const { createTenantPool, mainPool } = require('../config/database');
const { feeReminderService } = require('../services/reminderService');
const path = require('path');
const fs = require('fs');

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

// Generate unique receipt number
const generateReceiptNumber = async (client, prefix = 'RCP') => {
  const currentYear = new Date().getFullYear();
  const fiscalYear = `${currentYear}-${(currentYear + 1).toString().slice(2)}`;
  
  // Get or create sequence for this fiscal year
  const result = await client.query(`
    INSERT INTO receipt_sequences (prefix, fiscal_year) 
    VALUES ($1, $2) 
    ON CONFLICT (prefix, fiscal_year) 
    DO UPDATE SET current_number = receipt_sequences.current_number + 1
    RETURNING current_number
  `, [prefix, fiscalYear]);
  
  const sequenceNumber = result.rows[0].current_number;
  return `${prefix}${fiscalYear}${sequenceNumber.toString().padStart(4, '0')}`;
};

// Generate unique voucher number
const generateVoucherNumber = async (client, classId, ayId) => {
  const currentYear = new Date().getFullYear();
  const prefix = `V${classId}${ayId}${currentYear}`;
  
  const result = await client.query(`
    SELECT COUNT(*) + 1 as next_number 
    FROM fee_vouchers 
    WHERE class_id = $1 AND ay_id = $2 AND EXTRACT(YEAR FROM created_at) = $3
  `, [classId, ayId, currentYear]);
  
  const sequenceNumber = result.rows[0].next_number;
  return `${prefix}${sequenceNumber.toString().padStart(4, '0')}`;
};

// Calculate discounts and scholarships for a student
const calculateDiscountsAndScholarships = async (client, studentId, classId, amount) => {
  let discountAmount = 0;
  let scholarshipAmount = 0;
  
  // Calculate applicable discounts
  const discounts = await client.query(`
    SELECT * FROM discounts 
    WHERE is_active = TRUE 
    AND valid_from <= CURRENT_DATE 
    AND valid_to >= CURRENT_DATE
    AND (
      applicable_to = 'all' 
      OR (applicable_to = 'class' AND $2 = ANY(class_ids))
      OR (applicable_to = 'student' AND $1 = ANY(student_ids))
    )
    ORDER BY value DESC
  `, [studentId, classId]);
  
  for (const discount of discounts.rows) {
    let calculatedDiscount = 0;
    if (discount.type === 'percentage') {
      calculatedDiscount = (amount * discount.value) / 100;
    } else {
      calculatedDiscount = discount.value;
    }
    
    if (discount.max_amount && calculatedDiscount > discount.max_amount) {
      calculatedDiscount = discount.max_amount;
    }
    
    discountAmount = Math.max(discountAmount, calculatedDiscount);
  }
  
  // Calculate applicable scholarships
  const scholarships = await client.query(`
    SELECT s.*, ss.amount as scholarship_amount
    FROM scholarships s
    JOIN student_scholarships ss ON s.id = ss.scholarship_id
    WHERE ss.student_id = $1 
    AND ss.status = 'active'
    AND ss.valid_from <= CURRENT_DATE 
    AND ss.valid_to >= CURRENT_DATE
  `, [studentId]);
  
  for (const scholarship of scholarships.rows) {
    scholarshipAmount += scholarship.scholarship_amount;
  }
  
  return { discountAmount, scholarshipAmount };
};

// =======================
// FEE STRUCTURE MANAGEMENT
// =======================

// Get all fee structures
const getFeeStructures = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { page = 1, limit = 20, class_id, ay_id } = req.query;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (class_id) {
        params.push(class_id);
        whereClause += ` AND fs.class_id = $${params.length}`;
      }
      
      if (ay_id) {
        params.push(ay_id);
        whereClause += ` AND fs.ay_id = $${params.length}`;
      }
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) FROM fee_structures fs ${whereClause}
      `;
      const countResult = await client.query(countQuery, params);
      const totalRecords = parseInt(countResult.rows[0].count);
      
      // Get fee structures with class and academic year details
      const offset = (page - 1) * limit;
      params.push(limit, offset);
      
      const query = `
        SELECT 
          fs.*,
          c.class_name,
          c.grade_level,
          ay.year_name as academic_year
        FROM fee_structures fs
        LEFT JOIN classes c ON fs.class_id = c.id
        LEFT JOIN academic_years ay ON fs.ay_id = ay.id
        ${whereClause}
        ORDER BY fs.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;
      
      const result = await client.query(query, params);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalRecords / limit),
          total_records: totalRecords,
          limit: parseInt(limit)
        }
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error getting fee structures:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fee structures'
    });
  }
};

