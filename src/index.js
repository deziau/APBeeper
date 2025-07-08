const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
const cron = require('node-cron');

// Load and validate environment variables first
const { isHealthCheckOnly } = require('./envCheck');

const { initializeDatabase } = require('./database');
const { updatePlayersPanels, handlePresenceUpdate, cleanupSessions } = require('./services/playersTracking');
const logger = require('./utils/logger');
const HealthServer = require('./health');

class APBeeperBot {
    constructor() {
        this.healthServer = new HealthServer(this);
        this.databaseReady = false;
        
        // Only initialize Discord client if not in health-check-only mode
        if (!isHealthCheckOnly) {
            this.client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.GuildPresences,
                    GatewayIntentBits.GuildMembers
                ]
            });
            
            this.client.commands = new Collection();
            this.loadCommands();
            this.setupEventHandlers();
        }
    }

    loadCommands() {
        if (isHealthCheckOnly) return;
        
        const commandsPath = join(__dirname, 'commands');
        const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = join(commandsPath, file);
            try {
                const command = require(filePath);
                
                if ('data' in command && 'execute' in command) {
                    this.client.commands.set(command.data.name, command);
                    logger.info(`Loaded command: ${command.data.name}`);
                } else {
                    logger.warn(`Command at ${filePath} is missing required "data" or "execute" property.`);
                }
            } catch (error) {
                logger.error(`Error loading command ${file}:`, error);
            }
        }
    }

    setupEventHandlers() {
        if (isHealthCheckOnly) return;
        
        this.client.once('ready', async () => {
            logger.info(`${this.client.user.tag} is online!`);
            
            // Initialize database with retry logic
            await this.initializeDatabaseWithRetry();
            
            // Deploy commands
            await this.deployCommands();
            
            // Start scheduled tasks only if database is ready
            if (this.databaseReady) {
                this.startScheduledTasks();
            } else {
                logger.warn('Database not ready, scheduled tasks will not start');
            }
        });

        this.client.on('interactionCreate', async interaction => {
            if (!interaction.isChatInputCommand()) return;

            const command = this.client.commands.get(interaction.commandName);
            if (!command) {
                logger.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            // Check if database is ready for database-dependent commands
            if (!this.databaseReady && this.isDatabaseCommand(interaction.commandName)) {
                const errorMessage = 'Database is not ready yet. Please try again in a moment.';
                try {
                    await interaction.reply({ 
                        content: errorMessage, 
                        flags: 64 // MessageFlags.Ephemeral
                    });
                } catch (error) {
                    logger.error('Error sending database not ready message:', error);
                }
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                logger.error(`Error executing command ${interaction.commandName}:`, error);
                
                const errorMessage = 'There was an error while executing this command!';
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ 
                            content: errorMessage, 
                            flags: 64 // MessageFlags.Ephemeral
                        });
                    } else {
                        await interaction.reply({ 
                            content: errorMessage, 
                            flags: 64 // MessageFlags.Ephemeral
                        });
                    }
                } catch (followUpError) {
                    logger.error('Error sending error message:', followUpError);
                }
            }
        });

        // Handle presence updates for player tracking (only if database is ready)
        this.client.on('presenceUpdate', async (oldPresence, newPresence) => {
            if (!this.databaseReady) return;
            
            try {
                await handlePresenceUpdate(oldPresence, newPresence);
            } catch (error) {
                logger.error('Error handling presence update:', error);
            }
        });

        this.client.on('guildCreate', guild => {
            logger.info(`Joined new guild: ${guild.name} (${guild.id})`);
        });

        this.client.on('guildDelete', guild => {
            logger.info(`Left guild: ${guild.name} (${guild.id})`);
        });
    }

    async initializeDatabaseWithRetry(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await initializeDatabase();
                this.databaseReady = true;
                logger.info('Database initialized successfully');
                return;
            } catch (error) {
                logger.error(`Database initialization attempt ${attempt} failed:`, error);
                
                if (attempt === maxRetries) {
                    logger.error('All database initialization attempts failed. Bot will continue without database features.');
                    this.databaseReady = false;
                    return;
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
        }
    }

    isDatabaseCommand(commandName) {
        // Commands that require database access
        const databaseCommands = ['setchannel', 'removechannel'];
        return databaseCommands.includes(commandName);
    }

    async deployCommands() {
        if (isHealthCheckOnly) return;
        
        const commands = [];
        for (const command of this.client.commands.values()) {
            commands.push(command.data.toJSON());
        }

        const rest = new REST().setToken(process.env.DISCORD_TOKEN);

        try {
            logger.info(`Started refreshing ${commands.length} application (/) commands.`);

            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );

            logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            logger.error('Error deploying commands:', error);
        }
    }

    startScheduledTasks() {
        if (isHealthCheckOnly || !this.databaseReady) return;
        
        // Update players panels every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            if (!this.databaseReady) return;
            
            try {
                await updatePlayersPanels(this.client);
            } catch (error) {
                logger.error('Error updating players panels:', error);
            }
        });

        // Cleanup old player sessions every hour
        cron.schedule('0 * * * *', async () => {
            if (!this.databaseReady) return;
            
            try {
                await cleanupSessions();
            } catch (error) {
                logger.error('Error cleaning up sessions:', error);
            }
        });

        logger.info('Scheduled tasks started');
    }

    async start() {
        try {
            // Always start health server first
            await this.healthServer.start();
            
            if (isHealthCheckOnly) {
                logger.info('Running in health-check-only mode for Railway deployment');
                return;
            }
            
            // Login to Discord only if not in health-check mode
            await this.client.login(process.env.DISCORD_TOKEN);
        } catch (error) {
            logger.error('Failed to start bot:', error);
            process.exit(1);
        }
    }

    async stop() {
        logger.info('Shutting down bot...');
        
        try {
            // Stop health server
            await this.healthServer.stop();
            
            // Destroy Discord client if it exists
            if (this.client) {
                this.client.destroy();
            }
            
            logger.info('Bot shutdown complete');
        } catch (error) {
            logger.error('Error during shutdown:', error);
        }
    }
}

// Start the bot
const bot = new APBeeperBot();

// Handle process termination
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

bot.start();
