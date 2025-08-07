const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { initializeMainDatabase, getTenantByCustomDomain, getTenantBranding } = require('./config/database');
const { onboardTenant } = require('./services/tenantService');
const { checkDomainExists } = require('./config/database');
const domainRoutes = require('./routes/domainRoutes');
const brandingRoutes = require('./routes/brandingRoutes');

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

// Additional CORS headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.APP_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Request timeout middleware (5 minutes)
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes
  next();
});

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
app.get('/api/tenants/domain/:domain/check', async (req, res) => {
  try {
    const { domain } = req.params;
    
    // Basic validation
    if (!domain || domain.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Domain must be at least 3 characters long'
      });
    }
    
    // Check domain availability
    const exists = await checkDomainExists(domain);
    
    res.json({
      success: true,
      data: {
        available: !exists,
        message: exists ? 'Domain is already taken' : 'Domain is available'
      }
    });
  } catch (error) {
    console.error('Domain check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking domain availability'
    });
  }
});

// Domain routing middleware
app.use(async (req, res, next) => {
  const host = req.get('host');
  
  // Skip for API routes and static files
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return next();
  }
  
  // Check if this is a custom domain
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    try {
      const tenant = await getTenantByCustomDomain(host);
      if (tenant) {
        // Add tenant info to request
        req.tenant = tenant;
        return next();
      }
    } catch (error) {
      console.error('Error checking custom domain:', error);
    }
  }
  
  next();
});

// Tenant onboarding endpoint
app.post('/api/tenants/onboard', async (req, res) => {
  try {
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
    
    // Basic validation
    if (!schoolName || !domain || !adminName || !adminEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Call the real tenant service
    const result = await onboardTenant({
      schoolName,
      domain,
      adminName,
      adminEmail,
      phone,
      schoolType,
      studentCount,
      address,
      website
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: 'School onboarded successfully! Check your email for login credentials.',
        data: {
          tenantId: result.tenantId,
          duration: result.duration
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to onboard school'
      });
    }
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during onboarding'
    });
  }
});

// API routes
app.use('/api/domains', domainRoutes);
app.use('/api/branding', brandingRoutes);

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

// Initialize database and start server
const startServer = async () => {
  try {
    console.log('Initializing database...');
    await initializeMainDatabase();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API URL: http://localhost:${PORT}`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/api/tenants/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 