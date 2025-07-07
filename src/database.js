
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const { join } = require('path');
const { mkdirSync, existsSync } = require('fs');
const logger = require('./utils/logger');

const DB_PATH = process.env.DATABASE_PATH || './data/apbeeper.db';
const DATABASE_URL = process.env.DATABASE_URL;

// Determine database type
const isPostgreSQL = !!DATABASE_URL;
const isSQLite = !isPostgreSQL;

// Ensure data directory exists
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
}

let db;

// Promise wrapper for sqlite3 to provide synchronous-like interface
class DatabaseWrapper {
    constructor(dbInstance) {
        this.db = dbInstance;
    }

    exec(sql) {
        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    prepare(sql) {
        const stmt = this.db.prepare(sql);
        return new StatementWrapper(stmt);
    }

    pragma(pragma) {
        return new Promise((resolve, reject) => {
            this.db.run(`PRAGMA ${pragma}`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

class StatementWrapper {
    constructor(stmt) {
        this.stmt = stmt;
    }

    get(...params) {
        return new Promise((resolve, reject) => {
            this.stmt.get(...params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(...params) {
        return new Promise((resolve, reject) => {
            this.stmt.all(...params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    run(...params) {
        return new Promise((resolve, reject) => {
            this.stmt.run(...params, function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes, lastID: this.lastID });
            });
        });
    }
}

async function initializeDatabase() {
    try {
        const dbInstance = new sqlite3.Database(DB_PATH);
        db = new DatabaseWrapper(dbInstance);
        
        await db.pragma('journal_mode = WAL');
        
        // Create tables
        await createTables();
        
        logger.info('Database initialized successfully');
        return db;
    } catch (error) {
        logger.error('Failed to initialize database:', error);
        throw error;
    }
}

async function createTables() {
    // Server settings table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS server_settings (
            guild_id TEXT PRIMARY KEY,
            game_name TEXT DEFAULT 'APB: Reloaded',
            clan_role_id TEXT,
            apb_channel_id TEXT,
            twitch_enabled BOOLEAN DEFAULT 1,
            twitch_channel_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // APB panels table for tracking auto-updating messages
    await db.exec(`
        CREATE TABLE IF NOT EXISTS apb_panels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            message_id TEXT NOT NULL,
            region TEXT NOT NULL CHECK(region IN ('NA', 'EU', 'BOTH')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(guild_id, channel_id, region)
        )
    `);

    // Twitch streamers table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS twitch_streamers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            twitch_url TEXT NOT NULL,
            is_live BOOLEAN DEFAULT 0,
            last_notified DATETIME,
            added_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(guild_id, user_id)
        )
    `);

    // Create indexes for better performance
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_server_settings_guild_id ON server_settings(guild_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_apb_panels_guild_id ON apb_panels(guild_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_twitch_streamers_guild_id ON twitch_streamers(guild_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_twitch_streamers_user_id ON twitch_streamers(user_id)`);
}

// Server settings functions
async function getServerSettings(guildId) {
    const stmt = db.prepare('SELECT * FROM server_settings WHERE guild_id = ?');
    let settings = await stmt.get(guildId);
    
    if (!settings) {
        // Create default settings for new server
        settings = await createDefaultServerSettings(guildId);
    }
    
    return settings;
}

async function createDefaultServerSettings(guildId) {
    const stmt = db.prepare(`
        INSERT INTO server_settings (guild_id, game_name, twitch_enabled)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id) DO NOTHING
    `);
    
    await stmt.run(guildId, 'APB: Reloaded', 1);
    
    return {
        guild_id: guildId,
        game_name: 'APB: Reloaded',
        clan_role_id: null,
        apb_channel_id: null,
        twitch_enabled: 1,
        twitch_channel_id: null
    };
}

async function updateServerSetting(guildId, key, value) {
    const stmt = db.prepare(`
        INSERT INTO server_settings (guild_id, ${key}, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(guild_id) DO UPDATE SET
        ${key} = excluded.${key},
        updated_at = CURRENT_TIMESTAMP
    `);
    
    return await stmt.run(guildId, value);
}

// APB panels functions
async function getAPBPanels(guildId) {
    const stmt = db.prepare('SELECT * FROM apb_panels WHERE guild_id = ?');
    return await stmt.all(guildId);
}

async function addAPBPanel(guildId, channelId, messageId, region) {
    const stmt = db.prepare(`
        INSERT INTO apb_panels (guild_id, channel_id, message_id, region)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id, channel_id, region) DO UPDATE SET
        message_id = excluded.message_id
    `);
    
    return await stmt.run(guildId, channelId, messageId, region);
}

async function removeAPBPanel(guildId, channelId, region) {
    const stmt = db.prepare('DELETE FROM apb_panels WHERE guild_id = ? AND channel_id = ? AND region = ?');
    return await stmt.run(guildId, channelId, region);
}

async function getAllAPBPanels() {
    const stmt = db.prepare('SELECT * FROM apb_panels');
    return await stmt.all();
}

// Twitch streamers functions
async function getTwitchStreamers(guildId) {
    const stmt = db.prepare('SELECT * FROM twitch_streamers WHERE guild_id = ?');
    return await stmt.all(guildId);
}

async function addTwitchStreamer(guildId, userId, username, twitchUrl, addedBy = null) {
    const stmt = db.prepare(`
        INSERT INTO twitch_streamers (guild_id, user_id, username, twitch_url, added_by)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET
        username = excluded.username,
        twitch_url = excluded.twitch_url,
        added_by = excluded.added_by
    `);
    
    return await stmt.run(guildId, userId, username, twitchUrl, addedBy);
}

async function removeTwitchStreamer(guildId, userId) {
    const stmt = db.prepare('DELETE FROM twitch_streamers WHERE guild_id = ? AND user_id = ?');
    return await stmt.run(guildId, userId);
}

async function updateStreamerLiveStatus(guildId, userId, isLive, lastNotified = null) {
    const stmt = db.prepare(`
        UPDATE twitch_streamers 
        SET is_live = ?, last_notified = COALESCE(?, last_notified)
        WHERE guild_id = ? AND user_id = ?
    `);
    
    return await stmt.run(isLive, lastNotified, guildId, userId);
}

async function getAllTwitchStreamers() {
    const stmt = db.prepare('SELECT * FROM twitch_streamers');
    return await stmt.all();
}

// Cleanup functions
async function cleanupOldData() {
    // Remove panels for messages that no longer exist (could be expanded with actual message checking)
    // Remove old notifications older than 30 days
    const stmt = db.prepare(`
        UPDATE twitch_streamers 
        SET is_live = 0, last_notified = NULL 
        WHERE last_notified < datetime('now', '-30 days')
    `);
    
    return await stmt.run();
}

module.exports = {
    initializeDatabase,
    getServerSettings,
    updateServerSetting,
    getAPBPanels,
    addAPBPanel,
    removeAPBPanel,
    getAllAPBPanels,
    getTwitchStreamers,
    addTwitchStreamer,
    removeTwitchStreamer,
    updateStreamerLiveStatus,
    getAllTwitchStreamers,
    cleanupOldData
};