// Create fee structure
const createFeeStructure = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const {
      class_id,
      ay_id,
      tuition_fee,
      library_fee = 0,
      lab_fee = 0,
      sports_fee = 0,
      transport_fee = 0,
      examination_fee = 0,
      development_fee = 0,
      other_fees = [],
      installments = 1,
      due_dates = []
    } = req.body;
    
    if (!class_id || !ay_id || !tuition_fee) {
      return res.status(400).json({
        success: false,
        error: 'Class ID, Academic Year ID, and tuition fee are required'
      });
    }
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      // Calculate total fees
      const totalAnnualFee = parseFloat(tuition_fee) + 
                            parseFloat(library_fee) + 
                            parseFloat(lab_fee) + 
                            parseFloat(sports_fee) + 
                            parseFloat(transport_fee) + 
                            parseFloat(examination_fee) + 
                            parseFloat(development_fee) +
                            (other_fees || []).reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
      
      const installmentAmount = totalAnnualFee / installments;
      
      const query = `
        INSERT INTO fee_structures (
          class_id, ay_id, tuition_fee, library_fee, lab_fee, sports_fee,
          transport_fee, examination_fee, development_fee, other_fees,
          total_annual_fee, installments, installment_amount, due_dates
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const values = [
        class_id, ay_id, tuition_fee, library_fee, lab_fee, sports_fee,
        transport_fee, examination_fee, development_fee, JSON.stringify(other_fees),
        totalAnnualFee, installments, installmentAmount, JSON.stringify(due_dates)
      ];
      
      const result = await client.query(query, values);
      
      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Fee structure created successfully'
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error creating fee structure:', error);
    if (error.constraint === 'fee_structures_class_id_ay_id_key') {
      res.status(400).json({
        success: false,
        error: 'Fee structure already exists for this class and academic year'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create fee structure'
      });
    }
  }
};

// Update fee structure
const updateFeeStructure = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { id } = req.params;
    const {
      tuition_fee,
      library_fee = 0,
      lab_fee = 0,
      sports_fee = 0,
      transport_fee = 0,
      examination_fee = 0,
      development_fee = 0,
      other_fees = [],
      installments = 1,
      due_dates = [],
      status
    } = req.body;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      // Calculate total fees
      const totalAnnualFee = parseFloat(tuition_fee) + 
                            parseFloat(library_fee) + 
                            parseFloat(lab_fee) + 
                            parseFloat(sports_fee) + 
                            parseFloat(transport_fee) + 
                            parseFloat(examination_fee) + 
                            parseFloat(development_fee) +
                            (other_fees || []).reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
      
      const installmentAmount = totalAnnualFee / installments;
      
      const query = `
        UPDATE fee_structures SET
          tuition_fee = $1, library_fee = $2, lab_fee = $3, sports_fee = $4,
          transport_fee = $5, examination_fee = $6, development_fee = $7,
          other_fees = $8, total_annual_fee = $9, installments = $10,
          installment_amount = $11, due_dates = $12, status = $13,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $14
        RETURNING *
      `;
      
      const values = [
        tuition_fee, library_fee, lab_fee, sports_fee,
        transport_fee, examination_fee, development_fee, JSON.stringify(other_fees),
        totalAnnualFee, installments, installmentAmount, JSON.stringify(due_dates),
        status || 'active', id
      ];
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Fee structure not found'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0],
        message: 'Fee structure updated successfully'
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error updating fee structure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update fee structure'
    });
  }
};

// Delete fee structure
const deleteFeeStructure = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { id } = req.params;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      // Check if there are any vouchers associated with this fee structure
      const voucherCheck = await client.query(
        'SELECT COUNT(*) FROM fee_vouchers WHERE fee_structure_id = $1',
        [id]
      );
      
      if (parseInt(voucherCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete fee structure. Fee vouchers exist for this structure.'
        });
      }
      
      const result = await client.query(
        'DELETE FROM fee_structures WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Fee structure not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Fee structure deleted successfully'
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error deleting fee structure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete fee structure'
    });
  }
};

// =======================
// VOUCHER MANAGEMENT
// =======================

// Generate vouchers for students
const generateVouchers = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { class_ids, ay_id, installment_count, due_date } = req.body;
    
    if (!class_ids || !ay_id || !installment_count || !due_date) {
      return res.status(400).json({
        success: false,
        error: 'Class IDs, Academic Year ID, installment count, and due date are required'
      });
    }
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      await client.query('BEGIN');
      
      const generatedVouchers = [];
      
      for (const classId of class_ids) {
        // Get fee structure for this class and academic year
        const feeStructureResult = await client.query(`
          SELECT * FROM fee_structures 
          WHERE class_id = $1 AND ay_id = $2 AND status = 'active'
        `, [classId, ay_id]);
        
        if (feeStructureResult.rows.length === 0) {
          throw new Error(`No active fee structure found for class ${classId} and academic year ${ay_id}`);
        }
        
        const feeStructure = feeStructureResult.rows[0];
        
        // Get all students in this class for this academic year
        const studentsResult = await client.query(`
          SELECT id, first_name, last_name 
          FROM students 
          WHERE class_id = $1 AND ay_id = $2 AND status = 'active'
        `, [classId, ay_id]);
        
        for (const student of studentsResult.rows) {
          // Calculate total annual fee
          const totalAnnualFee = feeStructure.total_annual_fee;
          
          // Calculate installment amount
          const installmentAmount = Math.ceil(totalAnnualFee / installment_count);
          
          // Calculate due dates for each installment (monthly intervals)
          const dueDates = [];
          const baseDate = new Date(due_date);
          for (let i = 0; i < installment_count; i++) {
            const installmentDate = new Date(baseDate);
            installmentDate.setMonth(baseDate.getMonth() + i);
            dueDates.push(installmentDate.toISOString().split('T')[0]);
          }
          
          // Create vouchers for each installment
          for (let installmentNum = 1; installmentNum <= installment_count; installmentNum++) {
            // Check if voucher already exists for this student and installment
            const existingVoucher = await client.query(`
              SELECT id FROM fee_vouchers 
              WHERE student_id = $1 AND installment_number = $2 AND ay_id = $3
            `, [student.id, installmentNum, ay_id]);
            
            if (existingVoucher.rows.length > 0) {
              continue; // Skip if voucher already exists
            }
            
            // Calculate discounts and scholarships for this installment
            const { discountAmount, scholarshipAmount } = await calculateDiscountsAndScholarships(
              client, student.id, classId, installmentAmount
            );
            
            const finalAmount = Math.max(0, installmentAmount - discountAmount - scholarshipAmount);
            
            // Generate voucher number
            const voucherNumber = await generateVoucherNumber(client, classId, ay_id);
            
            // Get month name from due date
            const monthDate = new Date(dueDates[installmentNum - 1]);
            const monthName = monthDate.toLocaleString('en-US', { month: 'long' });

            // Create voucher for this installment
            const voucherResult = await client.query(`
              INSERT INTO fee_vouchers (
                voucher_number, student_id, class_id, ay_id, fee_structure_id,
                installment_number, due_date, amount_due, discount_amount,
                scholarship_amount, final_amount, balance_amount, generated_by, month
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              RETURNING *
            // Get admin name for generated_by
            let adminName = 'Admin';
            if (req.user?.id) {
              const adminResult = await client.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
              adminName = adminResult.rows[0]?.name || 'Admin';
            }
            
            `, [
              voucherNumber, student.id, classId, ay_id, feeStructure.id,
              installmentNum, dueDates[installmentNum - 1], installmentAmount,
              discountAmount, scholarshipAmount, finalAmount, finalAmount, adminName, monthName
            ]);
            
            generatedVouchers.push({
              ...voucherResult.rows[0],
              student_name: `${student.first_name} ${student.last_name}`,
              installment_info: `Installment ${installmentNum} of ${installment_count}`
            });
          }
        }
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        data: generatedVouchers,
        message: `${generatedVouchers.length} vouchers generated successfully`
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error generating vouchers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate vouchers'
    });
  }
};

// Get all installments for a specific student and fee structure
const getStudentInstallments = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { student_id, fee_structure_id, ay_id } = req.query;
    
    if (!student_id || !fee_structure_id || !ay_id) {
      return res.status(400).json({
        success: false,
        error: 'Student ID, fee structure ID, and academic year ID are required'
      });
    }
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      const query = `
        SELECT 
          v.*,
          s.first_name || ' ' || s.last_name as student_name,
          c.class_name,
          ay.label as academic_year_label
        FROM fee_vouchers v
        LEFT JOIN students s ON v.student_id = s.id
        LEFT JOIN classes c ON v.class_id = c.id
        LEFT JOIN academic_years ay ON v.ay_id = ay.id
        WHERE v.student_id = $1 
        AND v.fee_structure_id = $2 
        AND v.ay_id = $3
        ORDER BY v.installment_number ASC
      `;
      
      const result = await client.query(query, [student_id, fee_structure_id, ay_id]);
      
      res.json({
        success: true,
        data: result.rows || [],
        total_installments: result.rows.length,
        total_amount: result.rows.reduce((sum, v) => sum + parseFloat(v.final_amount || 0), 0),
        paid_amount: result.rows.reduce((sum, v) => sum + parseFloat(v.amount_paid || 0), 0),
        balance_amount: result.rows.reduce((sum, v) => sum + parseFloat(v.balance_amount || 0), 0)
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error getting student installments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student installments'
    });
  }
};

// Get vouchers
const getVouchers = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { 
      page = 1, 
      limit = 20, 
      student_id, 
      class_id, 
      ay_id, 
      status,
      search 
    } = req.query;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (student_id) {
        params.push(student_id);
        whereClause += ` AND v.student_id = $${params.length}`;
      }
      
      if (class_id) {
        params.push(class_id);
        whereClause += ` AND v.class_id = $${params.length}`;
      }
      
      if (ay_id) {
        params.push(ay_id);
        whereClause += ` AND v.ay_id = $${params.length}`;
      }
      
      if (status) {
        params.push(status);
        whereClause += ` AND v.status = $${params.length}`;
      }
      
      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (s.first_name ILIKE $${params.length} OR s.last_name ILIKE $${params.length} OR v.voucher_number ILIKE $${params.length})`;
      }
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) 
        FROM fee_vouchers v
        LEFT JOIN students s ON v.student_id = s.id
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, params);
      const totalRecords = parseInt(countResult.rows[0].count);
      
      // Get vouchers with student and class details
      const offset = (page - 1) * limit;
      params.push(limit, offset);
      
      const query = `
        SELECT 
          v.*,
          s.first_name || ' ' || s.last_name as student_name,
          s.student_id as student_roll_number,
          c.class_name,
          c.grade_level,
          ay.id as ay_id,
          ay.label as academic_year_label,
          COALESCE(v.generated_by, 'Admin') as generated_by_name
        FROM fee_vouchers v
        LEFT JOIN students s ON v.student_id = s.id
        LEFT JOIN classes c ON v.class_id = c.id
        LEFT JOIN academic_years ay ON v.ay_id = ay.id
        ${whereClause}
        ORDER BY v.id DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;
      
      const result = await client.query(query, params);
      
      // Return empty result if no vouchers found (this is normal, not an error)
      res.json({
        success: true,
        data: result.rows || [],
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalRecords / limit),
          total_records: totalRecords,
          limit: parseInt(limit)
        }
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error getting vouchers:', error);
    
    // Check if it's a table doesn't exist error - return empty result instead of error
    if (error.message && error.message.includes('relation "fee_vouchers" does not exist')) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          current_page: parseInt(req.query.page || 1),
          total_pages: 1,
          total_records: 0,
          limit: parseInt(req.query.limit || 20)
        }
      });
    }
    
    // Check if it's a column doesn't exist error - return empty result instead of error
    if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          current_page: parseInt(req.query.page || 1),
          total_pages: 1,
          total_records: 0,
          limit: parseInt(req.query.limit || 20)
        }
      });
    }
    
    // Only return error for actual failures (network, database connection, etc.)
    res.status(500).json({
      success: false,
      error: 'Failed to get vouchers'
    });
  }
};

// =======================
// PAYMENT MANAGEMENT
// =======================

// Record payment
const recordPayment = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const {
      voucher_id,
      amount_paid,
      payment_method,
      transaction_id,
      gateway_reference,
      notes
    } = req.body;
    
    if (!voucher_id || !amount_paid || !payment_method) {
      return res.status(400).json({
        success: false,
        error: 'Voucher ID, amount paid, and payment method are required'
      });
    }
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get voucher details
      const voucherResult = await client.query(
        'SELECT * FROM fee_vouchers WHERE id = $1',
        [voucher_id]
      );
      
      if (voucherResult.rows.length === 0) {
        throw new Error('Voucher not found');
      }
      
      const voucher = voucherResult.rows[0];
      
      // Validate payment amount
      if (parseFloat(amount_paid) > voucher.balance_amount) {
        throw new Error('Payment amount cannot exceed balance amount');
      }
      
      // Generate receipt number
      const receiptNumber = await generateReceiptNumber(client, 'RCP');
      
      // Record payment
      const paymentResult = await client.query(`
        INSERT INTO fee_payments (
          voucher_id, student_id, payment_date, amount_paid, payment_method,
          transaction_id, gateway_reference, receipt_number, notes, processed_by
        ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        voucher_id, voucher.student_id, amount_paid, payment_method,
        transaction_id, gateway_reference, receiptNumber, notes, req.user.id
      ]);
      
      // Update voucher amounts
      const newAmountPaid = parseFloat(voucher.amount_paid) + parseFloat(amount_paid);
      const newBalanceAmount = voucher.final_amount - newAmountPaid;
      const newStatus = newBalanceAmount <= 0 ? 'paid' : 'pending';
      
      await client.query(`
        UPDATE fee_vouchers SET 
          amount_paid = $1, 
          balance_amount = $2, 
          status = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [newAmountPaid, newBalanceAmount, newStatus, voucher_id]);
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        data: paymentResult.rows[0],
        message: 'Payment recorded successfully',
        receipt_url: `/api/fees/receipt/${paymentResult.rows[0].id}`
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record payment'
    });
  }
};

// Get payments
const getPayments = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { 
      page = 1, 
      limit = 20, 
      student_id, 
      voucher_id, 
      payment_method,
      start_date,
      end_date
    } = req.query;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (student_id) {
        params.push(student_id);
        whereClause += ` AND p.student_id = $${params.length}`;
      }
      
      if (voucher_id) {
        params.push(voucher_id);
        whereClause += ` AND p.voucher_id = $${params.length}`;
      }
      
      if (payment_method) {
        params.push(payment_method);
        whereClause += ` AND p.payment_method = $${params.length}`;
      }
      
      if (start_date) {
        params.push(start_date);
        whereClause += ` AND p.payment_date >= $${params.length}`;
      }
      
      if (end_date) {
        params.push(end_date);
        whereClause += ` AND p.payment_date <= $${params.length}`;
      }
      
      // Get total count and sum
      const countQuery = `
        SELECT COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total_amount
        FROM fee_payments p
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, params);
      const { count: totalRecords, total_amount: totalAmount } = countResult.rows[0];
      
      // Get payments with related details
      const offset = (page - 1) * limit;
      params.push(limit, offset);
      
      const query = `
        SELECT 
          p.*,
          s.first_name || ' ' || s.last_name as student_name,
          v.voucher_number,
          v.installment_number,
          v.month,
          c.class_name,
          ay.label as academic_year_label,
          u.name as processed_by_name
        FROM fee_payments p
        LEFT JOIN students s ON p.student_id = s.id
        LEFT JOIN fee_vouchers v ON p.voucher_id = v.id
        LEFT JOIN classes c ON v.class_id = c.id
        LEFT JOIN academic_years ay ON v.ay_id = ay.id
        LEFT JOIN users u ON p.processed_by = u.id
        ${whereClause}
        ORDER BY p.payment_date DESC, p.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;
      
      const result = await client.query(query, params);
      
      res.json({
        success: true,
        data: result.rows,
        summary: {
          total_amount: parseFloat(totalAmount)
        },
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalRecords / limit),
          total_records: parseInt(totalRecords),
          limit: parseInt(limit)
        }
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error getting payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payments'
    });
  }
};

// =======================
// DISCOUNT MANAGEMENT
// =======================

// Get discounts
const getDiscounts = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { page = 1, limit = 20, is_active } = req.query;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (is_active !== undefined) {
        params.push(is_active === 'true');
        whereClause += ` AND is_active = $${params.length}`;
      }
      
      // Get total count
      const countQuery = `SELECT COUNT(*) FROM discounts ${whereClause}`;
      const countResult = await client.query(countQuery, params);
      const totalRecords = parseInt(countResult.rows[0].count);
      
      // Get discounts
      const offset = (page - 1) * limit;
      params.push(limit, offset);
      
      const query = `
        SELECT * FROM discounts 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;
      
      const result = await client.query(query, params);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalRecords / limit),
          total_records: totalRecords,
          limit: parseInt(limit)
        }
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error getting discounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get discounts'
    });
  }
};

