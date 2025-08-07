const { Pool } = require('pg');
require('dotenv').config();

// Main database pool for tenant management
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

// Function to create tenant-specific database pool
const createTenantPool = (tenantId) => {
  const tenantDbName = `${process.env.TENANT_DB_PREFIX}${tenantId}`;
  
  return new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: tenantDbName,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
};

// Initialize main database tables
const initializeMainDatabase = async () => {
  try {
    const client = await mainPool.connect();
    
    // Create tenants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) UNIQUE NOT NULL,
        school_name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) UNIQUE NOT NULL,
        admin_email VARCHAR(255) NOT NULL,
        admin_name VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create custom domains table
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_domains (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        domain VARCHAR(255) UNIQUE NOT NULL,
        verification_type VARCHAR(20) DEFAULT 'txt',
        verification_status VARCHAR(20) DEFAULT 'pending',
        verification_token VARCHAR(255),
        verification_file_path VARCHAR(500),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
      )
    `);

    // Create tenant branding table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_branding (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) UNIQUE NOT NULL,
        logo_data BYTEA,
        logo_filename VARCHAR(255),
        logo_mimetype VARCHAR(100),
        primary_color VARCHAR(7) DEFAULT '#2563eb',
        secondary_color VARCHAR(7) DEFAULT '#1d4ed8',
        accent_color VARCHAR(7) DEFAULT '#16a34a',
        font_family VARCHAR(100) DEFAULT 'Inter',
        custom_css TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
      )
    `);

    // Migrate existing tenant_branding table if needed
    try {
      // Check if logo_data column exists
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tenant_branding' AND column_name = 'logo_data'
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log('Migrating tenant_branding table to add logo columns...');
        
        // Add new logo columns
        await client.query(`
          ALTER TABLE tenant_branding 
          ADD COLUMN logo_data BYTEA,
          ADD COLUMN logo_filename VARCHAR(255),
          ADD COLUMN logo_mimetype VARCHAR(100)
        `);
        
        // Remove old logo_url column if it exists
        const urlColumnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'tenant_branding' AND column_name = 'logo_url'
        `);
        
        if (urlColumnCheck.rows.length > 0) {
          await client.query(`
            ALTER TABLE tenant_branding DROP COLUMN logo_url
          `);
        }
        
        console.log('Migration completed successfully');
      }
    } catch (migrationError) {
      console.error('Migration error:', migrationError);
      // Continue even if migration fails
    }

    // Create admin users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
      )
    `);

    client.release();
    console.log('Main database initialized successfully');
  } catch (error) {
    console.error('Error initializing main database:', error);
    throw error;
  }
};

