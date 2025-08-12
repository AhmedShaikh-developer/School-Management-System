const AttendanceService = require('../services/attendanceService');
const { mainPool } = require('../config/database');

// Get attendance configuration for a class
const getAttendanceConfig = async (req, res) => {
  try {
    const { tenantId, classId } = req.params;
    const attendanceService = new AttendanceService(tenantId);
    
    const config = await attendanceService.getAttendanceConfig(classId);
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error getting attendance config:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting attendance configuration'
    });
  }
};

// Update attendance configuration for a class
const updateAttendanceConfig = async (req, res) => {
  try {
    const { tenantId, classId } = req.params;
    const config = req.body;
    
    const attendanceService = new AttendanceService(tenantId);
    const updatedConfig = await attendanceService.updateAttendanceConfig(classId, config);
    
    res.json({
      success: true,
      data: updatedConfig,
      message: 'Attendance configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating attendance config:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating attendance configuration'
    });
  }
};

// Record attendance
const recordAttendance = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const attendanceData = req.body;
    
    const attendanceService = new AttendanceService(tenantId);
    const record = await attendanceService.recordAttendance(attendanceData);
    
    res.json({
      success: true,
      data: record,
      message: 'Attendance recorded successfully'
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error recording attendance'
    });
  }
};

// Generate QR code for attendance
const generateQRCode = async (req, res) => {
  try {
    const { tenantId, classId } = req.params;
    const { validFrom, validUntil } = req.body;
    const createdBy = req.user?.id || 1; // Default to admin if not authenticated
    
    const attendanceService = new AttendanceService(tenantId);
    const qrCode = await attendanceService.generateQRCode(classId, validFrom, validUntil, createdBy);
    
    res.json({
      success: true,
      data: qrCode,
      message: 'QR code generated successfully'
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating QR code'
    });
  }
};

// Get tenant attendance settings
const getTenantAttendanceSettings = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Get tenant-specific database connection
    const { createTenantPool } = require('../config/database');
    const tenantPool = createTenantPool(tenantId);
    const tenantClient = await tenantPool.connect();

    try {
      // Get attendance configuration
      const configResult = await tenantClient.query(`
        SELECT * FROM attendance_config ORDER BY id DESC LIMIT 1
      `);
      
      // Get classes for selection
      const classesResult = await tenantClient.query(`
        SELECT id, class_name, grade_level FROM classes WHERE status = 'active' ORDER BY class_name
      `);

      // Get biometric settings from main database
      const mainPool = require('../config/database').mainPool;
      const mainClient = await mainPool.connect();
      const biometricResult = await mainClient.query(`
        SELECT biometric_enabled, device_configuration, allowed_devices, max_devices
        FROM tenant_biometric_settings WHERE tenant_id = $1
      `, [tenantId]);
      mainClient.release();

      const settings = {
        attendance_policies: {
          grace_time_minutes: configResult.rows[0]?.grace_time_minutes || 15,
          cut_off_time_minutes: configResult.rows[0]?.cut_off_time_minutes || 30,
          late_rules: configResult.rows[0]?.late_rules || 'standard'
        },
        mode_selection: {
          manual: true,
          qr: true,
          biometric: biometricResult.rows[0]?.biometric_enabled || false
        },
        class_selection: classesResult.rows.map(c => ({
          id: c.id,
          name: c.class_name,
          grade: c.grade_level
        })),
        sms_alerts: {
          enabled: configResult.rows[0]?.sms_alerts_enabled || false,
          alert_types: configResult.rows[0]?.alert_types || ['late', 'absent'],
          time: configResult.rows[0]?.alert_time || '09:00'
        },
        device_config: {
          enabled: biometricResult.rows[0]?.biometric_enabled || false,
          configuration: biometricResult.rows[0]?.device_configuration || {},
          allowed_devices: biometricResult.rows[0]?.allowed_devices || [],
          max_devices: biometricResult.rows[0]?.max_devices || 5
        }
      };

      res.json({
        success: true,
        data: settings
      });

    } finally {
      tenantClient.release();
      tenantPool.end();
    }

  } catch (error) {
    console.error('Error getting tenant attendance settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting attendance settings'
    });
  }
};

