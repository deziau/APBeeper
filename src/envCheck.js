
const dotenv = require('dotenv');
const logger = require('./utils/logger');

// Load environment variables
dotenv.config();

// Debug: Show what environment variables are being loaded
console.log('🔍 Environment Variables Debug:');
console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? `${process.env.DISCORD_TOKEN.substring(0, 10)}...` : 'NOT SET');
console.log('CLIENT_ID:', process.env.CLIENT_ID ? `${process.env.CLIENT_ID}` : 'NOT SET');
console.log('TWITCH_CLIENT_ID:', process.env.TWITCH_CLIENT_ID ? `${process.env.TWITCH_CLIENT_ID.substring(0, 10)}...` : 'NOT SET');
console.log('DATABASE_PATH:', process.env.DATABASE_PATH || 'NOT SET');
console.log('LOG_LEVEL:', process.env.LOG_LEVEL || 'NOT SET');
console.log('');

// Validation function
function validateEnvironmentVariables() {
    const requiredVars = {
        'DISCORD_TOKEN': process.env.DISCORD_TOKEN,
        'CLIENT_ID': process.env.CLIENT_ID
    };

    const missingVars = [];
    const placeholderVars = [];

    for (const [varName, value] of Object.entries(requiredVars)) {
        if (!value) {
            missingVars.push(varName);
        } else if (value.includes('your_') || value.includes('_here')) {
            placeholderVars.push(varName);
        }
    }

    if (missingVars.length > 0 || placeholderVars.length > 0) {
        console.error('❌ Environment Variable Validation Failed!');
        console.error('');
        
        if (missingVars.length > 0) {
            console.error('Missing required environment variables:');
            missingVars.forEach(varName => {
                console.error(`  - ${varName}`);
            });
            console.error('');
        }

        if (placeholderVars.length > 0) {
            console.error('Environment variables with placeholder values:');
            placeholderVars.forEach(varName => {
                console.error(`  - ${varName}: ${requiredVars[varName]}`);
            });
            console.error('');
        }

        console.error('Please update your .env file with the correct values:');
        console.error('1. Copy .env.example to .env if you haven\'t already');
        console.error('2. Replace placeholder values with your actual Discord bot credentials');
        console.error('3. Get your bot token from: https://discord.com/developers/applications');
        console.error('4. Get your client ID from the same Discord Developer Portal');
        console.error('');
        
        throw new Error('Environment variables validation failed. Bot cannot start without proper credentials.');
    }

    console.log('✅ Environment variables validation passed!');
    console.log('');
}

// Export the validation function
module.exports = { validateEnvironmentVariables };

// Run validation immediately when this module is required
validateEnvironmentVariables();