// Create tenant database schema
const createTenantDatabase = async (tenantId, schoolName) => {
  const tenantDbName = `${process.env.TENANT_DB_PREFIX}${tenantId}`;
  
  try {
    // Create database
    const client = await mainPool.connect();
    await client.query(`CREATE DATABASE "${tenantDbName}"`);
    client.release();

    // Create tenant-specific pool
    const tenantPool = createTenantPool(tenantId);
    const tenantClient = await tenantPool.connect();

    // Create tenant schema
    await tenantClient.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await tenantClient.query(`
      CREATE TABLE students (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        date_of_birth DATE,
        grade VARCHAR(20),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await tenantClient.query(`
      CREATE TABLE teachers (
        id SERIAL PRIMARY KEY,
        teacher_id VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        subject VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await tenantClient.query(`
      CREATE TABLE classes (
        id SERIAL PRIMARY KEY,
        class_name VARCHAR(100) NOT NULL,
        grade VARCHAR(20),
        teacher_id INTEGER REFERENCES teachers(id),
        capacity INTEGER DEFAULT 30,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    tenantClient.release();
    tenantPool.end();
    
    console.log(`Tenant database ${tenantDbName} created successfully`);
    return true;
  } catch (error) {
    console.error(`Error creating tenant database ${tenantDbName}:`, error);
    throw error;
  }
};

// Drop tenant database (for rollback)
const dropTenantDatabase = async (tenantId) => {
  const tenantDbName = `${process.env.TENANT_DB_PREFIX}${tenantId}`;
  
  try {
    const client = await mainPool.connect();
    await client.query(`DROP DATABASE IF EXISTS "${tenantDbName}"`);
    client.release();
    console.log(`Tenant database ${tenantDbName} dropped successfully`);
    return true;
  } catch (error) {
    console.error(`Error dropping tenant database ${tenantDbName}:`, error);
    throw error;
  }
};

// Check if domain already exists
const checkDomainExists = async (domain) => {
  try {
    const client = await mainPool.connect();
    const result = await client.query(
      'SELECT id FROM tenants WHERE domain = $1',
      [domain]
    );
    client.release();
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking domain existence:', error);
    throw error;
  }
};

// Generate verification token for domain verification
const generateVerificationToken = () => {
  return `sms_verify_${Math.random().toString(36).substring(2, 15)}`;
};

// Add custom domain
const addCustomDomain = async (tenantId, domain, verificationType = 'txt') => {
  try {
    const client = await mainPool.connect();
    const verificationToken = generateVerificationToken();
    
    await client.query(`
      INSERT INTO custom_domains (tenant_id, domain, verification_type, verification_token)
      VALUES ($1, $2, $3, $4)
    `, [tenantId, domain, verificationType, verificationToken]);
    
    client.release();
    return { success: true, verificationToken };
  } catch (error) {
    console.error('Error adding custom domain:', error);
    throw error;
  }
};

// Get custom domain by domain name
const getCustomDomainByDomain = async (domain) => {
  try {
    const client = await mainPool.connect();
    const result = await client.query(`
      SELECT cd.*, t.school_name, t.tenant_id 
      FROM custom_domains cd
      JOIN tenants t ON cd.tenant_id = t.tenant_id
      WHERE cd.domain = $1 AND cd.status = 'active'
    `, [domain]);
    
    client.release();
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting custom domain:', error);
    throw error;
  }
};

// Update domain verification status
const updateDomainVerificationStatus = async (domain, status) => {
  try {
    const client = await mainPool.connect();
    await client.query(`
      UPDATE custom_domains 
      SET verification_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE domain = $2
    `, [status, domain]);
    
    client.release();
    return true;
  } catch (error) {
    console.error('Error updating domain verification status:', error);
    throw error;
  }
};

// Get tenant branding
const getTenantBranding = async (tenantId) => {
  try {
    const client = await mainPool.connect();
    const result = await client.query(`
      SELECT * FROM tenant_branding WHERE tenant_id = $1
    `, [tenantId]);
    
    client.release();
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting tenant branding:', error);
    throw error;
  }
};

// Update tenant branding
const updateTenantBranding = async (tenantId, brandingData) => {
  try {
    const client = await mainPool.connect();
    
    const {
      logo_data,
      logo_filename,
      logo_mimetype,
      primary_color,
      secondary_color,
      accent_color,
      font_family,
      custom_css
    } = brandingData;
    
    await client.query(`
      INSERT INTO tenant_branding (tenant_id, logo_data, logo_filename, logo_mimetype, primary_color, secondary_color, accent_color, font_family, custom_css)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (tenant_id) 
      DO UPDATE SET 
        logo_data = EXCLUDED.logo_data,
        logo_filename = EXCLUDED.logo_filename,
        logo_mimetype = EXCLUDED.logo_mimetype,
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        accent_color = EXCLUDED.accent_color,
        font_family = EXCLUDED.font_family,
        custom_css = EXCLUDED.custom_css,
        updated_at = CURRENT_TIMESTAMP
    `, [tenantId, logo_data, logo_filename, logo_mimetype, primary_color, secondary_color, accent_color, font_family, custom_css]);
    
    client.release();
    return true;
  } catch (error) {
    console.error('Error updating tenant branding:', error);
    throw error;
  }
};

// Get tenant by custom domain
const getTenantByCustomDomain = async (domain) => {
  try {
    const client = await mainPool.connect();
    const result = await client.query(`
      SELECT t.*, cd.verification_status
      FROM tenants t
      JOIN custom_domains cd ON t.tenant_id = cd.tenant_id
      WHERE cd.domain = $1 AND cd.status = 'active' AND cd.verification_status = 'verified'
    `, [domain]);
    
    client.release();
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting tenant by custom domain:', error);
    throw error;
  }
};

module.exports = {
  mainPool,
  createTenantPool,
  initializeMainDatabase,
  createTenantDatabase,
  dropTenantDatabase,
  checkDomainExists,
  addCustomDomain,
  getCustomDomainByDomain,
  updateDomainVerificationStatus,
  getTenantBranding,
  updateTenantBranding,
  getTenantByCustomDomain,
  generateVerificationToken
}; 