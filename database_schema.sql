-- ============================================
-- SCHOOL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- PostgreSQL Database Schema
-- ============================================

-- ============================================
-- MAIN DATABASE SCHEMA
-- ============================================

-- Database: school_management
-- This is the main database that manages all tenants

-- ============================================
-- TABLE: tenants
-- ============================================
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
);

-- ============================================
-- TABLE: custom_domains
-- ============================================
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
);

-- ============================================
-- TABLE: tenant_branding
-- ============================================
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
);

-- ============================================
-- TABLE: tenant_biometric_settings
-- ============================================
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
);

-- ============================================
-- TABLE: super_admins
-- ============================================
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
);

-- ============================================
-- TABLE: admin_users
-- ============================================
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
);

-- ============================================
-- TABLE: database_migrations
-- ============================================
CREATE TABLE IF NOT EXISTS database_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'completed'
);

-- ============================================
-- INSERT DEFAULT SUPER ADMIN
-- ============================================
-- Password: admin123 (bcrypt hash)
INSERT INTO super_admins (username, email, password_hash, full_name, role)
VALUES ('admin', 'binsolswork@gmail.com', '$2a$10$r8K8hO5LZtN.1p5ZqQY8XuYFk5ZxXnBkXpXkXkXkXkXkXkXkXk', 'Super Administrator', 'super_admin')
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- TENANT DATABASE SCHEMA (Per Tenant)
-- ============================================
-- Each tenant gets their own database with the following schema

-- Note: Run this schema for EACH tenant database
-- Replace 'tenant_db_name' with actual tenant database name

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: teachers
-- ============================================
CREATE TABLE IF NOT EXISTS teachers (
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
);

-- ============================================
-- TABLE: classes
-- ============================================
CREATE TABLE IF NOT EXISTS classes (
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
);

-- ============================================
-- TABLE: academic_years
-- ============================================
CREATE TABLE IF NOT EXISTS academic_years (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    label VARCHAR(50) NOT NULL,
    year_name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: students
-- ============================================
CREATE TABLE IF NOT EXISTS students (
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
    ay_id INTEGER REFERENCES academic_years(id),
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
);

-- ============================================
-- TABLE: student_documents
-- ============================================
CREATE TABLE IF NOT EXISTS student_documents (
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
);

-- ============================================
-- TABLE: student_transfers
-- ============================================
CREATE TABLE IF NOT EXISTS student_transfers (
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
);

-- ============================================
-- TABLE: student_attendance_summary
-- ============================================
CREATE TABLE IF NOT EXISTS student_attendance_summary (
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
);

-- ============================================
-- TABLE: attendance_config
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_config (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id),
    attendance_mode VARCHAR(20) DEFAULT 'manual',
    grace_time_minutes INTEGER DEFAULT 15,
    cut_off_time_minutes INTEGER DEFAULT 30,
    sms_alerts_enabled BOOLEAN DEFAULT TRUE,
    offline_mode_enabled BOOLEAN DEFAULT FALSE,
    conflict_resolution VARCHAR(20) DEFAULT 'latest',
    alert_types TEXT[] DEFAULT ARRAY['late', 'absent'],
    alert_time TIME DEFAULT '09:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: attendance
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    class_id INTEGER REFERENCES classes(id),
    date DATE NOT NULL,
    time_in TIME,
    time_out TIME,
    status VARCHAR(20) NOT NULL,
    attendance_mode VARCHAR(20) NOT NULL,
    device_id VARCHAR(100),
    location_data JSONB,
    remarks TEXT,
    recorded_by INTEGER REFERENCES teachers(id),
    conflict_resolved BOOLEAN DEFAULT FALSE,
    conflict_resolution_method VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: qr_codes
-- ============================================
CREATE TABLE IF NOT EXISTS qr_codes (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id),
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES teachers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: biometric_devices
-- ============================================
CREATE TABLE IF NOT EXISTS biometric_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(100) UNIQUE NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50),
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    last_sync TIMESTAMP,
    configuration JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: sms_alerts
