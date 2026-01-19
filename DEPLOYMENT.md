# Production Deployment Guide

Complete guide for deploying Router Management System to production using PM2 and Nginx.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Install Dependencies](#install-dependencies)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Build & Deploy](#build--deploy)
7. [Nginx Configuration](#nginx-configuration)
8. [SSL Certificate Setup](#ssl-certificate-setup)
9. [PM2 Process Management](#pm2-process-management)
10. [Monitoring & Logs](#monitoring--logs)
11. [Updates & Maintenance](#updates--maintenance)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Ubuntu 20.04 LTS or newer (or similar Linux distribution)
- Node.js 18.x or newer
- PostgreSQL 14 or newer
- Nginx
- Domain name pointed to your server (for SSL)
- Minimum 1GB RAM (2GB recommended)
- 1-2 CPU cores

---

## Server Setup

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v18.x or newer
```

### 3. Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4. Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Install PM2 Globally
```bash
sudo npm install -g pm2
pm2 --version
```

### 6. Install Certbot (for SSL)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## Install Dependencies

### 1. Clone Repository
```bash
cd /var/www
sudo git clone <your-repo-url> router-management
sudo chown -R $USER:$USER router-management
cd router-management
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

---

## Environment Configuration

### 1. Backend Environment (.env)
Create `.env` file in `/var/www/router-management/backend/`:

```bash
cd /var/www/router-management/backend
cp .env.example .env
nano .env
```

Update the following values:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://router_admin:STRONG_PASSWORD_HERE@localhost:5432/router_management

# Authentication
JWT_SECRET=<generate-random-64-char-string>
JWT_EXPIRES_IN=7d

# Encryption (must be exactly 32 characters)
ENCRYPTION_KEY=<generate-random-32-char-string>

# CORS
CORS_ORIGIN=https://your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Generate secure secrets:**
```bash
# For JWT_SECRET (64 characters)
openssl rand -base64 48

# For ENCRYPTION_KEY (32 characters)
openssl rand -base64 24 | cut -c1-32
```

### 2. Frontend Environment (.env)
Create `.env` file in `/var/www/router-management/frontend/`:

```bash
cd /var/www/router-management/frontend
cp .env.example .env
nano .env
```

Update:
```env
NUXT_PUBLIC_API_BASE=https://your-domain.com/api
NUXT_PUBLIC_WS_URL=https://your-domain.com
```

---

## Database Setup

### 1. Create PostgreSQL Database and User
```bash
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE USER router_admin WITH PASSWORD 'STRONG_PASSWORD_HERE';
CREATE DATABASE router_management OWNER router_admin;
GRANT ALL PRIVILEGES ON DATABASE router_management TO router_admin;
\q
```

### 2. Run Database Migrations
```bash
cd /var/www/router-management/backend
npm run prisma:generate
npm run prisma:migrate:prod
```

### 3. (Optional) Seed Initial Data
```bash
npm run prisma:seed
```

---

## Build & Deploy

### 1. Build Backend
```bash
cd /var/www/router-management/backend
npm run build
```

This compiles TypeScript to JavaScript in `dist/` folder.

### 2. Build Frontend
```bash
cd /var/www/router-management/frontend
npm run build
```

This creates production-ready static files in `.output/` folder.

### 3. First Deployment
```bash
cd /var/www/router-management/backend
npm run deploy:first
```

This will:
- Install dependencies
- Build the project
- Generate Prisma client
- Run migrations
- Start PM2 processes

---

## Nginx Configuration

### 1. Copy Nginx Config
```bash
sudo cp /var/www/router-management/nginx.conf /etc/nginx/sites-available/router-management
```

### 2. Edit Configuration
```bash
sudo nano /etc/nginx/sites-available/router-management
```

Update these lines:
- Replace `your-domain.com` with your actual domain
- Update paths if necessary

### 3. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/router-management /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default config
```

### 4. Test Configuration
```bash
sudo nginx -t
```

### 5. Reload Nginx
```bash
sudo systemctl reload nginx
```

---

## SSL Certificate Setup

### 1. Obtain SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow the prompts. Certbot will automatically configure Nginx for SSL.

### 2. Auto-Renewal Test
```bash
sudo certbot renew --dry-run
```

### 3. Enable Auto-Renewal
Certbot automatically sets up a cron job. Verify:
```bash
sudo systemctl status certbot.timer
```

---

## PM2 Process Management

### Common Commands

#### Start Application
```bash
cd /var/www/router-management/backend
npm run pm2:start
```

#### Check Status
```bash
npm run pm2:status
# Or directly:
pm2 status
```

#### View Logs
```bash
npm run pm2:logs
# Or:
pm2 logs router-management-api
```

#### Restart (with downtime)
```bash
npm run pm2:restart
```

#### Reload (zero-downtime)
```bash
npm run pm2:reload
```

#### Stop Application
```bash
npm run pm2:stop
```

#### Delete from PM2
```bash
npm run pm2:delete
```

#### Real-time Monitoring
```bash
npm run pm2:monit
```

### Configure PM2 Startup

Setup PM2 to auto-start on server reboot:

```bash
pm2 startup
# Copy and run the command it outputs (starts with sudo)

# Save current PM2 process list
pm2 save
```

Now PM2 will automatically start your app on server reboot.

---

## Monitoring & Logs

### PM2 Monitoring

#### Built-in Monitoring
```bash
pm2 monit
```

Shows real-time CPU, memory usage, and logs.

#### Process Details
```bash
pm2 show router-management-api
```

### Application Logs

PM2 logs are stored in:
```
/var/www/router-management/backend/logs/error.log
/var/www/router-management/backend/logs/out.log
```

#### View Logs
```bash
# Real-time logs
pm2 logs router-management-api

# Last 100 lines
pm2 logs router-management-api --lines 100

# Error logs only
tail -f backend/logs/error.log
```

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/router-management-access.log

# Error logs
sudo tail -f /var/log/nginx/router-management-error.log
```

### PostgreSQL Logs

```bash
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## Updates & Maintenance

### Deploy New Updates

When you have code changes:

```bash
cd /var/www/router-management

# Pull latest changes
git pull origin main

# Backend updates
cd backend
npm install  # If package.json changed
npm run deploy  # Build + migrate + reload PM2
```

This performs zero-downtime reload using PM2 cluster mode.

### Database Migrations

For new migrations:
```bash
cd backend
npm run prisma:migrate:prod
npm run pm2:reload
```

### Rollback Strategy

If deployment fails:

```bash
# Rollback git
git reset --hard HEAD~1

# Rebuild and restart
cd backend
npm run build
npm run pm2:restart
```

### Backup Database

```bash
# Create backup
sudo -u postgres pg_dump router_management > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore from backup
sudo -u postgres psql router_management < backup-20240101-120000.sql
```

---

## Troubleshooting

### Application Won't Start

1. Check PM2 logs:
```bash
pm2 logs router-management-api --err
```

2. Check environment variables:
```bash
cd backend
cat .env
```

3. Verify database connection:
```bash
psql -U router_admin -d router_management -h localhost
```

### High Memory Usage

Check PM2 status:
```bash
pm2 status
```

If memory > 500MB, app will auto-restart (configured in ecosystem.config.js).

Adjust in `ecosystem.config.js`:
```javascript
max_memory_restart: '1G', // Increase if needed
```

### Database Connection Issues

1. Check PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

2. Verify connection string in `.env`

3. Check PostgreSQL logs:
```bash
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Nginx 502 Bad Gateway

1. Check backend is running:
```bash
pm2 status
curl http://localhost:5000/health
```

2. Check Nginx error logs:
```bash
sudo tail -f /var/log/nginx/router-management-error.log
```

3. Verify upstream in Nginx config:
```bash
sudo nginx -t
```

### SSL Certificate Issues

1. Renew certificate:
```bash
sudo certbot renew
```

2. Check certificate status:
```bash
sudo certbot certificates
```

3. Test SSL:
```bash
curl -I https://your-domain.com
```

### PM2 Process Crashed

1. Check crash logs:
```bash
pm2 logs router-management-api --err --lines 100
```

2. Common issues:
   - Uncaught exceptions (check logs)
   - Out of memory (increase `max_memory_restart`)
   - Database connection lost (check PostgreSQL)

3. Restart application:
```bash
cd backend
npm run pm2:restart
```

---

## Performance Optimization

### 1. PM2 Cluster Mode
Already configured in `ecosystem.config.js` with 2 instances for load balancing.

### 2. Nginx Caching
Nginx config includes:
- Static file caching (1 year)
- Gzip compression
- HTTP/2 support

### 3. Database Connection Pooling
Prisma handles this automatically. Check `schema.prisma` for pool settings.

### 4. Rate Limiting
Configured in:
- Backend: Express rate limiter
- Nginx: Request rate limiting

---

## Security Checklist

- ✅ Environment variables secured
- ✅ SSL/TLS enabled
- ✅ Database password strong
- ✅ JWT secret generated
- ✅ Encryption key generated
- ✅ Firewall configured (ufw)
- ✅ SSH key authentication
- ✅ Regular security updates
- ✅ Nginx security headers
- ✅ Rate limiting enabled

### Firewall Setup (UFW)

```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
sudo ufw status
```

---

## Useful Commands Cheat Sheet

```bash
# PM2
pm2 status                    # Check status
pm2 logs                      # View logs
pm2 monit                     # Real-time monitoring
pm2 restart all               # Restart all apps
pm2 reload all                # Zero-downtime reload
pm2 stop all                  # Stop all apps
pm2 flush                     # Clear logs

# Nginx
sudo nginx -t                 # Test config
sudo systemctl reload nginx   # Reload config
sudo systemctl restart nginx  # Restart nginx
sudo systemctl status nginx   # Check status

# PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql
\l                            # List databases
\c router_management          # Connect to DB
\dt                           # List tables

# System
htop                          # System monitoring
df -h                         # Disk usage
free -h                       # Memory usage
journalctl -xe                # System logs
```

---

## Support

For issues:
1. Check application logs: `pm2 logs`
2. Check Nginx logs: `/var/log/nginx/`
3. Check PostgreSQL logs: `/var/log/postgresql/`
4. Review this troubleshooting guide

---

**Deployment completed successfully! 🎉**

Your Router Management System is now running in production with:
- PM2 cluster mode (2 instances)
- Nginx reverse proxy
- SSL/TLS encryption
- Auto-restart on crash
- Zero-downtime deployments
- Comprehensive logging