// Update tenant attendance settings
const updateTenantAttendanceSettings = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const settings = req.body;
    
    // Get tenant-specific database connection
    const { createTenantPool } = require('../config/database');
    const tenantPool = createTenantPool(tenantId);
    const tenantClient = await tenantPool.connect();

    try {
      // Update or create attendance configuration
      const configResult = await tenantClient.query(`
        INSERT INTO attendance_config (
          attendance_mode, grace_time_minutes, cut_off_time_minutes, 
          sms_alerts_enabled, offline_mode_enabled, conflict_resolution
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          attendance_mode = EXCLUDED.attendance_mode,
          grace_time_minutes = EXCLUDED.grace_time_minutes,
          cut_off_time_minutes = EXCLUDED.cut_off_time_minutes,
          sms_alerts_enabled = EXCLUDED.sms_alerts_enabled,
          offline_mode_enabled = EXCLUDED.offline_mode_enabled,
          conflict_resolution = EXCLUDED.cut_off_time_minutes,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        settings.mode_selection.manual ? 'manual' : (settings.mode_selection.qr ? 'qr' : 'biometric'),
        settings.attendance_policies.grace_time_minutes,
        settings.attendance_policies.cut_off_time_minutes,
        settings.sms_alerts.enabled,
        false, // offline_mode_enabled
        'latest' // conflict_resolution
      ]);

      res.json({
        success: true,
        data: configResult.rows[0],
        message: 'Attendance settings updated successfully'
      });

    } finally {
      tenantClient.release();
      tenantPool.end();
    }

  } catch (error) {
    console.error('Error updating tenant attendance settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating attendance settings'
    });
  }
};

// Validate QR code for attendance
const validateQRCode = async (req, res) => {
  try {
    const { tenantId, classId } = req.params;
    const { qrCode } = req.body;
    
    const attendanceService = new AttendanceService(tenantId);
    const isValid = await attendanceService.validateQRCode(qrCode, classId);
    
    res.json({
      success: true,
      data: { isValid: !!isValid, qrCode: isValid },
      message: isValid ? 'QR code is valid' : 'QR code is invalid or expired'
    });
  } catch (error) {
    console.error('Error validating QR code:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error validating QR code'
    });
  }
};

// Get attendance report
const getAttendanceReport = async (req, res) => {
  try {
    const { tenantId, classId } = req.params;
    const { startDate, endDate } = req.query;
    
    const attendanceService = new AttendanceService(tenantId);
    const report = await attendanceService.getAttendanceReport(classId, startDate, endDate);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error getting attendance report:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting attendance report'
    });
  }
};

// Get attendance statistics
const getAttendanceStatistics = async (req, res) => {
  try {
    const { tenantId, classId } = req.params;
    const { date } = req.query;
    
    const attendanceService = new AttendanceService(tenantId);
    const statistics = await attendanceService.getAttendanceStatistics(classId, date);
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error getting attendance statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting attendance statistics'
    });
  }
};

// Sync offline attendance
const syncOfflineAttendance = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const attendanceService = new AttendanceService(tenantId);
    await attendanceService.syncOfflineAttendance();
    
    res.json({
      success: true,
      message: 'Offline attendance synced successfully'
    });
  } catch (error) {
    console.error('Error syncing offline attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing offline attendance'
    });
  }
};

// Get biometric devices for a tenant
const getBiometricDevices = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const attendanceService = new AttendanceService(tenantId);
    
    const client = await attendanceService.tenantPool.connect();
    const result = await client.query(`
      SELECT * FROM biometric_devices WHERE status = 'active'
      ORDER BY device_name
    `);
    client.release();
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting biometric devices:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting biometric devices'
    });
  }
};

// Add biometric device
const addBiometricDevice = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const deviceData = req.body;
    
    const attendanceService = new AttendanceService(tenantId);
    const client = await attendanceService.tenantPool.connect();
    
    const result = await client.query(`
      INSERT INTO biometric_devices (
        device_id, device_name, device_type, location, configuration
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [deviceData.device_id, deviceData.device_name, deviceData.device_type, 
        deviceData.location, JSON.stringify(deviceData.configuration || {})]);
    
    client.release();
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Biometric device added successfully'
    });
  } catch (error) {
    console.error('Error adding biometric device:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding biometric device'
    });
  }
};

