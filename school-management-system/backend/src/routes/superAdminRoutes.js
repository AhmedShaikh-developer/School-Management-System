const express = require('express');
const router = express.Router();
const {
  getAllTenantsWithBiometricSettings,
  getTenantBiometricSettings,
  updateTenantBiometricSettings,
  enableBiometricAttendance,
  disableBiometricAttendance,
  getBiometricAttendanceStats,
  getTenantDeviceConfiguration,
  updateTenantDeviceConfiguration
} = require('../controllers/superAdminController');

// Get all tenants with biometric settings
router.get('/tenants/biometric', getAllTenantsWithBiometricSettings);

// Get biometric settings for a specific tenant
router.get('/tenants/:tenantId/biometric', getTenantBiometricSettings);

// Update biometric settings for a tenant
router.put('/tenants/:tenantId/biometric', updateTenantBiometricSettings);

// Enable biometric attendance for a tenant
router.post('/tenants/:tenantId/biometric/enable', enableBiometricAttendance);

// Disable biometric attendance for a tenant
router.post('/tenants/:tenantId/biometric/disable', disableBiometricAttendance);

// Get biometric attendance statistics
router.get('/biometric/stats', getBiometricAttendanceStats);

// Get device configuration for a tenant
router.get('/tenants/:tenantId/devices', getTenantDeviceConfiguration);

// Update device configuration for a tenant
router.put('/tenants/:tenantId/devices', updateTenantDeviceConfiguration);

module.exports = router;
