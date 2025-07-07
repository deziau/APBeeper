
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🤖 APBeeper Bot Environment Setup');
console.log('=====================================');
console.log('');
console.log('This script will help you set up your Discord bot credentials.');
console.log('You can get these from: https://discord.com/developers/applications');
console.log('');

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function setupEnvironment() {
    try {
        console.log('Please provide your Discord bot credentials:');
        console.log('');
        
        const discordToken = await askQuestion('Discord Bot Token: ');
        const clientId = await askQuestion('Discord Client ID: ');
        
        if (!discordToken || !clientId) {
            console.log('❌ Both Discord Token and Client ID are required!');
            process.exit(1);
        }
        
        // Optional Twitch credentials
        console.log('');
        console.log('Twitch integration is optional. Press Enter to skip:');
        const twitchClientId = await askQuestion('Twitch Client ID (optional): ');
        const twitchClientSecret = await askQuestion('Twitch Client Secret (optional): ');
        
        // Create .env content
        const envContent = `# Discord Bot Configuration
DISCORD_TOKEN=${discordToken}
CLIENT_ID=${clientId}

# Twitch API Configuration (optional)
TWITCH_CLIENT_ID=${twitchClientId || 'your_twitch_client_id_here'}
TWITCH_CLIENT_SECRET=${twitchClientSecret || 'your_twitch_client_secret_here'}

# Database Configuration
DATABASE_PATH=./data/apbeeper.db

# Bot Configuration
UPDATE_INTERVAL=300000
LOG_LEVEL=info
`;

        // Write to .env file
        fs.writeFileSync('.env', envContent);
        
        console.log('');
        console.log('✅ Environment file created successfully!');
        console.log('');
        console.log('You can now start your bot with:');
        console.log('  npm start');
        console.log('');
        
    } catch (error) {
        console.error('❌ Error setting up environment:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

setupEnvironment();
