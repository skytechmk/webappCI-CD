# SnapifY CI/CD Pipeline

This repository contains the CI/CD implementation for the SnapifY event sharing platform.

## 🚀 What is CI/CD?

CI/CD (Continuous Integration/Continuous Deployment) automates the process of:
- **Testing** code changes
- **Building** applications
- **Deploying** to staging/production environments

## 📋 Pipeline Overview

### Continuous Integration (CI)
- Automated testing on every push/PR
- Code quality checks (linting, type checking)
- Security vulnerability scanning
- Build verification

### Continuous Deployment (CD)
- **Staging**: Automatic deployment on `develop` branch pushes
- **Production**: Manual deployment on `main` branch with approval

## 🛠️ Tech Stack

- **CI/CD Platform**: GitHub Actions
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + TypeScript
- **Deployment**: SSH-based deployment to servers
- **Process Management**: PM2
- **Notifications**: Slack integration

## 📁 Repository Structure

```
.github/workflows/
├── ci.yml              # CI pipeline for testing
├── deploy-staging.yml  # Staging deployment
└── deploy-production.yml # Production deployment

src/test/
├── setup.ts           # Test configuration
└── App.test.tsx       # Sample test

# Configuration files
├── vitest.config.ts   # Test runner config
├── .eslintrc.js       # Linting rules
└── package.json       # Updated with test scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and 20+ (tested versions)
- GitHub repository with Actions enabled
- Staging and production servers

### Setup Steps

1. **Clone this repository**
   ```bash
   git clone https://github.com/skytechmk/webappCI-CD.git
   cd webappCI-CD
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests locally**
   ```bash
   npm run test
   ```

4. **Run linting**
   ```bash
   npm run lint
   ```

## 🔐 Required Secrets

Add these to your GitHub repository secrets:

### Staging Deployment
```
STAGING_HOST=your-staging-server.com
STAGING_USER=deploy
STAGING_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
```

### Production Deployment
```
PRODUCTION_HOST=your-production-server.com
PRODUCTION_USER=deploy
PRODUCTION_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
```

### Notifications
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## 📊 Pipeline Stages

### 1. CI Pipeline (`ci.yml`)
Runs on every push and PR:
- ✅ Install dependencies
- ✅ Run linter (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Run tests (Vitest)
- ✅ Build application
- ✅ Security audit (npm audit)

### 2. Staging Deployment (`deploy-staging.yml`)
Triggers on `develop` branch pushes:
- ✅ Run full CI pipeline
- ✅ Create deployment package
- ✅ Deploy to staging server
- ✅ Health checks
- ✅ Slack notifications

### 3. Production Deployment (`deploy-production.yml`)
Manual trigger from `main` branch:
- ✅ Run full CI pipeline
- ✅ Create deployment package
- ✅ Backup current production
- ✅ Deploy with zero-downtime
- ✅ Health checks with rollback
- ✅ Slack notifications

## 🎯 Available Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "coverage": "vitest run --coverage"
  }
}
```

## 🔍 Monitoring & Troubleshooting

### Pipeline Status
Check GitHub Actions tab in your repository for pipeline status and logs.

### Common Issues
- **SSH Connection Failed**: Check server credentials and SSH keys
- **Health Check Failed**: Verify application starts correctly
- **Test Failures**: Run `npm run test` locally to debug

### Logs
- **Application Logs**: `pm2 logs snapify-production`
- **Deployment Logs**: GitHub Actions workflow logs
- **Server Logs**: Check `/var/log` on deployment servers

## 🚀 Deployment Process

### Staging (Automatic)
1. Push to `develop` branch
2. CI pipeline runs automatically
3. If successful, deploys to staging
4. Test on staging environment
5. Create PR to merge to `main`

### Production (Manual)
1. Ensure staging deployment is successful
2. Go to GitHub Actions → "Deploy to Production"
3. Click "Run workflow"
4. Monitor deployment progress
5. Verify production deployment

## 📈 Benefits

### Speed & Efficiency
- **Automated Workflows**: No manual deployment steps
- **Fast Feedback**: Catch issues before production
- **Consistent Process**: Same deployment every time

### Quality & Reliability
- **Automated Testing**: Prevents regressions
- **Security Scanning**: Identifies vulnerabilities
- **Health Checks**: Ensures deployments work

### Team Productivity
- **Focus on Code**: Less time on deployment
- **Confidence**: Safe to deploy frequently
- **Visibility**: Clear status of all deployments

## 🔧 Customization

### Adding New Tests
```typescript
// src/test/ComponentName.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ComponentName from '../ComponentName'

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Modifying Deployment Scripts
Edit the deployment scripts in workflow files to customize:
- Server commands
- Health check endpoints
- Backup strategies
- Notification messages

## 📞 Support

For CI/CD pipeline issues:
1. Check GitHub Actions logs
2. Verify server connectivity
3. Review deployment scripts
4. Check application health endpoints

---

**Happy Deploying! 🚀**

This CI/CD setup will transform your development workflow, making deployments reliable, automated, and low-risk.
# CI/CD Test - Thu Nov 27 09:48:21 UTC 2025
# CI/CD Staging Test - Thu Nov 27 09:51:06 UTC 2025
# CI/CD Test - Thu Nov 27 10:15:24 UTC 2025 - Fixed Dependencies
