const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/tenants/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Domain check endpoint
app.get('/api/tenants/domain/:domain/check', (req, res) => {
  const { domain } = req.params;
  
  // Simple domain validation
  if (!domain || domain.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Domain must be at least 3 characters long'
    });
  }
  
  // Mock domain availability check
  const isAvailable = Math.random() > 0.3; // 70% chance of being available
  
  res.json({
    success: true,
    data: {
      available: isAvailable,
      message: isAvailable ? 'Domain is available' : 'Domain is already taken'
    }
  });
});

// Tenant onboarding endpoint
app.post('/api/tenants/onboard', (req, res) => {
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
  
  // Validate required fields
  if (!schoolName || !domain || !adminName || !adminEmail) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }
  
  // Mock successful onboarding
  const tenantId = `tenant_${Date.now()}`;
  
  res.json({
    success: true,
    message: 'Tenant created successfully',
    data: {
      tenantId,
      schoolName,
      domain,
      adminName,
      adminEmail,
      status: 'active',
      createdAt: new Date().toISOString()
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'School Management System API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/tenants/health',
      domainCheck: '/api/tenants/domain/:domain/check',
      onboard: '/api/tenants/onboard'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    requestedUrl: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/tenants/health`);
}); 