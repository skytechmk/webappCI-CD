# 🚀 SnapifY CI/CD Setup Guide

## Overview
This guide will help you set up a complete CI/CD pipeline for your SnapifY application using GitHub Actions. The pipeline includes automated testing, building, and deployment to your production server.

## 📋 Prerequisites

### Server Requirements
- Ubuntu/Debian server with SSH access
- Node.js 20.x installed
- PM2 process manager installed
- Nginx web server configured
- Git repository access

### Current Server Configuration
Based on your setup:
- **Domain**: `snapify.skytech.mk`
- **Port**: `3001` (internal), `80/443` (nginx)
- **Project Directory**: `/var/www/snapify`
- **Backup Directory**: `/var/www/backups`
- **PM2 Config**: `ecosystem.config.cjs`
- **Database**: SQLite (`snapify.db`)

---

## 🔐 Step 1: Set Up GitHub Secrets

### Access GitHub Repository Settings
1. Go to your repository: `https://github.com/skytechmk/webappCI-CD`
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions** in the left sidebar
4. Click **New repository secret**

### Required Secrets

#### Production Server Secrets
```
Name: PRODUCTION_HOST
Value: your-server-ip-or-domain.com
```

```
Name: PRODUCTION_USER
Value: deploy
```

```
Name: PRODUCTION_SSH_KEY
Value: -----BEGIN OPENSSH PRIVATE KEY-----
YOUR_PRIVATE_KEY_HERE
-----END OPENSSH PRIVATE KEY-----
```

#### Staging Server Secrets (Optional)
```
Name: STAGING_HOST
Value: your-staging-server.com
```

```
Name: STAGING_USER
Value: deploy
```

```
Name: STAGING_SSH_KEY
Value: -----BEGIN OPENSSH PRIVATE KEY-----
YOUR_STAGING_PRIVATE_KEY_HERE
-----END OPENSSH PRIVATE KEY-----
```

#### Slack Notifications (Optional)
```
Name: SLACK_WEBHOOK_URL
Value: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### How to Generate SSH Keys

#### On Your Local Machine:
```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "deploy@snapify"

# Copy public key to server
ssh-copy-id -i ~/.ssh/id_rsa.pub deploy@your-server.com

# Get private key for GitHub secret
cat ~/.ssh/id_rsa
```

#### On Your Server:
```bash
# Create deploy user (if not exists)
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy

# Set up SSH directory
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy chmod 700 /home/deploy/.ssh

# Add your public key to authorized_keys
sudo -u deploy echo "YOUR_PUBLIC_KEY_HERE" >> /home/deploy/.ssh/authorized_keys
sudo -u deploy chmod 600 /home/deploy/.ssh/authorized_keys
```

---

## 🏗️ Step 2: Prepare Your Server

### 1. Install Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install jq for JSON parsing
sudo apt install -y jq
```

### 2. Set Up Project Directory
```bash
# Create directories
sudo mkdir -p /var/www/snapify
sudo mkdir -p /var/www/backups
sudo chown -R deploy:deploy /var/www/snapify
sudo chown -R deploy:deploy /var/www/backups
```

### 3. Configure Nginx
```bash
# Copy nginx configuration
sudo cp /var/www/snapify/nginx.conf /etc/nginx/sites-available/snapify

# Enable site
sudo ln -sf /etc/nginx/sites-available/snapify /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 4. Set Up SSL (Let's Encrypt)
```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d snapify.skytech.mk

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🧪 Step 3: Test the Pipeline

### 1. Push to Develop Branch (Staging)
```bash
# Switch to develop branch
git checkout -b develop

# Make a small change (e.g., update README)
echo "# Test deployment" >> README.md
git add README.md
git commit -m "test: Staging deployment test"
git push origin develop
```

### 2. Monitor the Pipeline
1. Go to **Actions** tab in your GitHub repository
2. Click on the running workflow
3. Watch the **deploy-staging** job
4. Check server logs: `pm2 logs snapify-staging`

### 3. Verify Staging Deployment
```bash
# SSH to your server
ssh deploy@your-server.com

# Check if staging is running
pm2 status
pm2 logs snapify-staging

# Test health endpoint
curl http://localhost:3002/api/health
```

---

## 🚀 Step 4: Production Deployment