// Create discount
const createDiscount = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const {
      name,
      type,
      value,
      applicable_to,
      class_ids = [],
      student_ids = [],
      max_amount,
      valid_from,
      valid_to,
      status = 'active',
      description
    } = req.body;
    
    if (!name || !type || !value || !applicable_to || !valid_from || !valid_to) {
      return res.status(400).json({
        success: false,
        error: 'Name, type, value, applicable_to, valid_from, and valid_to are required'
      });
    }
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      const query = `
        INSERT INTO discounts (
          name, type, value, applicable_to, class_ids, student_ids,
          max_amount, valid_from, valid_to, status, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        name, type, value, applicable_to, class_ids, student_ids,
        max_amount, valid_from, valid_to, status, description
      ];
      
      const result = await client.query(query, values);
      
      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Discount created successfully'
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error creating discount:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create discount'
    });
  }
};

// Update discount
const updateDiscount = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { id } = req.params;
    const {
      name,
      type,
      value,
      applicable_to,
      class_ids = [],
      student_ids = [],
      max_amount,
      valid_from,
      valid_to,
      is_active,
      status,
      description
    } = req.body;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      const query = `
        UPDATE discounts SET
          name = $1, type = $2, value = $3, applicable_to = $4,
          class_ids = $5, student_ids = $6, max_amount = $7,
          valid_from = $8, valid_to = $9, is_active = $10,
          status = $11, description = $12, updated_at = CURRENT_TIMESTAMP
        WHERE id = $13
        RETURNING *
      `;
      
      const values = [
        name, type, value, applicable_to, class_ids, student_ids,
        max_amount, valid_from, valid_to, is_active, status, description, id
      ];
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Discount not found'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0],
        message: 'Discount updated successfully'
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error updating discount:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update discount'
    });
  }
};

const deleteDiscount = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { id } = req.params;

    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();

    try {
      const result = await client.query(
        'DELETE FROM discounts WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Discount not found'
        });
      }

      res.json({
        success: true,
        message: 'Discount deleted successfully'
      });

    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error deleting discount:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete discount'
    });
  }
};

// =======================
// SCHOLARSHIP MANAGEMENT
// =======================

// Get scholarships
const getScholarships = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { page = 1, limit = 20, is_active } = req.query;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (is_active !== undefined) {
        params.push(is_active === 'true');
        whereClause += ` AND is_active = $${params.length}`;
      }
      
      // Get total count
      const countQuery = `SELECT COUNT(*) FROM scholarships ${whereClause}`;
      const countResult = await client.query(countQuery, params);
      const totalRecords = parseInt(countResult.rows[0].count);
      
      // Get scholarships
      const offset = (page - 1) * limit;
      params.push(limit, offset);
      
      const query = `
        SELECT * FROM scholarships 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;
      
      const result = await client.query(query, params);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalRecords / limit),
          total_records: totalRecords,
          limit: parseInt(limit)
        }
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error getting scholarships:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scholarships'
    });
  }
};

