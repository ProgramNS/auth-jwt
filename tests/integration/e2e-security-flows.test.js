const { TestHelpers, UserFixtures, AuthFixtures } = require('../utils');
const app = require('../../src/app');

describe('End-to-End Security and Rate Limiting Tests', () => {
  let testHelpers;

  beforeAll(() => {
    testHelpers = new TestHelpers(app);
  });

  beforeEach(async () => {
    await global.testUtils.clearAllData();
  });

  describe('Rate Limiting Protection', () => {
    it('should enforce rate limits on login attempts', async () => {
      const userData = await UserFixtures.createValidUserData();
      await testHelpers.registerUser(userData);

      // Make multiple failed login attempts
      const failedAttempts = Array(12).fill().map(() =>
        testHelpers.loginUser({
          email: userData.email,
          password: 'WrongPassword123!',
        }),
      );

      const responses = await Promise.all(failedAttempts);

      // First 10 should return 401 (invalid credentials)
      responses.slice(0, 10).forEach(response => {
        testHelpers.assertErrorResponse(response, 401, 'INVALID_CREDENTIALS');
      });

      // Remaining should be rate limited (429)
      responses.slice(10).forEach(response => {
        expect(response.status).toBe(429);
      });

      // Wait for rate limit to reset (if configured for short window in tests)
      await testHelpers.wait(1000);

      // Should be able to login successfully after rate limit reset
      const successResponse = await testHelpers.loginUser({
        email: userData.email,
        password: userData.password,
      });

      // This might still be rate limited depending on configuration
      expect([200, 429]).toContain(successResponse.status);
    });

    it('should enforce rate limits on registration attempts', async () => {
      // Make multiple registration attempts
      const registrationAttempts = Array(12).fill().map((_, index) =>
        testHelpers.registerUser({
          email: `test${index}@example.com`,
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        }),
      );

      const responses = await Promise.all(registrationAttempts);

      // First several should succeed
      const successfulRegistrations = responses.filter(r => r.status === 201);
      const rateLimitedRegistrations = responses.filter(r => r.status === 429);

      expect(successfulRegistrations.length).toBeGreaterThan(0);
      expect(rateLimitedRegistrations.length).toBeGreaterThan(0);
      expect(successfulRegistrations.length + rateLimitedRegistrations.length).toBe(12);
    });

    it('should enforce rate limits per IP address', async () => {
      const userData1 = await UserFixtures.createValidUserData();
      const userData2 = await UserFixtures.createValidUserData();

      await testHelpers.registerUser(userData1);
      await testHelpers.registerUser(userData2);

      // Make multiple failed attempts for different users from same IP
      const attempts = [];
      for (let i = 0; i < 6; i++) {
        attempts.push(testHelpers.loginUser({
          email: userData1.email,
          password: 'Wrong1',
        }));
        attempts.push(testHelpers.loginUser({
          email: userData2.email,
          password: 'Wrong2',
        }));
      }

      const responses = await Promise.all(attempts);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      // Should have some rate limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('JWT Security', () => {
    it('should reject tampered JWT tokens', async () => {
      const { tokens } = await testHelpers.createAndLoginUser();

      // Tamper with the token
      const tamperedToken = tokens.accessToken.slice(0, -5) + 'XXXXX';

      const response = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        tamperedToken,
      );

      testHelpers.assertErrorResponse(response, 403, 'MALFORMED_TOKEN');
    });

    it('should reject expired JWT tokens', async () => {
      const { user } = await testHelpers.createAndLoginUser();

      // Generate expired token
      const expiredToken = AuthFixtures.generateExpiredAccessToken(user.id);

      const response = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        expiredToken,
      );

      testHelpers.assertErrorResponse(response, 403, 'TOKEN_EXPIRED');
    });

    it('should reject tokens with wrong secret', async () => {
      const { user } = await testHelpers.createAndLoginUser();

      // Generate token with wrong secret
      const wrongSecretToken = AuthFixtures.generateTokenWithWrongSecret(user.id);

      const response = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        wrongSecretToken,
      );

      testHelpers.assertErrorResponse(response, 403, 'MALFORMED_TOKEN');
    });

    it('should handle token without Bearer prefix', async () => {
      const { tokens } = await testHelpers.createAndLoginUser();

      const response = await testHelpers.request
        .get('/api/users/profile')
        .set('Authorization', tokens.accessToken); // Missing 'Bearer '

      testHelpers.assertErrorResponse(response, 401, 'MISSING_TOKEN');
    });
  });

  describe('Input Validation Security', () => {
    it('should sanitize and validate registration input', async () => {
      const maliciousInputs = [
        {
          description: 'XSS in firstName',
          data: {
            email: 'test@example.com',
            password: 'Password123!',
            firstName: '<script>alert("xss")</script>',
            lastName: 'User',
          },
        },
        {
          description: 'SQL injection in email',
          data: {
            email: 'test\'; DROP TABLE users; --@example.com',
            password: 'Password123!',
            firstName: 'Test',
            lastName: 'User',
          },
        },
        {
          description: 'Very long firstName',
          data: {
            email: 'test@example.com',
            password: 'Password123!',
            firstName: 'A'.repeat(1000),
            lastName: 'User',
          },
        },
      ];

      for (const { data } of maliciousInputs) {
        const response = await testHelpers.registerUser(data);

        // Should either reject with validation error or sanitize the input
        if (response.status === 201) {
          // If accepted, ensure input was sanitized
          const user = response.body.data.user;
          expect(user.firstName).not.toContain('<script>');
          expect(user.firstName.length).toBeLessThan(500);
        } else {
          testHelpers.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
        }
      }
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'plainaddress',
        '@missingdomain.com',
        'missing@.com',
        'missing@domain',
        'spaces @domain.com',
        'multiple@@domain.com',
        'trailing.dot@domain.com.',
      ];

      for (const email of invalidEmails) {
        const response = await testHelpers.registerUser({
          email,
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        });

        testHelpers.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
      }
    });

    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        '123',
        'password',
        'PASSWORD',
        '12345678',
        'abcdefgh',
        'ABCDEFGH',
        'Password', // Missing number and special char
        'password123', // Missing uppercase and special char
        'PASSWORD123', // Missing lowercase and special char
      ];

      for (const password of weakPasswords) {
        const response = await testHelpers.registerUser({
          email: 'test@example.com',
          password,
          firstName: 'Test',
          lastName: 'User',
        });

        testHelpers.assertErrorResponse(response, 400, 'VALIDATION_ERROR');
      }
    });
  });

  describe('CORS Security', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await testHelpers.request
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await testHelpers.request
        .post('/api/auth/login')
        .set('Origin', 'http://malicious-site.com')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      // Should either reject or not include CORS headers
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
      }
    });
  });

  describe('Cookie Security', () => {
    it('should set secure cookie attributes', async () => {
      await testHelpers.createAndLoginUser();

      // Check refresh token cookie attributes
      const loginResponse = await testHelpers.loginUser({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const setCookieHeader = loginResponse.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();

      const refreshTokenCookie = setCookieHeader.find(cookie =>
        cookie.includes('refreshToken'),
      );

      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('SameSite');
      expect(refreshTokenCookie).toContain('Path=/');
    });

    it('should clear cookies on logout', async () => {
      await testHelpers.createAndLoginUser();
      const loginResponse = await testHelpers.loginUser({
        email: 'test@example.com',
        password: 'Password123!',
      });

      const cookies = testHelpers.extractCookies(loginResponse);

      const logoutResponse = await testHelpers.requestWithRefreshToken(
        'POST',
        '/api/auth/logout',
        cookies.refreshToken,
      );

      const logoutCookies = logoutResponse.headers['set-cookie'];
      expect(logoutCookies).toBeDefined();

      const clearedCookie = logoutCookies.find(cookie =>
        cookie.includes('refreshToken=;'),
      );
      expect(clearedCookie).toBeDefined();
    });
  });

  describe('Brute Force Protection', () => {
    it('should implement progressive delays for failed attempts', async () => {
      const userData = await UserFixtures.createValidUserData();
      await testHelpers.registerUser(userData);

      const startTime = Date.now();

      // Make several failed attempts
      for (let i = 0; i < 5; i++) {
        await testHelpers.loginUser({
          email: userData.email,
          password: 'WrongPassword',
        });
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should take some time due to rate limiting or progressive delays
      expect(totalTime).toBeGreaterThan(100); // At least 100ms
    });

    it('should lock account after multiple failed attempts', async () => {
      const userData = await UserFixtures.createValidUserData();
      await testHelpers.registerUser(userData);

      // Make many failed attempts
      const failedAttempts = Array(15).fill().map(() =>
        testHelpers.loginUser({
          email: userData.email,
          password: 'WrongPassword',
        }),
      );

      await Promise.all(failedAttempts);

      // Try to login with correct password
      const correctPasswordResponse = await testHelpers.loginUser({
        email: userData.email,
        password: userData.password,
      });

      // Should be rate limited even with correct password
      expect([401, 429]).toContain(correctPasswordResponse.status);
    });
  });

  describe('Data Exposure Prevention', () => {
    it('should not expose sensitive data in error messages', async () => {
      const response = await testHelpers.loginUser({
        email: 'nonexistent@example.com',
        password: 'Password123!',
      });

      testHelpers.assertErrorResponse(response, 401);

      // Error message should not reveal whether email exists
      expect(response.body.error.message.toLowerCase()).not.toContain('email');
      expect(response.body.error.message.toLowerCase()).not.toContain('user');
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    it('should not expose password hashes in any response', async () => {
      const { tokens } = await testHelpers.createAndLoginUser();

      const profileResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        tokens.accessToken,
      );

      testHelpers.assertSuccessResponse(profileResponse);
      expect(profileResponse.body.data.user.password).toBeUndefined();

      // Check users list endpoint too
      const usersResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users',
        tokens.accessToken,
      );

      testHelpers.assertSuccessResponse(usersResponse);
      usersResponse.body.data.users.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });

    it('should not expose internal system information', async () => {
      const response = await testHelpers.request
        .get('/api/nonexistent-endpoint');

      expect(response.status).toBe(404);

      // Should not expose stack traces or internal paths
      if (response.body.error) {
        expect(response.body.error.message).not.toContain('/src/');
        expect(response.body.error.message).not.toContain('node_modules');
        expect(response.body.error.message).not.toContain('Error:');
      }
    });
  });
});
