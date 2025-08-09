const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Main database pool for super admin authentication
const mainPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
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
    
    // Verify super admin exists and is active
    const client = await mainPool.connect();
    const result = await client.query(
      'SELECT id, username, email, full_name, role, is_active FROM super_admins WHERE id = $1 AND is_active = $2',
      [decoded.userId, true]
    );
    client.release();

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
};

// Function to verify super admin credentials
const verifySuperAdminCredentials = async (username, password) => {
  try {
    const client = await mainPool.connect();
    const result = await client.query(
      'SELECT id, username, email, password_hash, full_name, role, is_active FROM super_admins WHERE username = $1 OR email = $1',
      [username]
    );
    client.release();

    if (result.rows.length === 0) {
      return { success: false, message: 'Invalid credentials' };
    }

    const superAdmin = result.rows[0];
    
    if (!superAdmin.is_active) {
      return { success: false, message: 'Account is deactivated' };
    }

    const isValidPassword = await bcrypt.compare(password, superAdmin.password_hash);
    
    if (!isValidPassword) {
      return { success: false, message: 'Invalid credentials' };
    }

    // Update last login
    const updateClient = await mainPool.connect();
    await updateClient.query(
      'UPDATE super_admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [superAdmin.id]
    );
    updateClient.release();

    return {
      success: true,
      user: {
        id: superAdmin.id,
        username: superAdmin.username,
        email: superAdmin.email,
        full_name: superAdmin.full_name,
        role: superAdmin.role
      }
    };
  } catch (error) {
    console.error('Credential verification error:', error);
    return { success: false, message: 'Authentication failed' };
  }
};

module.exports = {
  authenticateToken,
  generateToken,
  verifySuperAdminCredentials
};
