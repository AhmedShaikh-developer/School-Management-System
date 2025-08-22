const { createTenantPool, mainPool } = require('../config/database');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/students');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and common document formats
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, PDF, and document files are allowed'));
    }
  }
});

// Separate multer instance for CSV uploads
const csvUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for CSV files
    files: 1 // Only one CSV file per request
  },
  fileFilter: (req, file, cb) => {
    // Allow CSV files
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed for bulk import'));
    }
  }
});

// Get all students with pagination and search
const getStudents = async (req, res) => {
  try {
    const { tenantId } = req;
    const { page = 1, limit = 20, search = '', class_id, status = 'active' } = req.query;
    
    console.log('getStudents called with:', { tenantId, page, limit, search, class_id, status });
    
    if (!tenantId) {
      console.error('No tenantId in request');
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
    }
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    console.log('Tenant database name:', tenantDbName);
    
    if (!tenantDbName) {
      console.error('No database name found for tenant:', tenantId);
      return res.status(500).json({
        success: false,
        error: 'Tenant database not configured'
      });
    }
    
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      // Build where clause for filtering
      let whereClause = 'WHERE 1=1'; // No status filtering since we use hard delete
      let params = [];
      let paramCount = 0;
      
      if (search) {
        paramCount++;
        whereClause += ` AND (s.first_name ILIKE $${paramCount} OR s.last_name ILIKE $${paramCount} OR s.student_id ILIKE $${paramCount} OR s.email ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }
      
      if (class_id) {
        if (class_id === 'unassigned') {
          whereClause += ` AND s.class_id IS NULL`;
          console.log('Filtering for unassigned students (class_id IS NULL)');
        } else {
          paramCount++;
          whereClause += ` AND s.class_id = $${paramCount}`;
          params.push(class_id);
          console.log(`Filtering for class_id = ${class_id}`);
        }
      } else {
        console.log('No class filter applied - showing all classes');
      }
      
      // Status filter removed - all students are active since we use hard delete
      console.log('No status filter applied - all students are active');
      
      console.log('Final where clause:', whereClause);
      console.log('Final params:', params);
      
      // Get total count with proper filtering
      // Use a separate count query without JOINs to avoid counting issues
      const countQuery = `SELECT COUNT(*) FROM students s ${whereClause}`;
      console.log('Count query:', countQuery);
      
      let totalStudents = 0;
      try {
        const countResult = await client.query(countQuery, params);
        totalStudents = parseInt(countResult.rows[0].count);
        console.log('Total students found:', totalStudents);
      } catch (countError) {
        console.error('Error executing count query:', countError);
        console.error('Count query:', countQuery);
        console.error('Count params:', params);
        throw new Error(`Count query failed: ${countError.message}`);
      }
      
      // Get students with pagination - simple approach to prevent duplicates
      paramCount++;
      const offset = (page - 1) * limit;
      const studentsQuery = `
        SELECT s.*, c.class_name, c.grade_level
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        ${whereClause}
        ORDER BY s.last_name, s.first_name
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      
      // For unassigned students, we need to be extra careful with the count
      if (class_id === 'unassigned') {
        console.log('🔍 Special handling for unassigned students count');
        console.log('Where clause:', whereClause);
        console.log('Params:', params);
      }
      
      console.log('Students query:', studentsQuery);
      console.log('Query params:', [...params, limit, offset]);
      
      try {
        const studentsResult = await client.query(studentsQuery, [...params, limit, offset]);
        console.log('Students result rows:', studentsResult.rows.length);
        console.log('First few students:', studentsResult.rows.slice(0, 3));
        
        // Debug: Show all students with their class info
        console.log('\n=== ALL RETURNED STUDENTS ===');
        studentsResult.rows.forEach((student, index) => {
          console.log(`${index + 1}. ID: ${student.id}, Name: ${student.first_name} ${student.last_name}, Class ID: ${student.class_id}, Class Name: ${student.class_name}, Grade: ${student.grade_level}, Status: ${student.status}`);
        });
        
        // Verify no duplicates in results
        const studentIds = studentsResult.rows.map(s => s.id);
        const uniqueIds = [...new Set(studentIds)];
        if (studentIds.length !== uniqueIds.length) {
          console.warn('Duplicate students detected in results!');
          console.warn('Total rows:', studentIds.length, 'Unique IDs:', uniqueIds.length);
          
          // Find the duplicates
          const duplicates = studentIds.filter((id, index) => studentIds.indexOf(id) !== index);
          console.warn('Duplicate IDs:', [...new Set(duplicates)]);
        } else {
          console.log('No duplicate students in results');
        }
        
        // Additional debug: Check what the filter should have returned
        if (class_id === 'unassigned') {
          console.log('\n=== DEBUGGING UNASSIGNED FILTER ===');
          console.log('Query params for unassigned filter:', params);
          console.log('Where clause for unassigned filter:', whereClause);
          
          const unassignedCheck = await client.query(`
            SELECT COUNT(*) as count FROM students s 
            WHERE s.class_id IS NULL
          `);
          console.log(`Total unassigned students in database: ${unassignedCheck.rows[0].count}`);
          
          const assignedCheck = await client.query(`
            SELECT COUNT(*) as count FROM students s 
            WHERE s.class_id IS NOT NULL
          `);
          console.log(`Total assigned students in database: ${assignedCheck.rows[0].count}`);
          
          // Show the actual unassigned students
          const unassignedStudents = await client.query(`
            SELECT s.id, s.first_name, s.last_name, s.class_id
            FROM students s 
            WHERE s.class_id IS NULL
            ORDER BY s.id
          `);
          console.log('Unassigned students found:', unassignedStudents.rows);
          
          // Debug the count query result
          console.log(`Count query result: ${totalStudents} students`);
          console.log(`Expected: ${unassignedCheck.rows[0].count} students`);
          if (totalStudents !== parseInt(unassignedCheck.rows[0].count)) {
            console.warn('⚠️ COUNT MISMATCH! Count query returned different result than expected');
            
            // Check for students with unexpected status values
            const statusCheck = await client.query(`
              SELECT DISTINCT status, COUNT(*) as count 
              FROM students s 
              WHERE s.class_id IS NULL
              GROUP BY status
              ORDER BY status
            `);
            console.log('Status breakdown for unassigned students:', statusCheck.rows);
            
            // Also check the raw count query that was executed
            console.log('🔍 Executing the actual count query to debug...');
            const debugCount = await client.query(`SELECT COUNT(*) FROM students s ${whereClause}`, params);
            console.log(`Debug count query result: ${debugCount.rows[0].count}`);
          }
        } else if (!class_id) {
          console.log('\n=== DEBUGGING ALL CLASSES FILTER ===');
          const totalCheck = await client.query(`
            SELECT COUNT(*) as count FROM students s 
            WHERE s.status != 'deleted'
          `);
          console.log(`Total students in database: ${totalCheck.rows[0].count}`);
          
          const unassignedCheck = await client.query(`
            SELECT COUNT(*) as count FROM students s 
            WHERE s.status != 'deleted' AND s.class_id IS NULL
          `);
          console.log(`Unassigned students in database: ${unassignedCheck.rows[0].count}`);
          
          const assignedCheck = await client.query(`
            SELECT COUNT(*) as count FROM students s 
            WHERE s.status != 'deleted' AND s.class_id IS NOT NULL
          `);
          console.log(`Assigned students in database: ${assignedCheck.rows[0].count}`);
        }
        
        res.json({
          success: true,
          data: {
            students: studentsResult.rows,
            pagination: {
              current_page: parseInt(page),
              total_pages: Math.ceil(totalStudents / limit),
              total_students: totalStudents,
              limit: parseInt(limit)
            }
          }
        });
        
      } catch (studentsError) {
        console.error('Error executing students query:', studentsError);
        console.error('Students query:', studentsQuery);
        console.error('Students params:', [...params, limit, offset]);
        throw new Error(`Students query failed: ${studentsError.message}`);
      }
      
    } finally {
      client.release();
      tenantPool.end();
    }
    
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve students',
      details: error.message
    });
  }
};

