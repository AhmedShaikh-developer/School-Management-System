const express = require('express');
const router = express.Router();
const { login, getProfile, logout, getTenantInfo } = require('../controllers/tenantAuthController');
const { authenticateTenant } = require('../middleware/tenantAuth');

// Public routes - direct login with domain
router.post('/login', login);
router.get('/tenant/:tenantId/info', getTenantInfo);

// Protected routes
router.get('/profile', authenticateTenant, getProfile);
router.post('/logout', authenticateTenant, logout);

module.exports = router;
