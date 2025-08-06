# Deployment Guide

## 🚀 Production Deployment

### Prerequisites
- Node.js (v16+)
- PostgreSQL (v12+)
- PM2 (for process management)
- Nginx (for reverse proxy)

### 1. Server Setup

#### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

### 2. Database Setup

#### Create Production Database
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE school_management_prod;
CREATE USER school_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE school_management_prod TO school_user;
\q
```

### 3. Application Deployment

#### Clone and Setup
```bash
# Clone repository
git clone <your-repo-url>
cd school-management-system

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

#### Environment Configuration
```bash
# Backend .env
cd backend
cp env.local .env
# Edit .env with production settings
```

```env
# Production Backend .env
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_management_prod
DB_USER=school_user
DB_PASSWORD=secure_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_production_email@gmail.com
EMAIL_PASS=your_app_password
APP_URL=https://yourdomain.com
API_URL=https://yourdomain.com/api
```

#### Build Frontend
```bash
cd frontend
npm run build
```

### 4. PM2 Configuration

#### Create PM2 Ecosystem File
```bash
# Create ecosystem.config.js in root
```

```javascript
module.exports = {
  apps: [
    {
      name: 'school-management-backend',
      script: './backend/src/server-fixed.js',
      cwd: './backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
```

#### Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Nginx Configuration

#### Create Nginx Config
```bash
sudo nano /etc/nginx/sites-available/school-management
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        root /var/www/school-management/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

#### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/school-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL Certificate (Let's Encrypt)

#### Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### Get SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 7. Security Setup

#### Firewall Configuration
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

#### Database Security
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/12/main/postgresql.conf

# Add/modify these lines:
listen_addresses = 'localhost'
max_connections = 100

# Edit pg_hba.conf
sudo nano /etc/postgresql/12/main/pg_hba.conf

# Ensure local connections only
local   all             postgres                                peer
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

### 8. Monitoring and Logs

#### PM2 Monitoring
```bash
pm2 monit
pm2 logs
```

#### Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### Database Logs
```bash
sudo tail -f /var/log/postgresql/postgresql-12-main.log
```

### 9. Backup Strategy

#### Database Backup
```bash
# Create backup script
sudo nano /root/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
mkdir -p $BACKUP_DIR

# Backup main database
pg_dump -U postgres school_management_prod > $BACKUP_DIR/main_db_$DATE.sql

# Backup tenant databases
psql -U postgres -d school_management_prod -c "SELECT tenant_id FROM tenants;" | grep school_ | while read db; do
    pg_dump -U postgres $db > $BACKUP_DIR/${db}_$DATE.sql
done

# Compress backups
gzip $BACKUP_DIR/*.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

#### Setup Cron Job
```bash
chmod +x /root/backup-db.sh
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * /root/backup-db.sh
```

### 10. Performance Optimization

#### Node.js Optimization
```bash
# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### PostgreSQL Optimization
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/12/main/postgresql.conf

# Add these optimizations:
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

### 11. Health Checks

#### Create Health Check Script
```bash
sudo nano /root/health-check.sh
```

```bash
#!/bin/bash

# Check if backend is running
if ! curl -f http://localhost:5000/api/tenants/health > /dev/null 2>&1; then
    echo "Backend is down, restarting..."
    pm2 restart school-management-backend
fi

# Check if nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "Nginx is down, restarting..."
    sudo systemctl restart nginx
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "Disk usage is high: ${DISK_USAGE}%"
fi
```

#### Setup Health Check Cron
```bash
chmod +x /root/health-check.sh
crontab -e

# Add this line for health check every 5 minutes
*/5 * * * * /root/health-check.sh
```

## 🎯 Deployment Checklist

- [ ] Server setup complete
- [ ] Database configured
- [ ] Environment variables set
- [ ] Frontend built
- [ ] PM2 configured and running
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Backup strategy implemented
- [ ] Monitoring setup
- [ ] Health checks configured
- [ ] Performance optimized

## 🚨 Troubleshooting

### Common Issues

1. **Port 5000 not accessible**
   - Check if PM2 is running: `pm2 status`
   - Check firewall: `sudo ufw status`

2. **Database connection failed**
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check credentials in .env file

3. **Email not sending**
   - Verify email credentials
   - Check if App Password is correct
   - Test with: `node test-email.js`

4. **Nginx 502 error**
   - Check if backend is running: `pm2 logs`
   - Verify nginx config: `sudo nginx -t`

## 📊 Monitoring Commands

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs school-management-backend

# Monitor resources
pm2 monit

# Check nginx status
sudo systemctl status nginx

# Check database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

---

**Your school management system is now production-ready! 🚀** 