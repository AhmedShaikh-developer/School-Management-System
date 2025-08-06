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

module.exports = {
  mainPool,
  createTenantPool,
  initializeMainDatabase,
  createTenantDatabase,
  dropTenantDatabase,
  checkDomainExists
}; 