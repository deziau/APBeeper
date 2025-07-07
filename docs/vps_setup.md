
# VPS Setup Guide for APBeeper Bot

This guide will walk you through setting up a Virtual Private Server (VPS) to host your APBeeper Discord bot in a production environment.

## Table of Contents
- [VPS Requirements](#vps-requirements)
- [Initial Server Setup](#initial-server-setup)
- [Node.js Installation](#nodejs-installation)
- [Database Configuration](#database-configuration)
- [Process Management with PM2](#process-management-with-pm2)
- [Security Configuration](#security-configuration)
- [Firewall Setup](#firewall-setup)
- [SSL Certificate Setup](#ssl-certificate-setup)
- [Troubleshooting](#troubleshooting)

## VPS Requirements

### Minimum Requirements
- **OS:** Ubuntu 20.04 LTS or newer (recommended)
- **RAM:** 1GB (2GB+ recommended for multiple servers)
- **Storage:** 20GB SSD
- **CPU:** 1 vCPU (2+ recommended)
- **Network:** 1TB bandwidth/month

### Recommended Providers
- **DigitalOcean:** Reliable with good documentation
- **Linode:** Excellent performance and support
- **Vultr:** Cost-effective with global locations
- **AWS EC2:** Enterprise-grade with extensive features
- **Hetzner:** European provider with competitive pricing

### Recommended Specifications
For production use with multiple Discord servers:
- **RAM:** 4GB+
- **CPU:** 2+ vCPUs
- **Storage:** 40GB+ SSD
- **Bandwidth:** Unlimited or high allocation

## Initial Server Setup

### 1. Connect to Your VPS
```bash
ssh root@your_server_ip
```

### 2. Update System Packages
```bash
apt update && apt upgrade -y
```

### 3. Create a Non-Root User
```bash
# Create new user
adduser apbeeper

# Add to sudo group
usermod -aG sudo apbeeper

# Switch to new user
su - apbeeper
```

### 4. Configure SSH Key Authentication
On your local machine:
```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy public key to server
ssh-copy-id apbeeper@your_server_ip
```

### 5. Disable Root Login (Security)
```bash
sudo nano /etc/ssh/sshd_config
```

Update these settings:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH service:
```bash
sudo systemctl restart sshd
```

## Node.js Installation

### Method 1: Using NodeSource Repository (Recommended)
```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Method 2: Using Node Version Manager (NVM)
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload bash profile
source ~/.bashrc

# Install and use Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default node
```

### Install Global Dependencies
```bash
# Install PM2 process manager
sudo npm install -g pm2

# Install other useful tools
sudo npm install -g nodemon
```

## Database Configuration

APBeeper uses SQLite by default, but you can configure PostgreSQL or MySQL for production.

### SQLite Setup (Default)
SQLite requires no additional setup - the bot will create the database file automatically.

### PostgreSQL Setup (Recommended for Production)
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql

-- In PostgreSQL prompt:
CREATE DATABASE apbeeper_bot;
CREATE USER apbeeper_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE apbeeper_bot TO apbeeper_user;
\q
```

Update your `.env` file:
```env
DATABASE_URL=postgresql://apbeeper_user:your_secure_password@localhost:5432/apbeeper_bot
```

### MySQL Setup (Alternative)
```bash
# Install MySQL
sudo apt install mysql-server

# Secure installation
sudo mysql_secure_installation

# Create database and user
sudo mysql

-- In MySQL prompt:
CREATE DATABASE apbeeper_bot;
CREATE USER 'apbeeper_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON apbeeper_bot.* TO 'apbeeper_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Process Management with PM2

PM2 is a production process manager for Node.js applications that provides features like auto-restart, clustering, and monitoring.

### 1. Create PM2 Ecosystem File
```bash
cd /home/apbeeper/apbeeper_bot
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'apbeeper-bot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 2. Start the Bot with PM2
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions provided by the startup command
```

### 3. PM2 Management Commands
```bash
# View running processes
pm2 list

# Monitor processes
pm2 monit

# View logs
pm2 logs apbeeper-bot

# Restart application
pm2 restart apbeeper-bot

# Stop application
pm2 stop apbeeper-bot

# Delete application from PM2
pm2 delete apbeeper-bot
```

## Security Configuration

### 1. Install and Configure Fail2Ban
```bash
# Install Fail2Ban
sudo apt install fail2ban

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit configuration
sudo nano /etc/fail2ban/jail.local
```

Update SSH jail settings:
```ini
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

Start Fail2Ban:
```bash
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 2. Configure Automatic Security Updates
```bash
# Install unattended-upgrades
sudo apt install unattended-upgrades

# Configure automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 3. Set Up Log Rotation
```bash
sudo nano /etc/logrotate.d/apbeeper-bot
```

```
/home/apbeeper/apbeeper_bot/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 apbeeper apbeeper
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Firewall Setup

### 1. Install and Configure UFW
```bash
# Install UFW (usually pre-installed)
sudo apt install ufw

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if changed)
sudo ufw allow ssh

# Allow HTTP and HTTPS (if hosting web interface)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow custom application port (if needed)
sudo ufw allow 3000/tcp

# Enable UFW
sudo ufw enable

# Check status
sudo ufw status verbose
```

### 2. Advanced UFW Rules
```bash
# Allow specific IP addresses
sudo ufw allow from 192.168.1.100

# Allow port range
sudo ufw allow 8000:8999/tcp

# Rate limiting for SSH (prevent brute force)
sudo ufw limit ssh

# Enable logging
sudo ufw logging on
```

### 3. UFW Management
```bash
# List rules with numbers
sudo ufw status numbered

# Delete rule by number
sudo ufw delete 3

# Reset all rules
sudo ufw reset

# Disable UFW
sudo ufw disable
```

## SSL Certificate Setup

If you're hosting a web interface or webhook endpoints:

### 1. Install Certbot
```bash
# Install Certbot
sudo apt install certbot

# For Nginx (if using)
sudo apt install python3-certbot-nginx
```

### 2. Obtain SSL Certificate
```bash
# For standalone certificate
sudo certbot certonly --standalone -d yourdomain.com

# For Nginx integration
sudo certbot --nginx -d yourdomain.com
```

### 3. Auto-Renewal Setup
```bash
# Test renewal
sudo certbot renew --dry-run

# Set up automatic renewal (usually configured by default)
sudo systemctl status certbot.timer
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Node.js Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall Node.js
sudo apt remove nodejs npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. PM2 Not Starting on Boot
```bash
# Regenerate startup script
pm2 unstartup
pm2 startup
# Follow the provided instructions
pm2 save
```

#### 3. Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Test connection
psql -h localhost -U apbeeper_user -d apbeeper_bot
```

#### 4. Firewall Blocking Connections
```bash
# Check UFW status
sudo ufw status verbose

# Check iptables rules
sudo iptables -L

# Temporarily disable UFW for testing
sudo ufw disable
```

#### 5. Memory Issues
```bash
# Check memory usage
free -h
htop

# Check PM2 memory usage
pm2 monit

# Restart application if memory leak suspected
pm2 restart apbeeper-bot
```

### Log Locations
- **Application logs:** `/home/apbeeper/apbeeper_bot/logs/`
- **PM2 logs:** `~/.pm2/logs/`
- **System logs:** `/var/log/`
- **UFW logs:** `/var/log/ufw.log`
- **Fail2Ban logs:** `/var/log/fail2ban.log`

### Performance Monitoring
```bash
# System resource usage
htop
iotop
nethogs

# PM2 monitoring
pm2 monit

# Check disk usage
df -h
du -sh /home/apbeeper/apbeeper_bot/
```

### Backup Important Files
```bash
# Create backup directory
mkdir -p /home/apbeeper/backups

# Backup configuration files
cp /home/apbeeper/apbeeper_bot/.env /home/apbeeper/backups/
cp /home/apbeeper/apbeeper_bot/ecosystem.config.js /home/apbeeper/backups/

# Backup database (if using PostgreSQL)
pg_dump -U apbeeper_user apbeeper_bot > /home/apbeeper/backups/database_backup.sql
```

## Next Steps

After completing the VPS setup:
1. Follow the [GitHub Integration Guide](./github_integration.md) to set up automated deployment
2. Use the [Hosting Documentation](./hosting.md) for deployment procedures
3. Configure bot distribution using the [Bot Distribution Guide](./bot_distribution.md)

---

**Security Note:** Always keep your system updated, use strong passwords, and regularly monitor your server logs for suspicious activity.
