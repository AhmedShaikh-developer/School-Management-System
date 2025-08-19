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
  upload
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
router.post('/:studentId/documents', upload.array('documents', 5), uploadDocuments);

// Bulk operations
router.post('/bulk-import', upload.single('csv_file'), bulkImportStudents);

// Student transfers
router.post('/:studentId/transfer', transferStudent);

// ID card generation
router.get('/:studentId/id-card', generateStudentIdCard);

module.exports = router;
