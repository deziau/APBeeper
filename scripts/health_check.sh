
#!/bin/bash

# APBeeper Health Check Script
# This script performs comprehensive health checks on the APBeeper Discord bot

# Configuration
APP_DIR="/home/apbeeper/apbeeper_bot"
LOG_FILE="/home/apbeeper/logs/health_check.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Health check results
HEALTH_SCORE=0
MAX_SCORE=0
ISSUES=()

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
}

fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ISSUES+=("$1")
}

warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
    ISSUES+=("WARNING: $1")
}

check() {
    MAX_SCORE=$((MAX_SCORE + 1))
}

echo "🐝 APBeeper Health Check"
echo "========================"
echo ""

# Check 1: Application Directory
check
log "Checking application directory..."
if [ -d "$APP_DIR" ]; then
    pass "Application directory exists: $APP_DIR"
else
    fail "Application directory not found: $APP_DIR"
fi

# Check 2: Node.js Installation
check
log "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    pass "Node.js installed: $NODE_VERSION"
else
    fail "Node.js not installed"
fi

# Check 3: NPM Installation
check
log "Checking NPM installation..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    pass "NPM installed: $NPM_VERSION"
else
    fail "NPM not installed"
fi

# Check 4: PM2 Installation
check
log "Checking PM2 installation..."
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    pass "PM2 installed: $PM2_VERSION"
else
    fail "PM2 not installed"
fi

# Navigate to app directory for remaining checks
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    
    # Check 5: Package.json exists
    check
    log "Checking package.json..."
    if [ -f "package.json" ]; then
        pass "package.json exists"
    else
        fail "package.json not found"
    fi
    
    # Check 6: Node modules installed
    check
    log "Checking node_modules..."
    if [ -d "node_modules" ]; then
        pass "node_modules directory exists"
    else
        fail "node_modules not found - run 'npm install'"
    fi
    
    # Check 7: Environment file
    check
    log "Checking environment configuration..."
    if [ -f ".env" ]; then
        pass ".env file exists"
        
        # Check for required environment variables
        if grep -q "DISCORD_TOKEN=" .env; then
            pass "DISCORD_TOKEN configured"
        else
            fail "DISCORD_TOKEN not found in .env"
        fi
        
        if grep -q "CLIENT_ID=" .env; then
            pass "CLIENT_ID configured"
        else
            warn "CLIENT_ID not found in .env"
        fi
    else
        fail ".env file not found"
    fi
    
    # Check 8: PM2 Ecosystem file
    check
    log "Checking PM2 configuration..."
    if [ -f "ecosystem.config.js" ]; then
        pass "ecosystem.config.js exists"
    else
        fail "ecosystem.config.js not found"
    fi
    
    # Check 9: Database
    check
    log "Checking database..."
    if [ -f ".env" ]; then
        DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"')
        if [[ "$DATABASE_URL" == sqlite:* ]]; then
            DB_PATH=$(echo "$DATABASE_URL" | sed 's/sqlite://')
            if [ -f "$DB_PATH" ]; then
                pass "SQLite database exists: $DB_PATH"
                
                # Check database integrity
                if sqlite3 "$DB_PATH" "PRAGMA integrity_check;" | grep -q "ok"; then
                    pass "Database integrity check passed"
                else
                    fail "Database integrity check failed"
                fi
            else
                warn "SQLite database file not found: $DB_PATH"
            fi
        elif [[ "$DATABASE_URL" == postgresql:* ]]; then
            if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
                pass "PostgreSQL database connection successful"
            else
                fail "Cannot connect to PostgreSQL database"
            fi
        else
            warn "Unknown database type or no DATABASE_URL configured"
        fi
    fi
    
    # Check 10: Log directory
    check
    log "Checking log directory..."
    if [ -d "logs" ]; then
        pass "Logs directory exists"
        
        # Check log file permissions
        if [ -w "logs" ]; then
            pass "Logs directory is writable"
        else
            fail "Logs directory is not writable"
        fi
    else
        warn "Logs directory not found"
    fi
    
    # Check 11: Data directory
    check
    log "Checking data directory..."
    if [ -d "data" ]; then
        pass "Data directory exists"
        
        # Check data directory permissions
        if [ -w "data" ]; then
            pass "Data directory is writable"
        else
            fail "Data directory is not writable"
        fi
    else
        warn "Data directory not found"
    fi
fi

# Check 12: PM2 Process Status
check
log "Checking PM2 process status..."
if pm2 describe apbeeper-bot > /dev/null 2>&1; then
    PM2_STATUS=$(pm2 describe apbeeper-bot | grep "status" | awk '{print $4}')
    if [ "$PM2_STATUS" = "online" ]; then
        pass "APBeeper bot is running (status: online)"
    else
        fail "APBeeper bot is not running (status: $PM2_STATUS)"
    fi
