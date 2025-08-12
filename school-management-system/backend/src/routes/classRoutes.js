const express = require('express');
const router = express.Router();
const { authenticateTenant } = require('../middleware/tenantAuth');
const {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  getClassesForDropdown
} = require('../controllers/classController');

// Apply tenant authentication middleware to all routes
router.use(authenticateTenant);

// Get all classes for the authenticated tenant
router.get('/', (req, res) => {
  // Extract tenantId from the authenticated user's context
  const tenantId = req.tenant.tenant_id;
  console.log('🔍 GET /classes - Tenant ID:', tenantId);
  console.log('🔍 req.tenant:', req.tenant);
  req.params.tenantId = tenantId;
  getClasses(req, res);
});

// Get a specific class by ID
router.get('/:classId', (req, res) => {
  const tenantId = req.tenant.tenant_id;
  req.params.tenantId = tenantId;
  getClass(req, res);
});

// Create a new class
router.post('/', (req, res) => {
  const tenantId = req.tenant.tenant_id;
  req.params.tenantId = tenantId;
  createClass(req, res);
});

// Update an existing class
router.put('/:classId', (req, res) => {
  const tenantId = req.tenant.tenant_id;
  req.params.tenantId = tenantId;
  updateClass(req, res);
});

// Delete a class (soft delete)
router.delete('/:classId', (req, res) => {
  const tenantId = req.tenant.tenant_id;
  console.log('🗑️ DELETE /classes/:classId - Tenant ID:', tenantId);
  console.log('🗑️ Class ID:', req.params.classId);
  console.log('🗑️ req.tenant:', req.tenant);
  req.params.tenantId = tenantId;
  deleteClass(req, res);
});

// Get classes for dropdown (used in forms)
router.get('/dropdown/list', (req, res) => {
  const tenantId = req.tenant.tenant_id;
  req.params.tenantId = tenantId;
  getClassesForDropdown(req, res);
});

module.exports = router;
