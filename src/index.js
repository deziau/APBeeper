
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
const cron = require('node-cron');

// Load and validate environment variables first
require('./envCheck');

const { initializeDatabase } = require('./database');
const { updateAPBPanels } = require('./services/apbPopulation');
const { checkTwitchStreams } = require('./services/twitchNotify');
const logger = require('./utils/logger');
const HealthServer = require('./health');

class APBeeperBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildMembers
            ]
        });
        
        this.client.commands = new Collection();
        this.healthServer = new HealthServer(this);
        this.loadCommands();
        this.setupEventHandlers();
    }

    loadCommands() {
        const commandsPath = join(__dirname, 'commands');
        const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = join(commandsPath, file);
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                this.client.commands.set(command.data.name, command);
                logger.info(`Loaded command: ${command.data.name}`);
            } else {
                logger.warn(`Command at ${filePath} is missing required "data" or "execute" property.`);
            }
        }
    }

    setupEventHandlers() {
        this.client.once('ready', async () => {
            logger.info(`${this.client.user.tag} is online!`);
            
            // Initialize database
            await initializeDatabase();
            
            // Deploy commands
            await this.deployCommands();
            
            // Start scheduled tasks
            this.startScheduledTasks();
        });

        this.client.on('interactionCreate', async interaction => {
            if (!interaction.isChatInputCommand()) return;

            const command = this.client.commands.get(interaction.commandName);
            if (!command) {
                logger.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                logger.error(`Error executing command ${interaction.commandName}:`, error);
                
                const errorMessage = 'There was an error while executing this command!';
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
        });

        this.client.on('guildCreate', guild => {
            logger.info(`Joined new guild: ${guild.name} (${guild.id})`);
        });

        this.client.on('guildDelete', guild => {
            logger.info(`Left guild: ${guild.name} (${guild.id})`);
        });
    }

    async deployCommands() {
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
        // Update APB population panels every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            try {
                await updateAPBPanels(this.client);
            } catch (error) {
                logger.error('Error updating APB panels:', error);
            }
        });

        // Check Twitch streams every 2 minutes
        cron.schedule('*/2 * * * *', async () => {
            try {
                await checkTwitchStreams(this.client);
            } catch (error) {
                logger.error('Error checking Twitch streams:', error);
            }
        });

        logger.info('Scheduled tasks started');
    }

    async start() {
        try {
            // Start health server
            this.healthServer.start();
            
            // Login to Discord
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
            this.healthServer.stop();
            
            // Destroy Discord client
            this.client.destroy();
            
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
