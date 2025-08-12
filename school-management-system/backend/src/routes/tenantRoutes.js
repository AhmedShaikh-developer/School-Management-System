const express = require('express');
const router = express.Router();
const { 
  createTenant, 
  checkDomainAvailability, 
  getTenant, 
  getAllTenants, 
  updateTenant, 
  healthCheck,
  getTenantSetupStatus
} = require('../controllers/tenantController');
const { 
  validateTenantOnboarding, 
  validateDomainCheck, 
  handleValidationErrors 
} = require('../middleware/validation');

// Health check
router.get('/health', healthCheck);

// Check domain availability
router.get('/domain/:domain/check', validateDomainCheck, handleValidationErrors, checkDomainAvailability);

// Create new tenant (onboarding)
router.post('/onboard', validateTenantOnboarding, handleValidationErrors, createTenant);

// Get all tenants (admin only)
router.get('/', getAllTenants);

// Get specific tenant
router.get('/:tenantId', getTenant);

// Get tenant setup status
router.get('/:tenantId/setup-status', getTenantSetupStatus);

// Update tenant status (admin only)
router.patch('/:tenantId/status', updateTenant);

module.exports = router; 