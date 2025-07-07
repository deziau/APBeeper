# APBeeper Bot

A Discord bot for APB: Reloaded that provides server population monitoring, Twitch notifications, and clan management features.

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `DISCORD_TOKEN` - Your Discord bot token
- `DISCORD_CLIENT_ID` - Your Discord application client ID
- `TWITCH_CLIENT_ID` - Twitch API client ID
- `TWITCH_CLIENT_SECRET` - Twitch API client secret
- `DATABASE_URL` - PostgreSQL database URL

### 3. Run the Bot
```bash
npm start
```

## Railway Deployment

1. Fork this repository
2. Connect your GitHub repo to Railway
3. Set environment variables in Railway dashboard
4. Deploy automatically triggers on push to main branch

The bot includes:
- **Population Monitoring**: Real-time APB server population tracking
- **Twitch Integration**: Stream notifications for configured streamers
- **Clan Management**: Clan group management and player tracking
- **Discord Commands**: Interactive slash commands for server management

## Commands

- `/apbpop` - Check current server population
- `/players` - View active players by district
- `/twitch` - Manage Twitch notifications
- `/setchannel` - Configure notification channels
- `/setclangroup` - Set up clan groups
- `/setgame` - Configure game settings

## Support

For issues or questions, create an issue in the GitHub repository.
