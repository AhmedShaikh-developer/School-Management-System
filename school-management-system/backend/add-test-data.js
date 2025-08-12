const { Pool } = require('pg');
require('dotenv').config();

// Function to create tenant-specific database pool
const createTenantPool = (tenantId) => {
  const tenantDbName = `${process.env.TENANT_DB_PREFIX}${tenantId}`;
  
  return new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: tenantDbName,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
};

// Add test data for a specific tenant
const addTestData = async (tenantId) => {
  try {
    console.log(`Adding test data for tenant: ${tenantId}`);
    
    const tenantPool = createTenantPool(tenantId);
    const client = await tenantPool.connect();

    try {
      // Add academic year
      await client.query(`
        INSERT INTO academic_years (year_name, start_date, end_date, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
      `, ['2024-2025', '2024-09-01', '2025-06-30', 'active']);

      // Add classes
      await client.query(`
        INSERT INTO classes (class_name, grade_level, capacity, academic_year, status)
        VALUES 
          ($1, $2, $3, $4, $5),
          ($2, $6, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, ['Class 1A', 'Grade 1', 30, '2024-2025', 'active', 'Grade 1']);

      await client.query(`
        INSERT INTO classes (class_name, grade_level, capacity, academic_year, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, ['Class 2A', 'Grade 2', 30, '2024-2025', 'active']);

      // Add students
      await client.query(`
        INSERT INTO students (student_id, first_name, last_name, email, class_id, status)
        VALUES 
          ($1, $2, $3, $4, $5, $6),
          ($7, $8, $9, $10, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, ['ST001', 'John', 'Doe', 'john.doe@school.com', 1, 'active', 'ST002', 'Jane', 'Smith', 'jane.smith@school.com', 1, 'active']);

      await client.query(`
        INSERT INTO students (student_id, first_name, last_name, email, class_id, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, ['ST003', 'Bob', 'Johnson', 'bob.johnson@school.com', 2, 'active']);

      console.log('Test data added successfully!');
      console.log('- Academic Year: 2024-2025');
      console.log('- Classes: Class 1A (Grade 1), Class 2A (Grade 2)');
      console.log('- Students: John Doe, Jane Smith, Bob Johnson');

    } finally {
      client.release();
      tenantPool.end();
    }

  } catch (error) {
    console.error('Error adding test data:', error);
  }
};

// Main execution
const main = async () => {
  const tenantId = process.argv[2];
  
  if (!tenantId) {
    console.error('Please provide a tenant ID as an argument');
    console.log('Usage: node add-test-data.js <tenant_id>');
    process.exit(1);
  }

  await addTestData(tenantId);
  process.exit(0);
};

main();
