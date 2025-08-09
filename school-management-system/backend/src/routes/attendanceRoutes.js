const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/attendanceController');

// Attendance configuration routes
router.get('/config/:tenantId/:classId', getAttendanceConfig);
router.put('/config/:tenantId/:classId', updateAttendanceConfig);

// Attendance recording routes
router.post('/record/:tenantId', recordAttendance);

// QR code routes
router.post('/qr/generate/:tenantId/:classId', generateQRCode);
router.post('/qr/validate/:tenantId/:classId', validateQRCode);

// Report routes
router.get('/report/:tenantId/:classId', getAttendanceReport);
router.get('/statistics/:tenantId/:classId', getAttendanceStatistics);

// Offline sync routes
router.post('/sync/offline/:tenantId', syncOfflineAttendance);

// Biometric device routes
router.get('/devices/:tenantId', getBiometricDevices);
router.post('/devices/:tenantId', addBiometricDevice);
router.put('/devices/:tenantId/:deviceId', updateBiometricDevice);
router.delete('/devices/:tenantId/:deviceId', deleteBiometricDevice);

// SMS alert routes
router.get('/sms/:tenantId', getSMSAlerts);
router.post('/sms/resend/:tenantId', resendFailedSMSAlerts);

module.exports = router;
