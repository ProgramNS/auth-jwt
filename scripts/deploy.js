#!/usr/bin/env node

/**
 * Deployment Script
 * Handles deployment to various environments
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class DeploymentManager {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async run() {
    console.log('🚀 Deployment Manager\n');

    try {
      const deploymentType = await this.selectDeploymentType();
      
      switch (deploymentType) {
        case '1':
          await this.deployLocal();
          break;
        case '2':
          await this.deployDocker();
          break;
        case '3':
          await this.deployProduction();
          break;
        default:
          throw new Error('Invalid deployment type selected');
      }

    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async selectDeploymentType() {
    return new Promise((resolve) => {
      console.log('Select deployment type:');
      console.log('1. Local Production');
      console.log('2. Docker Container');
      console.log('3. Production Server');
      
      this.rl.question('\nEnter choice (1-3): ', resolve);
    });
  }

  async deployLocal() {
    console.log('🏠 Deploying to local production environment...\n');

    await this.runPreDeploymentChecks();
    await this.buildApplication();
    await this.setupProductionDatabase();
    await this.startProductionServer();

    console.log('\n🎉 Local production deployment complete!');
    console.log('Server running at: http://localhost:3000');
  }

  async deployDocker() {
    console.log('🐳 Deploying with Docker...\n');

    await this.runPreDeploymentChecks();
    await this.buildDockerImage();
    await this.runDockerContainer();

    console.log('\n🎉 Docker deployment complete!');
    console.log('Container running with name: auth-app-prod');
  }

  async deployProduction() {
    console.log('🏭 Deploying to production server...\n');

    await this.runPreDeploymentChecks();
    await this.buildApplication();
    await this.createDeploymentPackage();
    await this.showDeploymentInstructions();

    console.log('\n🎉 Production deployment package ready!');
  }

  async runPreDeploymentChecks() {
    console.log('🔍 Running pre-deployment checks...');

    // Check if .env exists
    const envFile = path.join(this.projectRoot, '.env');
    if (!fs.existsSync(envFile)) {
      throw new Error('.env file not found. Create it from .env.example');
    }

    // Run tests
    console.log('🧪 Running test suite...');
    try {
      execSync('npm run test:ci', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });
    } catch (error) {
      throw new Error('Tests failed. Fix failing tests before deployment');
    }

    // Check code quality
    console.log('🔍 Checking code quality...');
    try {
      execSync('npm run lint', { 
        stdio: 'pipe', 
        cwd: this.projectRoot 
      });
    } catch (error) {
      console.warn('⚠️ Linting issues found. Consider running npm run lint:fix');
    }

    console.log('✅ Pre-deployment checks completed');
  }

  async buildApplication() {
    console.log('🔨 Building application...');
    
    try {
      execSync('npm run build', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });
      console.log('✅ Application built successfully');
    } catch (error) {
      throw new Error('Build failed: ' + error.message);
    }
  }

  async setupProductionDatabase() {
    console.log('🗄️ Setting up production database...');

    const shouldMigrate = await this.prompt('Run database migrations? (Y/n): ');
    if (shouldMigrate.toLowerCase() !== 'n') {
      try {
        execSync('npm run db:migrate:prod', { 
          stdio: 'inherit', 
          cwd: this.projectRoot 
        });
        console.log('✅ Database migrations completed');
      } catch (error) {
        throw new Error('Database migration failed: ' + error.message);
      }
    }

    const shouldSeed = await this.prompt('Seed database? (y/N): ');
    if (shouldSeed.toLowerCase() === 'y') {
      try {
        execSync('npm run db:seed:prod', { 
          stdio: 'inherit', 
          cwd: this.projectRoot 
        });
        console.log('✅ Database seeded');
      } catch (error) {
        console.warn('⚠️ Database seeding failed:', error.message);
      }
    }
  }

  async startProductionServer() {
    console.log('🚀 Starting production server...');

    const shouldStart = await this.prompt('Start server now? (Y/n): ');
    if (shouldStart.toLowerCase() !== 'n') {
      console.log('Starting server... (Press Ctrl+C to stop)');
      try {
        execSync('npm run start:prod', { 
          stdio: 'inherit', 
          cwd: this.projectRoot 
        });
      } catch (error) {
        // This is expected when user stops the server
        console.log('\nServer stopped');
      }
    } else {
      console.log('To start the server later, run: npm run start:prod');
    }
  }

  async buildDockerImage() {
    console.log('🐳 Building Docker image...');

    // Create Dockerfile if it doesn't exist
    await this.createDockerfile();

    try {
      execSync('docker build -t auth-app:latest .', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });
      console.log('✅ Docker image built successfully');
    } catch (error) {
      throw new Error('Docker build failed: ' + error.message);
    }
  }

  async runDockerContainer() {
    console.log('🚀 Running Docker container...');

    // Stop existing container if running
    try {
      execSync('docker stop auth-app-prod', { stdio: 'pipe' });
      execSync('docker rm auth-app-prod', { stdio: 'pipe' });
    } catch (error) {
      // Container doesn't exist, which is fine
    }

    try {
      const dockerRun = `docker run -d \
        --name auth-app-prod \
        -p 3000:3000 \
        --env-file .env \
        auth-app:latest`;

      execSync(dockerRun, { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });
      
      console.log('✅ Docker container started');
      console.log('Container logs: docker logs -f auth-app-prod');
    } catch (error) {
      throw new Error('Failed to start Docker container: ' + error.message);
    }
  }

  async createDeploymentPackage() {
    console.log('📦 Creating deployment package...');

    const deployDir = path.join(this.projectRoot, 'deploy');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const packageDir = path.join(deployDir, `auth-app-${timestamp}`);

    // Create deployment directory
    fs.mkdirSync(packageDir, { recursive: true });

    // Copy build artifacts
    const buildDir = path.join(this.projectRoot, 'dist');
    if (fs.existsSync(buildDir)) {
      this.copyDirectory(buildDir, packageDir);
    } else {
      throw new Error('Build directory not found. Run npm run build first');
    }

    // Create deployment scripts
    await this.createDeploymentScripts(packageDir);

    console.log(`✅ Deployment package created: ${packageDir}`);
    return packageDir;
  }

  async createDockerfile() {
    const dockerfilePath = path.join(this.projectRoot, 'Dockerfile');
    
    if (!fs.existsSync(dockerfilePath)) {
      const dockerfile = `# Production Dockerfile for Auth & User Management Starter
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY src/ ./src/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node scripts/health-check.js || exit 1

# Start application
CMD ["npm", "run", "start:prod"]
`;

      fs.writeFileSync(dockerfilePath, dockerfile);
      console.log('✅ Created Dockerfile');
    }

    // Create .dockerignore
    const dockerignorePath = path.join(this.projectRoot, '.dockerignore');
    if (!fs.existsSync(dockerignorePath)) {
      const dockerignore = `node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.nyc_output
.coverage
tests
*.test.js
.DS_Store
dist
deploy
logs/*.log
`;

      fs.writeFileSync(dockerignorePath, dockerignore);
      console.log('✅ Created .dockerignore');
    }
  }

  async createDeploymentScripts(packageDir) {
    const scriptsDir = path.join(packageDir, 'scripts');
    
    // Install script
    const installScript = `#!/bin/bash
set -e

echo "🚀 Installing Auth & User Management Starter..."

# Install dependencies
npm ci --only=production

# Generate Prisma client
npx prisma generate

echo "✅ Installation complete!"
echo "Next steps:"
echo "1. Configure .env file"
echo "2. Run: npm run db:migrate:prod"
echo "3. Run: npm run start:prod"
`;

    fs.writeFileSync(path.join(scriptsDir, 'install.sh'), installScript);
    fs.chmodSync(path.join(scriptsDir, 'install.sh'), '755');

    // Update script
    const updateScript = `#!/bin/bash
set -e

echo "🔄 Updating Auth & User Management Starter..."

# Backup current version
if [ -d "backup" ]; then
  rm -rf backup
fi
mkdir backup
cp -r src backup/ 2>/dev/null || true

# Install dependencies
npm ci --only=production

# Generate Prisma client
npx prisma generate

# Run migrations
npm run db:migrate:prod

echo "✅ Update complete!"
echo "Restart the server: npm run start:prod"
`;

    fs.writeFileSync(path.join(scriptsDir, 'update.sh'), updateScript);
    fs.chmodSync(path.join(scriptsDir, 'update.sh'), '755');
  }

  async showDeploymentInstructions() {
    console.log('\n📋 Production Deployment Instructions:');
    console.log('=====================================');
    console.log('1. Upload the deployment package to your server');
    console.log('2. Extract the package');
    console.log('3. Run: chmod +x scripts/*.sh');
    console.log('4. Run: ./scripts/install.sh');
    console.log('5. Configure your .env file');
    console.log('6. Run: npm run db:migrate:prod');
    console.log('7. Run: npm run start:prod');
    console.log('\nFor updates:');
    console.log('1. Upload new package');
    console.log('2. Run: ./scripts/update.sh');
  }

  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }
}

// Run if called directly
if (require.main === module) {
  const deployer = new DeploymentManager();
  deployer.run();
}

module.exports = DeploymentManager;