
#!/bin/bash
set -e

# APBeeper Database Backup Script
# This script creates backups of the APBeeper bot database and configuration files

# Configuration
APP_DIR="/home/apbeeper/apbeeper_bot"
BACKUP_DIR="/home/apbeeper/backups"
LOG_FILE="/home/apbeeper/logs/backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

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

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

log "Starting APBeeper backup process..."

# Check if application directory exists
if [ ! -d "$APP_DIR" ]; then
    error "Application directory not found: $APP_DIR"
fi

cd "$APP_DIR" || error "Cannot access application directory"

# Function to backup SQLite database
backup_sqlite() {
    local db_file="$1"
    local backup_name="$2"
    
    if [ -f "$db_file" ]; then
        log "Backing up SQLite database: $db_file"
        
        # Create a consistent backup using SQLite's backup command
        sqlite3 "$db_file" ".backup '$BACKUP_DIR/${backup_name}.db'"
        
        if [ $? -eq 0 ]; then
            success "SQLite backup created: ${backup_name}.db"
            
            # Verify backup integrity
            if sqlite3 "$BACKUP_DIR/${backup_name}.db" "PRAGMA integrity_check;" | grep -q "ok"; then
                success "Backup integrity verified"
            else
                warning "Backup integrity check failed"
            fi
        else
            error "Failed to create SQLite backup"
        fi
    else
        warning "SQLite database not found: $db_file"
    fi
}

# Function to backup PostgreSQL database
backup_postgresql() {
    local db_url="$1"
    local backup_name="$2"
    
    if [ -n "$db_url" ]; then
        log "Backing up PostgreSQL database..."
        
        # Extract connection details from DATABASE_URL
        # Format: postgresql://username:password@host:port/database
        if pg_dump "$db_url" > "$BACKUP_DIR/${backup_name}.sql"; then
            success "PostgreSQL backup created: ${backup_name}.sql"
            
            # Compress the SQL backup
            gzip "$BACKUP_DIR/${backup_name}.sql"
            success "PostgreSQL backup compressed: ${backup_name}.sql.gz"
        else
            error "Failed to create PostgreSQL backup"
        fi
    fi
}

# Function to backup MySQL database
backup_mysql() {
    local db_url="$1"
    local backup_name="$2"
    
    if [ -n "$db_url" ]; then
        log "Backing up MySQL database..."
        
        # Extract connection details and create backup
        # This would need to be customized based on your MySQL setup
        warning "MySQL backup not implemented in this script"
    fi
}

# Main backup process
log "Creating backup with timestamp: $DATE"

# Backup database based on DATABASE_URL in .env
if [ -f ".env" ]; then
    DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"')
    
    if [[ "$DATABASE_URL" == sqlite:* ]]; then
        # SQLite database
        DB_PATH=$(echo "$DATABASE_URL" | sed 's/sqlite://')
        backup_sqlite "$DB_PATH" "apbeeper_db_$DATE"
    elif [[ "$DATABASE_URL" == postgresql:* ]]; then
        # PostgreSQL database
        backup_postgresql "$DATABASE_URL" "apbeeper_db_$DATE"
    elif [[ "$DATABASE_URL" == mysql:* ]]; then
        # MySQL database
        backup_mysql "$DATABASE_URL" "apbeeper_db_$DATE"
    else
        warning "Unknown database type in DATABASE_URL: $DATABASE_URL"
    fi
else
    # Fallback to default SQLite location
    backup_sqlite "data/apbeeper.db" "apbeeper_db_$DATE"
fi

# Backup configuration files
log "Backing up configuration files..."

# Backup .env file (without sensitive data in logs)
if [ -f ".env" ]; then
    cp ".env" "$BACKUP_DIR/env_$DATE"
    success "Environment file backed up"
else
    warning "No .env file found"
fi

# Backup PM2 ecosystem file
if [ -f "ecosystem.config.js" ]; then
    cp "ecosystem.config.js" "$BACKUP_DIR/ecosystem_$DATE.js"
    success "PM2 ecosystem file backed up"
