
const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const CURRENT_LOG_LEVEL = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.info;

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

function formatTimestamp() {
    return new Date().toISOString();
}

function formatMessage(level, message, ...args) {
    const timestamp = formatTimestamp();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
}

function writeToFile(level, formattedMessage) {
    const logFile = path.join(logsDir, `apbeeper-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, formattedMessage + '\n');
}

function log(level, message, ...args) {
    if (LOG_LEVELS[level] > CURRENT_LOG_LEVEL) return;
    
    const formattedMessage = formatMessage(level, message, ...args);
    
    // Console output with colors
    const colors = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m',  // Yellow
        info: '\x1b[36m',  // Cyan
        debug: '\x1b[90m'  // Gray
    };
    
    const resetColor = '\x1b[0m';
    console.log(`${colors[level] || ''}${formattedMessage}${resetColor}`);
    
    // File output
    try {
        writeToFile(level, formattedMessage);
    } catch (error) {
        console.error('Failed to write to log file:', error);
    }
}

module.exports = {
    error: (message, ...args) => log('error', message, ...args),
    warn: (message, ...args) => log('warn', message, ...args),
    info: (message, ...args) => log('info', message, ...args),
    debug: (message, ...args) => log('debug', message, ...args)
};
