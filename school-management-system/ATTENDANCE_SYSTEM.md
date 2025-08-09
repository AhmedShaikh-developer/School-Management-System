# 🎯 Attendance Management System

## 📋 **Overview**

The Attendance Management System is a comprehensive solution for managing student attendance across multiple modes, with advanced features like SMS alerts, conflict resolution, and biometric integration.

## 🎯 **Key Features**

### **1. Multiple Attendance Modes**
- ✅ **Manual Mode**: Traditional teacher-based attendance recording
- ✅ **QR Code Mode**: QR code-based attendance with time-limited codes
- ✅ **Biometric Mode**: Fingerprint/facial recognition attendance (super admin controlled)

### **2. Advanced Configuration**
- ✅ **Grace Time**: Configurable grace period for late arrivals
- ✅ **Cut-off Time**: Configurable cut-off time for attendance
- ✅ **SMS Alerts**: Automatic SMS notifications for absences/late arrivals
- ✅ **Offline Mode**: Attendance recording without internet connection
- ✅ **Conflict Resolution**: Automatic handling of duplicate entries

### **3. Super Admin Controls**
- ✅ **Biometric Toggle**: Enable/disable biometric attendance per school
- ✅ **Device Management**: Configure biometric devices and settings
- ✅ **Usage Statistics**: Monitor biometric attendance usage across tenants

## 🏗️ **Architecture**

### **Database Schema**

#### **Main Database Tables**
```sql
-- Super admin controls for biometric attendance
CREATE TABLE tenant_biometric_settings (
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
```

#### **Tenant Database Tables**
```sql
-- Attendance configuration per class
CREATE TABLE attendance_config (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id),
  attendance_mode VARCHAR(20) DEFAULT 'manual', -- manual, qr, biometric
  grace_time_minutes INTEGER DEFAULT 15,
  cut_off_time_minutes INTEGER DEFAULT 30,
  sms_alerts_enabled BOOLEAN DEFAULT TRUE,
  offline_mode_enabled BOOLEAN DEFAULT FALSE,
  conflict_resolution VARCHAR(20) DEFAULT 'latest', -- latest, earliest, manual
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance records
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
);

-- QR codes for attendance
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
);

-- Biometric devices
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
);

-- SMS alerts
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
);

-- Attendance conflicts
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
);

-- Offline attendance queue
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
);
```

## 🔧 **API Endpoints**

### **Attendance Management**
```
GET    /api/attendance/config/:tenantId/:classId          # Get attendance config
PUT    /api/attendance/config/:tenantId/:classId          # Update attendance config
POST   /api/attendance/record/:tenantId                   # Record attendance
POST   /api/attendance/qr/generate/:tenantId/:classId     # Generate QR code
POST   /api/attendance/qr/validate/:tenantId/:classId     # Validate QR code
GET    /api/attendance/report/:tenantId/:classId          # Get attendance report
GET    /api/attendance/statistics/:tenantId/:classId      # Get attendance statistics
POST   /api/attendance/sync/offline/:tenantId             # Sync offline attendance
```

### **Biometric Device Management**
```
GET    /api/attendance/devices/:tenantId                  # Get biometric devices
POST   /api/attendance/devices/:tenantId                  # Add biometric device
PUT    /api/attendance/devices/:tenantId/:deviceId        # Update biometric device
DELETE /api/attendance/devices/:tenantId/:deviceId        # Delete biometric device
```

### **SMS Alerts**
```
GET    /api/attendance/sms/:tenantId                      # Get SMS alerts
POST   /api/attendance/sms/resend/:tenantId               # Resend failed SMS alerts
```

