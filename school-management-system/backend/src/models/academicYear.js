const { createTenantPool, mainPool } = require('../config/database');

// Helper function to get tenant database name
const getTenantDatabaseName = async (tenantId) => {
  const client = await mainPool.connect();
  try {
    const dbNameResult = await client.query(
      'SELECT database_name FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );
    
    if (dbNameResult.rows.length === 0 || !dbNameResult.rows[0].database_name) {
      throw new Error('Tenant database not configured');
    }
    
    return dbNameResult.rows[0].database_name;
  } finally {
    client.release();
  }
};

// Helper function to log academic year events in tenant database
const logAcademicYearEventInTenant = async (client, tenantId, action, fromAYId, toAYId) => {
  try {
    await client.query(`
      INSERT INTO academic_year_audit_log (
        tenant_id, action, from_ay_id, to_ay_id, actor_id, timestamp
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [tenantId, action, fromAYId, toAYId, 'system']);
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('Failed to log academic year event in tenant database:', error);
  }
};

// Helper function to log academic year events (kept for backward compatibility)
const logAcademicYearEvent = async (action, tenantId, fromAYId, toAYId) => {
  try {
    const client = await mainPool.connect();
    await client.query(`
      INSERT INTO academic_year_audit_log (
        tenant_id, action, from_ay_id, to_ay_id, actor_id, timestamp
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [tenantId, action, fromAYId, toAYId, 'system']);
    client.release();
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('Failed to log academic year event:', error);
  }
};

class AcademicYear {
  constructor(tenantId, label, startDate, endDate, status = 'draft') {
    this.tenantId = tenantId;
    this.label = label;
    this.startDate = startDate;
    this.endDate = endDate;
    this.status = status;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Validate academic year dates
  validate() {
    if (new Date(this.startDate) >= new Date(this.endDate)) {
      throw new Error('Start date must be before end date');
    }
    return true;
  }

  // Check if dates overlap with existing academic years
  async checkOverlap(client) {
    console.log('🔍 Checking overlap for:', {
      tenantId: this.tenantId,
      startDate: this.startDate,
      endDate: this.endDate,
      id: this.id
    });
    
    // First check if the label column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'academic_years' AND column_name = 'label'
    `);
    
    let query;
    if (columnCheck.rows.length > 0) {
      // Table has label column
      query = `
        SELECT id, label, start_date, end_date, status FROM academic_years 
        WHERE tenant_id = $1 
          AND status IN ('draft', 'active')
          AND (
            (start_date <= $2 AND end_date >= $2) OR
            (start_date <= $3 AND end_date >= $3) OR
            (start_date >= $2 AND end_date <= $3)
          )
          AND id != COALESCE($4, 0)
      `;
    } else {
      // Table doesn't have label column yet, use year_name instead
      query = `
        SELECT id, year_name, start_date, end_date, status FROM academic_years 
        WHERE tenant_id = $1 
          AND status IN ('draft', 'active')
          AND (
            (start_date <= $2 AND end_date >= $2) OR
            (start_date <= $3 AND end_date >= $3) OR
            (start_date >= $2 AND end_date <= $3)
          )
          AND id != COALESCE($4, 0)
      `;
    }
    
    const result = await client.query(query, [
      this.tenantId, 
      this.startDate, 
      this.endDate, 
      this.id || 0
    ]);
    
    console.log('🔍 Overlap check result:', result.rows);
    
    if (result.rows.length > 0) {
      console.error('❌ Found overlapping academic years:', result.rows);
      const nameField = columnCheck.rows.length > 0 ? 'label' : 'year_name';
      throw new Error(`Academic year dates overlap with existing academic years: ${result.rows.map(r => r[nameField]).join(', ')}`);
    }
    
    return true;
  }

  // Create new academic year
  static async create(tenantId, label, startDate, endDate, status = 'draft') {
    console.log('🔍 Creating academic year:', { tenantId, label, startDate, endDate, status });
    
    const academicYear = new AcademicYear(tenantId, label, startDate, endDate, status);
    
    console.log('🔍 Academic year object created:', academicYear);
    
    try {
      academicYear.validate();
      console.log('✅ Validation passed');
    } catch (validationError) {
      console.error('❌ Validation failed:', validationError.message);
      throw validationError;
    }
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check for overlaps
      console.log('🔍 Checking for overlaps...');
      try {
        await academicYear.checkOverlap(client);
        console.log('✅ No overlaps found');
      } catch (overlapError) {
        console.error('❌ Overlap check failed:', overlapError.message);
        throw overlapError;
      }
      
      // If setting as active, deactivate other active academic years
      if (status === 'active') {
        await client.query(`
          UPDATE academic_years 
          SET status = 'archived', updated_at = CURRENT_TIMESTAMP 
          WHERE tenant_id = $1 AND status = 'active'
        `, [tenantId]);
      }
      
      // Check if year_name column exists in this tenant's academic_years table
      const yearNameColumnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'academic_years' AND column_name = 'year_name'
      `);
      
      let insertQuery, insertValues;
      
      if (yearNameColumnCheck.rows.length > 0) {
        // Table has year_name column, include it in INSERT
        insertQuery = `
          INSERT INTO academic_years (
            tenant_id, label, year_name, start_date, end_date, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        insertValues = [
          academicYear.tenantId,
          academicYear.label,
          academicYear.label, // Use label as year_name
          academicYear.startDate,
          academicYear.endDate,
          academicYear.status,
          academicYear.createdAt,
          academicYear.updatedAt
        ];
      } else {
        // Table doesn't have year_name column, use standard INSERT
        insertQuery = `
          INSERT INTO academic_years (
            tenant_id, label, start_date, end_date, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        insertValues = [
          academicYear.tenantId,
          academicYear.label,
          academicYear.startDate,
          academicYear.endDate,
          academicYear.status,
          academicYear.createdAt,
          academicYear.updatedAt
        ];
      }
      
      const result = await client.query(insertQuery, insertValues);
      
      await client.query('COMMIT');
      
      // Log the creation event (in the tenant database)
      await logAcademicYearEventInTenant(client, tenantId, 'create', null, result.rows[0].id);
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      tenantPool.end();
    }
  }

  // Get academic year by ID
  static async getById(tenantId, id, client = null) {
    let shouldReleaseClient = false;
    
    if (!client) {
      const tenantDbName = await getTenantDatabaseName(tenantId);
      const tenantPool = createTenantPool(tenantId, tenantDbName);
      client = await tenantPool.connect();
      shouldReleaseClient = true;
    }
    
    try {
      let result;
      try {
        // First try with tenant_id filter
        result = await client.query(`
          SELECT * FROM academic_years 
          WHERE id = $1 AND tenant_id = $2
        `, [id, tenantId]);
      } catch (error) {
        // If tenant_id column doesn't exist, try without it
        console.log('tenant_id column not found in academic_years, trying without filter');
        result = await client.query(`
          SELECT * FROM academic_years 
          WHERE id = $1
        `, [id]);
      }
      
      return result.rows[0] || null;
    } finally {
      if (shouldReleaseClient) {
        client.release();
        // Note: We can't end the pool here if it was passed in
      }
    }
  }

  // Get all academic years for a tenant
  static async getAll(tenantId) {
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      let result;
      try {
        // First try with tenant_id filter
        result = await client.query(`
          SELECT * FROM academic_years 
          WHERE tenant_id = $1 
          ORDER BY start_date DESC
        `, [tenantId]);
      } catch (error) {
        // If tenant_id column doesn't exist, try without it
        console.log('tenant_id column not found in academic_years, trying without filter');
        result = await client.query(`
          SELECT * FROM academic_years 
          ORDER BY start_date DESC
        `);
      }
      
      return result.rows;
    } finally {
      client.release();
      tenantPool.end();
    }
  }

  // Get active academic year for a tenant
  static async getActive(tenantId) {
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      let result;
      try {
        // First try with tenant_id filter
        result = await client.query(`
          SELECT * FROM academic_years 
          WHERE tenant_id = $1 AND status = 'active'
          LIMIT 1
        `, [tenantId]);
      } catch (error) {
        // If tenant_id column doesn't exist, try without it
        console.log('tenant_id column not found in academic_years, trying without filter');
        result = await client.query(`
          SELECT * FROM academic_years 
          WHERE status = 'active'
          LIMIT 1
        `);
      }
      
      return result.rows[0] || null;
    } finally {
      client.release();
      tenantPool.end();
    }
  }

  // Update academic year
  static async update(tenantId, id, updates) {
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current academic year
      const current = await this.getById(tenantId, id, client);
      if (!current) {
        throw new Error('Academic year not found');
      }
      
      // If setting as active, deactivate other active academic years
      if (updates.status === 'active') {
        await client.query(`
          UPDATE academic_years 
          SET status = 'archived', updated_at = CURRENT_TIMESTAMP 
          WHERE tenant_id = $1 AND status = 'active' AND id != $2
        `, [tenantId, id]);
      }
      
      // Check for overlaps if dates are being updated
      if (updates.startDate || updates.endDate) {
        const academicYear = new AcademicYear(
          tenantId,
          updates.label || current.label,
          updates.startDate || current.start_date,
          updates.endDate || current.end_date,
          updates.status || current.status
        );
        academicYear.id = id;
        await academicYear.checkOverlap(client);
      }
      
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      Object.keys(updates).forEach(key => {
        if (['label', 'start_date', 'end_date', 'status'].includes(key)) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
          paramCount++;
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      updateFields.push(`updated_at = $${paramCount}`);
      values.push(new Date());
      values.push(id);
      values.push(tenantId);
      
      const result = await client.query(`
        UPDATE academic_years 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount + 1} AND tenant_id = $${paramCount + 2}
        RETURNING *
      `, values);
      
      await client.query('COMMIT');
      
      // Log the update event
      await logAcademicYearEventInTenant(client, tenantId, 'update', current.id, result.rows[0].id);
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      tenantPool.end();
    }
  }

  // Delete academic year
  static async delete(tenantId, id) {
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if academic year exists and get its status
      const current = await this.getById(tenantId, id, client);
      if (!current) {
        throw new Error('Academic year not found');
      }
      
      if (current.status === 'active') {
        throw new Error('Cannot delete active academic year');
      }
      
      // Check if academic year is referenced by classes or students
      const classCount = await client.query(`
        SELECT COUNT(*) FROM classes WHERE ay_id = $1
      `, [id]);
      
      const studentCount = await client.query(`
        SELECT COUNT(*) FROM students WHERE ay_id = $1
      `, [id]);
      
      if (parseInt(classCount.rows[0].count) > 0 || parseInt(studentCount.rows[0].count) > 0) {
        throw new Error('Academic year is referenced by classes or students and cannot be deleted');
      }
      
      const result = await client.query(`
        DELETE FROM academic_years 
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, [id, tenantId]);
      
      await client.query('COMMIT');
      
      // Log the deletion event
      await logAcademicYearEventInTenant(client, tenantId, 'delete', current.id, null);
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      tenantPool.end();
    }
  }

  // Activate academic year
  static async activate(tenantId, id) {
    console.log(`🔍 Activating academic year ${id} for tenant ${tenantId}`);
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    console.log(`📊 Using database: ${tenantDbName}`);
    
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      console.log('🔄 Starting transaction...');
      await client.query('BEGIN');
      
      // Get the academic year to activate
      console.log('🔍 Getting academic year details...');
      const academicYear = await this.getById(tenantId, id, client);
      if (!academicYear) {
        throw new Error('Academic year not found');
      }
      
      console.log(`📋 Current status: ${academicYear.status}`);
      
      if (academicYear.status === 'active') {
        throw new Error('Academic year is already active');
      }
      
      // Deactivate other active academic years
      console.log('🔄 Deactivating other active academic years...');
      const deactivateResult = await client.query(`
        UPDATE academic_years 
        SET status = 'archived', updated_at = CURRENT_TIMESTAMP 
        WHERE tenant_id = $1 AND status = 'active'
      `, [tenantId]);
      
      console.log(`✅ Deactivated ${deactivateResult.rowCount} other academic years`);
      
      // Activate the selected academic year
      console.log('🔄 Activating selected academic year...');
      const result = await client.query(`
        UPDATE academic_years 
        SET status = 'active', updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, [id, tenantId]);
      
      console.log(`✅ Activation result:`, result.rows[0]);
      
      // Run backfill for existing classes and students
      console.log('🔄 Running backfill...');
      await this.backfillClassesAndStudents(client, tenantId, id);
      
      console.log('🔄 Committing transaction...');
      await client.query('COMMIT');
      
      // Log the activation event
      console.log('🔄 Logging activation event...');
      await logAcademicYearEventInTenant(client, tenantId, 'activate', null, id);
      
      console.log('🎉 Academic year activated successfully!');
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error during activation:', error);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      tenantPool.end();
    }
  }

  // Backfill existing classes and students with the active academic year
  static async backfillClassesAndStudents(client, tenantId, academicYearId) {
    try {
      // Check if ay_id column exists in classes table
      const classesColumnExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'ay_id'
      `);
      
      if (classesColumnExists.rows.length > 0) {
        // Backfill classes without academic year
        await client.query(`
          UPDATE classes 
          SET ay_id = $1, updated_at = CURRENT_TIMESTAMP 
          WHERE tenant_id = $2 AND ay_id IS NULL
        `, [academicYearId, tenantId]);
      }
      
      // Check if ay_id column exists in students table
      const studentsColumnExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'ay_id'
      `);
      
      if (studentsColumnExists.rows.length > 0) {
        // Backfill students without academic year
        await client.query(`
          UPDATE students 
          SET ay_id = $1, updated_at = CURRENT_TIMESTAMP 
          WHERE tenant_id = $2 AND ay_id IS NULL
        `, [academicYearId, tenantId]);
      }
    } catch (error) {
      console.log('Note: Some tables may not have ay_id columns yet. This is normal for new installations.');
    }
  }

  // Check prerequisites for attendance system
  static async checkAttendancePrerequisites(tenantId) {
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      // Check if active academic year exists - handle both with and without tenant_id column
      let activeAY;
      try {
        // First try with tenant_id filter
        activeAY = await client.query(`
          SELECT id FROM academic_years 
          WHERE tenant_id = $1 AND status = 'active'
          LIMIT 1
        `, [tenantId]);
      } catch (error) {
        // If tenant_id column doesn't exist, try without it
        console.log('tenant_id column not found in academic_years, trying without filter');
        activeAY = await client.query(`
          SELECT id FROM academic_years 
          WHERE status = 'active'
          LIMIT 1
        `);
      }
      
      const hasActiveAY = activeAY.rows.length > 0;
      
      let hasClasses = false;
      let hasStudents = false;
      let classCount = 0;
      let studentCount = 0;
      
      // Check if classes table exists and has data
      try {
        const classCountResult = await client.query(`
          SELECT COUNT(*) FROM classes WHERE tenant_id = $1
        `, [tenantId]);
        
        hasClasses = parseInt(classCountResult.rows[0].count) > 0;
        classCount = parseInt(classCountResult.rows[0].count);
      } catch (error) {
        console.log('Classes table not accessible or missing tenant_id column:', error.message);
        // Try without tenant_id filter
        try {
          const classCountResult = await client.query(`SELECT COUNT(*) FROM classes`);
          hasClasses = parseInt(classCountResult.rows[0].count) > 0;
          classCount = parseInt(classCountResult.rows[0].count);
        } catch (innerError) {
          console.log('Classes table does not exist:', innerError.message);
        }
      }
      
      // Check if students table exists and has data
      try {
        const studentCountResult = await client.query(`
          SELECT COUNT(*) FROM students WHERE tenant_id = $1
        `, [tenantId]);
        
        hasStudents = parseInt(studentCountResult.rows[0].count) > 0;
        studentCount = parseInt(studentCountResult.rows[0].count);
      } catch (error) {
        console.log('Students table not accessible or missing tenant_id column:', error.message);
        // Try without tenant_id filter
        try {
          const studentCountResult = await client.query(`SELECT COUNT(*) FROM students`);
          hasStudents = parseInt(studentCountResult.rows[0].count) > 0;
          studentCount = parseInt(studentCountResult.rows[0].count);
        } catch (innerError) {
          console.log('Students table does not exist:', innerError.message);
        }
      }
      
      return {
        hasActiveAY,
        hasClasses,
        hasStudents,
        classCount,
        studentCount
      };
    } finally {
      client.release();
      tenantPool.end();
    }
  }
}

module.exports = AcademicYear;
