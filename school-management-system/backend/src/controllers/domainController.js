const { 
  addCustomDomainForTenant,
  verifyCustomDomain,
  getDomainVerificationInstructions,
  listCustomDomainsForTenant,
  deleteCustomDomain
} = require('../services/domainVerificationService');

// Add custom domain
const addCustomDomain = async (req, res) => {
  try {
    const { tenantId, domain, verificationType = 'txt' } = req.body;
    
    if (!tenantId || !domain) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID and domain are required'
      });
    }
    
    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid domain format'
      });
    }
    
    const result = await addCustomDomainForTenant(tenantId, domain, verificationType);
    
    res.status(201).json({
      success: true,
      message: 'Custom domain added successfully',
      data: result
    });
  } catch (error) {
    console.error('Error adding custom domain:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add custom domain'
    });
  }
};

// Verify custom domain
const verifyDomain = async (req, res) => {
  try {
    const { domain } = req.params;
    
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Domain is required'
      });
    }
    
    const result = await verifyCustomDomain(domain);
    
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error verifying domain:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify domain'
    });
  }
};

// Get domain verification instructions
const getVerificationInstructions = async (req, res) => {
  try {
    const { domain } = req.params;
    
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Domain is required'
      });
    }
    
    const result = await getDomainVerificationInstructions(domain);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting verification instructions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get verification instructions'
    });
  }
};

// List custom domains for tenant
const listDomains = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    const domains = await listCustomDomainsForTenant(tenantId);
    
    res.json({
      success: true,
      data: {
        domains,
        count: domains.length
      }
    });
  } catch (error) {
    console.error('Error listing domains:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to list domains'
    });
  }
};

// Delete custom domain
const deleteDomain = async (req, res) => {
  try {
    const { domain } = req.params;
    const { tenantId } = req.body;
    
    if (!domain || !tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Domain and tenant ID are required'
      });
    }
    
    const result = await deleteCustomDomain(domain, tenantId);
    
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error deleting domain:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete domain'
    });
  }
};

module.exports = {
  addCustomDomain,
  verifyDomain,
  getVerificationInstructions,
  listDomains,
  deleteDomain
}; 