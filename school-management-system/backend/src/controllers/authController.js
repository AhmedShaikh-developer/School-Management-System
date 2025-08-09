const { verifySuperAdminCredentials, generateToken } = require('../middleware/auth');

// Super admin login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Verify credentials
    const result = await verifySuperAdminCredentials(username, password);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }

    // Generate JWT token
    const token = generateToken(result.user.id);

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        token: token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    // User is already authenticated by middleware
    const { id, username, email, full_name, role } = req.user;

    res.json({
      success: true,
      data: {
        id,
        username,
        email,
        full_name,
        role
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
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
    // However, we can invalidate the token server-side if needed
    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  login,
  getProfile,
  logout
};
