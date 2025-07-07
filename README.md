
# APBeeper Discord Bot 🎮

A comprehensive multi-server APB (All Points Bulletin) community Discord bot featuring real-time status tracking, population monitoring, and Twitch integration.

## 🚀 Features

- **Real-time APB Server Monitoring**: Track server population and status across multiple APB servers
- **Discord Integration**: Slash commands for easy server interaction
- **Twitch Notifications**: Automated notifications for APB streamers going live
- **Multi-Server Support**: Manage multiple Discord servers with individual configurations
- **Persistent Data Storage**: SQLite database for configuration and historical data
- **Automated Status Updates**: Scheduled updates for server population and status
- **Rich Embeds**: Beautiful Discord embeds with server information

## 📋 Commands

- `/apbpop` - Display current APB server population
- `/players` - Show detailed player statistics
- `/setchannel` - Configure notification channels
- `/setgame` - Set game-specific settings
- `/setclangroup` - Configure clan group settings
- `/twitch` - Manage Twitch integration settings

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 16.0.0 or higher
- Discord Bot Token
- APB API access (if applicable)
- Twitch API credentials (for stream notifications)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/apbeeper_bot.git
   cd apbeeper_bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   npm run setup
   ```

4. **Start the bot**
   ```bash
   npm run dev  # Development with auto-reload
   npm start    # Production
   ```

## 🚂 Railway Deployment

### Quick Deploy

[![Deploy on Railway](https://i.ytimg.com/vi/McAAvVtE1dY/maxresdefault.jpg)

### Manual Deployment

1. **Fork this repository** to your GitHub account

2. **Create a new Railway project**
   - Go to [Railway](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your forked repository

3. **Add Environment Variables**
   ```
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_CLIENT_ID=your_discord_client_id
   TWITCH_CLIENT_ID=your_twitch_client_id
   TWITCH_CLIENT_SECRET=your_twitch_client_secret
   NODE_ENV=production
   DATABASE_URL=postgresql://username:password@host:port/database
   ```

4. **Deploy**
   - Railway will automatically detect the Node.js project
   - The bot will start using the configuration in `railway.json`
   - Monitor logs in the Railway dashboard

### Database Migration (SQLite → PostgreSQL)

When deploying to Railway, the bot automatically switches from SQLite to PostgreSQL:

1. Railway provides a PostgreSQL database addon
2. Set the `DATABASE_URL` environment variable
3. The bot will automatically create necessary tables on first run

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Discord bot token | ✅ |
| `DISCORD_CLIENT_ID` | Discord application client ID | ✅ |
| `TWITCH_CLIENT_ID` | Twitch API client ID | ✅ |
| `TWITCH_CLIENT_SECRET` | Twitch API client secret | ✅ |
| `NODE_ENV` | Environment (development/production) | ✅ |
| `DATABASE_URL` | PostgreSQL connection string (Railway) | ⚠️ |
| `DATABASE_PATH` | SQLite database path (local) | ⚠️ |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | ❌ |
| `PORT` | Health check server port | ❌ |

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the token and add to your environment variables
5. Enable necessary intents:
   - Server Members Intent
   - Message Content Intent (if needed)

### Twitch API Setup

1. Go to [Twitch Developers](https://dev.twitch.tv/console)
2. Create a new application
3. Copy Client ID and Client Secret
4. Add to your environment variables

## 📊 Monitoring & Health Checks

The bot includes a built-in health check endpoint for Railway monitoring:

- **Health Check**: `GET /health` - Returns bot status and uptime
- **Metrics**: `GET /metrics` - Basic performance metrics
- **Logs**: Structured logging with Winston

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Troubleshooting

- **Documentation**: Check the [docs/](docs/) folder for detailed guides
- **Issues**: Report bugs on [GitHub Issues](https://github.com/yourusername/apbeeper_bot/issues)
- **Railway Deployment**: See [docs/railway-deployment.md](docs/railway-deployment.md)
- **Common Issues**: Check [docs/troubleshooting.md](docs/troubleshooting.md)

## 🏗️ Project Structure

```
apbeeper_bot/
├── src/
│   ├── commands/          # Discord slash commands
│   ├── services/          # Core bot services
│   ├── utils/            # Utility functions
│   ├── database.js       # Database configuration
│   └── index.js          # Main bot entry point
├── docs/                 # Documentation
├── scripts/              # Utility scripts
├── data/                 # Local database files (gitignored)
├── logs/                 # Log files (gitignored)
└── railway.json          # Railway deployment config
```

## 🔄 Updates & Maintenance

The bot is actively maintained with regular updates for:
- Discord.js library updates
- APB server API changes
- New features and improvements
- Security patches

---

**Made with ❤️ for the APB community**
