const bcrypt = require('bcryptjs');
const { 
  mainPool, 
  createTenantDatabase, 
  dropTenantDatabase, 
  checkDomainExists 
} = require('../config/database');
const { 
  sendWelcomeEmail,
  sendSuperAdminNotification,
  sendFailureNotification
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
const createAdminUser = async (tenantId, adminData, password, databaseName) => {
  try {
    // Create admin user in tenant-specific database
    const tenantPool = require('../config/database').createTenantPool(tenantId, databaseName);
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
    
    // Step 2a: Generate database name
    console.log('Step 2a: Generating database name...');
    const sanitizeDatabaseName = (name) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
        .replace(/_+/g, '_') // Replace multiple underscores with single
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
        .substring(0, 30); // Limit length for PostgreSQL
    };
    
    // Generate base database name
    let baseDbName;
    if (tenantData.schoolName && tenantData.schoolName.toLowerCase() !== 'school' && tenantData.schoolName.toLowerCase() !== 'new') {
      baseDbName = `school_${sanitizeDatabaseName(tenantData.schoolName)}`;
    } else {
      // Fallback to timestamp-based name if school name is too generic
      baseDbName = `school_${Date.now().toString(36)}`;
    }
    
    // Check if database name already exists and add suffix if needed
    let databaseName = baseDbName;
    let counter = 1;
    
    const checkClient = await mainPool.connect();
    try {
      while (true) {
        const exists = await checkClient.query(`
          SELECT 1 FROM pg_database WHERE datname = $1
        `, [databaseName]);
        
        if (exists.rows.length === 0) {
          break; // Name is available
        }
        
        // Name exists, try with suffix
        databaseName = `${baseDbName}_${counter}`;
        counter++;
        
        // Prevent infinite loop (max 100 attempts)
        if (counter > 100) {
          throw new Error(`Could not find available database name after 100 attempts`);
        }
      }
    } finally {
      checkClient.release();
    }
    
    console.log(`Generated database name: ${databaseName}`);
    
    // Step 3: Create tenant record in main database
    console.log('Step 3: Creating tenant record...');
    const client = await mainPool.connect();
    await client.query(`
      INSERT INTO tenants (tenant_id, school_name, domain, admin_email, admin_name, phone, school_type, student_count, address, website, database_name, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [tenantId, tenantData.schoolName, tenantData.domain, tenantData.adminEmail, tenantData.adminName, tenantData.phone, tenantData.schoolType, tenantData.studentCount, tenantData.address, tenantData.website, databaseName, 'active']);
    
    rollbackSteps.push(async () => {
      try {
        const rollbackClient = await mainPool.connect();
        await rollbackClient.query('DELETE FROM tenants WHERE tenant_id = $1', [tenantId]);
        rollbackClient.release();
      } catch (error) {
        console.error('Error during tenant record rollback:', error);
      }
    });
    client.release();
    
    // Step 4: Create tenant database
    console.log('Step 4: Creating tenant database...');
    await createTenantDatabase(tenantId, tenantData.schoolName, databaseName);
    rollbackSteps.push(async () => {
      try {
        await dropTenantDatabase(tenantId, databaseName);
      } catch (error) {
        console.error('Error during database rollback:', error);
      }
    });
    
    // Step 4a: Update tenant record with database name (now redundant but kept for consistency)
    console.log('Step 4a: Verifying database name in tenant record...');
    const updateClient = await mainPool.connect();
    await updateClient.query(`
      UPDATE tenants 
      SET database_name = $1 
      WHERE tenant_id = $2
    `, [databaseName, tenantId]);
    updateClient.release();
    
    // Step 5: Create admin user in tenant database
    console.log('Step 5: Creating admin user...');
    await createAdminUser(tenantId, {
      email: tenantData.adminEmail,
      name: tenantData.adminName
    }, tempPassword, databaseName);
    
    rollbackSteps.push(async () => {
      try {
        // Remove admin user from main database
        const rollbackClient = await mainPool.connect();
        await rollbackClient.query('DELETE FROM admin_users WHERE tenant_id = $1', [tenantId]);
        rollbackClient.release();
      } catch (error) {
        console.error('Error during admin user rollback:', error);
      }
    });
    
    // Step 6: Send welcome email to tenant admin (with error handling)
    console.log('Step 6: Sending welcome email to tenant admin...');
    try {
      await sendWelcomeEmail(
        tenantData.adminEmail,
        tenantData.adminName,
        tenantData.schoolName,
        tempPassword
      );
      console.log('Welcome email sent successfully to tenant admin');
    } catch (emailError) {
      console.error('Email sending failed to tenant admin, but continuing with onboarding:', emailError.message);
      // Don't fail the entire onboarding process due to email issues
    }
    
    // Step 7: Send notification email to Super Admin (with error handling)
    console.log('Step 7: Sending notification email to Super Admin...');
    try {
      const superAdminEmail = 'binsolswork@gmail.com'; // Hardcoded as per database config
      await sendSuperAdminNotification(superAdminEmail, tenantData);
      console.log('Super Admin notification email sent successfully');
    } catch (emailError) {
      console.error('Super Admin notification email failed, but continuing with onboarding:', emailError.message);
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
    
    // Send failure notification to Super Admin (with error handling)
    console.log('Sending failure notification to Super Admin...');
    try {
      const superAdminEmail = 'binsolswork@gmail.com'; // Hardcoded as per database config
      await sendFailureNotification(superAdminEmail, tenantData, error.message);
      console.log('Failure notification sent to Super Admin');
    } catch (notificationError) {
      console.error('Failed to send failure notification to Super Admin:', notificationError.message);
      // Don't fail the rollback process due to notification issues
    }
    
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