// Create scholarship
const createScholarship = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const {
      name,
      type,
      value,
      criteria,
      max_students,
      valid_from,
      valid_to,
      description
    } = req.body;
    
    if (!name || !type || !value || !criteria || !valid_from || !valid_to) {
      return res.status(400).json({
        success: false,
        error: 'Name, type, value, criteria, valid_from, and valid_to are required'
      });
    }
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      const query = `
        INSERT INTO scholarships (
          name, type, value, criteria, max_students, valid_from, valid_to, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [name, type, value, criteria, max_students, valid_from, valid_to, description];
      
      const result = await client.query(query, values);
      
      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Scholarship created successfully'
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error creating scholarship:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create scholarship'
    });
  }
};

// Assign scholarship to student
const assignScholarship = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const {
      student_id,
      scholarship_id,
      amount,
      valid_from,
      valid_to,
      notes
    } = req.body;
    
    if (!student_id || !scholarship_id || !amount || !valid_from || !valid_to) {
      return res.status(400).json({
        success: false,
        error: 'Student ID, scholarship ID, amount, valid_from, and valid_to are required'
      });
    }
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check scholarship availability
      const scholarshipResult = await client.query(
        'SELECT * FROM scholarships WHERE id = $1 AND is_active = TRUE',
        [scholarship_id]
      );
      
      if (scholarshipResult.rows.length === 0) {
        throw new Error('Scholarship not found or inactive');
      }
      
      const scholarship = scholarshipResult.rows[0];
      
      if (scholarship.max_students && scholarship.current_recipients >= scholarship.max_students) {
        throw new Error('Scholarship has reached maximum recipients');
      }
      
      // Assign scholarship
      const assignmentResult = await client.query(`
        INSERT INTO student_scholarships (
          student_id, scholarship_id, awarded_date, amount, valid_from, valid_to, notes
        ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6)
        RETURNING *
      `, [student_id, scholarship_id, amount, valid_from, valid_to, notes]);
      
      // Update scholarship recipient count
      await client.query(
        'UPDATE scholarships SET current_recipients = current_recipients + 1 WHERE id = $1',
        [scholarship_id]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        data: assignmentResult.rows[0],
        message: 'Scholarship assigned successfully'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error assigning scholarship:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to assign scholarship'
    });
  }
};

const updateScholarship = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { id } = req.params;
    const {
      scholarship_name,
      scholarship_type,
      scholarship_value,
      criteria,
      max_students,
      valid_from,
      valid_to,
      status,
      description
    } = req.body;

    if (!scholarship_name || !scholarship_type || !scholarship_value || !criteria) {
      return res.status(400).json({
        success: false,
        error: 'Scholarship name, type, value, and criteria are required'
      });
    }

    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();

    try {
      const result = await client.query(`
        UPDATE scholarships SET 
          scholarship_name = $1,
          scholarship_type = $2,
          scholarship_value = $3,
          criteria = $4,
          max_students = $5,
          valid_from = $6,
          valid_to = $7,
          status = $8,
          description = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING *
      `, [
        scholarship_name,
        scholarship_type,
        scholarship_value,
        criteria,
        max_students,
        valid_from,
        valid_to,
        status,
        description,
        id
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Scholarship not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Scholarship updated successfully'
      });

    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error updating scholarship:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update scholarship'
    });
  }
};

const deleteScholarship = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { id } = req.params;

    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();

    try {
      const result = await client.query(
        'DELETE FROM scholarships WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Scholarship not found'
        });
      }

      res.json({
        success: true,
        message: 'Scholarship deleted successfully'
      });

    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error deleting scholarship:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete scholarship'
    });
  }
};

// Get student scholarships
const getStudentScholarships = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { page = 1, limit = 10 } = req.query;

    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();

    try {
      // Get total count
      const countResult = await client.query(
        'SELECT COUNT(*) FROM student_scholarships'
      );
      const totalRecords = parseInt(countResult.rows[0].count);

      // Get paginated results
      const offset = (page - 1) * limit;
      const result = await client.query(`
        SELECT * FROM student_scholarships 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      const totalPages = Math.ceil(totalRecords / limit);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_records: totalRecords,
          limit: parseInt(limit)
        }
      });

    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error fetching student scholarships:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch student scholarships'
    });
  }
};

