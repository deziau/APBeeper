const express = require('express');
const logger = require('./utils/logger');

class HealthServer {
    constructor(bot) {
        this.bot = bot;
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.startTime = Date.now();
        this.server = null;
        
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupRoutes() {
        // Health check endpoint for Railway
        this.app.get('/health', (req, res) => {
            try {
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
                    version: process.env.npm_package_version || '1.0.0',
                    environment: process.env.NODE_ENV || 'development',
                    railway: !!process.env.RAILWAY_ENVIRONMENT
                };

                res.status(200).json(health);
            } catch (error) {
                logger.error('Health check error:', error);
                res.status(500).json({
                    status: 'error',
                    message: 'Health check failed',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Basic metrics endpoint
        this.app.get('/metrics', (req, res) => {
            try {
                const metrics = {
                    uptime: Math.floor((Date.now() - this.startTime) / 1000),
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage(),
                    guilds: this.bot && this.bot.client ? this.bot.client.guilds.cache.size : 0,
                    users: this.bot && this.bot.client ? this.bot.client.users.cache.size : 0,
                    commands: this.bot && this.bot.client ? this.bot.client.commands.size : 0
                };

                res.status(200).json(metrics);
            } catch (error) {
                logger.error('Metrics error:', error);
                res.status(500).json({
                    status: 'error',
                    message: 'Metrics unavailable'
                });
            }
        });

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.status(200).json({
                name: 'APBeeper Discord Bot',
                version: process.env.npm_package_version || '1.0.0',
                status: 'running',
                endpoints: ['/health', '/metrics'],
                railway: !!process.env.RAILWAY_ENVIRONMENT
            });
        });

        // Readiness probe (for Kubernetes-style deployments)
        this.app.get('/ready', (req, res) => {
            const isReady = this.bot && this.bot.client && this.bot.client.readyAt;
            if (isReady) {
                res.status(200).json({ status: 'ready' });
            } else {
                res.status(503).json({ status: 'not ready' });
            }
        });
    }

    setupErrorHandling() {
        this.app.use((err, req, res, next) => {
            logger.error('Express error:', err);
            res.status(500).json({
                status: 'error',
                message: 'Internal server error'
            });
        });
    }

    start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, '0.0.0.0', () => {
                    logger.info(`Health server listening on port ${this.port}`);
                    resolve();
                });

                this.server.on('error', (error) => {
                    logger.error('Health server error:', error);
                    reject(error);
                });

                // Set timeout for server startup
                this.server.timeout = 30000;
                
            } catch (error) {
                logger.error('Failed to start health server:', error);
                reject(error);
            }
        });
    }

    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    logger.info('Health server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = HealthServer;
