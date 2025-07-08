const winston = require('winston');

// Create logger with better error formatting
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
            let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
            
            // Add stack trace for errors
            if (stack) {
                log += `\n${stack}`;
            }
            
            // Add metadata if present
            if (Object.keys(meta).length > 0) {
                log += `\n${JSON.stringify(meta, null, 2)}`;
            }
            
            return log;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Override console methods to use winston
console.log = (...args) => logger.info(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));
console.warn = (...args) => logger.warn(args.join(' '));
console.info = (...args) => logger.info(args.join(' '));

module.exports = logger;
