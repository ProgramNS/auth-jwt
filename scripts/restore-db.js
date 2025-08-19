#!/usr/bin/env node

/**
 * Database Restore Script
 * Restores MySQL database from backup files
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class DatabaseRestore {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.backupDir = path.join(this.projectRoot, 'backups');
    this.databaseUrl = process.env.DATABASE_URL;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async run() {
    console.log('🔄 Database Restore Utility\n');

    try {
      await this.validateEnvironment();
      await this.listBackups();
      
      const backupFile = await this.selectBackup();
      await this.confirmRestore(backupFile);
      await this.restoreDatabase(backupFile);

    } catch (error) {
      console.error('❌ Restore failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async validateEnvironment() {
    if (!this.databaseUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    if (!fs.existsSync(this.backupDir)) {
      throw new Error(`Backup directory not found: ${this.backupDir}`);
    }

    // Check if mysql client is available
    try {
      execSync('mysql --version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('mysql client not found. Please install MySQL client tools');
    }

    console.log('✅ Environment validated');
  }

  async listBackups() {
    console.log('📋 Available backups:\n');

    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .reverse(); // Most recent first

    if (files.length === 0) {
      throw new Error('No backup files found');
    }

    files.forEach((file, index) => {
      const filepath = path.join(this.backupDir, file);
      const stats = fs.statSync(filepath);
      const sizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
      const created = stats.mtime.toISOString().replace('T', ' ').slice(0, 19);

      console.log(`${index + 1}. ${file}`);
      console.log(`   Size: ${sizeMB}MB | Created: ${created}`);

      // Show backup info if available
      const infoFile = path.join(this.backupDir, `${file}.info`);
      if (fs.existsSync(infoFile)) {
        try {
          const info = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
          console.log(`   Type: ${info.type} backup`);
        } catch (error) {
          // Ignore info file errors
        }
      }
      console.log('');
    });

    this.backupFiles = files;
  }

  async selectBackup() {
    return new Promise((resolve, reject) => {
      this.rl.question(`Select backup to restore (1-${this.backupFiles.length}): `, (answer) => {
        const index = parseInt(answer) - 1;
        
        if (isNaN(index) || index < 0 || index >= this.backupFiles.length) {
          reject(new Error('Invalid backup selection'));
          return;
        }

        resolve(this.backupFiles[index]);
      });
    });
  }

  async confirmRestore(backupFile) {
    console.log(`\n⚠️  WARNING: This will replace all data in the current database!`);
    console.log(`Selected backup: ${backupFile}`);
    
    return new Promise((resolve, reject) => {
      this.rl.question('\nAre you sure you want to continue? (yes/no): ', (answer) => {
        if (answer.toLowerCase() !== 'yes') {
          reject(new Error('Restore cancelled by user'));
          return;
        }
        resolve();
      });
    });
  }

  async restoreDatabase(backupFile) {
    console.log(`\n🔄 Restoring database from ${backupFile}...`);

    const backupPath = path.join(this.backupDir, backupFile);
    const dbConfig = this.parseDatabaseUrl();

    try {
      // Create backup of current database first
      await this.createPreRestoreBackup();

      // Restore from backup file
      const command = this.buildMysqlCommand(dbConfig, backupPath);
      
      console.log('📥 Importing backup data...');
      execSync(command, { stdio: 'inherit' });

      console.log('✅ Database restored successfully!');
      console.log('\nRecommended next steps:');
      console.log('1. Verify data integrity');
      console.log('2. Run any necessary migrations: npm run db:migrate:prod');
      console.log('3. Restart your application');

    } catch (error) {
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  async createPreRestoreBackup() {
    console.log('💾 Creating pre-restore backup...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `pre-restore-backup-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    const dbConfig = this.parseDatabaseUrl();
    const command = `mysqldump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.username} -p${dbConfig.password} --single-transaction --routines --triggers ${dbConfig.database} > "${filepath}"`;

    try {
      execSync(command, { stdio: 'pipe' });
      console.log(`✅ Pre-restore backup created: ${filename}`);
    } catch (error) {
      console.warn('⚠️ Failed to create pre-restore backup:', error.message);
      
      const proceed = await new Promise((resolve) => {
        this.rl.question('Continue without pre-restore backup? (yes/no): ', resolve);
      });

      if (proceed.toLowerCase() !== 'yes') {
        throw new Error('Restore cancelled - could not create pre-restore backup');
      }
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

  buildMysqlCommand(config, backupPath) {
    let command = `mysql`;
    
    // Connection parameters
    command += ` -h ${config.host}`;
    command += ` -P ${config.port}`;
    command += ` -u ${config.username}`;
    
    if (config.password) {
      command += ` -p${config.password}`;
    }

    // Database and input
    command += ` ${config.database}`;
    command += ` < "${backupPath}"`;

    return command;
  }
}

// Run if called directly
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  
  const restore = new DatabaseRestore();
  restore.run();
}

module.exports = DatabaseRestore;