### Manual Production Deployment
1. Go to **Actions** tab in GitHub
2. Click **Deploy to Production** workflow
3. Click **Run workflow**
4. Select branch/tag (leave empty for latest)
5. Click **Run workflow**

### Automatic Production Deployment
```bash
# Merge develop to main
git checkout main
git merge develop
git push origin main
```

### Monitor Production Deployment
```bash
# Check deployment status
pm2 status
pm2 logs snapify

# Test production endpoint
curl https://snapify.skytech.mk/api/health
```

---

## 🔧 Step 5: Customize for Your Needs

### Environment Variables
Create `.env` file on your server:
```bash
# Production environment variables
NODE_ENV=production
PORT=3001
JWT_SECRET=your-production-jwt-secret
GEMINI_API_KEY=your-gemini-api-key
# Add other required environment variables
```

### PM2 Configuration
Your `ecosystem.config.cjs` is already configured for:
- Port 3001
- Production environment
- Automatic restarts
- Memory limits

### Database Backups
The pipeline automatically backs up your SQLite database:
- Location: `/var/www/backups/`
- Naming: `snapify_prod_backup_YYYYMMDD_HHMMSS.tar.gz`
- Retention: Last 5 backups kept

---

## 📊 Monitoring & Troubleshooting

### Pipeline Status
- **GitHub Actions**: Real-time pipeline status
- **Slack Notifications**: Deployment success/failure alerts
- **PM2 Monitoring**: `pm2 monit` for application metrics

### Common Issues

#### SSH Connection Failed
```bash
# Check SSH key permissions
chmod 600 ~/.ssh/id_rsa

# Test SSH connection
ssh -T deploy@your-server.com

# Check GitHub secret format (no extra spaces/newlines)
```

#### Health Check Failed
```bash
# Check application logs
pm2 logs snapify

# Test health endpoint manually
curl http://localhost:3001/api/health

# Check if port 3001 is available
netstat -tlnp | grep 3001
```

#### Nginx Issues
```bash
# Check nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

#### PM2 Issues
```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs snapify

# Restart application
pm2 restart snapify
```

---

## 🔄 Rollback Procedures

### Automatic Rollback
The pipeline automatically rolls back on deployment failure:
1. Detects health check failure
2. Restores from backup
3. Restarts application
4. Verifies rollback success

### Manual Rollback
```bash
# List available backups
ls -la /var/www/backups/

# Restore from specific backup
cd /var/www/snapify
tar -xzf /var/www/backups/snapify_prod_backup_20241127_100000.tar.gz

# Restart application
pm2 restart snapify

# Verify
curl http://localhost:3001/api/health
```

---

## 📈 Best Practices

### Branch Strategy
```
main (production) ← develop (staging) ← feature branches
```

### Commit Messages
```bash
# Good commit messages
feat: Add user authentication
fix: Resolve memory leak in image processing
docs: Update deployment guide
test: Add unit tests for API endpoints
```

### Environment Management
- **Development**: Local development
- **Staging**: Testing environment
- **Production**: Live application

### Security
- Rotate SSH keys regularly
- Use environment-specific secrets
- Keep dependencies updated
- Monitor for security vulnerabilities

---

## 🎯 Success Metrics

### Pipeline Health
- ✅ **Build Success Rate**: >95%
- ✅ **Deployment Frequency**: Multiple per day
- ✅ **Rollback Success**: 100%
- ✅ **Health Check Pass Rate**: >99%

### Business Impact
- 🚀 **Faster Deployments**: From hours to minutes
- 🛡️ **Higher Reliability**: Automated testing & health checks
- 👥 **Team Productivity**: Focus on features, not deployment
- 💰 **Cost Savings**: Reduced manual work

---

## 📞 Support

### Quick Checks
1. **Pipeline Status**: GitHub Actions tab
2. **Application Health**: `curl https://snapify.skytech.mk/api/health`
3. **Server Resources**: `htop` or `pm2 monit`
4. **Logs**: `pm2 logs snapify`

### Getting Help
1. Check this guide first
2. Review GitHub Actions logs
3. Check server logs
4. Test commands manually

---

## 🎉 You're All Set!

Your SnapifY application now has a **production-ready CI/CD pipeline** that will:
- ✅ Automatically test every code change
- ✅ Deploy safely to staging and production
- ✅ Provide real-time monitoring and notifications
- ✅ Handle rollbacks automatically on failures
- ✅ Scale with your team growth

**Happy Deploying! 🚀**