// =======================
// REMINDER MANAGEMENT
// =======================

// Send overdue fee reminders
const sendOverdueReminders = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    
    const result = await feeReminderService.sendOverdueReminders(tenantId);
    
    res.json({
      success: true,
      data: result,
      message: `${result.reminders_sent} overdue reminders sent successfully`
    });
    
  } catch (error) {
    console.error('Error sending overdue reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send overdue reminders'
    });
  }
};

// Send upcoming due reminders
const sendUpcomingReminders = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { days_ahead = 3 } = req.query;
    
    const result = await feeReminderService.sendUpcomingDueReminders(tenantId, parseInt(days_ahead));
    
    res.json({
      success: true,
      data: result,
      message: `${result.reminders_sent} upcoming due reminders sent successfully`
    });
    
  } catch (error) {
    console.error('Error sending upcoming reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send upcoming reminders'
    });
  }
};

// Get reminder history
const getReminderHistory = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { 
      page = 1, 
      limit = 20, 
      student_id, 
      voucher_id,
      reminder_type,
      status 
    } = req.query;
    
    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (student_id) {
        params.push(student_id);
        whereClause += ` AND r.student_id = $${params.length}`;
      }
      
      if (voucher_id) {
        params.push(voucher_id);
        whereClause += ` AND r.voucher_id = $${params.length}`;
      }
      
      if (reminder_type) {
        params.push(reminder_type);
        whereClause += ` AND r.reminder_type = $${params.length}`;
      }
      
      if (status) {
        params.push(status);
        whereClause += ` AND r.status = $${params.length}`;
      }
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) FROM fee_reminders r ${whereClause}
      `;
      const countResult = await client.query(countQuery, params);
      const totalRecords = parseInt(countResult.rows[0].count);
      
      // Get reminders with related details
      const offset = (page - 1) * limit;
      params.push(limit, offset);
      
      const query = `
        SELECT 
          r.*,
          s.first_name || ' ' || s.last_name as student_name,
          v.voucher_number,
          v.balance_amount,
          c.class_name
        FROM fee_reminders r
        LEFT JOIN students s ON r.student_id = s.id
        LEFT JOIN fee_vouchers v ON r.voucher_id = v.id
        LEFT JOIN classes c ON v.class_id = c.id
        ${whereClause}
        ORDER BY r.sent_date DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;
      
      const result = await client.query(query, params);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalRecords / limit),
          total_records: totalRecords,
          limit: parseInt(limit)
        }
      });
      
    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error getting reminder history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reminder history'
    });
  }
};

