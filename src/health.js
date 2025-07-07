
const express = require('express');
const logger = require('./utils/logger');

class HealthServer {
    constructor(bot) {
        this.bot = bot;
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.startTime = Date.now();
        
        this.setupRoutes();
    }

    setupRoutes() {
        // Health check endpoint for Railway
        this.app.get('/health', (req, res) => {
            const uptime = Date.now() - this.startTime;
            const botStatus = this.bot && this.bot.client ? this.bot.client.readyAt : null;
            
            const health = {
                status: 'healthy',
                uptime: Math.floor(uptime / 1000),
                timestamp: new Date().toISOString(),
                bot: {
                    connected: !!botStatus,
                    readyAt: botStatus,
                    guilds: this.bot && this.bot.client ? this.bot.client.guilds.cache.size : 0,
                    users: this.bot && this.bot.client ? this.bot.client.users.cache.size : 0
                },
                memory: process.memoryUsage(),
                version: process.env.npm_package_version || '1.0.0'
            };

            res.status(200).json(health);
        });

        // Basic metrics endpoint
        this.app.get('/metrics', (req, res) => {
            const metrics = {
                uptime: Math.floor((Date.now() - this.startTime) / 1000),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                guilds: this.bot && this.bot.client ? this.bot.client.guilds.cache.size : 0,
                users: this.bot && this.bot.client ? this.bot.client.users.cache.size : 0,
                commands: this.bot && this.bot.client ? this.bot.client.commands.size : 0
            };

            res.status(200).json(metrics);
        });

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.status(200).json({
                name: 'APBeeper Discord Bot',
                version: process.env.npm_package_version || '1.0.0',
                status: 'running',
                endpoints: ['/health', '/metrics']
            });
        });
    }

    start() {
        if (process.env.NODE_ENV === 'production' || process.env.HEALTH_CHECK_ENABLED === 'true') {
            this.server = this.app.listen(this.port, '0.0.0.0', () => {
                logger.info(`Health server listening on port ${this.port}`);
            });

            this.server.on('error', (error) => {
                logger.error('Health server error:', error);
            });
        }
    }

    stop() {
        if (this.server) {
            this.server.close(() => {
                logger.info('Health server stopped');
            });
        }
    }
}

module.exports = HealthServer;
