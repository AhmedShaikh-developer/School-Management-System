const bcrypt = require('bcryptjs');
const { 
  mainPool, 
  createTenantDatabase, 
  dropTenantDatabase, 
  checkDomainExists 
} = require('../config/database');
const { 
  sendWelcomeEmail
} = require('./emailService');

// Generate unique tenant ID
const generateTenantId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `tenant_${timestamp}_${randomStr}`;
};

// Generate temporary password
const generateTemporaryPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Create admin user in both tenant database and main database
const createAdminUser = async (tenantId, adminData, password) => {
  try {
    // Create admin user in tenant-specific database
    const tenantPool = require('../config/database').createTenantPool(tenantId);
    const tenantClient = await tenantPool.connect();
    
    const passwordHash = await bcrypt.hash(password, 12);
    
    await tenantClient.query(`
      INSERT INTO users (email, password_hash, name, role, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [adminData.email, passwordHash, adminData.name, 'admin', 'active']);
    
    tenantClient.release();
    tenantPool.end();
    
    // Also create admin user in main database's admin_users table
    const mainClient = await mainPool.connect();
    await mainClient.query(`
      INSERT INTO admin_users (tenant_id, email, password_hash, name, role, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tenantId, adminData.email, passwordHash, adminData.name, 'admin', 'active']);
    
    mainClient.release();
    
    console.log(`Admin user created for tenant ${tenantId} in both databases`);
    return true;
  } catch (error) {
    console.error(`Error creating admin user for tenant ${tenantId}:`, error);
    throw error;
  }
};

// Main tenant onboarding function with rollback
const onboardTenant = async (tenantData) => {
  const startTime = Date.now();
  let tenantId = null;
  let tempPassword = null;
  let rollbackSteps = [];
  
  try {
    console.log('Starting tenant onboarding process...');
    
    // Step 1: Validate domain uniqueness
    console.log('Step 1: Checking domain uniqueness...');
    const domainExists = await checkDomainExists(tenantData.domain);
    if (domainExists) {
      throw new Error(`Domain ${tenantData.domain} is already registered`);
    }
    
    // Step 2: Generate tenant ID and temporary password
    console.log('Step 2: Generating tenant ID and password...');
    tenantId = generateTenantId();
    tempPassword = generateTemporaryPassword();
    
    // Step 3: Create tenant record in main database
    console.log('Step 3: Creating tenant record...');
    const client = await mainPool.connect();
    await client.query(`
      INSERT INTO tenants (tenant_id, school_name, domain, admin_email, admin_name, phone, school_type, student_count, address, website, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [tenantId, tenantData.schoolName, tenantData.domain, tenantData.adminEmail, tenantData.adminName, tenantData.phone, tenantData.schoolType, tenantData.studentCount, tenantData.address, tenantData.website, 'active']);
    
    rollbackSteps.push(() => client.query('DELETE FROM tenants WHERE tenant_id = $1', [tenantId]));
    client.release();
    
    // Step 4: Create tenant database
    console.log('Step 4: Creating tenant database...');
    await createTenantDatabase(tenantId, tenantData.schoolName);
    rollbackSteps.push(() => dropTenantDatabase(tenantId));
    
    // Step 5: Create admin user in tenant database
    console.log('Step 5: Creating admin user...');
    await createAdminUser(tenantId, {
      email: tenantData.adminEmail,
      name: tenantData.adminName
    }, tempPassword);
    
    // Step 6: Send welcome email (with error handling)
    console.log('Step 6: Sending welcome email...');
    try {
      await sendWelcomeEmail(
        tenantData.adminEmail,
        tenantData.adminName,
        tenantData.schoolName,
        tempPassword
      );
      console.log('Welcome email sent successfully');
    } catch (emailError) {
      console.error('Email sending failed, but continuing with onboarding:', emailError.message);
      // Don't fail the entire onboarding process due to email issues
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`Tenant onboarding completed successfully in ${duration} seconds`);
    
    return {
      success: true,
      tenantId,
      tempPassword,
      duration,
      message: 'Tenant onboarded successfully'
    };
    
  } catch (error) {
    console.error('Tenant onboarding failed:', error);
    
    // Rollback process
    console.log('Starting rollback process...');
    for (let i = rollbackSteps.length - 1; i >= 0; i--) {
      try {
        await rollbackSteps[i]();
        console.log(`Rollback step ${rollbackSteps.length - i} completed`);
      } catch (rollbackError) {
        console.error(`Rollback step ${rollbackSteps.length - i} failed:`, rollbackError);
      }
    }
    
    // Note: Email notifications removed for simplicity
    console.log('Skipping failure notification email');
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    return {
      success: false,
      error: error.message,
      duration,
      message: 'Tenant onboarding failed'
    };
  }
};

// Get tenant information
const getTenantInfo = async (tenantId) => {
  try {
    const client = await mainPool.connect();
    const result = await client.query(
      'SELECT * FROM tenants WHERE tenant_id = $1',
      [tenantId]
    );
    client.release();
    
    if (result.rows.length === 0) {
      throw new Error('Tenant not found');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting tenant info:', error);
    throw error;
  }
};

// List all tenants
const listTenants = async () => {
  try {
    const client = await mainPool.connect();
    const result = await client.query(
      'SELECT tenant_id, school_name, domain, admin_email, admin_name, status, created_at FROM tenants ORDER BY created_at DESC'
    );
    client.release();
    
    return result.rows;
  } catch (error) {
    console.error('Error listing tenants:', error);
    throw error;
  }
};

// Update tenant status
const updateTenantStatus = async (tenantId, status) => {
  try {
    const client = await mainPool.connect();
    await client.query(
      'UPDATE tenants SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $2',
      [status, tenantId]
    );
    client.release();
    
    console.log(`Tenant ${tenantId} status updated to ${status}`);
    return true;
  } catch (error) {
    console.error('Error updating tenant status:', error);
    throw error;
  }
};

module.exports = {
  onboardTenant,
  getTenantInfo,
  listTenants,
  updateTenantStatus,
  generateTenantId,
  generateTemporaryPassword
}; 