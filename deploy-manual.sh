#!/bin/bash

# SnapifY Manual Deployment Script
# This script deploys the application directly to the server

set -e  # Exit on any error

echo "🚀 Starting SnapifY manual deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="snapify"
STAGING_DIR="/var/www/${APP_NAME}-staging"
PRODUCTION_DIR="/var/www/${APP_NAME}"
BACKUP_DIR="/var/www/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo "  App Name: $APP_NAME"
echo "  Staging Dir: $STAGING_DIR"
echo "  Production Dir: $PRODUCTION_DIR"
echo "  Backup Dir: $BACKUP_DIR"
echo "  Timestamp: $TIMESTAMP"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"
if ! command_exists node; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

if ! command_exists pm2; then
    echo -e "${RED}❌ PM2 not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# Create directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p "$STAGING_DIR"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Backup current deployment if it exists
if [ -d "$STAGING_DIR/dist" ]; then
    echo -e "${YELLOW}📦 Creating backup...${NC}"
    BACKUP_FILE="$BACKUP_DIR/${APP_NAME}_staging_backup_$TIMESTAMP.tar.gz"
    cd "$STAGING_DIR"
    tar -czf "$BACKUP_FILE" dist/ server/ package*.json ecosystem.config.cjs .env snapify.db 2>/dev/null || true
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  No existing deployment to backup${NC}"
fi
echo ""

# Clean staging directory
echo -e "${YELLOW}🧹 Cleaning staging directory...${NC}"
cd "$STAGING_DIR"
# Keep only essential files, remove everything else
find . -mindepth 1 -maxdepth 1 ! -name 'snapify.db' ! -name '.env' ! -name 'logs' -exec rm -rf {} + 2>/dev/null || true
echo -e "${GREEN}✅ Staging directory cleaned${NC}"
echo ""

# Copy application files (this would be done by CI/CD, but for manual deployment we'll assume files are already there)
echo -e "${YELLOW}📋 Manual Deployment Instructions:${NC}"
echo "1. Make sure your application code is in: $STAGING_DIR"
echo "2. Ensure package.json, ecosystem.config.cjs, and nginx.conf are present"
echo "3. Run the dependency installation and build steps below"
echo ""

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
if [ -f "package.json" ]; then
    npm cache clean --force
    npm install --legacy-peer-deps
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ package.json not found in $STAGING_DIR${NC}"
    echo -e "${YELLOW}Please ensure your application files are deployed to $STAGING_DIR${NC}"
    exit 1
fi
echo ""

# Build application
echo -e "${YELLOW}🔨 Building application...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Application built successfully${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo ""

# Setup logging
echo -e "${YELLOW}📝 Setting up logging...${NC}"
mkdir -p logs
echo -e "${GREEN}✅ Logging setup complete${NC}"
echo ""

# Stop existing PM2 process
echo -e "${YELLOW}🛑 Stopping existing application...${NC}"
pm2 stop "$APP_NAME-staging" 2>/dev/null || true
pm2 delete "$APP_NAME-staging" 2>/dev/null || true
echo -e "${GREEN}✅ Existing application stopped${NC}"
echo ""

# Start application with PM2
echo -e "${YELLOW}▶️ Starting application...${NC}"
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --name "$APP_NAME-staging" --env staging
    pm2 save
    echo -e "${GREEN}✅ Application started with PM2${NC}"
else
    echo -e "${RED}❌ ecosystem.config.cjs not found${NC}"
    exit 1
fi
echo ""

# Wait for application to start
echo -e "${YELLOW}⏳ Waiting for application to start...${NC}"
sleep 15

# Health check
echo -e "${YELLOW}🔍 Running health check...${NC}"
if curl -f --max-time 30 http://localhost:3002/api/health; then
    echo -e "${GREEN}✅ Staging deployment successful!${NC}"
    echo -e "${GREEN}🌐 Application running at: http://localhost:3002${NC}"

    # Clean up old backups (keep last 3)
    echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
    ls -t "$BACKUP_DIR/${APP_NAME}_staging_backup_"*.tar.gz 2>/dev/null | tail -n +4 | xargs rm -f || true
    echo -e "${GREEN}✅ Cleanup completed${NC}"

    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}📊 Deployment Summary:${NC}"
    echo "  - Application: $APP_NAME-staging"
    echo "  - Port: 3002"
    echo "  - Health Check: http://localhost:3002/api/health"
    echo "  - PM2 Status: pm2 list"
    echo "  - Logs: pm2 logs $APP_NAME-staging"
    echo ""
    echo -e "${YELLOW}🚀 Next Steps:${NC}"
    echo "  1. Test the staging application"
    echo "  2. If working, deploy to production"
    echo "  3. Set up SSL with Cloudflare"

else
    echo -e "${RED}❌ Health check failed${NC}"
    echo -e "${YELLOW}🔍 Checking application logs...${NC}"
    pm2 logs "$APP_NAME-staging" --lines 20
    exit 1
fi