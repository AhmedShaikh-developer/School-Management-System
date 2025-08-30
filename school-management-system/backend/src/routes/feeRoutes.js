const express = require('express');
const router = express.Router();
const { authenticateTenant } = require('../middleware/tenantAuth');
const {
  // Fee Structures
  getFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  
  // Vouchers
  generateVouchers,
  getVouchers,
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
  deleteScholarship,
  assignScholarship,
  getStudentScholarships,
  
  // Reminders
  sendOverdueReminders,
  sendUpcomingReminders,
  getReminderHistory,

  // Reports
  getFeeStats,
  getMonthlyFeeData
} = require('../controllers/feeController');

const { addFeeManagementToTenant } = require('../config/database');

// Apply tenant authentication to all routes
router.use(authenticateTenant);

// =======================
// SETUP ROUTES
// =======================

// POST /api/fees/setup - Initialize fee management tables for existing tenant
router.post('/setup', async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const result = await addFeeManagementToTenant(tenantId);
    res.json({
      success: true,
      message: 'Fee management tables initialized successfully',
      data: result
    });
  } catch (error) {
    console.error('Fee setup error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initialize fee management'
    });
  }
});

// =======================
// FEE STRUCTURE ROUTES
// =======================

// GET /api/fees/structures - Get all fee structures
router.get('/structures', getFeeStructures);

// POST /api/fees/structures - Create fee structure
router.post('/structures', createFeeStructure);

// PUT /api/fees/structures/:id - Update fee structure
router.put('/structures/:id', updateFeeStructure);

// DELETE /api/fees/structures/:id - Delete fee structure
router.delete('/structures/:id', deleteFeeStructure);

// =======================
// VOUCHER ROUTES
// =======================

// GET /api/fees/vouchers - Get vouchers
router.get('/vouchers', getVouchers);

// POST /api/fees/vouchers - Create individual voucher
router.post('/vouchers', createVoucher);

// POST /api/fees/vouchers/generate - Generate vouchers
router.post('/vouchers/generate', generateVouchers);

// =======================
// PAYMENT ROUTES
// =======================

// GET /api/fees/payments - Get payments
router.get('/payments', getPayments);

// POST /api/fees/payments - Record payment
router.post('/payments', recordPayment);

// =======================
// DISCOUNT ROUTES
// =======================

// GET /api/fees/discounts - Get discounts
router.get('/discounts', getDiscounts);

// POST /api/fees/discounts - Create discount
router.post('/discounts', createDiscount);

// PUT /api/fees/discounts/:id - Update discount
router.put('/discounts/:id', updateDiscount);

// DELETE /api/fees/discounts/:id - Delete discount
router.delete('/discounts/:id', deleteDiscount);

// =======================
// SCHOLARSHIP ROUTES
// =======================

// GET /api/fees/scholarships - Get scholarships
router.get('/scholarships', getScholarships);

// POST /api/fees/scholarships - Create scholarship
router.post('/scholarships', createScholarship);

// PUT /api/fees/scholarships/:id - Update scholarship
router.put('/scholarships/:id', updateScholarship);

// DELETE /api/fees/scholarships/:id - Delete scholarship
router.delete('/scholarships/:id', deleteScholarship);

// POST /api/fees/scholarships/assign - Assign scholarship to student
router.post('/scholarships/assign', assignScholarship);

// GET /api/fees/student-scholarships - Get student scholarships
router.get('/student-scholarships', getStudentScholarships);

// =======================
// REMINDER ROUTES
// =======================

// POST /api/fees/reminders/overdue - Send overdue reminders
router.post('/reminders/overdue', sendOverdueReminders);

// POST /api/fees/reminders/upcoming - Send upcoming due reminders
router.post('/reminders/upcoming', sendUpcomingReminders);

// GET /api/fees/reminders/history - Get reminder history
router.get('/reminders/history', getReminderHistory);

// =======================
// REPORT ROUTES
// =======================

// GET /api/fees/reports/stats - Get fee statistics
router.get('/reports/stats', getFeeStats);

// GET /api/fees/reports/monthly - Get monthly fee data
router.get('/reports/monthly', getMonthlyFeeData);

module.exports = router;
