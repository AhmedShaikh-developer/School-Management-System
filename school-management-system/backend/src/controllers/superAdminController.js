const { mainPool } = require('../config/database');

// Get all tenants with biometric settings
const getAllTenantsWithBiometricSettings = async (req, res) => {
  try {
    const client = await mainPool.connect();
    const result = await client.query(`
      SELECT 
        t.tenant_id,
        t.school_name,
        t.domain,
        t.status,
        tbs.biometric_enabled,
        tbs.device_configuration,
        tbs.allowed_devices,
        tbs.max_devices,
        tbs.created_at as biometric_created_at,
        tbs.updated_at as biometric_updated_at
      FROM tenants t
      LEFT JOIN tenant_biometric_settings tbs ON t.tenant_id = tbs.tenant_id
      ORDER BY t.school_name
    `);
    client.release();

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting tenants with biometric settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting tenants with biometric settings'
    });
  }
};

// Get biometric settings for a specific tenant
const getTenantBiometricSettings = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const client = await mainPool.connect();
    
    const result = await client.query(`
      SELECT 
        t.tenant_id,
        t.school_name,
        tbs.biometric_enabled,
        tbs.device_configuration,
        tbs.allowed_devices,
        tbs.max_devices,
        tbs.created_at,
        tbs.updated_at
      FROM tenants t
      LEFT JOIN tenant_biometric_settings tbs ON t.tenant_id = tbs.tenant_id
      WHERE t.tenant_id = $1
    `, [tenantId]);
    
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting tenant biometric settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting tenant biometric settings'
    });
  }
};

// Update biometric settings for a tenant
const updateTenantBiometricSettings = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const {
      biometric_enabled,
      device_configuration,
      allowed_devices,
      max_devices
    } = req.body;

    const client = await mainPool.connect();
    
    // Check if tenant exists
    const tenantCheck = await client.query(`
      SELECT tenant_id FROM tenants WHERE tenant_id = $1
    `, [tenantId]);

    if (tenantCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Update or insert biometric settings
    const result = await client.query(`
      INSERT INTO tenant_biometric_settings (
        tenant_id, biometric_enabled, device_configuration, allowed_devices, max_devices
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tenant_id) DO UPDATE SET
        biometric_enabled = EXCLUDED.biometric_enabled,
        device_configuration = EXCLUDED.device_configuration,
        allowed_devices = EXCLUDED.allowed_devices,
        max_devices = EXCLUDED.max_devices,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [tenantId, biometric_enabled, JSON.stringify(device_configuration || {}), 
        allowed_devices || [], max_devices || 5]);

    client.release();

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Biometric settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating tenant biometric settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating tenant biometric settings'
    });
  }
};

// Enable biometric attendance for a tenant
const enableBiometricAttendance = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { device_configuration, allowed_devices, max_devices } = req.body;

    const client = await mainPool.connect();
    
    const result = await client.query(`
      INSERT INTO tenant_biometric_settings (
        tenant_id, biometric_enabled, device_configuration, allowed_devices, max_devices
      ) VALUES ($1, true, $2, $3, $4)
      ON CONFLICT (tenant_id) DO UPDATE SET
        biometric_enabled = true,
        device_configuration = EXCLUDED.device_configuration,
        allowed_devices = EXCLUDED.allowed_devices,
        max_devices = EXCLUDED.max_devices,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [tenantId, JSON.stringify(device_configuration || {}), 
        allowed_devices || [], max_devices || 5]);

    client.release();

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Biometric attendance enabled successfully'
    });
  } catch (error) {
    console.error('Error enabling biometric attendance:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error enabling biometric attendance'
    });
  }
};

// Disable biometric attendance for a tenant
const disableBiometricAttendance = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const client = await mainPool.connect();
    
    const result = await client.query(`
      UPDATE tenant_biometric_settings 
      SET biometric_enabled = false, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1
      RETURNING *
    `, [tenantId]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant biometric settings not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Biometric attendance disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling biometric attendance:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error disabling biometric attendance'
    });
  }
};

// Get biometric attendance statistics
const getBiometricAttendanceStats = async (req, res) => {
  try {
    const client = await mainPool.connect();
    
    // Get overall statistics
    const overallStats = await client.query(`
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(CASE WHEN tbs.biometric_enabled = true THEN 1 END) as biometric_enabled_count,
        COUNT(CASE WHEN tbs.biometric_enabled = false OR tbs.biometric_enabled IS NULL THEN 1 END) as biometric_disabled_count
      FROM tenants t
      LEFT JOIN tenant_biometric_settings tbs ON t.tenant_id = tbs.tenant_id
    `);

    // Get recent biometric usage
    const recentUsage = await client.query(`
      SELECT 
        t.school_name,
        t.tenant_id,
        COUNT(a.id) as attendance_count
      FROM tenants t
      JOIN tenant_biometric_settings tbs ON t.tenant_id = tbs.tenant_id
      LEFT JOIN LATERAL (
        SELECT id FROM ${process.env.TENANT_DB_PREFIX}${t.tenant_id}.attendance 
        WHERE attendance_mode = 'biometric' 
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      ) a ON true
      WHERE tbs.biometric_enabled = true
      GROUP BY t.school_name, t.tenant_id
      ORDER BY attendance_count DESC
    `);

    client.release();

    res.json({
      success: true,
      data: {
        overall: overallStats.rows[0],
        recent_usage: recentUsage.rows
      }
    });
  } catch (error) {
    console.error('Error getting biometric attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting biometric attendance statistics'
    });
  }
};

// Get device configuration for a tenant
const getTenantDeviceConfiguration = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const client = await mainPool.connect();
    
    const result = await client.query(`
      SELECT device_configuration, allowed_devices, max_devices
      FROM tenant_biometric_settings
      WHERE tenant_id = $1
    `, [tenantId]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant biometric settings not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting tenant device configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting tenant device configuration'
    });
  }
};

// Update device configuration for a tenant
const updateTenantDeviceConfiguration = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { device_configuration, allowed_devices, max_devices } = req.body;

    const client = await mainPool.connect();
    
    const result = await client.query(`
      UPDATE tenant_biometric_settings 
      SET device_configuration = $1, allowed_devices = $2, max_devices = $3, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $4
      RETURNING *
    `, [JSON.stringify(device_configuration || {}), allowed_devices || [], max_devices || 5, tenantId]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant biometric settings not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Device configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating tenant device configuration:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating tenant device configuration'
    });
  }
};

module.exports = {
  getAllTenantsWithBiometricSettings,
  getTenantBiometricSettings,
  updateTenantBiometricSettings,
  enableBiometricAttendance,
  disableBiometricAttendance,
  getBiometricAttendanceStats,
  getTenantDeviceConfiguration,
  updateTenantDeviceConfiguration
};
