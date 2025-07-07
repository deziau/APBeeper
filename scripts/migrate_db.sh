
#!/bin/bash
set -e

# APBeeper Database Migration Script
# This script handles database schema migrations for the APBeeper Discord bot

# Configuration
APP_DIR="/home/apbeeper/apbeeper_bot"
DATA_DIR="$APP_DIR/data"
LOG_FILE="/home/apbeeper/logs/migration.log"
BACKUP_DIR="/home/apbeeper/backups"

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

# Create necessary directories
mkdir -p "$DATA_DIR" "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

log "Starting APBeeper database migration process..."

# Navigate to application directory
cd "$APP_DIR" || error "Cannot access application directory: $APP_DIR"

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
    log "Environment variables loaded from .env"
else
    warning "No .env file found, using default settings"
fi

# Determine database type from DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
    if [[ "$DATABASE_URL" == sqlite:* ]]; then
        DB_TYPE="sqlite"
        DB_PATH=$(echo "$DATABASE_URL" | sed 's/sqlite://')
        log "Detected SQLite database: $DB_PATH"
    elif [[ "$DATABASE_URL" == postgresql:* ]]; then
        DB_TYPE="postgresql"
        log "Detected PostgreSQL database"
    elif [[ "$DATABASE_URL" == mysql:* ]]; then
        DB_TYPE="mysql"
        log "Detected MySQL database"
    else
        warning "Unknown database type, defaulting to SQLite"
        DB_TYPE="sqlite"
        DB_PATH="$DATA_DIR/apbeeper.db"
    fi
else
    log "No DATABASE_URL found, using default SQLite database"
    DB_TYPE="sqlite"
    DB_PATH="$DATA_DIR/apbeeper.db"
fi

# Function to create backup before migration
create_migration_backup() {
    local backup_name="pre_migration_$(date +%Y%m%d_%H%M%S)"
    
    log "Creating backup before migration: $backup_name"
    
    case $DB_TYPE in
        "sqlite")
            if [ -f "$DB_PATH" ]; then
                cp "$DB_PATH" "$BACKUP_DIR/${backup_name}.db"
                success "SQLite backup created: ${backup_name}.db"
            else
                log "No existing database to backup"
            fi
            ;;
        "postgresql")
            if pg_dump "$DATABASE_URL" > "$BACKUP_DIR/${backup_name}.sql"; then
                success "PostgreSQL backup created: ${backup_name}.sql"
            else
                error "Failed to create PostgreSQL backup"
            fi
            ;;
        "mysql")
            warning "MySQL backup not implemented in this script"
            ;;
    esac
}

# Function to run SQLite migrations
migrate_sqlite() {
    log "Running SQLite migrations..."
    
    # Ensure database file exists
    if [ ! -f "$DB_PATH" ]; then
        log "Creating new SQLite database: $DB_PATH"
        touch "$DB_PATH"
    fi
    
    # Check if database is accessible
    if ! sqlite3 "$DB_PATH" "SELECT 1;" > /dev/null 2>&1; then
        error "Cannot access SQLite database: $DB_PATH"
    fi
    
    # Create migrations table if it doesn't exist
    sqlite3 "$DB_PATH" "
    CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );"
    
    success "Migrations table ready"
    
    # Run individual migration scripts
    run_migration_scripts_sqlite
}

# Function to run PostgreSQL migrations
migrate_postgresql() {
    log "Running PostgreSQL migrations..."
    
    # Test connection
    if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        error "Cannot connect to PostgreSQL database"
    fi
    
    # Create migrations table
    psql "$DATABASE_URL" -c "
    CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );" > /dev/null
    
    success "Migrations table ready"
    
    # Run individual migration scripts
    run_migration_scripts_postgresql
}

# Function to run MySQL migrations
migrate_mysql() {
    log "Running MySQL migrations..."
    warning "MySQL migrations not fully implemented in this script"
    
    # Basic MySQL migration structure would go here
    # This would need to be customized based on your MySQL setup
}

