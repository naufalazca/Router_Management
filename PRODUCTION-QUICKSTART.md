# Production Quick Start Guide

Panduan singkat untuk deploy Router Management System ke production.

## Prerequisites Checklist

- [ ] Server Ubuntu 20.04+ dengan minimum 1GB RAM
- [ ] Domain sudah pointing ke IP server
- [ ] SSH access ke server
- [ ] Root/sudo privileges

## Instalasi (10 menit)

### 1. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL & Nginx
sudo apt install -y postgresql postgresql-contrib nginx certbot python3-certbot-nginx

# Install PM2 globally
sudo npm install -g pm2

# Install Git (jika belum ada)
sudo apt install -y git
```

### 2. Setup Project
```bash
# Clone repository
cd /var/www
sudo git clone <your-repo-url> router-management
sudo chown -R $USER:$USER router-management
cd router-management

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Setup Database
```bash
# Masuk PostgreSQL
sudo -u postgres psql

# Jalankan commands berikut (ganti PASSWORD dengan password kuat):
CREATE USER router_admin WITH PASSWORD 'YOUR_STRONG_PASSWORD';
CREATE DATABASE router_management OWNER router_admin;
GRANT ALL PRIVILEGES ON DATABASE router_management TO router_admin;
\q
```

### 4. Configure Environment

**Backend (.env):**
```bash
cd /var/www/router-management/backend
cp .env.production.example .env
nano .env
```

Update minimal:
- `FRONTEND_URL` → domain Anda
- `DATABASE_URL` → password database
- `JWT_SECRET` → generate dengan: `openssl rand -base64 48`
- `ENCRYPTION_KEY` → generate dengan: `openssl rand -base64 24 | cut -c1-32`
- `CORS_ORIGIN` → domain Anda

**Frontend (.env):**
```bash
cd ../frontend
nano .env
```

Update:
- `NUXT_PUBLIC_API_BASE=https://your-domain.com/api`
- `NUXT_PUBLIC_WS_URL=https://your-domain.com`

### 5. Build & Deploy
```bash
# Build frontend
cd /var/www/router-management/frontend
npm run build

# Deploy backend (first time)
cd ../backend
npm run deploy:first
```

### 6. Configure Nginx
```bash
# Copy config
sudo cp /var/www/router-management/nginx.conf /etc/nginx/sites-available/router-management

# Edit config
sudo nano /etc/nginx/sites-available/router-management
# Ganti semua 'your-domain.com' dengan domain Anda

# Enable site
sudo ln -s /etc/nginx/sites-available/router-management /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test & reload
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Setup SSL
```bash
# Dapatkan SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 8. Configure PM2 Startup
```bash
pm2 startup
# Jalankan command yang muncul (starts with sudo)

pm2 save
```

### 9. Setup Firewall
```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

## Verifikasi

### Check Services
```bash
# PM2 status
pm2 status

# Health check
curl http://localhost:5000/health

# Nginx status
sudo systemctl status nginx

# Database status
sudo systemctl status postgresql
```

### Run Monitor Script
```bash
cd /var/www/router-management/backend
./monitor.sh
```

### Test dari Browser
1. Buka `https://your-domain.com`
2. Check API: `https://your-domain.com/api/health`

## Daily Operations

### View Logs
```bash
# PM2 logs
pm2 logs

# Real-time monitoring
pm2 monit

# Nginx logs
sudo tail -f /var/log/nginx/router-management-error.log
```

### Deploy Updates
```bash
cd /var/www/router-management

# Pull latest code
git pull origin main

# Backend
cd backend
npm install  # If dependencies changed
npm run deploy  # Zero-downtime reload

# Frontend (jika ada perubahan)
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

### Restart Application
```bash
cd backend

# Graceful reload (zero-downtime)
npm run pm2:reload

# Hard restart (with brief downtime)
npm run pm2:restart
```

### Database Backup
```bash
# Create backup
sudo -u postgres pg_dump router_management > ~/backup-$(date +%Y%m%d).sql

# Restore
sudo -u postgres psql router_management < ~/backup-20240101.sql
```

## Common Issues

### PM2 App Not Starting
```bash
# Check logs
pm2 logs router-management-api --err

# Check .env file
cat backend/.env

# Restart
cd backend
npm run pm2:restart
```

### Nginx 502 Error
```bash
# Check backend is running
curl http://localhost:5000/health

# Check Nginx config
sudo nginx -t

# View Nginx error log
sudo tail -f /var/log/nginx/router-management-error.log
```

### Database Connection Error
```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test connection
psql -U router_admin -d router_management -h localhost

# Check DATABASE_URL in .env
```

## Performance Tips

### Current Setup (1-2 CPU cores)
- ✅ PM2 cluster mode: 2 instances
- ✅ Nginx caching: enabled
- ✅ Gzip compression: enabled
- ✅ HTTP/2: enabled

### For Higher Traffic
Edit `backend/ecosystem.config.js`:
```javascript
instances: 4, // Increase based on CPU cores
max_memory_restart: '1G', // Increase if needed
```

Then reload:
```bash
pm2 reload ecosystem.config.js
```

## Security Checklist

- [ ] SSL certificate active
- [ ] Firewall enabled (ufw)
- [ ] Strong database password
- [ ] JWT secret generated
- [ ] Encryption key generated
- [ ] SSH key authentication
- [ ] Regular updates scheduled
- [ ] .env file permissions: `chmod 600 .env`

## Monitoring Recommendations

### Setup Automated Monitoring
Consider adding:
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry
- **Server monitoring**: Netdata, Prometheus

### Automated Backups
Add to crontab (`crontab -e`):
```cron
# Daily database backup at 2 AM
0 2 * * * sudo -u postgres pg_dump router_management > /backups/db-$(date +\%Y\%m\%d).sql

# Keep only last 7 days
0 3 * * * find /backups -name "db-*.sql" -mtime +7 -delete
```

## Need Help?

Untuk troubleshooting lengkap, lihat [DEPLOYMENT.md](./DEPLOYMENT.md)

## Commands Cheat Sheet

```bash
# PM2
pm2 status                    # Check status
pm2 logs                      # View logs
pm2 monit                     # Monitor
pm2 reload all                # Reload (zero-downtime)
pm2 restart all               # Restart

# Nginx
sudo nginx -t                 # Test config
sudo systemctl reload nginx   # Reload
sudo systemctl status nginx   # Status

# Database
sudo systemctl status postgresql
sudo -u postgres psql router_management

# Health Check
./backend/monitor.sh

# Updates
git pull && cd backend && npm run deploy
```

---

**Selamat! Aplikasi Anda sudah running di production! 🎉**

Access:
- Frontend: https://your-domain.com
- API: https://your-domain.com/api
- Health: https://your-domain.com/health
