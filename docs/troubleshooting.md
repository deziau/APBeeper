
# Troubleshooting Guide

This guide helps you diagnose and fix common issues with APBeeper Bot deployment and operation.

## 🚨 Common Issues

### Bot Not Starting

#### Symptoms
- Bot doesn't appear online in Discord
- No response to commands
- Railway deployment fails

#### Diagnosis
```bash
# Check logs for startup errors
npm run dev  # Local development
# Or check Railway deployment logs
```

#### Solutions

**Invalid Discord Token**
```bash
# Verify token in .env file
DISCORD_TOKEN=your_actual_token_here

# Test token validity
npm run test-env
```

**Missing Environment Variables**
```bash
# Check all required variables are set
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...
```

**Node.js Version Issues**
```bash
# Ensure Node.js 16+ is installed
node --version

# Update if necessary
nvm install 16
nvm use 16
```

### Database Connection Issues

#### Symptoms
- "Database connection failed" errors
- Commands not saving data
- Bot crashes on database operations

#### Diagnosis
```bash
# Check database configuration
# Local: Verify SQLite file exists
ls -la data/apbeeper.db

# Railway: Verify DATABASE_URL is set
echo $DATABASE_URL
```

#### Solutions

**SQLite Issues (Local)**
```bash
# Ensure data directory exists
mkdir -p data

# Check file permissions
chmod 755 data/
chmod 644 data/apbeeper.db

# Recreate database if corrupted
rm data/apbeeper.db
npm start  # Will recreate tables
```

**PostgreSQL Issues (Railway)**
```bash
# Verify DATABASE_URL format
# Should be: postgresql://user:pass@host:port/db

# Check PostgreSQL service status in Railway dashboard
# Restart PostgreSQL service if needed
```

### Discord API Issues

#### Symptoms
- "Missing Permissions" errors
- Commands not registering
- Bot can't send messages

#### Diagnosis
```bash
# Check bot permissions in Discord server
# Verify bot has necessary intents enabled
```

#### Solutions

**Bot Permissions**
1. Go to Discord Developer Portal
2. Select your application
3. Go to "Bot" section
4. Enable required intents:
   - Server Members Intent
   - Message Content Intent (if needed)

**Slash Command Registration**
```bash
# Re-register commands
npm run setup

# Or manually register
node -e "require('./src/index.js')"
```

### Twitch Integration Issues

#### Symptoms
- Twitch notifications not working
- "Invalid Twitch credentials" errors
- Stream status not updating

#### Diagnosis
```bash
# Test Twitch API credentials
curl -H "Client-ID: YOUR_CLIENT_ID" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     https://api.twitch.tv/helix/users
```

#### Solutions

**Invalid Credentials**
```bash
# Verify Twitch API credentials
TWITCH_CLIENT_ID=your_actual_client_id
TWITCH_CLIENT_SECRET=your_actual_client_secret

# Regenerate credentials if needed
```

**API Rate Limiting**
```bash
# Reduce check frequency in cron jobs
# Default: */2 * * * * (every 2 minutes)
# Increase to: */5 * * * * (every 5 minutes)
```

### Railway Deployment Issues

#### Symptoms
- Build failures
- Deployment timeouts
- Health check failures

#### Diagnosis
```bash
# Check Railway build logs
# Check Railway deployment logs
# Verify railway.json configuration
```

#### Solutions

**Build Failures**
```bash
# Ensure package.json has correct scripts
"scripts": {
  "start": "node src/index.js",
  "build": "npm ci"
}

# Check Node.js version compatibility
"engines": {
  "node": ">=16.0.0"
}
```

**Health Check Failures**
```bash
# Verify health endpoint is working
curl http://localhost:3000/health

# Check PORT environment variable
PORT=3000  # Should match railway.json
```

**Memory Issues**
```bash
# Monitor memory usage in Railway dashboard
# Optimize database queries
# Implement caching if needed
```

## 🔧 Debugging Tools

### Local Development

**Environment Check**
```bash
npm run test-env
```

**Debug Mode**
```bash
LOG_LEVEL=debug npm run dev
```

**Database Inspection**
```bash
# SQLite
sqlite3 data/apbeeper.db ".tables"
sqlite3 data/apbeeper.db "SELECT * FROM guilds;"

# PostgreSQL (Railway)
# Use Railway database console
```

### Production Debugging

**Railway Logs**
```bash
# View real-time logs in Railway dashboard
# Filter by log level
# Search for specific errors
```

**Health Check Testing**
```bash
# Test health endpoint
curl https://your-app.railway.app/health

# Expected response:
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📊 Performance Issues

### High Memory Usage

#### Symptoms
- Railway memory alerts
- Bot becoming unresponsive
- Frequent restarts

#### Solutions
```bash
# Monitor memory usage
process.memoryUsage()

# Optimize database connections
# Implement connection pooling
# Clear unused variables
```

### High CPU Usage

#### Symptoms
- Slow command responses
- Railway CPU alerts
- Timeout errors

#### Solutions
```bash
# Profile CPU usage
# Optimize cron job frequency
# Implement caching
# Use async/await properly
```

### Database Performance

#### Symptoms
- Slow query responses
- Database timeouts
- Connection pool exhaustion

#### Solutions
```bash
# Add database indexes
CREATE INDEX idx_guild_id ON guilds(guild_id);

# Optimize queries
# Use prepared statements
# Implement query caching
```

## 🔍 Log Analysis

### Common Error Patterns

**Discord API Errors**
```
DiscordAPIError[50001]: Missing Access
DiscordAPIError[50013]: Missing Permissions
DiscordAPIError[10062]: Unknown interaction
```

**Database Errors**
```
SQLITE_BUSY: database is locked
ECONNREFUSED: Connection refused
ETIMEDOUT: Connection timeout
```

**Twitch API Errors**
```
401 Unauthorized: Invalid access token
429 Too Many Requests: Rate limit exceeded
400 Bad Request: Invalid request parameters
```

### Log Levels

```bash
# Error: Critical issues only
LOG_LEVEL=error

# Warn: Warnings and errors
LOG_LEVEL=warn

# Info: General information (default)
LOG_LEVEL=info

# Debug: Detailed debugging information
LOG_LEVEL=debug
```

## 🆘 Getting Help

### Before Asking for Help

1. **Check this troubleshooting guide**
2. **Review error logs carefully**
3. **Test with minimal configuration**
4. **Verify environment variables**
5. **Check service status pages**

### Where to Get Help

**GitHub Issues**
- Bug reports
- Feature requests
- Deployment issues

**Railway Support**
- Platform-specific issues
- Billing questions
- Service outages

**Discord/Twitch API Support**
- API-related issues
- Permission problems
- Rate limiting questions

### Information to Include

When asking for help, include:

1. **Error messages** (full stack trace)
2. **Environment details** (Node.js version, OS)
3. **Configuration** (sanitized, no secrets)
4. **Steps to reproduce**
5. **Expected vs actual behavior**

### Emergency Procedures

**Bot Completely Down**
1. Check Railway service status
2. Verify environment variables
3. Restart Railway service
4. Check Discord API status
5. Rollback to previous deployment if needed

**Database Issues**
1. Check database service status
2. Verify connection string
3. Test database connectivity
4. Restore from backup if needed

**Security Incident**
1. Rotate all API keys immediately
2. Check logs for unauthorized access
3. Update environment variables
4. Monitor for unusual activity

---

**Still having issues?** Create a detailed issue on [GitHub](https://github.com/yourusername/apbeeper_bot/issues) with logs and configuration details.
