const express = require('express');
const router = express.Router();
const { 
  addCustomDomain,
  verifyDomain,
  getVerificationInstructions,
  listDomains,
  deleteDomain
} = require('../controllers/domainController');

// Add custom domain
router.post('/add', addCustomDomain);

// Verify domain
router.post('/verify/:domain', verifyDomain);

// Get verification instructions
router.get('/instructions/:domain', getVerificationInstructions);

// List domains for tenant
router.get('/tenant/:tenantId', listDomains);

// Delete domain
router.delete('/:domain', deleteDomain);

module.exports = router; 