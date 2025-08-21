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
const createTenantPool = (tenantId, databaseName = null) => {
  let tenantDbName;
  
  if (databaseName) {
    // Use the provided database name (for new tenants with clean names)
    tenantDbName = databaseName;
  } else {
    // Fallback to old naming pattern (for existing tenants)
    tenantDbName = `${process.env.TENANT_DB_PREFIX}${tenantId}`;
  }
  
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
        phone VARCHAR(20),
        school_type VARCHAR(50),
        student_count INTEGER,
        address TEXT,
        website VARCHAR(255),
        database_name VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add database_name column to existing tenants table if it doesn't exist
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tenants' 
            AND column_name = 'database_name'
          ) THEN
            -- Add the column as nullable first
            ALTER TABLE tenants ADD COLUMN database_name VARCHAR(100);
            
            -- Populate existing records with their current database names
            UPDATE tenants 
            SET database_name = 'school_tenant_' || REPLACE(tenant_id, 'tenant_', '')
            WHERE database_name IS NULL;
            
            -- Make the column NOT NULL after populating it
            ALTER TABLE tenants ALTER COLUMN database_name SET NOT NULL;
            
            RAISE NOTICE 'Added database_name column to tenants table and populated existing records';
          ELSE
            RAISE NOTICE 'database_name column already exists in tenants table';
          END IF;
        END $$;
      `);
    } catch (migrationError) {
      // Continue even if migration fails
    }

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

    // Create super admin controls for biometric attendance
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_biometric_settings (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) UNIQUE NOT NULL,
        biometric_enabled BOOLEAN DEFAULT FALSE,
        device_configuration JSONB,
        allowed_devices TEXT[],
        max_devices INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
      )
    `);

    // Create super admins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'super_admin',
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default super admin if not exists
    const bcrypt = require('bcryptjs');
    const defaultPassword = process.env.SUPER_ADMIN_DEFAULT_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    await client.query(`
      INSERT INTO super_admins (username, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role
    `, ['admin', 'binsolswork@gmail.com', hashedPassword, 'Super Administrator', 'super_admin']);

    // Migrate existing tenant_branding table if needed
    try {
      // Check if logo_data column exists
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tenant_branding' AND column_name = 'logo_data'
      `);
      
      if (columnCheck.rows.length === 0) {
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
      }
    } catch (migrationError) {
      // Continue even if migration fails
    }

    // Create admin users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
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
  } catch (error) {
    console.error('Error initializing main database:', error);
    throw error;
  }
};

// Create tenant database schema
const createTenantDatabase = async (tenantId, schoolName, databaseName = null) => {
  let tenantDbName;
  
  if (databaseName) {
    // Use the provided database name (for new tenants with clean names)
    tenantDbName = databaseName;
  } else {
    // Fallback to old naming pattern (for backward compatibility)
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
    if (schoolName && schoolName.toLowerCase() !== 'school' && schoolName.toLowerCase() !== 'new') {
      baseDbName = `school_${sanitizeDatabaseName(schoolName)}`;
    } else {
      // Fallback to timestamp-based name if school name is too generic
      baseDbName = `school_${Date.now().toString(36)}`;
    }
    
    // Check if database name already exists and add suffix if needed
    tenantDbName = baseDbName;
    let counter = 1;
    
    const client = await mainPool.connect();
    try {
      while (true) {
        const exists = await client.query(`
          SELECT 1 FROM pg_database WHERE datname = $1
        `, [tenantDbName]);
        
        if (exists.rows.length === 0) {
          break; // Name is available
        }
        
        // Name exists, try with suffix
        tenantDbName = `${baseDbName}_${counter}`;
        counter++;
        
        // Prevent infinite loop (max 100 attempts)
        if (counter > 100) {
          throw new Error(`Could not find available database name after 100 attempts`);
        }
      }
    } finally {
      client.release();
    }
  }
  
  try {
    // Create database with the clean name
    const client = await mainPool.connect();
    await client.query(`CREATE DATABASE "${tenantDbName}"`);
    client.release();

    // Create tenant-specific pool
    const tenantPool = createTenantPool(tenantId, tenantDbName);
    const tenantClient = await tenantPool.connect();

    // Create users table (existing)
    await tenantClient.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create students table (extended)
    await tenantClient.query(`
      CREATE TABLE students (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        student_id VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        date_of_birth DATE,
        gender VARCHAR(10),
        address TEXT,
        parent_id INTEGER,
        class_id INTEGER REFERENCES classes(id),
        enrollment_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'active',
        photo_url VARCHAR(500),
        biometric_data JSONB,
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        emergency_contact_relationship VARCHAR(50),
        medical_conditions TEXT,
        allergies TEXT,
        blood_group VARCHAR(5),
        nationality VARCHAR(50),
        religion VARCHAR(50),
        mother_tongue VARCHAR(50),
        previous_school VARCHAR(255),
        academic_year VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create student documents table
    await tenantClient.query(`
      CREATE TABLE student_documents (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        document_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        document_type VARCHAR(50) DEFAULT 'general',
        description TEXT,
        uploaded_by INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create student transfers table
    await tenantClient.query(`
      CREATE TABLE student_transfers (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        from_class_id INTEGER REFERENCES classes(id),
        to_class_id INTEGER REFERENCES classes(id) NOT NULL,
        transfer_reason TEXT,
        effective_date DATE NOT NULL,
        approved_by INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'completed',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create student attendance summary table
    await tenantClient.query(`
      CREATE TABLE student_attendance_summary (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        class_id INTEGER REFERENCES classes(id),
        academic_year VARCHAR(20),
        month INTEGER,
        year INTEGER,
        total_days INTEGER DEFAULT 0,
        present_days INTEGER DEFAULT 0,
        absent_days INTEGER DEFAULT 0,
        late_days INTEGER DEFAULT 0,
        attendance_percentage DECIMAL(5,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, class_id, academic_year, month, year)
      )
    `);

    // Create teachers table (extended)
    await tenantClient.query(`
      CREATE TABLE teachers (
        id SERIAL PRIMARY KEY,
        teacher_id VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        qualification TEXT,
        experience_years INTEGER,
        subjects TEXT[],
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create classes table (extended)
    await tenantClient.query(`
      CREATE TABLE classes (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        class_name VARCHAR(100) NOT NULL,
        grade_level VARCHAR(50) NOT NULL,
        section VARCHAR(50),
        capacity INTEGER DEFAULT 30,
        teacher_id INTEGER REFERENCES teachers(id),
        academic_year VARCHAR(20),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create academic years table
    await tenantClient.query(`
      CREATE TABLE academic_years (
        id SERIAL PRIMARY KEY,
        year_name VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create attendance configuration table
    await tenantClient.query(`
      CREATE TABLE attendance_config (
        id SERIAL PRIMARY KEY,
        class_id INTEGER REFERENCES classes(id),
        attendance_mode VARCHAR(20) DEFAULT 'manual', -- manual, qr, biometric
        grace_time_minutes INTEGER DEFAULT 15,
        cut_off_time_minutes INTEGER DEFAULT 30,
        sms_alerts_enabled BOOLEAN DEFAULT TRUE,
        offline_mode_enabled BOOLEAN DEFAULT FALSE,
        conflict_resolution VARCHAR(20) DEFAULT 'latest', -- latest, earliest, manual
        alert_types TEXT[] DEFAULT ARRAY['late', 'absent'], -- Array of alert types
        alert_time TIME DEFAULT '09:00', -- Time to send alerts
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create attendance records table
    await tenantClient.query(`
      CREATE TABLE attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        class_id INTEGER REFERENCES classes(id),
        date DATE NOT NULL,
        time_in TIME,
        time_out TIME,
        status VARCHAR(20) NOT NULL, -- present, absent, late, early_departure
        attendance_mode VARCHAR(20) NOT NULL, -- manual, qr, biometric
        device_id VARCHAR(100),
        location_data JSONB,
        remarks TEXT,
        recorded_by INTEGER REFERENCES teachers(id),
        conflict_resolved BOOLEAN DEFAULT FALSE,
        conflict_resolution_method VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create QR codes table for QR-based attendance
    await tenantClient.query(`
      CREATE TABLE qr_codes (
        id SERIAL PRIMARY KEY,
        class_id INTEGER REFERENCES classes(id),
        qr_code VARCHAR(255) UNIQUE NOT NULL,
        valid_from TIMESTAMP NOT NULL,
        valid_until TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES teachers(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create biometric devices table
    await tenantClient.query(`
      CREATE TABLE biometric_devices (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(100) UNIQUE NOT NULL,
        device_name VARCHAR(255) NOT NULL,
        device_type VARCHAR(50), -- fingerprint, facial, iris
        location VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        last_sync TIMESTAMP,
        configuration JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create SMS alerts table
    await tenantClient.query(`
      CREATE TABLE sms_alerts (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        alert_type VARCHAR(50) NOT NULL, -- absence, late, early_departure
        message TEXT NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create attendance conflicts table
    await tenantClient.query(`
      CREATE TABLE attendance_conflicts (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        class_id INTEGER REFERENCES classes(id),
        date DATE NOT NULL,
        conflict_type VARCHAR(50), -- duplicate_entry, time_overlap, device_mismatch
        conflict_data JSONB,
        resolution_method VARCHAR(20),
        resolved_by INTEGER REFERENCES teachers(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create offline attendance queue table
    await tenantClient.query(`
      CREATE TABLE offline_attendance_queue (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        class_id INTEGER REFERENCES classes(id),
        date DATE NOT NULL,
        time_in TIME,
        time_out TIME,
        status VARCHAR(20) NOT NULL,
        device_id VARCHAR(100),
        sync_status VARCHAR(20) DEFAULT 'pending', -- pending, synced, failed
        sync_attempts INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add indexes for better performance
    await tenantClient.query(`
      CREATE INDEX idx_students_tenant_id ON students(tenant_id);
      CREATE INDEX idx_students_class_id ON students(class_id);
      CREATE INDEX idx_classes_tenant_id ON classes(tenant_id);
      CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);
      CREATE INDEX idx_attendance_class_date ON attendance(class_id, date);
      CREATE INDEX idx_attendance_mode ON attendance(attendance_mode);
      CREATE INDEX idx_attendance_config_class_id ON attendance_config(class_id);
      CREATE INDEX idx_qr_codes_class_valid ON qr_codes(class_id, valid_from, valid_until);
      CREATE INDEX idx_sms_alerts_status ON sms_alerts(status);
      CREATE INDEX idx_offline_queue_sync_status ON offline_attendance_queue(sync_status);
    `);

    tenantClient.release();
    tenantPool.end();
    
    return tenantDbName; // Return the database name for storage in tenants table
  } catch (error) {
    console.error(`Error creating tenant database ${tenantDbName}:`, error);
    throw error;
  }
};

// Drop tenant database (for rollback)
const dropTenantDatabase = async (tenantId, databaseName = null) => {
  let tenantDbName;
  
  if (databaseName) {
    // Use the provided database name (for new tenants with clean names)
    tenantDbName = databaseName;
  } else {
    // Fallback to old naming pattern (for existing tenants)
    tenantDbName = `${process.env.TENANT_DB_PREFIX}${tenantId}`;
  }
  
  try {
    const client = await mainPool.connect();
    await client.query(`DROP DATABASE IF EXISTS "${tenantDbName}"`);
    client.release();
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
    
    // Use CASE statements to handle empty strings properly
    await client.query(`
      INSERT INTO tenant_branding (tenant_id, logo_data, logo_filename, logo_mimetype, primary_color, secondary_color, accent_color, font_family, custom_css)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (tenant_id) 
      DO UPDATE SET 
        logo_data = EXCLUDED.logo_data,
        logo_filename = EXCLUDED.logo_filename,
        logo_mimetype = EXCLUDED.logo_mimetype,
        primary_color = CASE 
          WHEN EXCLUDED.primary_color IS NOT NULL AND EXCLUDED.primary_color != '' 
          THEN EXCLUDED.primary_color 
          ELSE tenant_branding.primary_color 
        END,
        secondary_color = CASE 
          WHEN EXCLUDED.secondary_color IS NOT NULL AND EXCLUDED.secondary_color != '' 
          THEN EXCLUDED.secondary_color 
          ELSE tenant_branding.secondary_color 
        END,
        accent_color = CASE 
          WHEN EXCLUDED.accent_color IS NOT NULL AND EXCLUDED.accent_color != '' 
          THEN EXCLUDED.accent_color 
          ELSE tenant_branding.accent_color 
        END,
        font_family = CASE 
          WHEN EXCLUDED.font_family IS NOT NULL AND EXCLUDED.font_family != '' 
          THEN EXCLUDED.font_family 
          ELSE tenant_branding.font_family 
        END,
        custom_css = COALESCE(EXCLUDED.custom_css, tenant_branding.custom_css),
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

// Check if any migrations are needed
const checkMigrationsNeeded = async () => {
  try {
    const client = await mainPool.connect();
    
    // Check if migrations table exists
    const migrationCheck = await client.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'database_migrations'
    `);
    
    if (migrationCheck.rows.length === 0) {
      // Migrations table doesn't exist, migration needed
      client.release();
      return true;
    }
    
    // Check if attendance config migration has been applied
    const attendanceMigration = await client.query(`
      SELECT 1 FROM database_migrations 
      WHERE migration_name = 'attendance_config_columns_v1'
    `);
    
    // Check if tenant_id columns migration has been applied
    const tenantIdMigration = await client.query(`
      SELECT 1 FROM database_migrations 
      WHERE migration_name = 'add_tenant_id_columns_v1'
    `);
    
    client.release();
    
    // Return true if any migration is needed, false if all are applied
    return attendanceMigration.rows.length === 0 || tenantIdMigration.rows.length === 0;
    
  } catch (error) {
    console.error('Error checking migrations:', error);
    // If we can't check, assume migration is needed for safety
    return true;
  }
};

// Migrate existing tenant databases to add new attendance config columns
const migrateTenantDatabases = async () => {
  try {
    const client = await mainPool.connect();
    
    // Check if migration has already been completed
    const migrationCheck = await client.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'database_migrations'
    `);
    
    // Create migrations tracking table if it doesn't exist
    if (migrationCheck.rows.length === 0) {
      await client.query(`
        CREATE TABLE database_migrations (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'completed'
        )
      `);
    }
    
    // Check if attendance config migration has already been applied
    const attendanceMigration = await client.query(`
      SELECT 1 FROM database_migrations 
      WHERE migration_name = 'attendance_config_columns_v1'
    `);
    
    // Check if tenant_id columns migration has already been applied
    const tenantIdMigration = await client.query(`
      SELECT 1 FROM database_migrations 
      WHERE migration_name = 'add_tenant_id_columns_v1'
    `);
    
    // Get all tenant databases
    const tenantsResult = await client.query(`
      SELECT tenant_id, database_name FROM tenants WHERE status = 'active'
    `);
    
    for (const tenant of tenantsResult.rows) {
      try {
        const tenantPool = createTenantPool(tenant.tenant_id, tenant.database_name);
        const tenantClient = await tenantPool.connect();
        
        try {
          // Migration 1: Add attendance config columns if needed
          if (attendanceMigration.rows.length === 0) {
            const columnCheck = await tenantClient.query(`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_name = 'attendance_config' AND column_name = 'alert_types'
            `);
            
            if (columnCheck.rows.length === 0) {
              await tenantClient.query(`
                ALTER TABLE attendance_config 
                ADD COLUMN IF NOT EXISTS alert_types TEXT[] DEFAULT ARRAY['late', 'absent'],
                ADD COLUMN IF NOT EXISTS alert_time TIME DEFAULT '09:00'
              `);
            }
          }
          
          // Migration 2: Add tenant_id columns if needed
          if (tenantIdMigration.rows.length === 0) {
            // Check if classes table has tenant_id column
            const classesColumnCheck = await tenantClient.query(`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_name = 'classes' AND column_name = 'tenant_id'
            `);
            
            if (classesColumnCheck.rows.length === 0) {
              await tenantClient.query(`
                ALTER TABLE classes 
                ADD COLUMN tenant_id VARCHAR(50) NOT NULL DEFAULT $1
              `, [tenant.tenant_id]);
            }
            
            // Check if students table has tenant_id column
            const studentsColumnCheck = await tenantClient.query(`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_name = 'students' AND column_name = 'tenant_id'
            `);
            
            if (studentsColumnCheck.rows.length === 0) {
              await tenantClient.query(`
                ALTER TABLE students 
                ADD COLUMN tenant_id VARCHAR(50) NOT NULL DEFAULT $1
              `, [tenant.tenant_id]);
            }
            
            // Add indexes for tenant_id columns
            try {
              await tenantClient.query(`
                CREATE INDEX IF NOT EXISTS idx_students_tenant_id ON students(tenant_id);
                CREATE INDEX IF NOT EXISTS idx_classes_tenant_id ON classes(tenant_id);
              `);
            } catch (indexError) {
              // Indexes might already exist, continue
            }
          }
          
        } finally {
          tenantClient.release();
          tenantPool.end();
        }
      } catch (error) {
        console.error(`Error migrating ${tenant.database_name}:`, error);
        // Continue with other tenants
      }
    }
    
    // Mark migrations as completed
    if (attendanceMigration.rows.length === 0) {
      await client.query(`
        INSERT INTO database_migrations (migration_name, status)
        VALUES ('attendance_config_columns_v1', 'completed')
        ON CONFLICT (migration_name) DO NOTHING
      `);
    }
    
    if (tenantIdMigration.rows.length === 0) {
      await client.query(`
        INSERT INTO database_migrations (migration_name, status)
        VALUES ('add_tenant_id_columns_v1', 'completed')
        ON CONFLICT (migration_name) DO NOTHING
      `);
    }
    
    client.release();
    
  } catch (error) {
    console.error('Error during tenant database migration:', error);
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
  generateVerificationToken,
  migrateTenantDatabases,
  checkMigrationsNeeded
}; 