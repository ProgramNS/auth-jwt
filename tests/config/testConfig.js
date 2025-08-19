/**
 * Test configuration for different test environments
 */

const testConfig = {
  // Database configuration for tests
  database: {
    // Use in-memory or separate test database
    url: process.env.TEST_DATABASE_URL || 'mysql://root:password@localhost:3306/test_auth_db',
    // Faster bcrypt rounds for testing
    bcryptRounds: 4,
  },

  // JWT configuration for tests
  jwt: {
    accessSecret: 'test-access-secret-key-for-testing-purposes-only',
    refreshSecret: 'test-refresh-secret-key-for-testing-purposes-only',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },

  // Rate limiting configuration for tests
  rateLimiting: {
    windowMs: 60000, // 1 minute
    maxRequests: 10, // Lower limit for testing
  },

  // Test user credentials
  testUsers: {
    valid: {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
    },
    admin: {
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      firstName: 'Admin',
      lastName: 'User',
    },
    oauth: {
      email: 'oauth@gmail.com',
      firstName: 'OAuth',
      lastName: 'User',
      provider: 'google',
      providerId: 'google-test-id',
    },
  },

  // Test timeouts
  timeouts: {
    unit: 5000,
    integration: 30000,
    e2e: 60000,
  },

  // Mock data
  mocks: {
    googleProfile: {
      id: 'google-test-id',
      emails: [{ value: 'oauth@gmail.com', verified: true }],
      name: {
        givenName: 'OAuth',
        familyName: 'User',
      },
      photos: [{ value: 'https://example.com/avatar.jpg' }],
      provider: 'google',
    },
  },

  // Test server configuration
  server: {
    port: 0, // Use random port
    host: 'localhost',
  },

  // Security configuration for tests
  security: {
    cookieSecret: 'test-cookie-secret',
    corsOrigin: 'http://localhost:3000',
    helmetOptions: {
      contentSecurityPolicy: false, // Disable for tests
    },
  },

  // Logging configuration for tests
  logging: {
    level: 'error', // Reduce noise in tests
    silent: true, // Silent mode for tests
  },
};

module.exports = testConfig;
