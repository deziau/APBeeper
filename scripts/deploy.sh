
#!/bin/bash
set -e

# APBeeper Bot Deployment Script
# This script handles the deployment process for the APBeeper Discord bot

# Configuration
APP_DIR="/home/apbeeper/apbeeper_bot"
BACKUP_DIR="/home/apbeeper/backups"
LOG_FILE="/home/apbeeper/logs/deploy.log"
NODE_ENV="production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as correct user
if [ "$USER" != "apbeeper" ]; then
    error "This script should be run as the 'apbeeper' user"
fi

# Create necessary directories
mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

log "Starting APBeeper deployment process..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    error "PM2 is not installed. Please install PM2 first: npm install -g pm2"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js first."
fi

# Navigate to application directory
cd "$APP_DIR" || error "Cannot access application directory: $APP_DIR"

# Create backup before deployment
log "Creating backup before deployment..."
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
if [ -f "data/apbeeper.db" ]; then
    cp "data/apbeeper.db" "$BACKUP_DIR/${BACKUP_NAME}.db"
    success "Database backup created: ${BACKUP_NAME}.db"
fi

# Backup configuration files
cp .env "$BACKUP_DIR/env_${BACKUP_NAME}" 2>/dev/null || warning "No .env file to backup"
cp ecosystem.config.js "$BACKUP_DIR/ecosystem_${BACKUP_NAME}.js" 2>/dev/null || warning "No ecosystem.config.js file to backup"

# Pull latest changes from Git
log "Pulling latest changes from Git..."
if git pull origin main; then
    success "Git pull completed successfully"
else
    error "Git pull failed. Please check your Git configuration."
fi

# Install/update dependencies
log "Installing/updating dependencies..."
if npm ci --production; then
    success "Dependencies installed successfully"
else
    error "Failed to install dependencies"
fi

# Run database migrations if script exists
if [ -f "scripts/migrate_db.sh" ]; then
    log "Running database migrations..."
    if ./scripts/migrate_db.sh; then
        success "Database migrations completed"
    else
        warning "Database migrations failed or not needed"
    fi
fi

# Check if ecosystem.config.js exists
if [ ! -f "ecosystem.config.js" ]; then
    error "ecosystem.config.js not found. Please create this file for PM2 configuration."
fi

# Stop the bot if it's running
log "Stopping existing bot process..."
if pm2 describe apbeeper-bot > /dev/null 2>&1; then
    pm2 stop apbeeper-bot
    success "Bot stopped successfully"
else
    warning "Bot was not running"
fi

# Start the bot with PM2
log "Starting bot with PM2..."
if pm2 start ecosystem.config.js; then
    success "Bot started successfully"
else
    error "Failed to start bot with PM2"
fi

# Save PM2 configuration
log "Saving PM2 configuration..."
pm2 save

# Wait a moment for the bot to initialize
log "Waiting for bot to initialize..."
sleep 10

# Check if bot is running properly
if pm2 describe apbeeper-bot | grep -q "online"; then
    success "Bot is running and online!"
else
    error "Bot failed to start properly. Check PM2 logs: pm2 logs apbeeper-bot"
fi

# Display deployment summary
log "Deployment completed successfully!"
echo ""
echo "=== Deployment Summary ==="
echo "Timestamp: $(date)"
echo "Application Directory: $APP_DIR"
echo "Backup Created: ${BACKUP_NAME}"
echo "PM2 Status:"
pm2 list | grep apbeeper-bot || echo "No APBeeper process found"
echo ""
echo "=== Next Steps ==="
echo "1. Monitor logs: pm2 logs apbeeper-bot"
echo "2. Check bot status: pm2 monit"
echo "3. Test bot functionality in Discord"
echo ""
echo "=== Useful Commands ==="
echo "View logs: pm2 logs apbeeper-bot"
echo "Restart bot: pm2 restart apbeeper-bot"
echo "Stop bot: pm2 stop apbeeper-bot"
echo "Monitor: pm2 monit"
echo ""

success "APBeeper deployment completed successfully! 🐝"
