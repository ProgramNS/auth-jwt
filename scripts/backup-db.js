#!/usr/bin/env node

/**
 * Database Backup Script
 * Creates backups of the MySQL database
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const url = require('url');

class DatabaseBackup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.backupDir = path.join(this.projectRoot, 'backups');
    this.databaseUrl = process.env.DATABASE_URL;
  }

  async run() {
    console.log('💾 Database Backup Utility\n');

    try {
      await this.validateEnvironment();
      await this.createBackupDirectory();
      
      const backupType = await this.selectBackupType();
      
      switch (backupType) {
        case '1':
          await this.createFullBackup();
          break;
        case '2':
          await this.createDataOnlyBackup();
          break;
        case '3':
          await this.createSchemaOnlyBackup();
          break;
        default:
          throw new Error('Invalid backup type selected');
      }

    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    if (!this.databaseUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    // Check if mysqldump is available
    try {
      execSync('mysqldump --version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('mysqldump not found. Please install MySQL client tools');
    }

    console.log('✅ Environment validated');
  }

  async createBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('✅ Created backup directory');
    }
  }

  async selectBackupType() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      console.log('Select backup type:');
      console.log('1. Full backup (schema + data)');
      console.log('2. Data only');
      console.log('3. Schema only');
      
      rl.question('\nEnter choice (1-3): ', (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  async createFullBackup() {
    console.log('📦 Creating full backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `full-backup-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    const dbConfig = this.parseDatabaseUrl();
    const command = this.buildMysqldumpCommand(dbConfig, {
      includeSchema: true,
      includeData: true,
      output: filepath
    });

    try {
      execSync(command, { stdio: 'inherit' });
      
      const stats = fs.statSync(filepath);
      const sizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
      
      console.log(`✅ Full backup created: ${filename}`);
      console.log(`📊 Backup size: ${sizeMB}MB`);
      
      await this.createBackupInfo(filename, 'full', sizeMB);
      
    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  async createDataOnlyBackup() {
    console.log('📊 Creating data-only backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `data-backup-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    const dbConfig = this.parseDatabaseUrl();
    const command = this.buildMysqldumpCommand(dbConfig, {
      includeSchema: false,
      includeData: true,
      output: filepath
    });

    try {
      execSync(command, { stdio: 'inherit' });
      
      const stats = fs.statSync(filepath);
      const sizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
      
      console.log(`✅ Data backup created: ${filename}`);
      console.log(`📊 Backup size: ${sizeMB}MB`);
      
      await this.createBackupInfo(filename, 'data', sizeMB);
      
    } catch (error) {
      throw new Error(`Data backup failed: ${error.message}`);
    }
  }

  async createSchemaOnlyBackup() {
    console.log('🏗️ Creating schema-only backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `schema-backup-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    const dbConfig = this.parseDatabaseUrl();
    const command = this.buildMysqldumpCommand(dbConfig, {
      includeSchema: true,
      includeData: false,
      output: filepath
    });

    try {
      execSync(command, { stdio: 'inherit' });
      
      const stats = fs.statSync(filepath);
      const sizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
      
      console.log(`✅ Schema backup created: ${filename}`);
      console.log(`📊 Backup size: ${sizeMB}MB`);
      
      await this.createBackupInfo(filename, 'schema', sizeMB);
      
    } catch (error) {
      throw new Error(`Schema backup failed: ${error.message}`);
    }
  }

  parseDatabaseUrl() {
    const parsed = new URL(this.databaseUrl);
    
    return {
      host: parsed.hostname,
      port: parsed.port || 3306,
      username: parsed.username,
      password: parsed.password,
      database: parsed.pathname.slice(1) // Remove leading slash
    };
  }

  buildMysqldumpCommand(config, options) {
    let command = `mysqldump`;
    
    // Connection parameters
    command += ` -h ${config.host}`;
    command += ` -P ${config.port}`;
    command += ` -u ${config.username}`;
    
    if (config.password) {
      command += ` -p${config.password}`;
    }

    // Backup options
    command += ` --single-transaction`;
    command += ` --routines`;
    command += ` --triggers`;

    if (!options.includeSchema) {
      command += ` --no-create-info`;
    }

    if (!options.includeData) {
      command += ` --no-data`;
    }

    // Database and output
    command += ` ${config.database}`;
    command += ` > "${options.output}"`;

    return command;
  }

  async createBackupInfo(filename, type, sizeMB) {
    const infoFile = path.join(this.backupDir, `${filename}.info`);
    
    const info = {
      filename,
      type,
      sizeMB,
      created: new Date().toISOString(),
      databaseUrl: this.databaseUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'), // Hide credentials
      nodeVersion: process.version,
      platform: process.platform
    };

    fs.writeFileSync(infoFile, JSON.stringify(info, null, 2));
    console.log(`📋 Backup info saved: ${filename}.info`);
  }
}

// Run if called directly
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  
  const backup = new DatabaseBackup();
  backup.run();
}

module.exports = DatabaseBackup;