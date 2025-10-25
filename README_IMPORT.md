# Database Import Guide - School Management System

## Overview
This is a **multi-tenant** system where:
- **1 Main Database** (`school_management`) - Manages all tenants
- **N Tenant Databases** (one per school) - Each school has isolated data
- All tenant databases use the **SAME schema** but have **different data**

## Database Structure

```
PostgreSQL
├── school_management (Main database)
│   ├── tenants
│   ├── custom_domains
│   ├── tenant_branding
│   ├── super_admins
│   └── ...
│
└── Tenant Databases (One per school)
    ├── school_fg_school
    ├── school_foundation
    ├── school_hello
    ├── school_helpchild
    ├── school_high_hopes
    ├── school_himayat
    ├── school_hope_full
    └── ... (more schools)
```

**Each tenant database** contains:
- users, teachers, students
- classes, academic_years
- attendance, fee_management
- All school-specific data

## Import Instructions

### Method 1: Fresh Import (No Existing Data)

#### Step 1: Import Main Database
```bash
# Create main database
createdb -U postgres school_management

# Import schema
psql -U postgres -d school_management < database_schema_main.sql
```

#### Step 2: Create All Tenant Databases
```bash
# For each school, create database and import schema

# School 1
createdb -U postgres school_fg_school
psql -U postgres -d school_fg_school < database_schema_tenant.sql

# School 2
createdb -U postgres school_foundation
psql -U postgres -d school_foundation < database_schema_tenant.sql

# School 3
createdb -U postgres school_hello
psql -U postgres -d school_hello < database_schema_tenant.sql

# School 4
createdb -U postgres school_helpchild
psql -U postgres -d school_helpchild < database_schema_tenant.sql

# School 5
createdb -U postgres school_high_hopes
psql -U postgres -d school_high_hopes < database_schema_tenant.sql

# School 6
createdb -U postgres school_himayat
psql -U postgres -d school_himayat < database_schema_tenant.sql

# School 7
createdb -U postgres school_hope_full
psql -U postgres -d school_hope_full < database_schema_tenant.sql
```

### Method 2: Import with Existing Data

#### Step 1: Export All Databases (from old PC)
```bash
# Export main database
pg_dump -U postgres -d school_management > main_db_backup.sql

# Export each tenant database
pg_dump -U postgres -d school_fg_school > school_fg_school_backup.sql
pg_dump -U postgres -d school_foundation > school_foundation_backup.sql
pg_dump -U postgres -d school_hello > school_hello_backup.sql
pg_dump -U postgres -d school_helpchild > school_helpchild_backup.sql
pg_dump -U postgres -d school_high_hopes > school_high_hopes_backup.sql
pg_dump -U postgres -d school_himayat > school_himayat_backup.sql
pg_dump -U postgres -d school_hope_full > school_hope_full_backup.sql
```

#### Step 2: Import All Databases (to new PC)
```bash
# Import main database
createdb -U postgres school_management
psql -U postgres -d school_management < main_db_backup.sql

# Import each tenant database
createdb -U postgres school_fg_school
psql -U postgres -d school_fg_school < school_fg_school_backup.sql

createdb -U postgres school_foundation
psql -U postgres -d school_foundation < school_foundation_backup.sql

createdb -U postgres school_hello
psql -U postgres -d school_hello < school_hello_backup.sql

createdb -U postgres school_helpchild
psql -U postgres -d school_helpchild < school_helpchild_backup.sql

createdb -U postgres school_high_hopes
psql -U postgres -d school_high_hopes < school_high_hopes_backup.sql

createdb -U postgres school_himayat
psql -U postgres -d school_himayat < school_himayat_backup.sql

createdb -U postgres school_hope_full
psql -U postgres -d school_hope_full < school_hope_full_backup.sql
```

### Method 3: Automated Import Script

Create `import_all.sh`:

