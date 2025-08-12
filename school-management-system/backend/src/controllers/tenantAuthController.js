const { verifyTenantCredentials, generateTenantToken } = require('../middleware/tenantAuth');
const bcrypt = require('bcrypt');
const { sendPasswordChangeNotification } = require('../services/emailService');

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

// Change tenant user password
const changePassword = async (req, res) => {
  try {
    const { tenantId, currentPassword, newPassword } = req.body;

    // Validate input
    if (!tenantId || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID, current password, and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Get main database connection
    const mainPool = require('../config/database').mainPool;
    const client = await mainPool.connect();

    try {
      // Get tenant info
      const tenantResult = await client.query(
        'SELECT tenant_id, domain, school_name FROM tenants WHERE tenant_id = $1 AND status = $2',
        [tenantId, 'active']
      );

      if (tenantResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      const tenant = tenantResult.rows[0];

      // Get tenant-specific database connection
      const { createTenantPool } = require('../config/database');
      
      // Get the actual database name from the tenants table
      const dbNameResult = await client.query(
        'SELECT database_name FROM tenants WHERE tenant_id = $1',
        [tenant.tenant_id]
      );
      
      if (dbNameResult.rows.length === 0 || !dbNameResult.rows[0].database_name) {
        return res.status(500).json({
          success: false,
          message: 'Tenant database not configured'
        });
      }
      
      const tenantDbName = dbNameResult.rows[0].database_name;
      const tenantPool = createTenantPool(tenant.tenant_id, tenantDbName);
      const tenantClient = await tenantPool.connect();

      try {
        // Get user from tenant database (assuming we have the user ID from the token)
        // For now, we'll get the first admin user - in a real app, you'd get this from the JWT token
        const userResult = await tenantClient.query(
          'SELECT id, email, password_hash, name FROM users WHERE role = $1 AND status = $2 LIMIT 1',
          ['admin', 'active']
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        const user = userResult.rows[0];

        // Debug: Log user data
        console.log('User data retrieved:', {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'admin'
        });

        // If name is not available in tenant database, try to get it from main database
        let userName = user.name;
        if (!userName) {
          console.log('Name not found in tenant database, checking main database...');
          const adminUserResult = await client.query(
            'SELECT name FROM admin_users WHERE tenant_id = $1 AND email = $2',
            [tenantId, user.email]
          );
          if (adminUserResult.rows.length > 0) {
            userName = adminUserResult.rows[0].name;
            console.log('Found name in main database:', userName);
          }
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
          return res.status(401).json({
            success: false,
            message: 'Current password is incorrect'
          });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // Update password in tenant database
        await tenantClient.query(
          'UPDATE users SET password_hash = $1 WHERE id = $2',
          [newPasswordHash, user.id]
        );

        // Also update password in main database's admin_users table
        await client.query(
          'UPDATE admin_users SET password_hash = $1 WHERE tenant_id = $2 AND email = $3',
          [newPasswordHash, tenantId, user.email]
        );

        // Send email notification to tenant
        try {
          // Debug: Log what we're sending to email
          console.log('Sending email notification with data:', {
            email: user.email,
            name: userName,
            schoolName: tenant.school_name
          });
          
          const emailResult = await sendPasswordChangeNotification(
            user.email,
            userName || 'User', // Use the fallback name
            tenant.school_name || 'School Management System'
          );
          
          if (emailResult.success) {
            console.log('Password change notification email sent successfully');
          } else {
            console.warn('Failed to send password change notification email:', emailResult.error);
          }
        } catch (emailError) {
          console.error('Error sending password change notification email:', emailError);
          // Don't fail the password change if email fails
        }

        res.json({
          success: true,
          message: 'Password changed successfully'
        });

      } finally {
        tenantClient.release();
        tenantPool.end();
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Change password error:', error);
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
  getTenantInfo,
  changePassword
};
