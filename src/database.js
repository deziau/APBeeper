const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

let db = null;

// Ensure data directory exists
function ensureDataDirectory() {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        try {
            fs.mkdirSync(dataDir, { recursive: true });
            logger.info('Created data directory');
        } catch (error) {
            logger.error('Failed to create data directory:', error);
            // Fallback to current directory
            return path.join(__dirname, '..');
        }
    }
    return dataDir;
}

async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        try {
            const dataDir = ensureDataDirectory();
            const dbPath = path.join(dataDir, 'apbeeper.db');
            
            logger.info(`Initializing database at: ${dbPath}`);
            
            db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    logger.error('Error opening database:', err);
                    reject(err);
                    return;
                }
                
                logger.info('Connected to SQLite database');
                
                // Create tables
                const createTables = `
                    CREATE TABLE IF NOT EXISTS players_panels (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        guild_id TEXT NOT NULL,
                        channel_id TEXT NOT NULL,
                        game_name TEXT NOT NULL,
                        message_id TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(guild_id, channel_id, game_name)
                    );
                    
                    CREATE TABLE IF NOT EXISTS player_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        guild_id TEXT NOT NULL,
                        game_name TEXT NOT NULL,
                        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        ended_at DATETIME,
                        duration INTEGER,
                        is_active BOOLEAN DEFAULT 1
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_active_sessions ON player_sessions(guild_id, game_name, is_active);
                    CREATE INDEX IF NOT EXISTS idx_user_sessions ON player_sessions(user_id, guild_id, game_name);
                `;
                
                db.exec(createTables, (err) => {
                    if (err) {
                        logger.error('Error creating tables:', err);
                        reject(err);
                        return;
                    }
                    
                    logger.info('Database tables created/verified');
                    resolve();
                });
            });
            
        } catch (error) {
            logger.error('Database initialization error:', error);
            reject(error);
        }
    });
}

// Players Panel Functions
async function addPlayersPanel(guildId, channelId, gameName) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT OR REPLACE INTO players_panels (guild_id, channel_id, game_name)
            VALUES (?, ?, ?)
        `;
        
        db.run(query, [guildId, channelId, gameName], function(err) {
            if (err) {
                logger.error('Error adding players panel:', err);
                reject(err);
                return;
            }
            
            logger.info(`Added players panel: ${gameName} in guild ${guildId}`);
            resolve(this.lastID);
        });
    });
}

async function removePlayersPanel(guildId, channelId, gameName) {
    return new Promise((resolve, reject) => {
        const query = `
            DELETE FROM players_panels 
            WHERE guild_id = ? AND channel_id = ? AND game_name = ?
        `;
        
        db.run(query, [guildId, channelId, gameName], function(err) {
            if (err) {
                logger.error('Error removing players panel:', err);
                reject(err);
                return;
            }
            
            logger.info(`Removed players panel: ${gameName} from guild ${guildId}`);
            resolve(this.changes > 0);
        });
    });
}

async function getAllPlayersPanels() {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM players_panels ORDER BY created_at DESC';
        
        db.all(query, [], (err, rows) => {
            if (err) {
                logger.error('Error getting players panels:', err);
                reject(err);
                return;
            }
            
            resolve(rows || []);
        });
    });
}

async function updatePlayersPanelMessage(panelId, messageId) {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE players_panels SET message_id = ? WHERE id = ?';
        
        db.run(query, [messageId, panelId], function(err) {
            if (err) {
                logger.error('Error updating panel message:', err);
                reject(err);
                return;
            }
            
            resolve(this.changes > 0);
        });
    });
}

// Player Session Functions
async function startPlayerSession(userId, guildId, gameName) {
    return new Promise((resolve, reject) => {
        // First, end any existing active session for this user/game
        const endQuery = `
            UPDATE player_sessions 
            SET ended_at = CURRENT_TIMESTAMP, is_active = 0,
                duration = (strftime('%s', 'now') - strftime('%s', started_at)) * 1000
            WHERE user_id = ? AND guild_id = ? AND game_name = ? AND is_active = 1
        `;
        
        db.run(endQuery, [userId, guildId, gameName], (err) => {
            if (err) {
                logger.error('Error ending previous session:', err);
                reject(err);
                return;
            }
            
            // Start new session
            const startQuery = `
                INSERT INTO player_sessions (user_id, guild_id, game_name, is_active)
                VALUES (?, ?, ?, 1)
            `;
            
            db.run(startQuery, [userId, guildId, gameName], function(err) {
                if (err) {
                    logger.error('Error starting player session:', err);
                    reject(err);
                    return;
                }
                
                logger.info(`Started session for user ${userId} playing ${gameName}`);
                resolve(this.lastID);
            });
        });
    });
}

async function endPlayerSession(userId, guildId, gameName) {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE player_sessions 
            SET ended_at = CURRENT_TIMESTAMP, is_active = 0,
                duration = (strftime('%s', 'now') - strftime('%s', started_at)) * 1000
            WHERE user_id = ? AND guild_id = ? AND game_name = ? AND is_active = 1
        `;
        
        db.run(query, [userId, guildId, gameName], function(err) {
            if (err) {
                logger.error('Error ending player session:', err);
                reject(err);
                return;
            }
            
            if (this.changes > 0) {
                logger.info(`Ended session for user ${userId} playing ${gameName}`);
            }
            resolve(this.changes > 0);
        });
    });
}

async function getActivePlayerSessions(guildId, gameName) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT * FROM player_sessions 
            WHERE guild_id = ? AND game_name = ? AND is_active = 1
            ORDER BY started_at DESC
        `;
        
        db.all(query, [guildId, gameName], (err, rows) => {
            if (err) {
                logger.error('Error getting active sessions:', err);
                reject(err);
                return;
            }
            
            resolve(rows || []);
        });
    });
}

async function cleanupOldSessions() {
    return new Promise((resolve, reject) => {
        // End sessions older than 1 hour that are still marked as active
        const query = `
            UPDATE player_sessions 
            SET ended_at = CURRENT_TIMESTAMP, is_active = 0,
                duration = (strftime('%s', 'now') - strftime('%s', started_at)) * 1000
            WHERE is_active = 1 AND started_at < datetime('now', '-1 hour')
        `;
        
        db.run(query, [], function(err) {
            if (err) {
                logger.error('Error cleaning up old sessions:', err);
                reject(err);
                return;
            }
            
            if (this.changes > 0) {
                logger.info(`Cleaned up ${this.changes} old sessions`);
            }
            resolve(this.changes);
        });
    });
}

// Get database instance for direct queries if needed
function getDatabase() {
    return db;
}

// Close database connection
async function closeDatabase() {
    return new Promise((resolve) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    logger.error('Error closing database:', err);
                } else {
                    logger.info('Database connection closed');
                }
                resolve();
            });
        } else {
            resolve();
        }
    });
}

module.exports = {
    initializeDatabase,
    addPlayersPanel,
    removePlayersPanel,
    getAllPlayersPanels,
    updatePlayersPanelMessage,
    startPlayerSession,
    endPlayerSession,
    getActivePlayerSessions,
    cleanupOldSessions,
    getDatabase,
    closeDatabase
};
