#!/usr/bin/env node

/**
 * Production Environment Setup Script
 * Handles production deployment setup and configuration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProductionSetup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
  }

  async run() {
    console.log('🏭 Setting up production environment...\n');

    try {
      await this.validateEnvironment();
      await this.installDependencies();
      await this.buildApplication();
      await this.setupDatabase();
      await this.validateSetup();
      console.log('\n🎉 Production setup complete!');
      console.log('\nProduction checklist:');
      console.log('✅ Dependencies installed');
      console.log('✅ Database configured');
      console.log('✅ Environment validated');
      console.log('\nStart production server: npm run start:prod');
    } catch (error) {
      console.error('❌ Production setup failed:', error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating production environment...');

    const envFile = path.join(this.projectRoot, '.env');
    if (!fs.existsSync(envFile)) {
      throw new Error('.env file not found. Create it from .env.example');
    }

    // Load environment variables
    require('dotenv').config({ path: envFile });

    const requiredVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'PORT'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate NODE_ENV
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ NODE_ENV is not set to "production"');
    }

    // Validate secrets
    if (process.env.JWT_ACCESS_SECRET.length < 32) {
      throw new Error('JWT_ACCESS_SECRET must be at least 32 characters long');
    }

    if (process.env.JWT_REFRESH_SECRET.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
    }

    console.log('✅ Environment validation passed');
  }

  async installDependencies() {
    console.log('📦 Installing production dependencies...');
    
    try {
      // Clean install production dependencies only
      execSync('npm ci --only=production', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });
      console.log('✅ Production dependencies installed');
    } catch (error) {
      throw new Error('Failed to install dependencies: ' + error.message);
    }
  }

  async buildApplication() {
    console.log('🔨 Building application...');
    
    try {
      // Generate Prisma client
      execSync('npx prisma generate', { 
        stdio: 'inherit', 
        cwd: this.projectRoot 
      });
      console.log('✅ Prisma client generated');

      // Run any build processes (if needed in future)
      console.log('✅ Application build complete');
    } catch (error) {
      throw new Error('Build failed: ' + error.message);
    }
  }

  async setupDatabase() {
    console.log('🗄️ Setting up production database...');
    
    try {
      // Run production migrations
      console.log('🔄 Running database migrations...');
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit', 
        cwd: this.projectRoot,
        env: { ...process.env, NODE_ENV: 'production' }
      });

      // Ask about seeding
      const shouldSeed = await this.promptUser('Seed database with initial data? (y/N): ');
      if (shouldSeed.toLowerCase() === 'y') {
        console.log('🌱 Seeding production database...');
        execSync('npm run db:seed:prod', { 
          stdio: 'inherit', 
          cwd: this.projectRoot 
        });
      }

      console.log('✅ Database setup complete');
    } catch (error) {
      throw new Error('Database setup failed: ' + error.message);
    }
  }

  async validateSetup() {
    console.log('🔍 Validating production setup...');

    try {
      // Test database connection
      const testScript = `
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        async function test() {
          try {
            await prisma.$connect();
            console.log('Database connection: OK');
            await prisma.$disconnect();
            process.exit(0);
          } catch (error) {
            console.error('Database connection: FAILED', error.message);
            process.exit(1);
          }
        }
        
        test();
      `;

      fs.writeFileSync('/tmp/db-test.js', testScript);
      execSync('node /tmp/db-test.js', { 
        stdio: 'inherit',
        cwd: this.projectRoot 
      });
      fs.unlinkSync('/tmp/db-test.js');

      console.log('✅ Production setup validation passed');
    } catch (error) {
      throw new Error('Setup validation failed: ' + error.message);
    }
  }

  async promptUser(question) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }
}

// Run if called directly
if (require.main === module) {
  const prodSetup = new ProductionSetup();
  prodSetup.run();
}

module.exports = ProductionSetup;