// Get single student by ID
const getStudent = async (req, res) => {
  try {
    const { tenantId } = req;
    const { studentId } = req.params;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      const result = await client.query(`
        SELECT s.*, c.class_name, c.grade_level, c.capacity
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.id = $1 AND s.status != 'deleted'
      `, [studentId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
      
      // Get student documents
      const documentsResult = await client.query(`
        SELECT * FROM student_documents 
        WHERE student_id = $1 
        ORDER BY created_at DESC
      `, [studentId]);
      
      const student = result.rows[0];
      student.documents = documentsResult.rows;
      
      res.json({
        success: true,
        data: student
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
    
  } catch (error) {
    console.error('Error getting student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve student',
      details: error.message
    });
  }
};

// Create new student
const createStudent = async (req, res) => {
  try {
    const { tenantId } = req;
    const studentData = req.body;
    
    console.log('Creating student with data:', studentData);
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generate unique student ID
      const studentId = await generateUniqueStudentId(client, studentData.school_prefix || 'STU');
      
      // Clean up date fields - convert empty strings to null
      const cleanDateOfBirth = studentData.date_of_birth && studentData.date_of_birth.trim() !== '' 
        ? studentData.date_of_birth 
        : null;
      
      const cleanEnrollmentDate = studentData.enrollment_date && studentData.enrollment_date.trim() !== '' 
        ? studentData.enrollment_date 
        : new Date();
      
      console.log('🔍 Student creation - class_id processing:');
      console.log('  - Raw studentData.class_id:', studentData.class_id, 'type:', typeof studentData.class_id);
      console.log('  - Processed class_id:', studentData.class_id || null, 'type:', typeof (studentData.class_id || null));
      console.log('Cleaned date fields:', { cleanDateOfBirth, cleanEnrollmentDate });
      
      // Insert student
      const insertValues = [
        studentId, studentData.first_name, studentData.last_name, studentData.email,
        studentData.phone || null, cleanDateOfBirth, studentData.gender || null,
        studentData.address || null, studentData.parent_id || null, studentData.class_id || null,
        studentData.ay_id || null, cleanEnrollmentDate, studentData.photo_url || null,
        studentData.biometric_data || null, 'active'
      ];
      
      console.log('🔍 Insert query values:');
      console.log('  - class_id value (position 9):', insertValues[9], 'type:', typeof insertValues[9]);
      console.log('  - ay_id value (position 10):', insertValues[10], 'type:', typeof insertValues[10]);
      console.log('  - photo_url value (position 12):', insertValues[12], 'type:', typeof insertValues[12]);
      console.log('  - All values:', insertValues);
      
      const result = await client.query(`
        INSERT INTO students (
          student_id, first_name, last_name, email, phone, date_of_birth, 
          gender, address, parent_id, class_id, ay_id, enrollment_date, photo_url, biometric_data, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, insertValues);
      
      await client.query('COMMIT');
      
      console.log('🔍 Student creation result:');
      console.log('  - Created student data:', result.rows[0]);
      console.log('  - Final class_id in database:', result.rows[0].class_id, 'type:', typeof result.rows[0].class_id);
      console.log('Student created successfully:', result.rows[0]);
      
      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Student created successfully'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      tenantPool.end();
    }
    
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create student',
      details: error.message
    });
  }
};

// Update student
const updateStudent = async (req, res) => {
  try {
    const { tenantId } = req;
    const { studentId } = req.params;
    const updateData = req.body;
    
    console.log('Updating student with data:', updateData);
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      // Check if student exists
      const existingStudent = await client.query(
        'SELECT * FROM students WHERE id = $1 AND status != $2',
        [studentId, 'deleted']
      );
      
      if (existingStudent.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
      
      // Clean up date fields - convert empty strings to null
      if (updateData.date_of_birth !== undefined) {
        updateData.date_of_birth = updateData.date_of_birth && updateData.date_of_birth.trim() !== '' 
          ? updateData.date_of_birth 
          : null;
      }
      
      if (updateData.enrollment_date !== undefined) {
        updateData.enrollment_date = updateData.enrollment_date && updateData.enrollment_date.trim() !== '' 
          ? updateData.enrollment_date 
          : null;
      }
      
             // Define allowed fields for updates
       const allowedFields = [
         'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 
         'gender', 'address', 'class_id', 'ay_id', 'enrollment_date', 
         'photo_url', 'biometric_data',
         'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
         'medical_conditions', 'allergies', 'blood_group', 'nationality', 
         'religion', 'mother_tongue', 'previous_school'
       ];
       
       // Handle class_id field - convert to integer or null
       if (updateData.class_id !== undefined) {
         console.log('🔍 Backend processing class_id:');
         console.log('  - Raw updateData.class_id:', updateData.class_id, 'type:', typeof updateData.class_id);
         
         if (updateData.class_id === '' || updateData.class_id === 'null' || updateData.class_id === null) {
           console.log('  - Setting class_id to null (empty/null value)');
           updateData.class_id = null;
         } else {
           const classId = parseInt(updateData.class_id);
           console.log('  - Parsed classId:', classId, 'type:', typeof classId);
           
           if (isNaN(classId)) {
             console.log('  - ❌ Invalid class ID format - returning error');
             return res.status(400).json({
               success: false,
               error: 'Invalid class ID format'
             });
           }
           
           console.log('  - ✅ Valid class ID, setting updateData.class_id to:', classId);
           updateData.class_id = classId;
           
                                 // Verify that the class exists
                      console.log('  - 🔍 Verifying class exists in database...');
                      console.log('  - Query: SELECT id FROM classes WHERE id = $1 AND status = $2');
                      console.log('  - Parameters: classId =', classId, ', status = active');
                      
                      const classExists = await client.query(
                        'SELECT id FROM classes WHERE id = $1 AND status = $2',
                        [classId, 'active']
                      );
                      
                      console.log('  - Class verification result:', classExists.rows);
                      console.log('  - Row count:', classExists.rows.length);
                      
                      if (classExists.rows.length === 0) {
                        console.log('  - ❌ Class does not exist or is not active - returning error');
                        return res.status(400).json({
                          success: false,
                          error: 'Selected class does not exist or is not active'
                        });
                      }
                      
                      console.log('  - ✅ Class verified successfully');
                      console.log('  - Verified class ID:', classExists.rows[0].id, 'type:', typeof classExists.rows[0].id);
         }
       } else {
         console.log('  - class_id not provided in update data');
       }
       
       console.log('Cleaned update data:', updateData);
       console.log('Allowed fields:', allowedFields);
       console.log('Fields being updated:', Object.keys(updateData).filter(key => allowedFields.includes(key)));
       
       // Build update query dynamically - only update allowed fields
      console.log('🔍 Building update query:');
      console.log('  - updateData keys:', Object.keys(updateData));
      console.log('  - allowedFields:', allowedFields);
      
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          console.log(`  - Adding field: ${key} = $${paramCount} with value:`, updateData[key], 'type:', typeof updateData[key]);
          updateFields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        } else {
          console.log(`  - Skipping field: ${key} (allowed: ${allowedFields.includes(key)}, defined: ${updateData[key] !== undefined})`);
        }
      });
      
      console.log('  - Final updateFields:', updateFields);
      console.log('  - Final values array:', values);
      
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }
      
      updateFields.push(`updated_at = $${paramCount}`);
      values.push(new Date());
      values.push(studentId);
      
      const updateQuery = `
        UPDATE students 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount + 1}
        RETURNING *
      `;
      
      console.log('🔍 Final update execution:');
      console.log('  - Update query:', updateQuery);
      console.log('  - Update values:', values);
      console.log('  - Final class_id value in updateData:', updateData.class_id, 'type:', typeof updateData.class_id);
      
      // Find the class_id value in the values array
      const classIdIndex = updateFields.findIndex(field => field.includes('class_id'));
      if (classIdIndex !== -1) {
        console.log('  - class_id found at index:', classIdIndex, 'in updateFields');
        console.log('  - class_id value in values array:', values[classIdIndex], 'type:', typeof values[classIdIndex]);
        console.log('  - class_id field name:', updateFields[classIdIndex]);
      } else {
        console.log('  - class_id not found in updateFields');
      }
      
      const result = await client.query(updateQuery, values);
      
      console.log('🔍 Update result:');
      console.log('  - Updated student data:', result.rows[0]);
      console.log('  - Final class_id in database:', result.rows[0].class_id, 'type:', typeof result.rows[0].class_id);
      
      // Double-check what's actually in the database
      console.log('  - 🔍 Verifying database value...');
      const verifyQuery = await client.query(
        'SELECT id, first_name, last_name, class_id FROM students WHERE id = $1',
        [studentId]
      );
      console.log('  - Verification query result:', verifyQuery.rows[0]);
      console.log('  - Verified class_id in database:', verifyQuery.rows[0].class_id, 'type:', typeof verifyQuery.rows[0].class_id);
      
      console.log('Student updated successfully:', result.rows[0]);
       console.log('Sending response with status 200');
       console.log('Response data being sent:', {
         success: true,
         data: result.rows[0],
         message: 'Student updated successfully'
       });
       
       res.status(200).json({
         success: true,
         data: result.rows[0],
         message: 'Student updated successfully'
       });
      
    } finally {
      client.release();
      tenantPool.end();
    }
    
     } catch (error) {
     console.error('Error updating student:', error);
     console.error('Error stack:', error.stack);
     res.status(500).json({
       success: false,
       error: 'Failed to update student',
       details: error.message
     });
   }
};

// Delete student (hard delete)
const deleteStudent = async (req, res) => {
  try {
    const { tenantId } = req;
    const { studentId } = req.params;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      // First check if student exists
      const checkResult = await client.query(
        'SELECT id, first_name, last_name FROM students WHERE id = $1',
        [studentId]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
      
      // Hard delete the student
      const result = await client.query(
        'DELETE FROM students WHERE id = $1 RETURNING *',
        [studentId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Student permanently deleted successfully'
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
    
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete student',
      details: error.message
    });
  }
};

// Upload student documents
const uploadDocuments = async (req, res) => {
  try {
    const { tenantId } = req;
    const { studentId } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if student exists
      const studentCheck = await client.query(
        'SELECT id FROM students WHERE id = $1 AND status != $2',
        [studentId, 'deleted']
      );
      
      if (studentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
      
      const uploadedDocs = [];
      
      for (const file of req.files) {
        const docResult = await client.query(`
          INSERT INTO student_documents (
            student_id, document_name, file_path, file_size, mime_type, document_type
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          studentId,
          file.originalname,
          file.path,
          file.size,
          file.mimetype,
          req.body.document_type || 'general'
        ]);
        
        uploadedDocs.push(docResult.rows[0]);
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        data: uploadedDocs,
        message: `${uploadedDocs.length} document(s) uploaded successfully`
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      tenantPool.end();
    }
    
  } catch (error) {
    console.error('Error uploading documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload documents',
      details: error.message
    });
  }
};

