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
  resendFailedSMSAlerts
};