# Function to run SQLite migration scripts
run_migration_scripts_sqlite() {
    log "Applying SQLite migration scripts..."
    
    # Migration 001: Initial schema
    apply_migration_sqlite "001_initial_schema" "
    -- Guild settings table
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        prefix TEXT DEFAULT '!',
        timezone TEXT DEFAULT 'UTC',
        language TEXT DEFAULT 'en',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- User data table
    CREATE TABLE IF NOT EXISTS user_data (
        user_id TEXT,
        guild_id TEXT,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        last_message DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, guild_id)
    );
    
    -- Moderation logs table
    CREATE TABLE IF NOT EXISTS moderation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        moderator_id TEXT NOT NULL,
        action TEXT NOT NULL,
        reason TEXT,
        duration INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Role assignments table
    CREATE TABLE IF NOT EXISTS role_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        assigned_by TEXT NOT NULL,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Channel configurations table
    CREATE TABLE IF NOT EXISTS channel_configs (
        channel_id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        channel_type TEXT NOT NULL,
        config_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    "
    
    # Migration 002: Add indexes for performance
    apply_migration_sqlite "002_add_indexes" "
    CREATE INDEX IF NOT EXISTS idx_user_data_guild ON user_data(guild_id);
    CREATE INDEX IF NOT EXISTS idx_moderation_logs_guild ON moderation_logs(guild_id);
    CREATE INDEX IF NOT EXISTS idx_moderation_logs_user ON moderation_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_role_assignments_guild ON role_assignments(guild_id);
    CREATE INDEX IF NOT EXISTS idx_role_assignments_user ON role_assignments(user_id);
    CREATE INDEX IF NOT EXISTS idx_channel_configs_guild ON channel_configs(guild_id);
    "
    
    # Migration 003: Add command usage tracking
    apply_migration_sqlite "003_command_usage" "
    CREATE TABLE IF NOT EXISTS command_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        command_name TEXT NOT NULL,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_command_usage_guild ON command_usage(guild_id);
    CREATE INDEX IF NOT EXISTS idx_command_usage_command ON command_usage(command_name);
    "
    
    # Migration 004: Add bot statistics
    apply_migration_sqlite "004_bot_statistics" "
    CREATE TABLE IF NOT EXISTS bot_statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_name TEXT NOT NULL,
        metric_value TEXT NOT NULL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_bot_statistics_metric ON bot_statistics(metric_name);
    CREATE INDEX IF NOT EXISTS idx_bot_statistics_date ON bot_statistics(recorded_at);
    "
}

# Function to apply individual SQLite migration
apply_migration_sqlite() {
    local version="$1"
    local sql="$2"
    
    # Check if migration already applied
    local applied=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM migrations WHERE version = '$version';")
    
    if [ "$applied" -eq 0 ]; then
        log "Applying migration: $version"
        
        # Apply the migration
        if sqlite3 "$DB_PATH" "$sql"; then
            # Record successful migration
            sqlite3 "$DB_PATH" "INSERT INTO migrations (version) VALUES ('$version');"
            success "Migration applied: $version"
        else
            error "Failed to apply migration: $version"
        fi
    else
        log "Migration already applied: $version"
    fi
}

# Function to run PostgreSQL migration scripts
run_migration_scripts_postgresql() {
    log "Applying PostgreSQL migration scripts..."
    
    # Similar structure to SQLite but with PostgreSQL syntax
    # This would need to be implemented based on your PostgreSQL schema needs
    warning "PostgreSQL migration scripts not fully implemented"
}

# Function to verify database integrity
verify_database() {
    log "Verifying database integrity..."
    
    case $DB_TYPE in
        "sqlite")
            if sqlite3 "$DB_PATH" "PRAGMA integrity_check;" | grep -q "ok"; then
                success "SQLite database integrity verified"
            else
                error "SQLite database integrity check failed"
            fi
            ;;
        "postgresql")
            # PostgreSQL doesn't have a simple integrity check like SQLite
            # But we can check if we can connect and query
            if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
                success "PostgreSQL database connection verified"
            else
                error "PostgreSQL database connection failed"
            fi
            ;;
        "mysql")
            warning "MySQL integrity check not implemented"
            ;;
    esac
}

# Function to display migration status
show_migration_status() {
    log "Migration status:"
    
    case $DB_TYPE in
        "sqlite")
            echo "Applied migrations:"
            sqlite3 "$DB_PATH" "SELECT version, applied_at FROM migrations ORDER BY applied_at;" | while read -r line; do
                echo "  ✅ $line"
            done
            ;;
        "postgresql")
            echo "Applied migrations:"
            psql "$DATABASE_URL" -t -c "SELECT version, applied_at FROM migrations ORDER BY applied_at;" | while read -r line; do
                echo "  ✅ $line"
            done
            ;;
        "mysql")
            warning "MySQL migration status not implemented"
            ;;
    esac
}

# Main migration process
log "Database type: $DB_TYPE"

# Create backup before migration
create_migration_backup

# Run migrations based on database type
case $DB_TYPE in
    "sqlite")
        migrate_sqlite
        ;;
    "postgresql")
        migrate_postgresql
        ;;
    "mysql")
        migrate_mysql
        ;;
    *)
        error "Unsupported database type: $DB_TYPE"
        ;;
esac

# Verify database integrity
verify_database

# Show migration status
show_migration_status

# Display completion summary
log "Database migration completed successfully!"
echo ""
echo "=== Migration Summary ==="
echo "Database Type: $DB_TYPE"
case $DB_TYPE in
    "sqlite")
        echo "Database Path: $DB_PATH"
        echo "Database Size: $(du -h "$DB_PATH" 2>/dev/null | cut -f1 || echo "Unknown")"
        ;;
    "postgresql"|"mysql")
        echo "Database URL: $DATABASE_URL"
        ;;
esac
echo "Migration Time: $(date)"
echo ""

success "APBeeper database migration completed successfully! 🐝"