// Upload student photo
const uploadPhoto = async (req, res) => {
  try {
    const { tenantId } = req;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No photo uploaded'
      });
    }
    
    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'Only image files are allowed'
      });
    }
    
    // Validate file size (5MB limit)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'Photo size should be less than 5MB'
      });
    }
    
    // Generate a unique filename
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `student_photo_${Date.now()}_${Math.random().toString(36).substring(2)}${fileExtension}`;
    
    // Move file to permanent location
    const uploadDir = path.join(__dirname, '../../uploads/students/photos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const finalPath = path.join(uploadDir, fileName);
    fs.renameSync(req.file.path, finalPath);
    
    // Generate URL for the photo
    const photoUrl = `/uploads/students/photos/${fileName}`;
    
    res.json({
      success: true,
      data: {
        photo_url: photoUrl,
        file_name: fileName,
        file_size: req.file.size,
        mime_type: req.file.mimetype
      },
      message: 'Photo uploaded successfully'
    });
    
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload photo',
      details: error.message
    });
  }
};

// Bulk import students via CSV
const bulkImportStudents = async (req, res) => {
  try {
    const { tenantId } = req;
    
    console.log('Bulk import started for tenant:', tenantId);
    console.log('Uploaded file:', req.file);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file uploaded'
      });
    }
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    console.log('Tenant database name:', tenantDbName);
    
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      const errors = [];
      let successCount = 0;
      let errorCount = 0;
      
      // Parse CSV file synchronously
      const csvData = [];
      
      console.log('Starting CSV parsing...');
      
      // Create a promise-based CSV parsing
      const parseCSV = () => {
        return new Promise((resolve, reject) => {
          const stream = fs.createReadStream(req.file.path);
          
          stream.on('error', (error) => {
            console.error('File read error:', error);
            reject(error);
          });
          
          stream.pipe(csv())
            .on('data', (row) => {
              console.log('Parsed row:', row);
              csvData.push(row);
            })
            .on('end', () => {
              console.log('CSV parsing completed. Total rows:', csvData.length);
              resolve();
            })
            .on('error', (error) => {
              console.error('CSV parsing error:', error);
              reject(error);
            });
        });
      };
      
      // Parse CSV first
      await parseCSV();
      
      console.log('Processing', csvData.length, 'rows...');
      console.log('🔍 Raw CSV data:');
      csvData.forEach((row, index) => {
        console.log(`  Row ${index + 1}:`, row);
        console.log(`    - class_id: "${row.class_id}" (type: ${typeof row.class_id})`);
        console.log(`    - class_id truthy: ${!!row.class_id}`);
        console.log(`    - class_id length: ${row.class_id ? row.class_id.length : 'N/A'}`);
      });
      
      // Check if CSV has data
      if (csvData.length === 0) {
        throw new Error('CSV file appears to be empty or contains no valid data rows');
      }
      
      // Validate CSV structure by checking first row
      const firstRow = csvData[0];
      const requiredFields = ['first_name', 'last_name', 'email'];
      const missingFields = requiredFields.filter(field => !firstRow[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`CSV file is missing required columns: ${missingFields.join(', ')}. Please use the provided template.`);
      }
      
      // Process each row
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const rowNumber = i + 2; // +2 because CSV starts at row 2 (1 is header)
        
        console.log(`Processing row ${rowNumber}:`, row);
        
        try {
          // Validate required fields
          if (!row.first_name || !row.last_name || !row.email) {
            const errorMsg = 'Missing required fields: first_name, last_name, or email';
            console.log(`Row ${rowNumber} validation failed:`, errorMsg);
            errors.push({
              row: rowNumber,
              error: errorMsg
            });
            errorCount++;
            continue;
          }
          
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(row.email)) {
            const errorMsg = 'Invalid email format';
            console.log(`Row ${rowNumber} validation failed:`, errorMsg);
            errors.push({
              row: rowNumber,
              error: errorMsg
            });
            errorCount++;
            continue;
          }
          
          // Check for duplicate email
          const existingEmail = await client.query(
            'SELECT id FROM students WHERE email = $1 AND status != $2',
            [row.email, 'deleted']
          );
          
          if (existingEmail.rows.length > 0) {
            const errorMsg = 'Email already exists';
            console.log(`Row ${rowNumber} validation failed:`, errorMsg);
            errors.push({
              row: rowNumber,
              error: errorMsg
            });
            errorCount++;
            continue;
          }
          
          // Validate class_id if provided
          let classId = null;
          console.log(`🔍 Row ${rowNumber} class_id processing:`);
          console.log(`  - Raw row.class_id: "${row.class_id}" (type: ${typeof row.class_id})`);
          console.log(`  - row.class_id truthy check: ${!!row.class_id}`);
          console.log(`  - row.class_id length: ${row.class_id ? row.class_id.length : 'N/A'}`);
          
          // Check if class_id is actually a meaningful value (not null, empty, or "null" string)
          const isClassIdValid = row.class_id && 
                                row.class_id.trim() !== '' && 
                                row.class_id.toLowerCase() !== 'null' &&
                                row.class_id.toLowerCase() !== 'n/a' &&
                                row.class_id.toLowerCase() !== 'none';
          
          if (isClassIdValid) {
            console.log(`  - class_id provided, processing...`);
            try {
              const classCheck = await client.query(
                'SELECT id FROM classes WHERE id = $1',
                [row.class_id]
              );
              
              if (classCheck.rows.length === 0) {
                const errorMsg = `Invalid class_id: ${row.class_id}. Class does not exist.`;
                console.log(`Row ${rowNumber} validation failed:`, errorMsg);
                errors.push({
                  row: rowNumber,
                  error: errorMsg
                });
                errorCount++;
                continue;
              }
              
              classId = parseInt(row.class_id);
              console.log(`  - ✅ Valid class_id set to: ${classId} (type: ${typeof classId})`);
            } catch (parseError) {
              const errorMsg = `Invalid class_id format: ${row.class_id}. Must be a number.`;
              console.log(`Row ${rowNumber} validation failed:`, errorMsg);
              errors.push({
                row: rowNumber,
                error: errorMsg
              });
              errorCount++;
              continue;
            }
          } else {
            console.log(`  - ✅ class_id is empty/null/"null"/"n/a"/"none", setting to null (unassigned)`);
            console.log(`  - Raw value: "${row.class_id}"`);
          }
          // If classId is still null, student will be created without class assignment
          
          // Generate unique student ID
          const studentId = await generateUniqueStudentId(client, row.school_prefix || 'STU');
          console.log(`Generated student ID for row ${rowNumber}:`, studentId);
          
          // Debug insert values
          console.log(`🔍 Row ${rowNumber} insert values:`);
          console.log(`  - class_id value: ${classId} (type: ${typeof classId})`);
          console.log(`  - All insert values:`, [
            studentId, row.first_name, row.last_name, row.email,
            row.phone || null, row.date_of_birth || null, row.gender || null,
            row.address || null, classId, row.ay_id || null,
            row.enrollment_date || new Date(), row.photo_url || null, row.biometric_data || null, 'active'
          ]);
          
          // Insert student
          const result = await client.query(`
            INSERT INTO students (
              student_id, first_name, last_name, email, phone, date_of_birth,
              gender, address, class_id, ay_id, enrollment_date, photo_url, biometric_data, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
          `, [
            studentId, row.first_name, row.last_name, row.email,
            row.phone || null, row.date_of_birth || null, row.gender || null,
            row.address || null, classId, row.ay_id || null,
            row.enrollment_date || new Date(), row.photo_url || null, row.biometric_data || null, 'active'
          ]);
          
          console.log(`Row ${rowNumber} inserted successfully:`, result.rows[0]);
          console.log(`🔍 Row ${rowNumber} final result:`);
          console.log(`  - Inserted class_id: ${result.rows[0].class_id} (type: ${typeof result.rows[0].class_id})`);
          console.log(`  - Full inserted student:`, result.rows[0]);
          
          results.push({
            row: rowNumber,
            student: result.rows[0],
            status: 'success'
          });
          successCount++;
          
        } catch (rowError) {
          console.error(`Error processing row ${rowNumber}:`, rowError);
          errors.push({
            row: rowNumber,
            error: rowError.message
          });
          errorCount++;
        }
      }
      
      console.log('All rows processed. Committing transaction...');
      await client.query('COMMIT');
      
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('Uploaded file cleaned up');
      }
      
      const responseData = {
        total_rows: csvData.length,
        successful_imports: successCount,
        failed_imports: errorCount,
        results: results,
        errors: errors
      };
      
      console.log('Bulk import completed successfully:', responseData);
      
      res.json({
        success: true,
        data: responseData,
        message: `Bulk import completed. ${successCount} students imported successfully, ${errorCount} failed.`
      });
      
    } catch (error) {
      console.error('Database transaction error:', error);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      tenantPool.end();
    }
    
  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk import',
      details: error.message
    });
  }
};