const getFeeStats = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { period = 'current_month', class_id = 'all' } = req.query;

    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();

    try {
      let dateFilter = '';
      if (period === 'current_month') {
        dateFilter = "AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)";
      } else if (period === 'last_month') {
        dateFilter = "AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')";
      } else if (period === 'current_quarter') {
        dateFilter = "AND DATE_TRUNC('quarter', payment_date) = DATE_TRUNC('quarter', CURRENT_DATE)";
      } else if (period === 'current_year') {
        dateFilter = "AND DATE_TRUNC('year', payment_date) = DATE_TRUNC('year', CURRENT_DATE)";
      }

      let classFilter = '';
      if (class_id !== 'all') {
        classFilter = `AND v.class_id = ${class_id}`;
      }

      // Get total collections
      const collectionsResult = await client.query(`
        SELECT COALESCE(SUM(fp.amount_paid), 0) as total_collections
        FROM fee_payments fp
        JOIN fee_vouchers v ON fp.voucher_id = v.id
        WHERE fp.status = 'completed' ${dateFilter} ${classFilter}
      `);

      // Get pending amount
      const pendingResult = await client.query(`
        SELECT COALESCE(SUM(v.balance_amount), 0) as pending_amount
        FROM fee_vouchers v
        WHERE v.status = 'pending' ${classFilter}
      `);

      // Get overdue amount
      const overdueResult = await client.query(`
        SELECT COALESCE(SUM(v.balance_amount), 0) as overdue_amount
        FROM fee_vouchers v
        WHERE v.status = 'pending' AND v.due_date < CURRENT_DATE ${classFilter}
      `);

      // Get total students
      const studentsResult = await client.query(`
        SELECT COUNT(DISTINCT v.student_id) as total_students
        FROM fee_vouchers v
        WHERE 1=1 ${classFilter}
      `);

      const totalCollections = parseFloat(collectionsResult.rows[0].total_collections);
      const pendingAmount = parseFloat(pendingResult.rows[0].pending_amount);
      const overdueAmount = parseFloat(overdueResult.rows[0].overdue_amount);
      const totalStudents = parseInt(studentsResult.rows[0].total_students);

      const totalAmount = totalCollections + pendingAmount;
      const collectionRate = totalAmount > 0 ? (totalCollections / totalAmount) * 100 : 0;

      res.json({
        success: true,
        data: {
          total_collections: totalCollections,
          pending_amount: pendingAmount,
          overdue_amount: overdueAmount,
          total_students: totalStudents,
          collection_rate: collectionRate
        }
      });

    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error fetching fee stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch fee stats'
    });
  }
};