### **Super Admin Controls**
```
GET    /api/super-admin/tenants/biometric                 # Get all tenants with biometric settings
GET    /api/super-admin/tenants/:tenantId/biometric       # Get tenant biometric settings
PUT    /api/super-admin/tenants/:tenantId/biometric       # Update tenant biometric settings
POST   /api/super-admin/tenants/:tenantId/biometric/enable    # Enable biometric attendance
POST   /api/super-admin/tenants/:tenantId/biometric/disable   # Disable biometric attendance
GET    /api/super-admin/biometric/stats                   # Get biometric statistics
GET    /api/super-admin/tenants/:tenantId/devices         # Get device configuration
PUT    /api/super-admin/tenants/:tenantId/devices         # Update device configuration
```

## 🎨 **Frontend Components**

### **AttendanceAdmin Component**
- Class selection and configuration
- Attendance mode settings (manual, QR, biometric)
- Grace time and cut-off time configuration
- SMS alerts and offline mode toggles
- Conflict resolution settings
- Quick actions (QR generation, offline sync, SMS resend)
- Biometric device management
- SMS alerts monitoring

### **SuperAdminBiometric Component**
- Overview statistics
- Tenant biometric settings management
- Enable/disable biometric attendance per tenant
- Device configuration management
- Recent usage monitoring

## 🔄 **Workflow**

### **1. Manual Attendance**
1. Teacher selects class
2. Teacher records attendance for each student
3. System applies grace time and cut-off time rules
4. SMS alerts sent if enabled
5. Attendance stored in database

### **2. QR Code Attendance**
1. Teacher generates QR code for class
2. QR code valid for specified time period
3. Students scan QR code with mobile app
4. System validates QR code and records attendance
5. SMS alerts sent if enabled

### **3. Biometric Attendance**
1. Super admin enables biometric for tenant
2. Biometric devices configured
3. Students register biometric data
4. Students use biometric devices for attendance
5. System validates and records attendance
6. SMS alerts sent if enabled

### **4. Conflict Resolution**
1. System detects attendance conflicts
2. Applies configured resolution method
3. Logs conflict details
4. Resolves automatically or flags for manual review

### **5. Offline Mode**
1. Attendance recorded locally when offline
2. Queued for sync when connection restored
3. Automatic sync on reconnection
4. Conflict resolution for offline entries

## 🔐 **Security Features**

- **Biometric Access Control**: Only super admin can enable biometric attendance
- **Device Validation**: Only authorized devices can record biometric attendance
- **QR Code Security**: Time-limited QR codes with unique identifiers
- **Conflict Detection**: Automatic detection and resolution of attendance conflicts
- **Audit Trail**: Complete logging of all attendance activities

## 📊 **Monitoring & Analytics**

- **Attendance Statistics**: Daily, weekly, monthly attendance reports
- **Biometric Usage**: Usage statistics across all tenants
- **SMS Alert Status**: Monitoring of SMS delivery success/failure
- **Conflict Resolution**: Tracking of attendance conflicts and resolutions
- **Device Status**: Monitoring of biometric device health and sync status

## 🚀 **Deployment**

### **Environment Variables**
```bash
# SMS Configuration
SMS_API_KEY=your_sms_api_key
SMS_API_URL=https://api.smsprovider.com/send
SMS_SENDER_ID=YOUR_SCHOOL

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_management
DB_USER=postgres
DB_PASSWORD=your_password
TENANT_DB_PREFIX=tenant_
```

### **Installation Steps**
1. **Database Setup**: Run the database migration scripts
2. **Backend Setup**: Install dependencies and configure environment variables
3. **Frontend Setup**: Install dependencies and configure API endpoints
4. **SMS Setup**: Configure SMS provider credentials
5. **Biometric Setup**: Configure biometric devices and settings

## 🎯 **Future Enhancements**

- **Facial Recognition**: Advanced facial recognition for attendance
- **Geolocation**: Location-based attendance validation
- **Mobile App**: Native mobile app for QR code scanning
- **Analytics Dashboard**: Advanced analytics and reporting
- **Integration**: Integration with existing school management systems
- **AI-Powered Insights**: AI-driven attendance pattern analysis

## 📞 **Support**

For technical support or questions about the Attendance Management System, please refer to the main project documentation or contact the development team.
