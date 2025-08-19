const { createTenantPool } = require('../config/database');

// Helper function to get tenant database name
const getTenantDatabaseName = async (tenantId) => {
  const mainPool = require('../config/database').mainPool;
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

// Get all classes for a tenant
const getClasses = async (req, res) => {
  try {
    const { tenantId } = req;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();

    try {
      const result = await client.query(`
        SELECT 
          id, 
          class_name, 
          grade_level, 
          section, 
          capacity, 
          academic_year,
          status,
          created_at,
          updated_at
        FROM classes 
        ORDER BY grade_level, class_name, section
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get a single class by ID
const getClass = async (req, res) => {
  try {
    const { tenantId } = req;
    const { classId } = req.params;
    
    if (!tenantId || !classId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID and Class ID are required'
      });
    }

    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();

    try {
      const result = await client.query(`
        SELECT 
          id, 
          class_name, 
          grade_level, 
          section, 
          capacity, 
          academic_year,
          status,
          created_at,
          updated_at
        FROM classes 
        WHERE id = $1
      `, [classId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create a new class
const createClass = async (req, res) => {
  try {
    const { tenantId } = req;
    const { class_name, grade_level, section, capacity, academic_year } = req.body;
    
    if (!tenantId || !class_name || !grade_level) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID, class name, and grade level are required'
      });
    }

    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();

    try {
      // Check if class already exists
      const existingClass = await client.query(`
        SELECT id FROM classes 
        WHERE class_name = $1 AND grade_level = $2 AND section = $3
      `, [class_name, grade_level, section || null]);

      if (existingClass.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A class with this name, grade level, and section already exists'
        });
      }

      const result = await client.query(`
        INSERT INTO classes (class_name, grade_level, section, capacity, academic_year, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, class_name, grade_level, section, capacity, academic_year, status, created_at, updated_at
      `, [class_name, grade_level, section || null, capacity || null, academic_year || null]);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Class created successfully'
      });
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update an existing class
const updateClass = async (req, res) => {
  try {
    const { tenantId } = req;
    const { classId } = req.params;
    const { class_name, grade_level, section, capacity, academic_year } = req.body;
    
    if (!tenantId || !classId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID and Class ID are required'
      });
    }

    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();

    try {
      // Check if class exists
      const existingClass = await client.query(`
        SELECT id FROM classes WHERE id = $1
      `, [classId]);

      if (existingClass.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      // Check if updated values conflict with existing classes
      if (class_name || grade_level || section) {
        const conflictCheck = await client.query(`
          SELECT id FROM classes 
          WHERE class_name = $1 AND grade_level = $2 AND section = $3 AND id != $4
        `, [class_name, grade_level, section || null, classId]);

        if (conflictCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'A class with this name, grade level, and section already exists'
          });
        }
      }

      const result = await client.query(`
        UPDATE classes 
        SET 
          class_name = COALESCE($1, class_name),
          grade_level = COALESCE($2, grade_level),
          section = COALESCE($3, section),
          capacity = COALESCE($4, capacity),
          academic_year = COALESCE($5, academic_year),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id, class_name, grade_level, section, capacity, academic_year, status, created_at, updated_at
      `, [class_name, grade_level, section, capacity, academic_year, classId]);

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Class updated successfully'
      });
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete a class (permanent deletion)
const deleteClass = async (req, res) => {
  try {
    const { tenantId } = req;
    const { classId } = req.params;
    
    if (!tenantId || !classId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID and Class ID are required'
      });
    }

    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // Check if class exists
      const existingClass = await client.query(`
        SELECT id FROM classes WHERE id = $1
      `, [classId]);

      if (existingClass.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      // Check if class has students
      const studentsCheck = await client.query(`
        SELECT COUNT(*) as count FROM students WHERE class_id = $1 AND status != 'deleted'
      `, [classId]);

      if (parseInt(studentsCheck.rows[0].count) > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Cannot delete class that has students. Please transfer or remove students first.'
        });
      }

      // Hard delete the class (completely remove the record)
      const deleteResult = await client.query(`
        DELETE FROM classes WHERE id = $1
      `, [classId]);

      console.log('Hard delete result for class ' + classId + ':', deleteResult.rowCount, 'rows affected');

      if (deleteResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'No class was deleted. Class may have already been removed.'
        });
      }

      console.log('Class ' + classId + ' has been permanently deleted from the database');

      // Commit transaction
      await client.query('COMMIT');
      console.log('Transaction committed successfully for class ' + classId);

      console.log('Sending success response for class ' + classId + ' deletion');
      res.json({
        success: true,
        message: 'Class permanently deleted successfully',
        data: { classId, deleted: true }
      });
    } catch (error) {
      // Rollback on error
      console.error('Error during class deletion for ' + classId + ':', error);
      try {
        await client.query('ROLLBACK');
        console.log('Transaction rolled back for class ' + classId);
      } catch (rollbackError) {
        console.error('Error during rollback for class ' + classId + ':', rollbackError);
      }
      throw error;
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get classes for dropdown (simplified data)
const getClassesForDropdown = async (req, res) => {
  try {
    const { tenantId } = req;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();

    try {
      const result = await client.query(`
        SELECT id, class_name, grade_level, section
        FROM classes 
        ORDER BY grade_level, class_name, section
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Get classes for dropdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  getClassesForDropdown
};