else
    fail "APBeeper bot process not found in PM2"
fi

# Check 13: System Resources
check
log "Checking system resources..."

# Memory check
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
if (( $(echo "$MEMORY_USAGE < 80" | bc -l) )); then
    pass "Memory usage is acceptable: ${MEMORY_USAGE}%"
else
    warn "High memory usage: ${MEMORY_USAGE}%"
fi

# Disk space check
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    pass "Disk usage is acceptable: ${DISK_USAGE}%"
else
    warn "High disk usage: ${DISK_USAGE}%"
fi

# Check 14: Network Connectivity
check
log "Checking network connectivity..."
if ping -c 1 discord.com > /dev/null 2>&1; then
    pass "Network connectivity to Discord is working"
else
    fail "Cannot reach Discord servers"
fi

# Check 15: Firewall Status
check
log "Checking firewall status..."
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status | head -1 | awk '{print $2}')
    if [ "$UFW_STATUS" = "active" ]; then
        pass "UFW firewall is active"
    else
        warn "UFW firewall is not active"
    fi
else
    warn "UFW firewall not installed"
fi

# Check 16: Recent Errors in Logs
check
log "Checking for recent errors..."
if [ -f "$APP_DIR/logs/error.log" ]; then
    ERROR_COUNT=$(grep -c "ERROR" "$APP_DIR/logs/error.log" 2>/dev/null | tail -1 || echo "0")
    if [ "$ERROR_COUNT" -eq 0 ]; then
        pass "No recent errors found in logs"
    else
        warn "Found $ERROR_COUNT errors in recent logs"
    fi
else
    warn "Error log file not found"
fi

# Check 17: Bot Uptime
check
log "Checking bot uptime..."
if pm2 describe apbeeper-bot > /dev/null 2>&1; then
    UPTIME=$(pm2 describe apbeeper-bot | grep "uptime" | awk '{print $4}')
    pass "Bot uptime: $UPTIME"
else
    fail "Cannot determine bot uptime"
fi

# Check 18: SSL Certificate (if applicable)
check
log "Checking SSL certificate..."
if [ -f ".env" ] && grep -q "HTTPS" .env; then
    DOMAIN=$(grep "DOMAIN=" .env | cut -d'=' -f2 | tr -d '"')
    if [ -n "$DOMAIN" ]; then
        if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
            pass "SSL certificate is valid for $DOMAIN"
        else
            warn "SSL certificate issues detected for $DOMAIN"
        fi
    else
        warn "HTTPS configured but no domain specified"
    fi
else
    pass "No HTTPS configuration detected (not required)"
fi

# Calculate health score percentage
HEALTH_PERCENTAGE=$(( (HEALTH_SCORE * 100) / MAX_SCORE ))

echo ""
echo "=== Health Check Summary ==="
echo "Health Score: $HEALTH_SCORE/$MAX_SCORE ($HEALTH_PERCENTAGE%)"
echo ""

if [ $HEALTH_PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}🎉 Excellent! Your APBeeper bot is in great health.${NC}"
elif [ $HEALTH_PERCENTAGE -ge 75 ]; then
    echo -e "${YELLOW}👍 Good! Your APBeeper bot is mostly healthy with minor issues.${NC}"
elif [ $HEALTH_PERCENTAGE -ge 50 ]; then
    echo -e "${YELLOW}⚠️  Warning! Your APBeeper bot has some issues that should be addressed.${NC}"
else
    echo -e "${RED}🚨 Critical! Your APBeeper bot has serious issues that need immediate attention.${NC}"
fi

# Display issues if any
if [ ${#ISSUES[@]} -gt 0 ]; then
    echo ""
    echo "=== Issues Found ==="
    for issue in "${ISSUES[@]}"; do
        echo "• $issue"
    done
    echo ""
    echo "=== Recommendations ==="
    echo "1. Address the failed checks above"
    echo "2. Check the logs for more details: pm2 logs apbeeper-bot"
    echo "3. Restart the bot if needed: pm2 restart apbeeper-bot"
    echo "4. Run this health check again after fixes"
fi

echo ""
echo "=== Quick Commands ==="
echo "View logs: pm2 logs apbeeper-bot"
echo "Restart bot: pm2 restart apbeeper-bot"
echo "Monitor bot: pm2 monit"
echo "Check PM2 status: pm2 status"
echo ""

# Exit with appropriate code
if [ $HEALTH_PERCENTAGE -ge 75 ]; then
    exit 0
else
    exit 1
fi
