const { verifyTenantCredentials, generateTenantToken } = require('../middleware/tenantAuth');

// Tenant login
const login = async (req, res) => {
  try {
    const { domain, email, password } = req.body;

    // Validate input
    if (!domain || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Domain, email, and password are required'
      });
    }

    // Get main database connection
    const mainPool = require('../config/database').mainPool;
    const client = await mainPool.connect();

    try {
      // Find tenant by domain
      const tenantResult = await client.query(
        'SELECT tenant_id, school_name, domain, status FROM tenants WHERE domain = $1 AND status = $2',
        [domain, 'active']
      );

      if (tenantResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid domain or tenant not found'
        });
      }

      const tenant = tenantResult.rows[0];
      const tenantId = tenant.tenant_id;

      // Verify credentials against tenant's database
      const result = await verifyTenantCredentials(tenantId, email, password);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message
        });
      }

      // Generate JWT token
      const token = generateTenantToken(tenantId, result.user.id);

      // Return success response
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          tenant: {
            tenant_id: tenant.tenant_id,
            school_name: tenant.school_name,
            domain: tenant.domain
          },
          token: token
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Tenant login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get current tenant user profile
const getProfile = async (req, res) => {
  try {
    // User and tenant are already authenticated by middleware
    const { id, email, name, role } = req.user;
    const { tenant_id, school_name, domain } = req.tenant;

    res.json({
      success: true,
      data: {
        user: {
          id,
          email,
          name,
          role
        },
        tenant: {
          tenant_id,
          school_name,
          domain
        }
      }
    });

  } catch (error) {
    console.error('Get tenant profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Logout (client-side token removal)
const logout = async (req, res) => {
  try {
    // In JWT-based auth, logout is typically handled client-side by removing the token
    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Tenant logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get tenant info by tenant ID (for login page)
const getTenantInfo = async (req, res) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    // Get tenant info from main database
    const mainPool = require('../config/database').mainPool;
    const client = await mainPool.connect();
    const result = await client.query(
      'SELECT tenant_id, school_name, domain, status FROM tenants WHERE tenant_id = $1 AND status = $2',
      [tenantId, 'active']
    );
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    const tenant = result.rows[0];

    res.json({
      success: true,
      data: {
        tenant_id: tenant.tenant_id,
        school_name: tenant.school_name,
        domain: tenant.domain,
        status: tenant.status
      }
    });

  } catch (error) {
    console.error('Get tenant info error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  login,
  getProfile,
  logout,
  getTenantInfo
};