else
    warning "No ecosystem.config.js file found"
fi

# Backup package.json and package-lock.json
if [ -f "package.json" ]; then
    cp "package.json" "$BACKUP_DIR/package_$DATE.json"
    success "Package.json backed up"
fi

if [ -f "package-lock.json" ]; then
    cp "package-lock.json" "$BACKUP_DIR/package-lock_$DATE.json"
    success "Package-lock.json backed up"
fi

# Backup recent logs (last 7 days)
log "Backing up recent log files..."
if [ -d "logs" ]; then
    find logs/ -name "*.log" -mtime -7 -exec cp {} "$BACKUP_DIR/" \; 2>/dev/null || true
    success "Recent log files backed up"
fi

# Create a manifest file with backup information
log "Creating backup manifest..."
cat > "$BACKUP_DIR/manifest_$DATE.txt" << EOF
APBeeper Backup Manifest
========================
Backup Date: $(date)
Backup ID: $DATE
Application Directory: $APP_DIR
Backup Directory: $BACKUP_DIR

Files Backed Up:
$(ls -la "$BACKUP_DIR" | grep "$DATE")

Database Type: $(grep "^DATABASE_URL=" .env 2>/dev/null | cut -d'=' -f2 | cut -d':' -f1 || echo "Unknown")
Node.js Version: $(node --version 2>/dev/null || echo "Unknown")
NPM Version: $(npm --version 2>/dev/null || echo "Unknown")
PM2 Version: $(pm2 --version 2>/dev/null || echo "Unknown")

Bot Status at Backup Time:
$(pm2 describe apbeeper-bot 2>/dev/null || echo "Bot not running")
EOF

success "Backup manifest created: manifest_$DATE.txt"

# Compress old backups (older than 7 days)
log "Compressing old backups..."
find "$BACKUP_DIR" -name "*.db" -mtime +7 -exec gzip {} \; 2>/dev/null || true
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -exec gzip {} \; 2>/dev/null || true

# Clean up very old backups (older than retention period)
log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "*" -mtime +$RETENTION_DAYS -type f -delete 2>/dev/null || true

# Calculate backup directory size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

# Display backup summary
log "Backup process completed!"
echo ""
echo "=== Backup Summary ==="
echo "Backup ID: $DATE"
echo "Backup Directory: $BACKUP_DIR"
echo "Total Backup Size: $BACKUP_SIZE"
echo "Files Created:"
ls -la "$BACKUP_DIR" | grep "$DATE" | awk '{print "  " $9 " (" $5 " bytes)"}'
echo ""
echo "=== Backup Verification ==="

# Verify database backup exists and is not empty
DB_BACKUP=$(find "$BACKUP_DIR" -name "*db_$DATE*" | head -1)
if [ -n "$DB_BACKUP" ] && [ -s "$DB_BACKUP" ]; then
    echo "✅ Database backup verified: $(basename "$DB_BACKUP")"
else
    echo "❌ Database backup verification failed"
fi

# Verify configuration backup
if [ -f "$BACKUP_DIR/env_$DATE" ]; then
    echo "✅ Configuration backup verified"
else
    echo "❌ Configuration backup not found"
fi

echo ""
echo "=== Restore Instructions ==="
echo "To restore from this backup:"
echo "1. Stop the bot: pm2 stop apbeeper-bot"
echo "2. Restore database: cp $BACKUP_DIR/apbeeper_db_$DATE.db data/apbeeper.db"
echo "3. Restore config: cp $BACKUP_DIR/env_$DATE .env"
echo "4. Start the bot: pm2 start apbeeper-bot"
echo ""

success "APBeeper backup completed successfully! 🐝"

# Optional: Send backup notification (uncomment if you have a notification system)
# curl -X POST "YOUR_WEBHOOK_URL" -H "Content-Type: application/json" -d "{\"content\":\"APBeeper backup completed: $DATE\"}"