// Promote/transfer student between classes
const transferStudent = async (req, res) => {
  try {
    const { tenantId } = req;
    const { studentId } = req.params;
    const { new_class_id, transfer_reason, effective_date } = req.body;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if student exists
      const studentCheck = await client.query(
        'SELECT * FROM students WHERE id = $1 AND status != $2',
        [studentId, 'deleted']
      );
      
      if (studentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
      
      // Check if new class exists
      const classCheck = await client.query(
        'SELECT * FROM classes WHERE id = $1 AND status = $2',
        [new_class_id, 'active']
      );
      
      if (classCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid class ID'
        });
      }
      
      // Check class capacity
      const currentStudents = await client.query(
        'SELECT COUNT(*) FROM students WHERE class_id = $1 AND status = $2',
        [new_class_id, 'active']
      );
      
      if (parseInt(currentStudents.rows[0].count) >= classCheck.rows[0].capacity) {
        return res.status(400).json({
          success: false,
          error: 'Class is at maximum capacity'
        });
      }
      
      // Record transfer history
      await client.query(`
        INSERT INTO student_transfers (
          student_id, from_class_id, to_class_id, transfer_reason, effective_date
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        studentId,
        studentCheck.rows[0].class_id,
        new_class_id,
        transfer_reason || 'Class transfer',
        effective_date || new Date()
      ]);
      
      // Update student's class
      const result = await client.query(`
        UPDATE students 
        SET class_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [new_class_id, studentId]);
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        data: result.rows[0],
        message: 'Student transferred successfully'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      tenantPool.end();
    }
    
  } catch (error) {
    console.error('Error transferring student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer student',
      details: error.message
    });
  }
};

