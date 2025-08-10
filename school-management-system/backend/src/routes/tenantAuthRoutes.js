const express = require('express');
const router = express.Router();
const { login, getProfile, logout, getTenantInfo, changePassword } = require('../controllers/tenantAuthController');
const { authenticateTenant } = require('../middleware/tenantAuth');

// Public routes
router.post('/login', login);
router.get('/tenant/:tenantId/info', getTenantInfo);

// Protected routes
router.get('/profile', authenticateTenant, getProfile);
router.post('/logout', authenticateTenant, logout);
router.post('/change-password', changePassword);

module.exports = router;
