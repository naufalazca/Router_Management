#!/bin/bash

# Router Management System - Monitoring Script
# Run this script to check system health

echo "======================================"
echo "Router Management System - Health Check"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service status
check_service() {
    local service=$1
    local name=$2

    if systemctl is-active --quiet $service; then
        echo -e "${name}: ${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${name}: ${RED}✗ Stopped${NC}"
        return 1
    fi
}

# Function to check port
check_port() {
    local port=$1
    local name=$2

    if netstat -tuln | grep -q ":$port "; then
        echo -e "${name} (port $port): ${GREEN}✓ Listening${NC}"
        return 0
    else
        echo -e "${name} (port $port): ${RED}✗ Not listening${NC}"
        return 1
    fi
}

# System Services
echo "1. System Services"
echo "-----------------------------------"
check_service nginx "Nginx"
check_service postgresql "PostgreSQL"
echo ""

# Application Ports
echo "2. Application Ports"
echo "-----------------------------------"
check_port 80 "HTTP"
check_port 443 "HTTPS"
check_port 5000 "Backend API"
check_port 5432 "PostgreSQL"
echo ""

# PM2 Status
echo "3. PM2 Application Status"
echo "-----------------------------------"
if command -v pm2 &> /dev/null; then
    pm2 status
    echo ""

    # Check if app is online
    if pm2 status | grep -q "online"; then
        echo -e "PM2 Status: ${GREEN}✓ Online${NC}"
    else
        echo -e "PM2 Status: ${RED}✗ Offline${NC}"
    fi
else
    echo -e "${RED}PM2 not installed${NC}"
fi
echo ""

# API Health Check
echo "4. API Health Check"
echo "-----------------------------------"
if command -v curl &> /dev/null; then
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)

    if [ "$response" = "200" ]; then
        echo -e "Backend API: ${GREEN}✓ Healthy (HTTP $response)${NC}"

        # Get uptime
        uptime_data=$(curl -s http://localhost:5000/health | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
        if [ ! -z "$uptime_data" ]; then
            uptime_minutes=$(echo "scale=2; $uptime_data / 60" | bc)
            echo "Uptime: ${uptime_minutes} minutes"
        fi
    else
        echo -e "Backend API: ${RED}✗ Unhealthy (HTTP $response)${NC}"
    fi
else
    echo -e "${YELLOW}curl not installed - skipping API check${NC}"
fi
echo ""

# Database Connection
echo "5. Database Status"
echo "-----------------------------------"
db_size=$(sudo -u postgres psql -d router_management -t -c "SELECT pg_size_pretty(pg_database_size('router_management'));" 2>/dev/null | xargs)

if [ ! -z "$db_size" ]; then
    echo -e "Database: ${GREEN}✓ Connected${NC}"
    echo "Database size: $db_size"

    # Count tables
    table_count=$(sudo -u postgres psql -d router_management -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    echo "Tables: $table_count"
else
    echo -e "Database: ${RED}✗ Cannot connect${NC}"
fi
echo ""

# Disk Usage
echo "6. Disk Usage"
echo "-----------------------------------"
df -h / | tail -1 | awk '{print "Root partition: " $3 " used of " $2 " (" $5 " used)"}'
echo ""

# Memory Usage
echo "7. Memory Usage"
echo "-----------------------------------"
free -h | grep Mem | awk '{print "Memory: " $3 " used of " $2}'
echo ""

# CPU Load
echo "8. CPU Load Average"
echo "-----------------------------------"
uptime | awk -F'load average:' '{print "Load:" $2}'
echo ""

# Recent Errors (PM2 logs)
echo "9. Recent Errors (last 10 lines)"
echo "-----------------------------------"
if [ -f "logs/error.log" ]; then
    error_count=$(wc -l < logs/error.log)
    echo "Total error log lines: $error_count"

    if [ $error_count -gt 0 ]; then
        echo "Last errors:"
        tail -10 logs/error.log
    else
        echo -e "${GREEN}No errors logged${NC}"
    fi
else
    echo "Error log not found"
fi
echo ""

# SSL Certificate (if exists)
echo "10. SSL Certificate Status"
echo "-----------------------------------"
if [ -f "/etc/letsencrypt/live/your-domain.com/cert.pem" ]; then
    expiry=$(sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/your-domain.com/cert.pem | cut -d= -f2)
    echo "Certificate expires: $expiry"

    # Days until expiry
    days_left=$(( ($(date -d "$expiry" +%s) - $(date +%s)) / 86400 ))
    if [ $days_left -lt 30 ]; then
        echo -e "Days left: ${YELLOW}$days_left days (Renew soon!)${NC}"
    else
        echo -e "Days left: ${GREEN}$days_left days${NC}"
    fi
else
    echo "SSL certificate not found or not configured"
fi
echo ""

echo "======================================"
echo "Health Check Complete"
echo "======================================"
echo ""
echo "Quick Actions:"
echo "  View logs:     pm2 logs"
echo "  Restart app:   pm2 reload ecosystem.config.js"
echo "  Monitor:       pm2 monit"
echo "  Nginx logs:    sudo tail -f /var/log/nginx/router-management-error.log"
