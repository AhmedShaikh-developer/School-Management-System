const { generateTenantToken, verifyTenantCredentials } = require('../middleware/tenantAuth');
const { mainPool } = require('../config/database');

// Login with domain, email, and password
const login = async (req, res) => {
  try {
    const { domain, email, password } = req.body;

    if (!domain || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Domain, email, and password are required'
      });
    }

    // First, find tenant by domain
    const client = await mainPool.connect();
    const tenantResult = await client.query(
      'SELECT tenant_id, school_name, domain, status FROM tenants WHERE domain = $1 AND status = $2',
      [domain, 'active']
    );
    client.release();

    if (tenantResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid domain or school not found'
      });
    }

    const tenant = tenantResult.rows[0];

    // Now verify credentials in tenant database
    const authResult = await verifyTenantCredentials(tenant.tenant_id, email, password);

    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message
      });
    }

    // Generate token with tenant and user info
    const token = generateTenantToken(tenant.tenant_id, authResult.user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: authResult.user,
        tenant: {
          tenant_id: tenant.tenant_id,
          school_name: tenant.school_name,
          domain: tenant.domain
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};
