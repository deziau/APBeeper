
#!/usr/bin/env node

/**
 * Migration script to move data from SQLite to PostgreSQL
 * Run this script when deploying to Railway for the first time
 */

const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Configuration
const SQLITE_PATH = process.env.SQLITE_PATH || './data/apbeeper.db';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required for PostgreSQL connection');
    process.exit(1);
}

if (!fs.existsSync(SQLITE_PATH)) {
    console.log('No SQLite database found. Skipping migration.');
    process.exit(0);
}

async function migrateSQLiteToPostgreSQL() {
    console.log('Starting migration from SQLite to PostgreSQL...');

    // Connect to SQLite
    const sqliteDb = new sqlite3.Database(SQLITE_PATH);
    
    // Connect to PostgreSQL
    const pgClient = new Client({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        await pgClient.connect();
        console.log('Connected to PostgreSQL');

        // Create PostgreSQL tables
        await createPostgreSQLTables(pgClient);

        // Migrate data
        await migrateGuilds(sqliteDb, pgClient);
        await migrateChannels(sqliteDb, pgClient);
        await migrateTwitchStreamers(sqliteDb, pgClient);
        await migratePopulationHistory(sqliteDb, pgClient);

        console.log('Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        sqliteDb.close();
        await pgClient.end();
    }
}

async function createPostgreSQLTables(client) {
    console.log('Creating PostgreSQL tables...');

    const createTables = `
        CREATE TABLE IF NOT EXISTS guilds (
            id SERIAL PRIMARY KEY,
            guild_id VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            settings JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS channels (
            id SERIAL PRIMARY KEY,
            guild_id VARCHAR(255) NOT NULL,
            channel_id VARCHAR(255) NOT NULL,
            channel_type VARCHAR(50) NOT NULL,
            settings JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(guild_id, channel_id, channel_type)
        );

        CREATE TABLE IF NOT EXISTS twitch_streamers (
            id SERIAL PRIMARY KEY,
            guild_id VARCHAR(255) NOT NULL,
            twitch_username VARCHAR(255) NOT NULL,
            twitch_user_id VARCHAR(255),
            is_live BOOLEAN DEFAULT FALSE,
            last_stream_title TEXT,
            last_game_name VARCHAR(255),
            notification_sent BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(guild_id, twitch_username)
        );

        CREATE TABLE IF NOT EXISTS population_history (
            id SERIAL PRIMARY KEY,
            server_name VARCHAR(255) NOT NULL,
            population INTEGER NOT NULL,
            max_population INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata JSONB DEFAULT '{}'
        );

        CREATE INDEX IF NOT EXISTS idx_guilds_guild_id ON guilds(guild_id);
        CREATE INDEX IF NOT EXISTS idx_channels_guild_id ON channels(guild_id);
        CREATE INDEX IF NOT EXISTS idx_channels_channel_id ON channels(channel_id);
        CREATE INDEX IF NOT EXISTS idx_twitch_guild_id ON twitch_streamers(guild_id);
        CREATE INDEX IF NOT EXISTS idx_twitch_username ON twitch_streamers(twitch_username);
        CREATE INDEX IF NOT EXISTS idx_population_server ON population_history(server_name);
        CREATE INDEX IF NOT EXISTS idx_population_timestamp ON population_history(timestamp);
    `;

    await client.query(createTables);
    console.log('PostgreSQL tables created successfully');
}

async function migrateGuilds(sqliteDb, pgClient) {
    return new Promise((resolve, reject) => {
        console.log('Migrating guilds...');
        
        sqliteDb.all("SELECT * FROM guilds", async (err, rows) => {
            if (err) {
                if (err.message.includes('no such table')) {
                    console.log('No guilds table found in SQLite, skipping...');
                    return resolve();
                }
                return reject(err);
            }

            try {
                for (const row of rows) {
                    await pgClient.query(
                        'INSERT INTO guilds (guild_id, name, settings, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (guild_id) DO UPDATE SET name = $2, settings = $3, updated_at = $5',
                        [row.guild_id, row.name, row.settings || '{}', row.created_at || new Date(), row.updated_at || new Date()]
                    );
                }
                console.log(`Migrated ${rows.length} guilds`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

async function migrateChannels(sqliteDb, pgClient) {
    return new Promise((resolve, reject) => {
        console.log('Migrating channels...');
        
        sqliteDb.all("SELECT * FROM channels", async (err, rows) => {
            if (err) {
                if (err.message.includes('no such table')) {
                    console.log('No channels table found in SQLite, skipping...');
                    return resolve();
                }
                return reject(err);
            }

            try {
                for (const row of rows) {
                    await pgClient.query(
                        'INSERT INTO channels (guild_id, channel_id, channel_type, settings, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (guild_id, channel_id, channel_type) DO UPDATE SET settings = $4, updated_at = $6',
                        [row.guild_id, row.channel_id, row.channel_type, row.settings || '{}', row.created_at || new Date(), row.updated_at || new Date()]
                    );
                }
                console.log(`Migrated ${rows.length} channels`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

async function migrateTwitchStreamers(sqliteDb, pgClient) {
    return new Promise((resolve, reject) => {
        console.log('Migrating Twitch streamers...');
        
        sqliteDb.all("SELECT * FROM twitch_streamers", async (err, rows) => {
            if (err) {
                if (err.message.includes('no such table')) {
                    console.log('No twitch_streamers table found in SQLite, skipping...');
                    return resolve();
                }
                return reject(err);
            }

            try {
                for (const row of rows) {
                    await pgClient.query(
                        'INSERT INTO twitch_streamers (guild_id, twitch_username, twitch_user_id, is_live, last_stream_title, last_game_name, notification_sent, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (guild_id, twitch_username) DO UPDATE SET twitch_user_id = $3, is_live = $4, last_stream_title = $5, last_game_name = $6, notification_sent = $7, updated_at = $9',
                        [
                            row.guild_id,
                            row.twitch_username,
                            row.twitch_user_id,
                            row.is_live || false,
                            row.last_stream_title,
                            row.last_game_name,
                            row.notification_sent || false,
                            row.created_at || new Date(),
                            row.updated_at || new Date()
                        ]
                    );
                }
                console.log(`Migrated ${rows.length} Twitch streamers`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

async function migratePopulationHistory(sqliteDb, pgClient) {
    return new Promise((resolve, reject) => {
        console.log('Migrating population history...');
        
        sqliteDb.all("SELECT * FROM population_history ORDER BY timestamp DESC LIMIT 1000", async (err, rows) => {
            if (err) {
                if (err.message.includes('no such table')) {
                    console.log('No population_history table found in SQLite, skipping...');
                    return resolve();
                }
                return reject(err);
            }

            try {
                for (const row of rows) {
                    await pgClient.query(
                        'INSERT INTO population_history (server_name, population, max_population, timestamp, metadata) VALUES ($1, $2, $3, $4, $5)',
                        [
                            row.server_name,
                            row.population,
                            row.max_population,
                            row.timestamp || new Date(),
                            row.metadata || '{}'
                        ]
                    );
                }
                console.log(`Migrated ${rows.length} population history records`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Run migration if called directly
if (require.main === module) {
    migrateSQLiteToPostgreSQL().catch(console.error);
}

module.exports = { migrateSQLiteToPostgreSQL };
