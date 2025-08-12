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

// Get tenant setup status
const getTenantSetupStatus = async (req, res) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    // Get main database connection
    const mainPool = require('../config/database').mainPool;
    const client = await mainPool.connect();

    try {
      // Get tenant info and biometric settings
      const tenantResult = await client.query(`
        SELECT t.tenant_id, t.domain, t.school_name, tbs.biometric_enabled
        FROM tenants t
        LEFT JOIN tenant_biometric_settings tbs ON t.tenant_id = tbs.tenant_id
        WHERE t.tenant_id = $1 AND t.status = $2
      `, [tenantId, 'active']);

      if (tenantResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      const tenant = tenantResult.rows[0];

      // Get tenant-specific database connection
      const { createTenantPool } = require('../config/database');
      const tenantPool = createTenantPool(tenant.tenant_id);
      const tenantClient = await tenantPool.connect();

      try {
        // Check academic year configuration
        const academicYearResult = await tenantClient.query(`
          SELECT COUNT(*) as count FROM academic_years WHERE status = 'active'
        `);
        const hasAcademicYear = parseInt(academicYearResult.rows[0].count) > 0;

        // Check classes
        const classesResult = await tenantClient.query(`
          SELECT COUNT(*) as count FROM classes WHERE status = 'active'
        `);
        const hasClasses = parseInt(classesResult.rows[0].count) > 0;

        // Check students
        const studentsResult = await tenantClient.query(`
          SELECT COUNT(*) as count FROM students WHERE status = 'active'
        `);
        const hasStudents = parseInt(studentsResult.rows[0].count) > 0;

        // Check attendance configuration
        const attendanceResult = await tenantClient.query(`
          SELECT COUNT(*) as count FROM attendance_config WHERE id IS NOT NULL
        `);
        const hasAttendanceConfig = parseInt(attendanceResult.rows[0].count) > 0;

        // Check domain and branding
        const brandingResult = await client.query(`
          SELECT COUNT(*) as count FROM tenant_branding WHERE tenant_id = $1
        `, [tenantId]);
        const hasBranding = parseInt(brandingResult.rows[0].count) > 0;

        // Determine attendance status
        let attendanceStatus = 'locked';
        if (tenant.biometric_enabled && hasAcademicYear && hasClasses && hasStudents) {
          attendanceStatus = hasAttendanceConfig ? 'configured' : 'ready_to_setup';
        } else if (hasAcademicYear && hasClasses && hasStudents) {
          attendanceStatus = hasAttendanceConfig ? 'configured' : 'ready_to_setup';
        }

        // Determine domain and branding status
        const domainBrandingStatus = hasBranding ? 'configured' : 'setup_required';

        res.json({
          success: true,
          data: {
            tenant_id: tenant.tenant_id,
            domain: tenant.domain,
            school_name: tenant.school_name,
            biometric_enabled: tenant.biometric_enabled || false,
            modules: {
              domain_branding: {
                status: domainBrandingStatus,
                available: true
              },
              attendance: {
                status: attendanceStatus,
                available: tenant.biometric_enabled || (hasAcademicYear && hasClasses && hasStudents),
                prerequisites: {
                  academic_year: hasAcademicYear,
                  classes: hasClasses,
                  students: hasStudents,
                  biometric_enabled: tenant.biometric_enabled || false
                }
              }
            }
          }
        });

      } finally {
        tenantClient.release();
        tenantPool.end();
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error getting tenant setup status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createTenant,
  checkDomainAvailability,
  getTenant,
  getAllTenants,
  updateTenant,
  healthCheck,
  getTenantSetupStatus
}; 