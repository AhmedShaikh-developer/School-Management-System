const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 5001;

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/api/tenants/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'School Management System API',
    version: '1.0.0',
    status: 'running'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/tenants/health`);
}); 