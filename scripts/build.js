#!/usr/bin/env node

/**
 * Build Script for Production
 * Handles building and preparing the application for production deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class BuildManager {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.buildDir = path.join(this.projectRoot, 'dist');
  }

  async run() {
    console.log('🔨 Building application for production...\n');

    try {
      await this.validateEnvironment();
      await this.cleanBuild();
      await this.runLinting();
      await this.runTests();
      await this.generatePrismaClient();
      await this.copyProductionFiles();
      await this.generateBuildInfo();
      
      console.log('\n🎉 Build completed successfully!');
      console.log(`📦 Build artifacts available in: ${this.buildDir}`);
      
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating build environment...');

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ required, found ${nodeVersion}`);
    }

    // Check if package.json exists
    const packagePath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(packagePath)) {
      throw new Error('package.json not found');
    }

    console.log('✅ Build environment validated');
  }

  async cleanBuild() {
    console.log('🧹 Cleaning previous build...');

    if (fs.existsSync(this.buildDir)) {
      fs.rmSync(this.buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.buildDir, { recursive: true });

    console.log('✅ Build directory cleaned');
  }

  async runLinting() {
    console.log('🔍 Running code quality checks...');

    try {
      // Run ESLint
      execSync('npm run lint', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });

      // Run Prettier check
      execSync('npm run format:check', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });

      console.log('✅ Code quality checks passed');
    } catch (error) {
      throw new Error('Code quality checks failed. Run npm run lint:fix and npm run format');
    }
  }

  async runTests() {
    console.log('🧪 Running test suite...');

    try {
      execSync('npm run test:ci', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });
      console.log('✅ All tests passed');
    } catch (error) {
      throw new Error('Tests failed. Fix failing tests before building');
    }
  }

  async generatePrismaClient() {
    console.log('📦 Generating Prisma client...');

    try {
      execSync('npx prisma generate', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });
      console.log('✅ Prisma client generated');
    } catch (error) {
      throw new Error('Prisma client generation failed: ' + error.message);
    }
  }

  async copyProductionFiles() {
    console.log('📁 Copying production files...');

    const filesToCopy = [
      'src',
      'prisma',
      'package.json',
      'package-lock.json',
      '.env.example'
    ];

    const directoriesToCreate = [
      'logs'
    ];

    // Copy files and directories
    for (const item of filesToCopy) {
      const srcPath = path.join(this.projectRoot, item);
      const destPath = path.join(this.buildDir, item);

      if (fs.existsSync(srcPath)) {
        if (fs.statSync(srcPath).isDirectory()) {
          this.copyDirectory(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
        console.log(`✅ Copied ${item}`);
      }
    }

    // Create necessary directories
    for (const dir of directoriesToCreate) {
      const dirPath = path.join(this.buildDir, dir);
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created ${dir} directory`);
    }

    // Create production scripts
    await this.createProductionScripts();

    console.log('✅ Production files copied');
  }

  async createProductionScripts() {
    const scriptsDir = path.join(this.buildDir, 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });

    // Create start script
    const startScript = `#!/usr/bin/env node

/**
 * Production Start Script
 */

const { startServer } = require('../src/server');

// Validate environment
if (process.env.NODE_ENV !== 'production') {
  console.warn('Warning: NODE_ENV is not set to production');
}

const requiredVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET'
];

const missing = requiredVars.filter(varName => !process.env[varName]);
if (missing.length > 0) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

// Start server
startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
`;

    fs.writeFileSync(path.join(scriptsDir, 'start-prod.js'), startScript);
    fs.chmodSync(path.join(scriptsDir, 'start-prod.js'), '755');

    // Create health check script
    const healthScript = `#!/usr/bin/env node

/**
 * Production Health Check Script
 */

const http = require('http');

const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

const options = {
  hostname: host,
  port: port,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('Health check: OK');
    process.exit(0);
  } else {
    console.log(\`Health check: FAILED (status: \${res.statusCode})\`);
    process.exit(1);
  }
});

req.on('error', (error) => {
  console.log('Health check: FAILED', error.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('Health check: TIMEOUT');
  req.destroy();
  process.exit(1);
});

req.end();
`;

    fs.writeFileSync(path.join(scriptsDir, 'health-check.js'), healthScript);
    fs.chmodSync(path.join(scriptsDir, 'health-check.js'), '755');
  }

  async generateBuildInfo() {
    console.log('📋 Generating build information...');

    const buildInfo = {
      buildTime: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      gitCommit: this.getGitCommit(),
      gitBranch: this.getGitBranch(),
      version: this.getPackageVersion()
    };

    fs.writeFileSync(
      path.join(this.buildDir, 'build-info.json'),
      JSON.stringify(buildInfo, null, 2)
    );

    console.log('✅ Build information generated');
    console.log('Build Info:', JSON.stringify(buildInfo, null, 2));
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

  getGitCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  getGitBranch() {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  getPackageVersion() {
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8')
      );
      return packageJson.version;
    } catch {
      return 'unknown';
    }
  }
}

// Run if called directly
if (require.main === module) {
  const builder = new BuildManager();
  builder.run();
}

module.exports = BuildManager;