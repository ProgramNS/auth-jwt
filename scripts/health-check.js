#!/usr/bin/env node

/**
 * Health Check Script
 * Monitors application health and dependencies
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');

class HealthChecker {
  constructor() {
    this.prisma = new PrismaClient();
    this.port = process.env.PORT || 3000;
    this.host = process.env.HOST || 'localhost';
  }

  async run() {
    console.log('🏥 Running health checks...\n');

    const checks = [
      { name: 'Application Server', check: () => this.checkServer() },
      { name: 'Database Connection', check: () => this.checkDatabase() },
      { name: 'Environment Variables', check: () => this.checkEnvironment() },
      { name: 'Disk Space', check: () => this.checkDiskSpace() },
      { name: 'Memory Usage', check: () => this.checkMemory() },
    ];

    let allPassed = true;
    const results = [];

    for (const { name, check } of checks) {
      try {
        const result = await check();
        results.push({ name, status: 'PASS', details: result });
        console.log(`✅ ${name}: PASS`);
        if (result) console.log(`   ${result}`);
      } catch (error) {
        results.push({ name, status: 'FAIL', details: error.message });
        console.log(`❌ ${name}: FAIL`);
        console.log(`   ${error.message}`);
        allPassed = false;
      }
    }

    await this.prisma.$disconnect();

    console.log('\n' + '='.repeat(50));
    console.log(`Overall Health: ${allPassed ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    console.log('='.repeat(50));

    if (process.argv.includes('--json')) {
      console.log(JSON.stringify({
        healthy: allPassed,
        timestamp: new Date().toISOString(),
        checks: results
      }, null, 2));
    }

    process.exit(allPassed ? 0 : 1);
  }

  async checkServer() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.host,
        port: this.port,
        path: '/health',
        method: 'GET',
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          resolve(`Server responding on port ${this.port}`);
        } else {
          reject(new Error(`Server returned status ${res.statusCode}`));
        }
      });

      req.on('error', (error) => {
        reject(new Error(`Server connection failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Server response timeout'));
      });

      req.end();
    });
  }

  async checkDatabase() {
    try {
      await this.prisma.$connect();
      
      // Test a simple query
      const userCount = await this.prisma.user.count();
      
      return `Database connected, ${userCount} users`;
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async checkEnvironment() {
    const requiredVars = [
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }

    // Check secret lengths
    if (process.env.JWT_ACCESS_SECRET.length < 32) {
      throw new Error('JWT_ACCESS_SECRET is too short (minimum 32 characters)');
    }

    if (process.env.JWT_REFRESH_SECRET.length < 32) {
      throw new Error('JWT_REFRESH_SECRET is too short (minimum 32 characters)');
    }

    return `All required environment variables present`;
  }

  async checkDiskSpace() {
    const fs = require('fs');
    const path = require('path');

    try {
      const stats = fs.statSync(path.resolve(__dirname, '..'));
      const free = await this.getDiskSpace();
      
      if (free < 100 * 1024 * 1024) { // Less than 100MB
        throw new Error(`Low disk space: ${Math.round(free / 1024 / 1024)}MB remaining`);
      }

      return `Disk space: ${Math.round(free / 1024 / 1024)}MB available`;
    } catch (error) {
      throw new Error(`Disk space check failed: ${error.message}`);
    }
  }

  async getDiskSpace() {
    const { execSync } = require('child_process');
    
    try {
      if (process.platform === 'win32') {
        // Windows
        const output = execSync('dir /-c', { encoding: 'utf8' });
        const match = output.match(/(\d+) bytes free/);
        return match ? parseInt(match[1]) : 0;
      } else {
        // Unix-like systems
        const output = execSync('df -k .', { encoding: 'utf8' });
        const lines = output.split('\n');
        const dataLine = lines[1] || lines[0];
        const parts = dataLine.split(/\s+/);
        return parseInt(parts[3]) * 1024; // Convert KB to bytes
      }
    } catch (error) {
      return 1024 * 1024 * 1024; // Default to 1GB if check fails
    }
  }

  async checkMemory() {
    const used = process.memoryUsage();
    const totalMB = Math.round(used.rss / 1024 / 1024);
    const heapMB = Math.round(used.heapUsed / 1024 / 1024);

    // Alert if using more than 512MB
    if (totalMB > 512) {
      throw new Error(`High memory usage: ${totalMB}MB RSS, ${heapMB}MB heap`);
    }

    return `Memory usage: ${totalMB}MB RSS, ${heapMB}MB heap`;
  }
}

// Run if called directly
if (require.main === module) {
  const healthChecker = new HealthChecker();
  healthChecker.run().catch((error) => {
    console.error('Health check failed:', error.message);
    process.exit(1);
  });
}

module.exports = HealthChecker;