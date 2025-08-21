const express = require('express');
const router = express.Router();
const { authenticateTenant } = require('../middleware/tenantAuth');
const {
  createAcademicYear,
  getAcademicYears,
  getAcademicYear,
  getActiveAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  activateAcademicYear,
  checkAttendancePrerequisites
} = require('../controllers/academicYearController');

// Apply tenant authentication middleware to all routes
router.use(authenticateTenant);

// Academic Year CRUD routes
router.post('/', createAcademicYear);
router.get('/', getAcademicYears);
router.get('/active', getActiveAcademicYear);
router.get('/:id', getAcademicYear);
router.put('/:id', updateAcademicYear);
router.delete('/:id', deleteAcademicYear);

// Special routes
router.post('/:id/activate', activateAcademicYear);
router.get('/prerequisites/attendance', checkAttendancePrerequisites);

module.exports = router;
