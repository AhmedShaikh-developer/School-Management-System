const { onboardTenant, getTenantInfo, listTenants, updateTenantStatus, checkDomainExists } = require('../services/tenantService');
const { validateDomainFormat, validateEmailFormat } = require('../middleware/validation');

// Onboard new tenant
const createTenant = async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Extract and validate required fields
    const {
      schoolName,
      domain,
      adminName,
      adminEmail,
      phone,
      schoolType,
      studentCount,
      address,
      website
    } = req.body;

    // Additional validation
    if (!validateDomainFormat(domain)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid domain format'
      });
    }

    if (!validateEmailFormat(adminEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check domain availability
    const domainExists = await checkDomainExists(domain);
    if (domainExists) {
      return res.status(409).json({
        success: false,
        message: `Domain ${domain} is already registered`
      });
    }

    // Prepare tenant data
    const tenantData = {
      schoolName: schoolName.trim(),
      domain: domain.toLowerCase().trim(),
      adminName: adminName.trim(),
      adminEmail: adminEmail.toLowerCase().trim(),
      phone: phone ? phone.trim() : null,
      schoolType: schoolType || 'other',
      studentCount: studentCount || null,
      address: address ? address.trim() : null,
      website: website ? website.trim() : null
    };

    console.log('Starting tenant onboarding process...');
    
    // Start onboarding process
    const result = await onboardTenant(tenantData);
    
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;

    if (result.success) {
      return res.status(201).json({
        success: true,
        message: 'School onboarded successfully',
        data: {
          tenantId: result.tenantId,
          schoolName: tenantData.schoolName,
          domain: tenantData.domain,
          adminEmail: tenantData.adminEmail,
          duration: result.duration,
          totalDuration
        },
        instructions: {
          message: 'Welcome email sent with login credentials',
          nextSteps: [
            'Check your email for login credentials',
            'Login to your school dashboard',
            'Change your password',
            'Start managing your school'
          ]
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to onboard school',
        error: result.error,
        duration: result.duration,
        totalDuration
      });
    }

  } catch (error) {
    console.error('Error in createTenant:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Check domain availability
const checkDomainAvailability = async (req, res) => {
  try {
    const { domain } = req.params;
    
    if (!validateDomainFormat(domain)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid domain format'
      });
    }

    const domainExists = await checkDomainExists(domain);
    
    return res.status(200).json({
      success: true,
      data: {
        domain,
        available: !domainExists,
        message: domainExists 
          ? 'Domain is already registered' 
          : 'Domain is available'
      }
    });

  } catch (error) {
    console.error('Error checking domain availability:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get tenant information
const getTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const tenantInfo = await getTenantInfo(tenantId);
    
    return res.status(200).json({
      success: true,
      data: tenantInfo
    });

  } catch (error) {
    console.error('Error getting tenant info:', error);
    
    if (error.message === 'Tenant not found') {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// List all tenants
const getAllTenants = async (req, res) => {
  try {
    const tenants = await listTenants();
    
    return res.status(200).json({
      success: true,
      data: {
        tenants,
        count: tenants.length
      }
    });

  } catch (error) {
    console.error('Error listing tenants:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update tenant status
const updateTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { status } = req.body;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: active, inactive, suspended'
      });
    }
    
    await updateTenantStatus(tenantId, status);
    
    return res.status(200).json({
      success: true,
      message: `Tenant status updated to ${status}`,
      data: { tenantId, status }
    });

  } catch (error) {
    console.error('Error updating tenant status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Health check endpoint
const healthCheck = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Tenant service is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Service unhealthy',
      error: error.message
    });
  }
};

module.exports = {
  createTenant,
  checkDomainAvailability,
  getTenant,
  getAllTenants,
  updateTenant,
  healthCheck
}; 