// Generate student ID card
const generateStudentIdCard = async (req, res) => {
  try {
    const { tenantId } = req;
    const { studentId } = req.params;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      // Get student information
      const studentResult = await client.query(`
        SELECT s.*, c.class_name, c.grade_level
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.id = $1 AND s.status != $2
      `, [studentId, 'deleted']);
      
      if (studentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
      
      const student = studentResult.rows[0];
      
      // Get school branding
      const brandingResult = await client.query(`
        SELECT * FROM tenant_branding WHERE tenant_id = $1
      `, [tenantId]);
      
      const branding = brandingResult.rows[0] || {};
      
      // Generate ID card data (in a real app, you'd generate a PDF/image)
      const idCardData = {
        student_id: student.student_id,
        name: `${student.first_name} ${student.last_name}`,
        class: student.class_name || 'Not Assigned',
        grade: student.grade_level || 'N/A',
        photo: student.photo_url || null,
        school_logo: branding.logo_data ? `data:${branding.logo_mimetype};base64,${branding.logo_data.toString('base64')}` : null,
        primary_color: branding.primary_color || '#2563eb',
        secondary_color: branding.secondary_color || '#1d4ed8'
      };
      
      res.json({
        success: true,
        data: idCardData,
        message: 'Student ID card data generated successfully'
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
    
  } catch (error) {
    console.error('Error generating ID card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate ID card',
      details: error.message
    });
  }
};

// Helper function to generate unique student ID
const generateUniqueStudentId = async (client, prefix = 'STU') => {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    const studentId = `${prefix}${timestamp}${random}`.toUpperCase();
    
    // Check if ID already exists
    const existing = await client.query(
      'SELECT id FROM students WHERE student_id = $1',
      [studentId]
    );
    
    if (existing.rows.length === 0) {
      return studentId;
    }
    
    attempts++;
  }
  
  throw new Error('Could not generate unique student ID after maximum attempts');
};

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  uploadDocuments,
  uploadPhoto, // Add the new uploadPhoto function to exports
  bulkImportStudents,
  transferStudent,
  generateStudentIdCard,
  upload, // Export multer instance for routes
  csvUpload // Export CSV multer instance for bulk import
};
