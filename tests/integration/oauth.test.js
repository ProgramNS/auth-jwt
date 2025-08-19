const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('../../src/routes/authRoutes');
// const rateLimiter = require('../../src/middleware/rateLimiter'); // Currently unused
const cors = require('../../src/middleware/cors');
const security = require('../../src/middleware/security');
const passport = require('../../src/config/passport');

// Mock environment variables
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3001/api/auth/google/callback';

const prisma = new PrismaClient();

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(session({
    secret: 'test-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(cors);
  app.use(security);
  app.use('/api/auth', authRoutes);
  return app;
};

describe('OAuth Integration Tests', () => {
  let app;
  let testUser; // eslint-disable-line no-unused-vars
  let accessToken;

  beforeAll(async () => {
    app = createTestApp();

    // Clean up test data
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});

    // Create a test user for authenticated tests
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      });

    testUser = userResponse.body.data.user; // eslint-disable-line no-unused-vars
    accessToken = userResponse.body.data.tokens.accessToken;
  });

  describe('GET /api/auth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/google')
        .expect(302);

      expect(response.headers.location).toContain('accounts.google.com');
      expect(response.headers.location).toContain('oauth2');
    });

    it('should handle redirect parameter', async () => {
      const redirectUrl = 'http://localhost:3000/dashboard';
      const response = await request(app)
        .get(`/api/auth/google?redirect=${encodeURIComponent(redirectUrl)}`)
        .expect(302);

      expect(response.headers.location).toContain('accounts.google.com');
    });
  });

  describe('GET /api/auth/google/callback', () => {
    // Note: Testing OAuth callbacks is complex because it requires mocking Google's response
    // In a real application, you would use tools like nock to mock external HTTP requests
    // or create integration tests that work with Google's OAuth playground

    it('should handle OAuth error in callback', async () => {
      const response = await request(app)
        .get('/api/auth/google/callback?error=access_denied')
        .expect(302);

      expect(response.headers.location).toContain('auth/error');
      expect(response.headers.location).toContain('authentication_failed');
    });

    it('should handle missing user in callback', async () => {
      // This would typically be tested with mocked passport authentication
      // For now, we'll test the error handling path
      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(302);

      expect(response.headers.location).toContain('auth/error');
    });
  });

  describe('GET /api/auth/oauth/error', () => {
    it('should return OAuth error details', async () => {
      const response = await request(app)
        .get('/api/auth/oauth/error?error=access_denied&error_description=User%20denied%20access')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
      expect(response.body.error.message).toBe('Access denied by user');
      expect(response.body.error.details.error).toBe('access_denied');
    });

    it('should handle generic OAuth error', async () => {
      const response = await request(app)
        .get('/api/auth/oauth/error?error=server_error')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('OAUTH_ERROR');
      expect(response.body.error.message).toBe('Authentication failed');
    });

    it('should handle OAuth error with description', async () => {
      const errorDescription = 'Custom error description';
      const response = await request(app)
        .get(`/api/auth/oauth/error?error=custom_error&error_description=${encodeURIComponent(errorDescription)}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe(errorDescription);
    });
  });

  describe('GET /api/auth/oauth/status', () => {
    it('should return OAuth status for local user', async () => {
      const response = await request(app)
        .get('/api/auth/oauth/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isConnected).toBe(false);
      expect(response.body.data.provider).toBe('local');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/auth/oauth/status')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return OAuth status for Google user', async () => {
      // Create a Google OAuth user
      const googleUser = await prisma.user.create({
        data: {
          email: 'google@example.com',
          firstName: 'Google',
          lastName: 'User',
          provider: 'google',
          providerId: 'google123',
          isEmailVerified: true,
        },
      });

      // Generate token for Google user
      const JWTService = require('../../src/services/jwtService');
      const googleAccessToken = JWTService.generateAccessToken({
        userId: googleUser.id,
        email: googleUser.email,
      });

      const response = await request(app)
        .get('/api/auth/oauth/status')
        .set('Authorization', `Bearer ${googleAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isConnected).toBe(true);
      expect(response.body.data.provider).toBe('google');
    });
  });

  describe('POST /api/auth/oauth/unlink', () => {
    it('should return error for local user without OAuth', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/unlink')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNLINK_NOT_ALLOWED');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/unlink')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should unlink OAuth account successfully', async () => {
      // Create a Google OAuth user with password (linked account)
      const linkedUser = await prisma.user.create({
        data: {
          email: 'linked@example.com',
          password: '$2b$12$hashedpassword', // Mock hashed password
          firstName: 'Linked',
          lastName: 'User',
          provider: 'google',
          providerId: 'google123',
          isEmailVerified: true,
        },
      });

      // Generate token for linked user
      const JWTService = require('../../src/services/jwtService');
      const linkedAccessToken = JWTService.generateAccessToken({
        userId: linkedUser.id,
        email: linkedUser.email,
      });

      const response = await request(app)
        .post('/api/auth/oauth/unlink')
        .set('Authorization', `Bearer ${linkedAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('OAuth account unlinked successfully');
      expect(response.body.data.user.provider).toBe('local');
      expect(response.body.data.user.providerId).toBeNull();
    });
  });

  describe('POST /api/auth/oauth/link', () => {
    it('should redirect to Google OAuth for linking', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/link')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(302);

      expect(response.headers.location).toContain('accounts.google.com');
      expect(response.headers.location).toContain('oauth2');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/link')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('OAuth Flow Integration', () => {
    it('should handle complete OAuth flow simulation', async () => {
      // This test simulates the OAuth flow without actually calling Google
      // In a real scenario, you would mock the OAuth provider responses

      // Step 1: Initiate OAuth
      const initiateResponse = await request(app)
        .get('/api/auth/google')
        .expect(302);

      expect(initiateResponse.headers.location).toContain('accounts.google.com');

      // Step 2: Handle callback (would normally come from Google)
      // This would require mocking the passport authentication
      // For now, we test the error handling

      // Step 3: Check OAuth status
      const statusResponse = await request(app)
        .get('/api/auth/oauth/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusResponse.body.data.isConnected).toBe(false);
    });
  });
});
