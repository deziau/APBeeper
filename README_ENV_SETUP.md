
# Environment Setup Guide

## Quick Setup

The APBeeper bot requires Discord credentials to function. You have two options:

### Option 1: Interactive Setup (Recommended)
Run the setup script to be guided through the process:
```bash
node setup-env.js
```

### Option 2: Manual Setup
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and replace the placeholder values:
   ```
   DISCORD_TOKEN=your_actual_bot_token_here
   CLIENT_ID=your_actual_client_id_here
   ```

## Getting Discord Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select an existing one
3. Go to the "Bot" section:
   - Copy the **Token** (this is your `DISCORD_TOKEN`)
   - Make sure to enable the required bot permissions
4. Go to "General Information":
   - Copy the **Application ID** (this is your `CLIENT_ID`)

## Environment Variables Explained

- `DISCORD_TOKEN`: Your bot's secret token from Discord Developer Portal
- `CLIENT_ID`: Your application's ID from Discord Developer Portal  
- `TWITCH_CLIENT_ID`: (Optional) For Twitch stream notifications
- `TWITCH_CLIENT_SECRET`: (Optional) For Twitch stream notifications
- `DATABASE_PATH`: Where to store the bot's database file
- `UPDATE_INTERVAL`: How often to update APB population (milliseconds)
- `LOG_LEVEL`: Logging level (info, debug, warn, error)

## Testing Your Setup

After setting up your environment variables, test them with:
```bash
node -e "require('./src/envCheck.js')"
```

If everything is configured correctly, you should see:
```
✅ Environment variables validation passed!
```

## Starting the Bot

Once your environment is set up:
```bash
npm start
```

## Troubleshooting

- **"undefined" client ID error**: Your `.env` file has placeholder values instead of real credentials
- **Bot not responding to slash commands**: Make sure your `CLIENT_ID` is correct and the bot has been invited to your server with the right permissions
- **Permission errors**: Ensure your bot has the necessary permissions in your Discord server

For more help, check the main README.md file.
