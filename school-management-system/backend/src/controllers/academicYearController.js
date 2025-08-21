const AcademicYear = require('../models/academicYear');

// Create new academic year
const createAcademicYear = async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const { label, startDate, endDate, status = 'draft' } = req.body;
    
    if (!label || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Label, start date, and end date are required'
      });
    }
    
    const academicYear = await AcademicYear.create(tenantId, label, startDate, endDate, status);
    
    res.status(201).json({
      success: true,
      data: academicYear,
      message: 'Academic year created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create academic year',
      details: error.message
    });
  }
};

// Get all academic years for a tenant
const getAcademicYears = async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    
    const academicYears = await AcademicYear.getAll(tenantId);
    
    res.json({
      success: true,
      data: academicYears
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve academic years',
      details: error.message
    });
  }
};

// Get academic year by ID
const getAcademicYear = async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const { id } = req.params;
    
    const academicYear = await AcademicYear.getById(tenantId, id);
    
    if (!academicYear) {
      return res.status(404).json({
        success: false,
        error: 'Academic year not found'
      });
    }
    
    res.json({
      success: true,
      data: academicYear
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve academic year',
      details: error.message
    });
  }
};

// Get active academic year for a tenant
const getActiveAcademicYear = async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    
    const activeAY = await AcademicYear.getActive(tenantId);
    
    res.json({
      success: true,
      data: activeAY
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve active academic year',
      details: error.message
    });
  }
};

// Update academic year
const updateAcademicYear = async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const { id } = req.params;
    const updates = req.body;
    
    // Validate allowed fields
    const allowedFields = ['label', 'startDate', 'endDate', 'status'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });
    
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    const academicYear = await AcademicYear.update(tenantId, id, filteredUpdates);
    
    res.json({
      success: true,
      data: academicYear,
      message: 'Academic year updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update academic year',
      details: error.message
    });
  }
};

// Delete academic year
const deleteAcademicYear = async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const { id } = req.params;
    
    const academicYear = await AcademicYear.delete(tenantId, id);
    
    res.json({
      success: true,
      data: academicYear,
      message: 'Academic year deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete academic year',
      details: error.message
    });
  }
};

// Activate academic year
const activateAcademicYear = async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const { id } = req.params;
    
    const academicYear = await AcademicYear.activate(tenantId, id);
    
    res.json({
      success: true,
      data: academicYear,
      message: 'Academic year activated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to activate academic year',
      details: error.message
    });
  }
};

// Check attendance prerequisites
const checkAttendancePrerequisites = async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    
    const prerequisites = await AcademicYear.checkAttendancePrerequisites(tenantId);
    
    res.json({
      success: true,
      data: prerequisites
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check attendance prerequisites',
      details: error.message
    });
  }
};

module.exports = {
  createAcademicYear,
  getAcademicYears,
  getAcademicYear,
  getActiveAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  activateAcademicYear,
  checkAttendancePrerequisites
};
