const express = require('express');
const router = express.Router();
const { 
  updateTenantBranding,
  getTenantBranding,
  getDynamicCSS,
  getTenantLogoData,
  uploadTenantLogo,
  deleteTenantLogo,
  getAvailableFonts,
  getColorPresets,
  upload
} = require('../controllers/brandingController');

// Update tenant branding
router.put('/:tenantId', updateTenantBranding);

// Get tenant branding
router.get('/:tenantId', getTenantBranding);

// Get dynamic CSS for tenant
router.get('/:tenantId/css', getDynamicCSS);

// Get logo data
router.get('/:tenantId/logo', getTenantLogoData);

// Upload logo
router.post('/:tenantId/logo', upload.single('logo'), uploadTenantLogo);

// Delete logo
router.delete('/:tenantId/logo', deleteTenantLogo);

// Get available fonts
router.get('/fonts/available', getAvailableFonts);

// Get color presets
router.get('/colors/presets', getColorPresets);

module.exports = router; 