const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

// Use a more Railway-friendly database path
const dataDir = process.env.DATABASE_DIR || path.join(__dirname, '..', 'data');
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'apbeeper.db');

let db;

function initializeDatabase() {
    return new Promise((resolve, reject) => {
        try {
            // Ensure data directory exists
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
                logger.info(`Created data directory: ${dataDir}`);
            }

            // Check if we can write to the directory
            try {
                fs.accessSync(dataDir, fs.constants.W_OK);
            } catch (error) {
                logger.error('Cannot write to data directory:', error);
                // Fallback to temp directory
                const tempDbPath = path.join('/tmp', 'apbeeper.db');
                logger.warn(`Using temporary database path: ${tempDbPath}`);
                return initializeDatabaseWithPath(tempDbPath, resolve, reject);
            }

            initializeDatabaseWithPath(dbPath, resolve, reject);
            
        } catch (error) {
            logger.error('Error setting up database directory:', error);
            // Final fallback to in-memory database
            logger.warn('Using in-memory database as final fallback');
            initializeDatabaseWithPath(':memory:', resolve, reject);
        }
    });
}

function initializeDatabaseWithPath(databasePath, resolve, reject) {
    db = new sqlite3.Database(databasePath, (err) => {
        if (err) {
            logger.error('Error opening database:', err);
            reject(err);
            return;
        }
        
        logger.info(`Connected to SQLite database at: ${databasePath}`);
        
        // Create tables
        createTables()
            .then(() => {
                logger.info('Database tables initialized');
                resolve();
            })
            .catch(reject);
    });
}

function createTables() {
    return new Promise((resolve, reject) => {
        const tables = [
            // Existing APB panels table
            `CREATE TABLE IF NOT EXISTS apb_panels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                message_id TEXT,
                region TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // New players panels table
            `CREATE TABLE IF NOT EXISTS players_panels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                message_id TEXT,
                game_name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, channel_id, game_name)
            )`,
            
            // New player sessions table
            `CREATE TABLE IF NOT EXISTS player_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                game_name TEXT NOT NULL,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                ended_at DATETIME,
                duration INTEGER,
                is_active BOOLEAN DEFAULT 1
            )`
        ];

        let completed = 0;
        let hasError = false;

        if (tables.length === 0) {
            resolve();
            return;
        }

        tables.forEach((sql, index) => {
            db.run(sql, (err) => {
                if (err && !hasError) {
                    hasError = true;
                    logger.error(`Error creating table ${index}:`, err);
                    reject(err);
                    return;
                }
                
                completed++;
                if (completed === tables.length && !hasError) {
                    // Create indexes for better performance
                    createIndexes()
                        .then(resolve)
                        .catch(reject);
                }
            });
        });
    });
}

function createIndexes() {
    return new Promise((resolve, reject) => {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_player_sessions_user_guild_game ON player_sessions(user_id, guild_id, game_name)',
            'CREATE INDEX IF NOT EXISTS idx_player_sessions_active ON player_sessions(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_apb_panels_guild_channel ON apb_panels(guild_id, channel_id)',
            'CREATE INDEX IF NOT EXISTS idx_players_panels_guild_channel_game ON players_panels(guild_id, channel_id, game_name)'
        ];

        let completed = 0;
        let hasError = false;

        if (indexes.length === 0) {
            resolve();
            return;
        }

        indexes.forEach((sql, index) => {
            db.run(sql, (err) => {
                if (err && !hasError) {
                    hasError = true;
                    logger.error(`Error creating index ${index}:`, err);
                    reject(err);
                    return;
                }
                
                completed++;
                if (completed === indexes.length && !hasError) {
                    resolve();
                }
            });
        });
    });
}

// APB Panels functions
function getAPBPanels() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        db.all('SELECT * FROM apb_panels', (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function addAPBPanel(guildId, channelId, region) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const sql = 'INSERT OR REPLACE INTO apb_panels (guild_id, channel_id, region) VALUES (?, ?, ?)';
        db.run(sql, [guildId, channelId, region], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function updateAPBPanelMessage(id, messageId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const sql = 'UPDATE apb_panels SET message_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        db.run(sql, [messageId, id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function removeAPBPanel(guildId, channelId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const sql = 'DELETE FROM apb_panels WHERE guild_id = ? AND channel_id = ?';
        db.run(sql, [guildId, channelId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Players Panels functions
function getPlayersPanel(guildId, channelId, gameName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const sql = 'SELECT * FROM players_panels WHERE guild_id = ? AND channel_id = ? AND game_name = ?';
        db.get(sql, [guildId, channelId, gameName], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getAllPlayersPanels() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        db.all('SELECT * FROM players_panels', (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function addPlayersPanel(guildId, channelId, gameName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const sql = 'INSERT OR REPLACE INTO players_panels (guild_id, channel_id, game_name) VALUES (?, ?, ?)';
        db.run(sql, [guildId, channelId, gameName], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function updatePlayersPanelMessage(id, messageId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const sql = 'UPDATE players_panels SET message_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        db.run(sql, [messageId, id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function removePlayersPanel(guildId, channelId, gameName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const sql = 'DELETE FROM players_panels WHERE guild_id = ? AND channel_id = ? AND game_name = ?';
        db.run(sql, [guildId, channelId, gameName], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Player Sessions functions
function startPlayerSession(userId, guildId, gameName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        // End any existing active session first
        const endSql = 'UPDATE player_sessions SET ended_at = CURRENT_TIMESTAMP, is_active = 0, duration = (julianday(CURRENT_TIMESTAMP) - julianday(started_at)) * 86400000 WHERE user_id = ? AND guild_id = ? AND game_name = ? AND is_active = 1';
        
        db.run(endSql, [userId, guildId, gameName], (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Start new session
            const startSql = 'INSERT INTO player_sessions (user_id, guild_id, game_name) VALUES (?, ?, ?)';
            db.run(startSql, [userId, guildId, gameName], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    });
}

function endPlayerSession(userId, guildId, gameName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const sql = 'UPDATE player_sessions SET ended_at = CURRENT_TIMESTAMP, is_active = 0, duration = (julianday(CURRENT_TIMESTAMP) - julianday(started_at)) * 86400000 WHERE user_id = ? AND guild_id = ? AND game_name = ? AND is_active = 1';
        db.run(sql, [userId, guildId, gameName], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function getActivePlayerSessions(guildId, gameName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const sql = 'SELECT * FROM player_sessions WHERE guild_id = ? AND game_name = ? AND is_active = 1 ORDER BY started_at DESC';
        db.all(sql, [guildId, gameName], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function cleanupOldSessions() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        // Clean up sessions older than 24 hours that are still marked as active
        const sql = 'UPDATE player_sessions SET ended_at = started_at, is_active = 0, duration = 0 WHERE is_active = 1 AND julianday(CURRENT_TIMESTAMP) - julianday(started_at) > 1';
        db.run(sql, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

module.exports = {
    initializeDatabase,
    getAPBPanels,
    addAPBPanel,
    updateAPBPanelMessage,
    removeAPBPanel,
    getPlayersPanel,
    getAllPlayersPanels,
    addPlayersPanel,
    updatePlayersPanelMessage,
    removePlayersPanel,
    startPlayerSession,
    endPlayerSession,
    getActivePlayerSessions,
    cleanupOldSessions
};