const getMonthlyFeeData = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const { period = 'current_month', class_id = 'all' } = req.query;

    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();

    try {
      let dateFilter = '';
      if (period === 'current_month') {
        dateFilter = "AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)";
      } else if (period === 'last_month') {
        dateFilter = "AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')";
      } else if (period === 'current_quarter') {
        dateFilter = "AND DATE_TRUNC('month', payment_date) >= DATE_TRUNC('quarter', CURRENT_DATE)";
      } else if (period === 'current_year') {
        dateFilter = "AND DATE_TRUNC('month', payment_date) >= DATE_TRUNC('year', CURRENT_DATE)";
      }

      let classFilter = '';
      if (class_id !== 'all') {
        classFilter = `AND v.class_id = ${class_id}`;
      }

      // Get monthly collections
      const result = await client.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', payment_date), 'Mon YYYY') as month,
          COALESCE(SUM(fp.amount_paid), 0) as collections,
          COALESCE(SUM(v.balance_amount), 0) as pending
        FROM fee_payments fp
        JOIN fee_vouchers v ON fp.voucher_id = v.id
        WHERE fp.status = 'completed' ${dateFilter} ${classFilter}
        GROUP BY DATE_TRUNC('month', payment_date)
        ORDER BY DATE_TRUNC('month', payment_date)
      `);

      res.json({
        success: true,
        data: result.rows.map(row => ({
          month: row.month,
          collections: parseFloat(row.collections),
          pending: parseFloat(row.pending)
        }))
      });

    } finally {
      client.release();
      tenantPool.end();
    }
  } catch (error) {
    console.error('Error fetching monthly fee data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch monthly fee data'
    });
  }
};

// Get school logo for voucher
const getSchoolLogo = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    
    // Get logo from main database tenant_branding table
    const client = await mainPool.connect();
    
    try {
      const result = await client.query(
        'SELECT logo_data, logo_filename, logo_mimetype FROM tenant_branding WHERE tenant_id = $1',
        [tenantId]
      );
      
      if (result.rows.length === 0 || !result.rows[0].logo_data) {
        return res.status(404).json({
          success: false,
          message: 'No logo found for this school'
        });
      }
      
      const logo = result.rows[0];
      
      // Convert bytea to base64 for frontend
      const logoBase64 = Buffer.from(logo.logo_data).toString('base64');
      const dataUrl = `data:${logo.logo_mimetype};base64,${logoBase64}`;
      
      res.json({
        success: true,
        data: {
          logoData: dataUrl,
          filename: logo.logo_filename,
          mimetype: logo.logo_mimetype
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error getting school logo:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching school logo',
      error: error.message
    });
  }
};

// Create fee voucher
const createVoucher = async (req, res) => {
  try {
    const { tenant_id: tenantId } = req.tenant;
    const {
      student_id,
      fee_structure_id,
      ay_id,
      due_date,
      installment_count,
      custom_installment_dates,
      total_amount,
      notes,
      status
    } = req.body;

    // Validate required fields
    if (!student_id || !fee_structure_id || !ay_id || !due_date) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, fee structure ID, academic year ID, and due date are required'
      });
    }

    const tenantDbName = await getTenantDatabaseName(tenantId);
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const client = await tenantPool.connect();
    
    try {
      // Get student's class_id
      const studentResult = await client.query(
        'SELECT class_id FROM students WHERE id = $1',
        [student_id]
      );
      
      if (studentResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Student not found'
        });
      }
      
      const class_id = studentResult.rows[0].class_id;

      // Get fee structure to calculate installment amount
      const feeStructureResult = await client.query(
        'SELECT total_annual_fee FROM fee_structures WHERE id = $1',
        [fee_structure_id]
      );
      
      if (feeStructureResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Fee structure not found'
        });
      }
      
      const feeStructure = feeStructureResult.rows[0];
      const installmentCount = installment_count || 1;
      const installmentAmount = Math.ceil(feeStructure.total_annual_fee / installmentCount);
      
      // Calculate due dates for each installment
      const dueDates = [];
      
      if (custom_installment_dates && custom_installment_dates.length === installmentCount) {
        // Validate custom dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (const customDate of custom_installment_dates) {
          if (!customDate) {
            throw new Error('All custom installment dates must be provided');
          }
          
          const date = new Date(customDate);
          if (isNaN(date.getTime())) {
            throw new Error(`Invalid date format: ${customDate}`);
          }
          
          // Ensure dates are not in the past
          if (date < today) {
            throw new Error(`Installment date ${customDate} cannot be in the past`);
          }
        }
        
        // Use custom dates provided by user
        dueDates.push(...custom_installment_dates);
      } else {
        // Fall back to monthly intervals from base due date
        const baseDate = new Date(due_date);
        for (let i = 0; i < installmentCount; i++) {
          const installmentDate = new Date(baseDate);
          installmentDate.setMonth(baseDate.getMonth() + i);
          dueDates.push(installmentDate.toISOString().split('T')[0]);
        }
      }
      
      const createdVouchers = [];
      
      // Create vouchers for each installment
      for (let installmentNum = 1; installmentNum <= installmentCount; installmentNum++) {
        // Generate unique voucher number for each installment
        const voucherNumberResult = await client.query(
          'SELECT COALESCE(MAX(CAST(voucher_number AS INTEGER)), 0) + 1 as next_number FROM fee_vouchers'
        );
        const voucherNumber = voucherNumberResult.rows[0].next_number.toString();

        // Get month name from due date
        const monthDate = new Date(dueDates[installmentNum - 1]);
        const monthName = monthDate.toLocaleString('en-US', { month: 'long' });

        // Create individual voucher for this installment
        const insertQuery = `
          INSERT INTO fee_vouchers (
            voucher_number, student_id, class_id, ay_id, fee_structure_id,
            due_date, installment_number, amount_due, final_amount, balance_amount, status, generated_date, generated_by, month
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_DATE, $12, $13)
          RETURNING *
        `;

        // Get admin name for generated_by
        let adminName = 'Admin';
        if (req.user?.id) {
          const adminResult = await client.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
          adminName = adminResult.rows[0]?.name || 'Admin';
        }
        
        const insertValues = [
          voucherNumber, student_id, class_id, ay_id, fee_structure_id,
          dueDates[installmentNum - 1], installmentNum, installmentAmount, installmentAmount, installmentAmount, status || 'pending', adminName, monthName
        ];

        const result = await client.query(insertQuery, insertValues);
        createdVouchers.push(result.rows[0]);
      }

      res.status(201).json({
        success: true,
        message: `${installmentCount} individual vouchers created successfully - one for each installment`,
        data: createdVouchers,
        installment_count: installmentCount,
        installment_amount: installmentAmount,
        total_amount: feeStructure.total_annual_fee,
        voucher_details: createdVouchers.map(v => ({
          voucher_number: v.voucher_number,
          installment_number: v.installment_number,
          due_date: v.due_date,
          amount: v.amount_due
        }))
      });

    } finally {
      client.release();
      tenantPool.end();
    }

  } catch (error) {
    console.error('Error creating voucher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create voucher'
    });
  }
};

module.exports = {
  // Fee Structures
  getFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  
  // Vouchers
  generateVouchers,
  getVouchers,
  getStudentInstallments,
  createVoucher,
  
  // Payments
  recordPayment,
  getPayments,
  
  // Discounts
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  
  // Scholarships
  getScholarships,
  createScholarship,
  updateScholarship,
  assignScholarship,
  deleteScholarship,
  getStudentScholarships,
  
  // Reminders
  sendOverdueReminders,
  sendUpcomingReminders,
  getReminderHistory,
  
  // Reports
  getFeeStats,
  getMonthlyFeeData,
  
  // Logo
  getSchoolLogo
};
