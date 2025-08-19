const express = require('express');
const router = express.Router();
const { authenticateTenant } = require('../middleware/tenantAuth');
const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  uploadDocuments,
  bulkImportStudents,
  transferStudent,
  generateStudentIdCard,
  upload,
  csvUpload
} = require('../controllers/studentController');

// Apply authentication middleware to all routes
router.use(authenticateTenant);

// Student CRUD operations
router.get('/', (req, res) => {
  req.tenantId = req.tenant.tenant_id;
  getStudents(req, res);
});

router.get('/:studentId', (req, res) => {
  req.tenantId = req.tenant.tenant_id;
  getStudent(req, res);
});

router.post('/', (req, res) => {
  req.tenantId = req.tenant.tenant_id;
  createStudent(req, res);
});

router.put('/:studentId', (req, res) => {
  req.tenantId = req.tenant.tenant_id;
  updateStudent(req, res);
});

router.delete('/:studentId', (req, res) => {
  req.tenantId = req.tenant.tenant_id;
  deleteStudent(req, res);
});

// Document management
router.post('/:studentId/documents', upload.array('documents', 5), (req, res) => {
  req.tenantId = req.tenant.tenant_id;
  uploadDocuments(req, res);
});

// Bulk operations
router.post('/bulk-import', csvUpload.single('csv_file'), (req, res) => {
  req.tenantId = req.tenant.tenant_id;
  bulkImportStudents(req, res);
});

// Student transfers
router.post('/:studentId/transfer', (req, res) => {
  req.tenantId = req.tenant.tenant_id;
  transferStudent(req, res);
});

// ID card generation
router.get('/:studentId/id-card', (req, res) => {
  req.tenantId = req.tenant.tenant_id;
  generateStudentIdCard(req, res);
});

module.exports = router;
