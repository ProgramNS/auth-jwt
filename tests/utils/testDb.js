const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

class TestDatabase {
  constructor() {
    this.prisma = null;
    this.testDbName = `test_auth_db_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  async setup() {
    try {
      // Create test database
      const baseUrl = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306';
      const [protocol, rest] = baseUrl.split('://');
      const [credentials, hostAndDb] = rest.split('@');
      const [host] = hostAndDb.split('/');

      const testDbUrl = `${protocol}://${credentials}@${host}/${this.testDbName}`;

      // Create database
      const createDbCommand = `mysql -h localhost -u root -ppassword -e "CREATE DATABASE IF NOT EXISTS ${this.testDbName};"`;
      try {
        execSync(createDbCommand, { stdio: 'ignore' });
      } catch (error) {
        console.warn('Could not create test database via MySQL CLI, trying with Prisma...');
      }

      // Set up Prisma client with test database
      process.env.DATABASE_URL = testDbUrl;
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: testDbUrl,
          },
        },
      });

      // Run migrations
      try {
        execSync('npx prisma migrate deploy', {
          stdio: 'ignore',
          env: { ...process.env, DATABASE_URL: testDbUrl },
        });
      } catch (error) {
        console.warn('Migration failed, trying to push schema...');
        execSync('npx prisma db push --force-reset', {
          stdio: 'ignore',
          env: { ...process.env, DATABASE_URL: testDbUrl },
        });
      }

      await this.prisma.$connect();
      return this.prisma;
    } catch (error) {
      console.error('Test database setup failed:', error);
      throw error;
    }
  }

  async cleanup() {
    if (this.prisma) {
      try {
        // Clear all data
        await this.prisma.refreshToken.deleteMany();
        await this.prisma.user.deleteMany();

        await this.prisma.$disconnect();
      } catch (error) {
        console.warn('Error during test cleanup:', error);
      }
    }
  }

  async teardown() {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }

    // Drop test database
    try {
      const dropDbCommand = `mysql -h localhost -u root -ppassword -e "DROP DATABASE IF EXISTS ${this.testDbName};"`;
      execSync(dropDbCommand, { stdio: 'ignore' });
    } catch (error) {
      console.warn('Could not drop test database:', error);
    }
  }

  getPrismaClient() {
    return this.prisma;
  }
}

module.exports = TestDatabase;
