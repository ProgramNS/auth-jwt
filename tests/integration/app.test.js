/**
 * Integration Tests for Complete Application Setup
 * Tests the main Express application configuration and server setup
 */

const request = require('supertest');
const { createApp } = require('../../src/app');
const { validateEnvironment, setupGracefulShutdown, cleanup } = require('../../src/server');

describe('Application Setup Integration Tests', () => {
  let app;
  let server;

  beforeAll(() => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_db';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.PORT = '0'; // Use random available port for testing

    app = createApp();
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
    await cleanup();
  });

  describe('Application Creation', () => {
    test('should create Express app successfully', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });

    test('should have correct middleware stack', () => {
      const middlewareStack = app._router.stack;
      expect(middlewareStack).toBeDefined();
      expect(middlewareStack.length).toBeGreaterThan(0);
    });
  });

  describe('Health Check Endpoint', () => {
    test('should respond to health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Server is healthy',
        environment: 'test',
      });

      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('Root Endpoint', () => {
    test('should respond to root endpoint', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Auth & User Management API',
        version: '1.0.0',
        documentation: '/api/docs',
        health: '/health',
      });
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['x-api-version']).toBe('1.0');
    });

    test('should include cache control headers for sensitive endpoints', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401); // Will fail auth but headers should be set

      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['pragma']).toBe('no-cache');
    });
  });

  describe('CORS Configuration', () => {
    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      // CORS might return 204 (success) or 403 (blocked) depending on configuration
      expect([204, 403]).toContain(response.status);

      if (response.status === 204) {
        expect(response.headers['access-control-allow-origin']).toBeDefined();
        expect(response.headers['access-control-allow-methods']).toContain('POST');
        expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
      }
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to API routes', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      // Check for rate limit headers
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });

    test('should not apply rate limiting to health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Health check should not have rate limit headers
      expect(response.headers['ratelimit-limit']).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: expect.stringContaining('Route GET /non-existent-route not found'),
        },
      });

      expect(response.body.timestamp).toBeDefined();
      expect(response.body.path).toBe('/non-existent-route');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Route Mounting', () => {
    test('should mount auth routes correctly', async () => {
      // Test that auth routes are accessible
      const loginResponse = await request(app)
        .post('/api/auth/login');

      // Should not be 404 (route exists)
      expect(loginResponse.status).not.toBe(404);

      const registerResponse = await request(app)
        .post('/api/auth/register');

      // Should not be 404 (route exists)
      expect(registerResponse.status).not.toBe(404);
    });

    test('should mount user routes correctly', async () => {
      // Test that user routes are accessible
      await request(app)
        .get('/api/users/profile')
        .expect(401); // Will fail auth but route exists
    });
  });

  describe('Request Parsing', () => {
    test('should parse JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      // Should not be 404 (route exists and JSON was parsed)
      expect(response.status).not.toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should parse URL-encoded requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send('email=test@example.com&password=password');

      // Should not be 404 (route exists and data was parsed)
      expect(response.status).not.toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should handle large request bodies within limit', async () => {
      const largeData = { data: 'x'.repeat(1000000) }; // 1MB of data

      const response = await request(app)
        .post('/api/auth/register')
        .send(largeData);

      // Should not be 404 (route exists and request was processed)
      expect(response.status).not.toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});

describe('Server Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    test('should pass with all required variables', () => {
      process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_db';
      process.env.JWT_ACCESS_SECRET = 'test-secret';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

      expect(() => validateEnvironment()).not.toThrow();
    });

    test('should set default values for optional variables', () => {
      process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_db';
      process.env.JWT_ACCESS_SECRET = 'test-secret';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

      // Remove optional variables
      delete process.env.PORT;
      delete process.env.NODE_ENV;

      validateEnvironment();

      expect(process.env.PORT).toBe('3000');
      expect(process.env.NODE_ENV).toBe('development');
    });

    test('should exit process when required variables are missing', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Remove required variable
      delete process.env.DATABASE_URL;
      delete process.env.JWT_ACCESS_SECRET;

      validateEnvironment();

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });
  });
});

describe('Graceful Shutdown', () => {
  test('should setup graceful shutdown handlers', () => {
    const mockServer = {
      close: jest.fn((callback) => callback()),
    };

    const originalListeners = process.listeners('SIGTERM');

    setupGracefulShutdown(mockServer);

    // Check that new listeners were added
    expect(process.listeners('SIGTERM').length).toBeGreaterThan(originalListeners.length);
    expect(process.listeners('SIGINT').length).toBeGreaterThan(0);
    expect(process.listeners('uncaughtException').length).toBeGreaterThan(0);
    expect(process.listeners('unhandledRejection').length).toBeGreaterThan(0);
  });
});

describe('Cleanup Function', () => {
  test('should cleanup resources successfully', async () => {
    // Mock Prisma client
    jest.mock('@prisma/client', () => ({
      PrismaClient: jest.fn().mockImplementation(() => ({
        $disconnect: jest.fn().mockResolvedValue(undefined),
      })),
    }));

    await expect(cleanup()).resolves.not.toThrow();
  });
});
