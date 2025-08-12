const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createTenantPool } = require('../config/database');

// Middleware to verify tenant JWT token
const authenticateTenant = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    if (!decoded.tenantId || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // Verify tenant exists in main database
    const mainPool = require('../config/database').mainPool;
    const mainClient = await mainPool.connect();
    const tenantResult = await mainClient.query(
      'SELECT tenant_id, school_name, domain, status FROM tenants WHERE tenant_id = $1 AND status = $2',
      [decoded.tenantId, 'active']
    );
    mainClient.release();

    if (tenantResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid tenant'
      });
    }

    // Get the actual database name from the tenants table
    const dbNameResult = await mainClient.query(
      'SELECT database_name FROM tenants WHERE tenant_id = $1',
      [decoded.tenantId]
    );
    
    if (dbNameResult.rows.length === 0 || !dbNameResult.rows[0].database_name) {
      return res.status(401).json({
        success: false,
        message: 'Tenant database not configured'
      });
    }
    
    const tenantDbName = dbNameResult.rows[0].database_name;
    
    // Verify user exists in tenant database
    const tenantPool = createTenantPool(decoded.tenantId, tenantDbName);
    const tenantClient = await tenantPool.connect();
    const userResult = await tenantClient.query(
      'SELECT id, email, name, role, status FROM users WHERE id = $1 AND status = $2',
      [decoded.userId, 'active']
    );
    tenantClient.release();
    tenantPool.end();

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user'
      });
    }

    req.tenant = { tenant_id: decoded.tenantId };
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    console.error('Tenant token verification error:', error);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Function to generate JWT token for tenant users
const generateTenantToken = (tenantId, userId) => {
  return jwt.sign(
    { tenantId, userId }, 
    process.env.JWT_SECRET || 'your-secret-key', 
    { expiresIn: '24h' }
  );
};

// Function to verify tenant user credentials
const verifyTenantCredentials = async (tenantId, email, password) => {
  let tenantPool = null;
  let tenantClient = null;
  
  try {
    console.log(`[AUTH] Starting authentication for tenant: ${tenantId}, email: ${email}`);
    
    // First check if tenant exists and is active
    const mainPool = require('../config/database').mainPool;
    const mainClient = await mainPool.connect();
    const tenantResult = await mainClient.query(
      'SELECT tenant_id, school_name, domain, status FROM tenants WHERE tenant_id = $1 AND status = $2',
      [tenantId, 'active']
    );
    mainClient.release();

    if (tenantResult.rows.length === 0) {
      console.log(`[AUTH] Tenant not found or inactive: ${tenantId}`);
      return { success: false, message: 'Invalid tenant' };
    }

    console.log(`[AUTH] Tenant found: ${tenantResult.rows[0].school_name}`);

    // Get the actual database name from the tenants table
    const dbNameResult = await mainClient.query(
      'SELECT database_name FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );
    
    if (dbNameResult.rows.length === 0 || !dbNameResult.rows[0].database_name) {
      console.log(`[AUTH] Database name not found for tenant: ${tenantId}`);
      return { success: false, message: 'Tenant database not configured' };
    }
    
    const tenantDbName = dbNameResult.rows[0].database_name;
    console.log(`[AUTH] Connecting to tenant database: ${tenantDbName}`);
    
    tenantPool = createTenantPool(tenantId, tenantDbName);
    tenantClient = await tenantPool.connect();
    
    // Check if user exists
    console.log(`[AUTH] Checking user credentials for email: ${email}`);
    const userResult = await tenantClient.query(
      'SELECT id, email, password_hash, name, role, status FROM users WHERE email = $1 AND status = $2',
      [email, 'active']
    );

    if (userResult.rows.length === 0) {
      console.log(`[AUTH] User not found: ${email}`);
      tenantClient.release();
      tenantPool.end();
      return { success: false, message: 'Invalid credentials' };
    }

    const user = userResult.rows[0];
    console.log(`[AUTH] User found: ${user.name} (${user.role})`);
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log(`[AUTH] Invalid password for user: ${email}`);
      tenantClient.release();
      tenantPool.end();
      return { success: false, message: 'Invalid credentials' };
    }

    console.log(`[AUTH] Password verified successfully for user: ${email}`);

    // Update last login using the same connection
    try {
      await tenantClient.query(
        'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );
      console.log(`[AUTH] Last login updated for user: ${user.id}`);
    } catch (updateError) {
      console.error('Error updating last login:', updateError);
      // Don't fail authentication if update fails
    }
    
    // Release the connection and end the pool
    tenantClient.release();
    tenantPool.end();

    console.log(`[AUTH] Authentication successful for tenant: ${tenantId}, user: ${email}`);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      tenant: tenantResult.rows[0]
    };
  } catch (error) {
    console.error('Tenant credential verification error:', error);
    
    // Clean up connections in case of error
    if (tenantClient) {
      try {
        tenantClient.release();
      } catch (releaseError) {
        console.error('Error releasing tenant client:', releaseError);
      }
    }
    if (tenantPool) {
      try {
        tenantPool.end();
      } catch (endError) {
        console.error('Error ending tenant pool:', endError);
      }
    }
    
    return { success: false, message: 'Authentication failed' };
  }
};

module.exports = {
  authenticateTenant,
  generateTenantToken,
  verifyTenantCredentials
};