-- ============================================
CREATE TABLE IF NOT EXISTS sms_alerts (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: attendance_conflicts
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_conflicts (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    class_id INTEGER REFERENCES classes(id),
    date DATE NOT NULL,
    conflict_type VARCHAR(50),
    conflict_data JSONB,
    resolution_method VARCHAR(20),
    resolved_by INTEGER REFERENCES teachers(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: offline_attendance_queue
-- ============================================
CREATE TABLE IF NOT EXISTS offline_attendance_queue (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    class_id INTEGER REFERENCES classes(id),
    date DATE NOT NULL,
    time_in TIME,
    time_out TIME,
    status VARCHAR(20) NOT NULL,
    device_id VARCHAR(100),
    sync_status VARCHAR(20) DEFAULT 'pending',
    sync_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: fee_structures
-- ============================================
CREATE TABLE IF NOT EXISTS fee_structures (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id),
    ay_id INTEGER REFERENCES academic_years(id),
    tuition_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    library_fee DECIMAL(10,2) DEFAULT 0,
    lab_fee DECIMAL(10,2) DEFAULT 0,
    sports_fee DECIMAL(10,2) DEFAULT 0,
    transport_fee DECIMAL(10,2) DEFAULT 0,
    examination_fee DECIMAL(10,2) DEFAULT 0,
    development_fee DECIMAL(10,2) DEFAULT 0,
    other_fees JSONB,
    total_annual_fee DECIMAL(10,2) NOT NULL,
    installments INTEGER DEFAULT 1,
    installment_amount DECIMAL(10,2) NOT NULL,
    due_dates JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, ay_id)
);

-- ============================================
-- TABLE: fee_vouchers
-- ============================================
CREATE TABLE IF NOT EXISTS fee_vouchers (
    id SERIAL PRIMARY KEY,
    voucher_number VARCHAR(50) UNIQUE NOT NULL,
    student_id INTEGER REFERENCES students(id),
    class_id INTEGER REFERENCES classes(id),
    ay_id INTEGER REFERENCES academic_years(id),
    fee_structure_id INTEGER REFERENCES fee_structures(id),
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    scholarship_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    generated_date DATE DEFAULT CURRENT_DATE,
    generated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: fee_payments
-- ============================================
CREATE TABLE IF NOT EXISTS fee_payments (
    id SERIAL PRIMARY KEY,
    voucher_id INTEGER REFERENCES fee_vouchers(id),
    student_id INTEGER REFERENCES students(id),
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(100),
    gateway_reference VARCHAR(100),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    notes TEXT,
    processed_by INTEGER REFERENCES users(id),
    gateway_response JSONB,
    status VARCHAR(20) DEFAULT 'completed',
    refund_amount DECIMAL(10,2) DEFAULT 0,
    refund_date DATE,
    refund_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: discounts
-- ============================================
CREATE TABLE IF NOT EXISTS discounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    applicable_to VARCHAR(20) NOT NULL,
    class_ids INTEGER[],
    student_ids INTEGER[],
    max_amount DECIMAL(10,2),
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: scholarships
-- ============================================
CREATE TABLE IF NOT EXISTS scholarships (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    criteria TEXT NOT NULL,
    max_students INTEGER,
    current_recipients INTEGER DEFAULT 0,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: student_scholarships
-- ============================================
CREATE TABLE IF NOT EXISTS student_scholarships (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    scholarship_id INTEGER REFERENCES scholarships(id),
    awarded_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, scholarship_id, valid_from)
);

-- ============================================
-- TABLE: fee_reminders
-- ============================================
CREATE TABLE IF NOT EXISTS fee_reminders (
    id SERIAL PRIMARY KEY,
    voucher_id INTEGER REFERENCES fee_vouchers(id),
    student_id INTEGER REFERENCES students(id),
    reminder_type VARCHAR(20) NOT NULL,
    sent_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'queued',
    message_content TEXT NOT NULL,
    gateway_response JSONB,
    retry_count INTEGER DEFAULT 0,
    next_retry TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: sms_queue
-- ============================================
CREATE TABLE IF NOT EXISTS sms_queue (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'medium',
    scheduled_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'queued',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    gateway_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: email_queue
-- ============================================
CREATE TABLE IF NOT EXISTS email_queue (
    id SERIAL PRIMARY KEY,
    email_address VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    html_content TEXT,
    priority VARCHAR(10) DEFAULT 'medium',
    scheduled_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'queued',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    gateway_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: payment_gateways
-- ============================================
CREATE TABLE IF NOT EXISTS payment_gateways (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    secret_key VARCHAR(255) NOT NULL,
    webhook_url VARCHAR(500),
    is_active BOOLEAN DEFAULT FALSE,
    test_mode BOOLEAN DEFAULT TRUE,
    currency VARCHAR(10) DEFAULT 'INR',
    supported_methods JSONB,
    configuration JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: receipt_sequences
-- ============================================
CREATE TABLE IF NOT EXISTS receipt_sequences (
    id SERIAL PRIMARY KEY,
    prefix VARCHAR(10) NOT NULL,
    current_number INTEGER DEFAULT 1,
    fiscal_year VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(prefix, fiscal_year)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Main Database Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_custom_domains_tenant_id ON custom_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON custom_domains(status);

-- Tenant Database Indexes
CREATE INDEX IF NOT EXISTS idx_students_tenant_id ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_ay_id ON students(ay_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_classes_tenant_id ON classes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_academic_years_tenant_id ON academic_years(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_status ON academic_years(status);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_mode ON attendance(attendance_mode);
CREATE INDEX IF NOT EXISTS idx_attendance_config_class_id ON attendance_config(class_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_class_valid ON qr_codes(class_id, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_sms_alerts_status ON sms_alerts(status);
CREATE INDEX IF NOT EXISTS idx_offline_queue_sync_status ON offline_attendance_queue(sync_status);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class_ay ON fee_structures(class_id, ay_id);
CREATE INDEX IF NOT EXISTS idx_fee_vouchers_student_id ON fee_vouchers(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_vouchers_status ON fee_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_fee_vouchers_due_date ON fee_vouchers(due_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_voucher_id ON fee_payments(voucher_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_status ON fee_payments(status);
CREATE INDEX IF NOT EXISTS idx_student_scholarships_student_id ON student_scholarships(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_reminders_voucher_id ON fee_reminders(voucher_id);
CREATE INDEX IF NOT EXISTS idx_sms_queue_status_priority ON sms_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_email_queue_status_priority ON email_queue(status, priority);

-- ============================================
-- END OF SCHEMA
-- ============================================
