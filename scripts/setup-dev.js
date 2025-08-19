#!/usr/bin/env node

/**
 * Development Environment Setup Script
 * Quick setup for development environment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DevSetup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
  }

  async run() {
    console.log('🔧 Setting up development environment...\n');

    try {
      await this.checkDocker();
      await this.createDevEnv();
      await this.startServices();
      await this.setupDatabase();
      await this.runTests();
      
      console.log('\n🎉 Development environment ready!');
      console.log('\nQuick start commands:');
      console.log('• npm run dev          - Start development server');
      console.log('• npm run test:watch   - Run tests in watch mode');
      console.log('• npm run db:studio    - Open Prisma Studio');
      console.log('• npm run docker:logs  - View container logs');
      
    } catch (error) {
      console.error('❌ Development setup failed:', error.message);
      process.exit(1);
    }
  }

  async checkDocker() {
    console.log('🐳 Checking Docker...');
    try {
      execSync('docker --version', { stdio: 'pipe' });
      execSync('docker compose version', { stdio: 'pipe' });
      console.log('✅ Docker is available');
    } catch (error) {
      throw new Error('Docker or Docker Compose not found. Please install Docker Desktop.');
    }
  }

  async createDevEnv() {
    const envFile = path.join(this.projectRoot, '.env');
    const envExampleFile = path.join(this.projectRoot, '.env.example');

    if (!fs.existsSync(envFile)) {
      console.log('📝 Creating development .env file...');
      
      if (fs.existsSync(envExampleFile)) {
        let envContent = fs.readFileSync(envExampleFile, 'utf8');
        
        // Set development defaults
        const devDefaults = {
          NODE_ENV: 'development',
          PORT: '3000',
          DATABASE_URL: 'mysql://auth_user:auth_password@localhost:3306/auth_db',
          JWT_ACCESS_SECRET: this.generateSecret(),
          JWT_REFRESH_SECRET: this.generateSecret(),
          GOOGLE_CLIENT_ID: 'your-google-client-id',
          GOOGLE_CLIENT_SECRET: 'your-google-client-secret',
          GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/auth/google/callback'
        };

        for (const [key, value] of Object.entries(devDefaults)) {
          const regex = new RegExp(`^${key}=.*$`, 'm');
          if (envContent.match(regex)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
          } else {
            envContent += `\n${key}=${value}`;
          }
        }

        fs.writeFileSync(envFile, envContent);
        console.log('✅ Created .env file with development defaults');
      } else {
        throw new Error('.env.example file not found');
      }
    } else {
      console.log('✅ .env file already exists');
    }
  }

  async startServices() {
    console.log('🚀 Starting Docker services...');
    try {
      execSync('docker compose up -d', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });
      console.log('✅ Docker services started');
      
      // Wait for services to be ready
      console.log('⏳ Waiting for services to be ready...');
      await this.waitForDatabase();
      
    } catch (error) {
      throw new Error('Failed to start Docker services: ' + error.message);
    }
  }

  async setupDatabase() {
    console.log('🗄️ Setting up database...');
    
    try {
      // Generate Prisma client
      console.log('📦 Generating Prisma client...');
      execSync('npx prisma generate', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });

      // Run migrations
      console.log('🔄 Running database migrations...');
      execSync('npx prisma migrate dev --name init', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });

      // Seed database
      console.log('🌱 Seeding database...');
      execSync('npm run db:seed', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });

      console.log('✅ Database setup complete');
    } catch (error) {
      console.warn('⚠️ Database setup had issues:', error.message);
      console.log('You may need to run these commands manually:');
      console.log('• npm run db:migrate');
      console.log('• npm run db:seed');
    }
  }

  async runTests() {
    console.log('🧪 Running initial tests...');
    try {
      execSync('npm run test:ci', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });
      console.log('✅ All tests passed');
    } catch (error) {
      console.warn('⚠️ Some tests failed. Check the output above.');
    }
  }

  async waitForDatabase() {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        execSync('docker exec auth_mysql mysqladmin ping -h localhost -u root -prootpassword', { 
          stdio: 'pipe' 
        });
        console.log('✅ Database is ready');
        return;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Database failed to start within timeout');
        }
        await this.sleep(2000);
        process.stdout.write('.');
      }
    }
  }

  generateSecret() {
    return require('crypto').randomBytes(64).toString('hex');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if called directly
if (require.main === module) {
  const devSetup = new DevSetup();
  devSetup.run();
}

module.exports = DevSetup;