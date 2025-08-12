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

// Enable biometric for a specific tenant
const enableBiometric = async (tenantId) => {
  try {
    console.log(`Enabling biometric attendance for tenant: ${tenantId}`);
    
    const client = await mainPool.connect();

    try {
      // Check if tenant exists
      const tenantResult = await client.query(
        'SELECT tenant_id, school_name FROM tenants WHERE tenant_id = $1 AND status = $2',
        [tenantId, 'active']
      );

      if (tenantResult.rows.length === 0) {
        console.error('Tenant not found or not active');
        return;
      }

      const tenant = tenantResult.rows[0];
      console.log(`Found tenant: ${tenant.school_name}`);

      // Insert or update biometric settings
      await client.query(`
        INSERT INTO tenant_biometric_settings (tenant_id, biometric_enabled, device_configuration, allowed_devices, max_devices)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tenant_id) DO UPDATE SET
          biometric_enabled = EXCLUDED.biometric_enabled,
          device_configuration = EXCLUDED.device_configuration,
          allowed_devices = EXCLUDED.allowed_devices,
          max_devices = EXCLUDED.max_devices,
          updated_at = CURRENT_TIMESTAMP
      `, [
        tenantId,
        true, // biometric_enabled
        JSON.stringify({}), // device_configuration
        [], // allowed_devices
        5 // max_devices
      ]);

      console.log('Biometric attendance enabled successfully!');
      console.log(`Tenant: ${tenant.school_name}`);
      console.log('Max devices: 5');
      console.log('Status: Enabled');

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error enabling biometric:', error);
  }
};

// Main execution
const main = async () => {
  const tenantId = process.argv[2];
  
  if (!tenantId) {
    console.error('Please provide a tenant ID as an argument');
    console.log('Usage: node enable-biometric.js <tenant_id>');
    process.exit(1);
  }

  await enableBiometric(tenantId);
  await mainPool.end();
  process.exit(0);
};

main();
