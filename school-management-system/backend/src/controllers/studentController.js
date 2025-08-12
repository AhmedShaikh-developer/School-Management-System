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

// Get all students with pagination and search
const getStudents = async (req, res) => {
  try {
    const { tenantId } = req;
    const { page = 1, limit = 20, search = '', class_id, status = 'active' } = req.query;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      let whereClause = 'WHERE status = $1';
      let params = [status];
      let paramCount = 1;
      
      if (search) {
        paramCount++;
        whereClause += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR student_id ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }
      
      if (class_id) {
        paramCount++;
        whereClause += ` AND class_id = $${paramCount}`;
        params.push(class_id);
      }
      
      // Get total count
      const countQuery = `SELECT COUNT(*) FROM students ${whereClause}`;
      const countResult = await client.query(countQuery, params);
      const totalStudents = parseInt(countResult.rows[0].count);
      
      // Get students with pagination
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
      
      const studentsResult = await client.query(studentsQuery, [...params, limit, offset]);
      
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
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generate unique student ID
      const studentId = await generateUniqueStudentId(client, studentData.school_prefix || 'STU');
      
      // Insert student
      const result = await client.query(`
        INSERT INTO students (
          student_id, first_name, last_name, email, phone, date_of_birth, 
          gender, address, parent_id, class_id, enrollment_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        studentId, studentData.first_name, studentData.last_name, studentData.email,
        studentData.phone, studentData.date_of_birth, studentData.gender,
        studentData.address, studentData.parent_id, studentData.class_id,
        studentData.enrollment_date || new Date(), 'active'
      ]);
      
      await client.query('COMMIT');
      
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
      
      // Build update query dynamically
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && key !== 'student_id' && key !== 'created_at') {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });
      
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
      
      const result = await client.query(updateQuery, values);
      
      res.json({
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
    res.status(500).json({
      success: false,
      error: 'Failed to update student',
      details: error.message
    });
  }
};

// Delete student (soft delete)
const deleteStudent = async (req, res) => {
  try {
    const { tenantId } = req;
    const { studentId } = req.params;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      const result = await client.query(`
        UPDATE students 
        SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [studentId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Student deleted successfully'
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

// Bulk import students via CSV
const bulkImportStudents = async (req, res) => {
  try {
    const { tenantId } = req;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file uploaded'
      });
    }
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      const errors = [];
      let successCount = 0;
      let errorCount = 0;
      
      // Parse CSV file
      const csvData = [];
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => csvData.push(row))
        .on('end', async () => {
          try {
            for (let i = 0; i < csvData.length; i++) {
              const row = csvData[i];
              const rowNumber = i + 2; // +2 because CSV starts at row 2 (1 is header)
              
              try {
                // Validate required fields
                if (!row.first_name || !row.last_name || !row.email) {
                  errors.push({
                    row: rowNumber,
                    error: 'Missing required fields: first_name, last_name, or email'
                  });
                  errorCount++;
                  continue;
                }
                
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(row.email)) {
                  errors.push({
                    row: rowNumber,
                    error: 'Invalid email format'
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
                  errors.push({
                    row: rowNumber,
                    error: 'Email already exists'
                  });
                  errorCount++;
                  continue;
                }
                
                // Generate unique student ID
                const studentId = await generateUniqueStudentId(client, row.school_prefix || 'STU');
                
                // Insert student
                const result = await client.query(`
                  INSERT INTO students (
                    student_id, first_name, last_name, email, phone, date_of_birth,
                    gender, address, class_id, enrollment_date, status
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                  RETURNING *
                `, [
                  studentId, row.first_name, row.last_name, row.email,
                  row.phone || null, row.date_of_birth || null, row.gender || null,
                  row.address || null, row.class_id || null,
                  row.enrollment_date || new Date(), 'active'
                ]);
                
                results.push({
                  row: rowNumber,
                  student: result.rows[0],
                  status: 'success'
                });
                successCount++;
                
              } catch (rowError) {
                errors.push({
                  row: rowNumber,
                  error: rowError.message
                });
                errorCount++;
              }
            }
            
            await client.query('COMMIT');
            
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            
            res.json({
              success: true,
              data: {
                total_rows: csvData.length,
                successful_imports: successCount,
                failed_imports: errorCount,
                results: results,
                errors: errors
              },
              message: `Bulk import completed. ${successCount} students imported successfully, ${errorCount} failed.`
            });
            
          } catch (parseError) {
            await client.query('ROLLBACK');
            throw parseError;
          }
        })
        .on('error', async (error) => {
          await client.query('ROLLBACK');
          throw error;
        });
        
    } catch (error) {
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
  bulkImportStudents,
  transferStudent,
  generateStudentIdCard,
  upload // Export multer instance for routes
};