```bash
#!/bin/bash

# Set your database credentials
DB_USER="postgres"
DB_PASSWORD="your_password"

# List of all tenant databases
DATABASES=(
    "school_fg_school"
    "school_foundation"
    "school_hello"
    "school_helpchild"
    "school_high_hopes"
    "school_himayat"
    "school_hope_full"
)

echo "========================================="
echo "Importing School Management Databases"
echo "========================================="

# Import main database
echo "1. Creating main database..."
createdb -U $DB_USER school_management

echo "2. Importing main database schema..."
psql -U $DB_USER -d school_management < database_schema_main.sql

# Import each tenant database
for db in "${DATABASES[@]}"; do
    echo "3. Creating and importing $db..."
    createdb -U $DB_USER $db
    psql -U $DB_USER -d $db < database_schema_tenant.sql
    
    # If you have backup files, uncomment this:
    # psql -U $DB_USER -d $db < ${db}_backup.sql
done

echo "========================================="
echo "Import completed successfully!"
echo "========================================="
```

Run it:
```bash
chmod +x import_all.sh
./import_all.sh
```

## Using pgAdmin (GUI Method - Like phpMyAdmin)

### Import Main Database:
1. Open pgAdmin
2. Right-click **Databases** → **Create** → **Database**
3. Name: `school_management`
4. Right-click `school_management` → **Query Tool**
5. Click **Folder icon** → Select `database_schema_main.sql`
6. Click **Execute**

### Import Each Tenant Database:
1. Right-click **Databases** → **Create** → **Database**
2. Name: `school_fg_school` (or any tenant name)
3. Right-click the database → **Query Tool**
4. Click **Folder icon** → Select `database_schema_tenant.sql`
5. Click **Execute**
6. Repeat for each school

## File Structure

```
project/
├── database_schema_main.sql     # Main database schema only
├── database_schema_tenant.sql   # Tenant database schema (used for each school)
├── database_schema.sql          # Combined schema (both main + tenant)
├── import_databases.sql         # Master import script
├── README_IMPORT.md            # This file
└── backups/                     # Your backup files
    ├── main_db_backup.sql
    ├── school_fg_school_backup.sql
    ├── school_foundation_backup.sql
    └── ... (more backups)
```

## Important Notes

1. **Each school has isolated data** - Schools cannot see each other's data
2. **Same schema, different data** - All tenant databases use identical structure
3. **Main database manages tenants** - Keeps track of all schools
4. **Red 'X' icons** - These indicate dropped databases that need restoration
5. **Always backup first** - Before importing, export your current data

## Quick Reference Commands

```bash
# List all databases
psql -U postgres -c "\l"

# Connect to a database
psql -U postgres -d school_management

# List tables in a database
psql -U postgres -d school_fg_school -c "\dt"

# Export database
pg_dump -U postgres -d database_name > backup.sql

# Import database
psql -U postgres -d database_name < backup.sql
```

## Troubleshooting

### Issue: "database already exists"
```bash
# Drop and recreate
dropdb -U postgres school_name
createdb -U postgres school_name
psql -U postgres -d school_name < database_schema_tenant.sql
```

### Issue: "Permission denied"
```bash
# Fix ownership
sudo chown postgres:postgres /path/to/database_files
```

### Issue: "Connection refused"
```bash
# Start PostgreSQL service
sudo systemctl start postgresql  # Linux
brew services start postgresql   # Mac
net start postgresql             # Windows
```

## Verification

After importing, verify all databases exist:
```sql
SELECT datname FROM pg_database 
WHERE datname LIKE 'school_%' 
ORDER BY datname;
```

You should see:
- school_management (main)
- school_fg_school
- school_foundation
- school_hello
- school_helpchild
- school_high_hopes
- school_himayat
- school_hope_full

## Support

For issues, check:
1. PostgreSQL is running
2. User has proper permissions
3. Database names match exactly
4. Backup files are complete
5. Port 5432 is accessible
