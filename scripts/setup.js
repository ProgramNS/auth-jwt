#!/usr/bin/env node

/**
 * Main Setup Script
 * Handles initial project setup for different environments
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

class SetupManager {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.envFile = path.join(this.projectRoot, '.env');
    this.envExampleFile = path.join(this.projectRoot, '.env.example');
  }

  async run() {
    console.log('🚀 Auth & User Management Starter - Setup');
    console.log('==========================================\n');

    try {
      await this.checkPrerequisites();
      await this.selectEnvironment();
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  async checkPrerequisites() {
    console.log('📋 Checking prerequisites...\n');

    const checks = [
      { name: 'Node.js', command: 'node --version', minVersion: '18.0.0' },
      { name: 'npm', command: 'npm --version', minVersion: '9.0.0' },
      { name: 'Docker', command: 'docker --version' },
      { name: 'Docker Compose', command: 'docker compose version' },
    ];

    for (const check of checks) {
      try {
        const version = execSync(check.command, { encoding: 'utf8' }).trim();
        console.log(`✅ ${check.name}: ${version}`);
      } catch (error) {
        throw new Error(`${check.name} is not installed or not in PATH`);
      }
    }

    console.log('\n✅ All prerequisites met!\n');
  }

  async selectEnvironment() {
    const environment = await this.prompt(
      'Select environment to setup:\n1. Development\n2. Production\n3. Testing\nEnter choice (1-3): '
    );

    switch (environment.trim()) {
      case '1':
        await this.setupDevelopment();
        break;
      case '2':
        await this.setupProduction();
        break;
      case '3':
        await this.setupTesting();
        break;
      default:
        throw new Error('Invalid environment selection');
    }
  }

  async setupDevelopment() {
    console.log('🔧 Setting up development environment...\n');
    
    await this.createEnvFile('development');
    await this.installDependencies();
    await this.setupDatabase();
    
    console.log('\n🎉 Development setup complete!');
    console.log('\nNext steps:');
    console.log('1. Review and update .env file with your settings');
    console.log('2. Run: npm run docker:up');
    console.log('3. Run: npm run db:migrate');
    console.log('4. Run: npm run db:seed');
    console.log('5. Run: npm run dev');
  }

  async setupProduction() {
    console.log('🏭 Setting up production environment...\n');
    
    await this.createEnvFile('production');
    await this.installDependencies(true);
    
    console.log('\n🎉 Production setup complete!');
    console.log('\nNext steps:');
    console.log('1. Update .env file with production settings');
    console.log('2. Run: npm run db:migrate:prod');
    console.log('3. Run: npm run db:seed:prod');
    console.log('4. Run: npm run start:prod');
  }

  async setupTesting() {
    console.log('🧪 Setting up testing environment...\n');
    
    await this.createEnvFile('test');
    await this.installDependencies();
    await this.setupTestDatabase();
    
    console.log('\n🎉 Testing setup complete!');
    console.log('\nRun tests with: npm test');
  }

  async createEnvFile(environment) {
    if (fs.existsSync(this.envFile)) {
      const overwrite = await this.prompt('.env file exists. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Skipping .env file creation');
        return;
      }
    }

    if (!fs.existsSync(this.envExampleFile)) {
      throw new Error('.env.example file not found');
    }

    const envContent = this.generateEnvContent(environment);
    fs.writeFileSync(this.envFile, envContent);
    console.log('✅ Created .env file');
  }

  generateEnvContent(environment) {
    const baseContent = fs.readFileSync(this.envExampleFile, 'utf8');
    
    const environmentDefaults = {
      development: {
        NODE_ENV: 'development',
        PORT: '3000',
        DATABASE_URL: 'mysql://auth_user:auth_password@localhost:3306/auth_db',
        JWT_ACCESS_SECRET: this.generateSecret(),
        JWT_REFRESH_SECRET: this.generateSecret(),
      },
      production: {
        NODE_ENV: 'production',
        PORT: '3000',
        DATABASE_URL: 'mysql://username:password@localhost:3306/auth_db_prod',
        JWT_ACCESS_SECRET: this.generateSecret(),
        JWT_REFRESH_SECRET: this.generateSecret(),
      },
      test: {
        NODE_ENV: 'test',
        PORT: '3001',
        DATABASE_URL: 'mysql://auth_user:auth_password@localhost:3306/auth_db_test',
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
      },
    };

    let content = baseContent;
    const defaults = environmentDefaults[environment];
    
    for (const [key, value] of Object.entries(defaults)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (content.match(regex)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    }

    return content;
  }

  generateSecret() {
    return require('crypto').randomBytes(64).toString('hex');
  }

  async installDependencies(production = false) {
    console.log('📦 Installing dependencies...');
    const command = production ? 'npm ci --only=production' : 'npm install';
    execSync(command, { stdio: 'inherit', cwd: this.projectRoot });
    console.log('✅ Dependencies installed');
  }

  async setupDatabase() {
    console.log('🗄️ Setting up database...');
    try {
      execSync('docker compose up -d db', { stdio: 'inherit', cwd: this.projectRoot });
      console.log('✅ Database container started');
      
      // Wait for database to be ready
      console.log('⏳ Waiting for database to be ready...');
      await this.sleep(10000);
      
    } catch (error) {
      console.warn('⚠️ Database setup failed. You may need to start it manually.');
    }
  }

  async setupTestDatabase() {
    console.log('🗄️ Setting up test database...');
    try {
      execSync('npm run db:test:setup', { stdio: 'inherit', cwd: this.projectRoot });
      console.log('✅ Test database setup complete');
    } catch (error) {
      console.warn('⚠️ Test database setup failed. Run manually: npm run db:test:setup');
    }
  }

  async prompt(question) {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new SetupManager();
  setup.run();
}

module.exports = SetupManager;