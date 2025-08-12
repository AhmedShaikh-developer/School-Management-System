# Attendance System Setup Guide

## Overview
The attendance system provides comprehensive attendance management with support for manual, QR code, and biometric attendance modes. The system includes prerequisite checks to ensure proper setup before enabling attendance features.

## Prerequisites
Before the attendance system can be configured, the following must be in place:

1. **Academic Year**: Must have an active academic year configured
2. **Classes**: At least one class must exist
3. **Students**: At least one student must be enrolled
4. **Biometric Feature**: Must be enabled by Super Admin (for biometric mode)

## Dashboard Status Indicators

### Domain & Branding
- **Setup Required**: No branding configuration exists
- **Configured**: Branding has been set up

### Attendance System
- **Locked**: Prerequisites not met (academic year, classes, or students missing)
- **Ready to Setup**: Prerequisites met, but attendance not configured
- **Configured**: Attendance system fully configured

## Setting Up Prerequisites

### 1. Add Academic Year, Classes, and Students
Use the test data script to quickly set up prerequisites:

```bash
cd backend
node add-test-data.js <tenant_id>
```

This will create:
- Academic Year: 2024-2025
- Classes: Class 1A (Grade 1), Class 2A (Grade 2)
- Students: John Doe, Jane Smith, Bob Johnson

### 2. Enable Biometric Attendance (Optional)
If you want to use biometric attendance, enable it for your tenant:

```bash
cd backend
node enable-biometric.js <tenant_id>
```

## Attendance Configuration

### Attendance Policies
- **Grace Time**: Minutes allowed after scheduled time before marking as late
- **Cut-off Time**: Minutes after scheduled time when attendance is no longer accepted
- **Late Rules**: Standard, Strict, or Flexible policies for handling late arrivals

### Mode Selection
- **Manual**: Traditional attendance marking by teachers
- **QR Code**: Students scan QR codes to mark attendance
- **Biometric**: Fingerprint/face recognition attendance (requires Super Admin approval)

### Class Selection
Select which classes will use the attendance system. Only active classes are shown.

### SMS Alerts
- **Enable/Disable**: Toggle SMS notifications
- **Alert Types**: Choose from Late, Absent, Early Departure
- **Alert Time**: When to send daily attendance summaries

### Device Configuration (Biometric Only)
- **Maximum Devices**: Limit on number of biometric devices
- **Allowed Devices**: Specific device IDs that can be used

## API Endpoints

### Get Setup Status
```
GET /api/tenants/{tenantId}/setup-status
```
Returns the current status of all modules and their prerequisites.

### Get Attendance Settings
```
GET /api/attendance/settings/{tenantId}
```
Returns current attendance configuration for the tenant.

### Update Attendance Settings
```
PUT /api/attendance/settings/{tenantId}
```
Updates attendance configuration. Requires tenant authentication.

## Troubleshooting

### Attendance System Shows "Locked"
1. Check if academic year exists: `SELECT * FROM academic_years WHERE status = 'active'`
2. Check if classes exist: `SELECT * FROM classes WHERE status = 'active'`
3. Check if students exist: `SELECT * FROM students WHERE status = 'active'`

### Biometric Mode Not Available
1. Ensure Super Admin has enabled biometric for your tenant
2. Check `tenant_biometric_settings` table in main database
3. Run `node enable-biometric.js <tenant_id>` if needed

### Settings Not Saving
1. Verify tenant authentication token is valid
2. Check browser console for error messages
3. Ensure all required fields are filled

## Database Schema

### New Tables Added
- `academic_years`: Academic year management
- `attendance_config`: Attendance system configuration
- `tenant_biometric_settings`: Biometric feature flags

### Key Fields
- `grace_time_minutes`: Grace period for late arrivals
- `cut_off_time_minutes`: Maximum time for attendance
- `attendance_mode`: Selected attendance method
- `sms_alerts_enabled`: SMS notification toggle
- `biometric_enabled`: Biometric feature flag

## Security Features
- JWT-based authentication required for all operations
- Tenant isolation ensures data privacy
- Super Admin controls biometric feature availability
- Input validation on all configuration fields

## Future Enhancements
- Offline attendance support
- Advanced reporting and analytics
- Integration with external systems
- Mobile app support
- Real-time attendance monitoring