// Update biometric device
const updateBiometricDevice = async (req, res) => {
  try {
    const { tenantId, deviceId } = req.params;
    const deviceData = req.body;
    
    const attendanceService = new AttendanceService(tenantId);
    const client = await attendanceService.tenantPool.connect();
    
    const result = await client.query(`
      UPDATE biometric_devices 
      SET device_name = $1, device_type = $2, location = $3, 
          configuration = $4, updated_at = CURRENT_TIMESTAMP
      WHERE device_id = $5
      RETURNING *
    `, [deviceData.device_name, deviceData.device_type, deviceData.location,
        JSON.stringify(deviceData.configuration || {}), deviceId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Biometric device not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Biometric device updated successfully'
    });
  } catch (error) {
    console.error('Error updating biometric device:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating biometric device'
    });
  }
};

// Delete biometric device
const deleteBiometricDevice = async (req, res) => {
  try {
    const { tenantId, deviceId } = req.params;
    
    const attendanceService = new AttendanceService(tenantId);
    const client = await attendanceService.tenantPool.connect();
    
    const result = await client.query(`
      UPDATE biometric_devices 
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE device_id = $1
      RETURNING *
    `, [deviceId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Biometric device not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Biometric device deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting biometric device:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting biometric device'
    });
  }
};

// Get SMS alerts
const getSMSAlerts = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { status, startDate, endDate } = req.query;
    
    const attendanceService = new AttendanceService(tenantId);
    const client = await attendanceService.tenantPool.connect();
    
    let query = `
      SELECT sa.*, s.first_name, s.last_name, s.student_id
      FROM sms_alerts sa
      JOIN students s ON sa.student_id = s.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ` AND sa.status = $${params.length + 1}`;
      params.push(status);
    }
    
    if (startDate) {
      query += ` AND sa.created_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND sa.created_at <= $${params.length + 1}`;
      params.push(endDate);
    }
    
    query += ` ORDER BY sa.created_at DESC`;
    
    const result = await client.query(query, params);
    client.release();
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting SMS alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting SMS alerts'
    });
  }
};

// Resend failed SMS alerts
const resendFailedSMSAlerts = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { alertIds } = req.body;
    
    const attendanceService = new AttendanceService(tenantId);
    const client = await attendanceService.tenantPool.connect();
    
    const failedAlerts = await client.query(`
      SELECT * FROM sms_alerts 
      WHERE id = ANY($1) AND status = 'failed'
    `, [alertIds]);
    
    const results = [];
    for (const alert of failedAlerts.rows) {
      try {
        // Resend SMS
        const smsResult = await attendanceService.sendSMS(alert.phone_number, alert.message);
        
        if (smsResult.success) {
          await client.query(`
            UPDATE sms_alerts 
            SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [alert.id]);
          results.push({ id: alert.id, status: 'sent' });
        } else {
          results.push({ id: alert.id, status: 'failed', error: smsResult.error });
        }
      } catch (error) {
        results.push({ id: alert.id, status: 'failed', error: error.message });
      }
    }
    
    client.release();
    
    res.json({
      success: true,
      data: results,
      message: 'SMS alerts processed'
    });
  } catch (error) {
    console.error('Error resending SMS alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error resending SMS alerts'
    });
  }
};

module.exports = {
  getAttendanceConfig,
  updateAttendanceConfig,
  recordAttendance,
  generateQRCode,
  validateQRCode,
  getAttendanceReport,
  getAttendanceStatistics,
  syncOfflineAttendance,
  getBiometricDevices,
  addBiometricDevice,
  updateBiometricDevice,
  deleteBiometricDevice,
  getSMSAlerts,
  resendFailedSMSAlerts,
  getTenantAttendanceSettings,
  updateTenantAttendanceSettings
};
