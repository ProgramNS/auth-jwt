// Jest setup file for global test configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-testing-purposes-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-purposes-only';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DATABASE_URL = 'mysql://root:password@localhost:3306/test_auth_db';
process.env.PORT = '0'; // Use random port for tests
process.env.BCRYPT_SALT_ROUNDS = '4'; // Lower for faster tests
process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute for tests
process.env.RATE_LIMIT_MAX_REQUESTS = '10'; // Lower limit for tests
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.CORS_CREDENTIALS = 'true';
process.env.COOKIE_SECRET = 'test-cookie-secret';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Google OAuth test configuration
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/auth/google/callback';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
const originalConsole = global.console;
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  // Keep error for debugging
  error: originalConsole.error,
};

// Global test utilities
global.testConfig = {
  validPassword: 'Password123!',
  weakPassword: '123',
  validEmail: 'test@example.com',
  invalidEmail: 'invalid-email',
};

// Cleanup function for tests
global.afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});
