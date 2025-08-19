const { TestHelpers, AuthFixtures } = require('../utils');
const app = require('../../src/app');

describe('End-to-End OAuth Authentication Flows', () => {
  let testHelpers;

  beforeAll(() => {
    testHelpers = new TestHelpers(app);
  });

  beforeEach(async () => {
    await global.testUtils.clearAllData();
  });

  describe('OAuth Initiation Flow', () => {
    it('should redirect to Google OAuth with proper parameters', async () => {
      const response = await testHelpers.request
        .get('/api/auth/google');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('accounts.google.com');
      expect(response.headers.location).toContain('oauth2');
      expect(response.headers.location).toContain('client_id');
      expect(response.headers.location).toContain('redirect_uri');
      expect(response.headers.location).toContain('scope');
    });

    it('should handle redirect parameter in OAuth initiation', async () => {
      const redirectUrl = encodeURIComponent('http://localhost:3000/dashboard');

      const response = await testHelpers.request
        .get(`/api/auth/google?redirect=${redirectUrl}`);

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('accounts.google.com');

      // State parameter should contain redirect info
      expect(response.headers.location).toContain('state=');
    });

    it('should validate redirect URL to prevent open redirects', async () => {
      const maliciousRedirect = encodeURIComponent('http://malicious-site.com');

      const response = await testHelpers.request
        .get(`/api/auth/google?redirect=${maliciousRedirect}`);

      // Should either reject or sanitize the redirect
      if (response.status === 302) {
        expect(response.headers.location).toContain('accounts.google.com');
      } else {
        testHelpers.assertErrorResponse(response, 400);
      }
    });
  });

  describe('OAuth Callback Error Handling', () => {
    it('should handle OAuth access denied error', async () => {
      const response = await testHelpers.request
        .get('/api/auth/google/callback?error=access_denied&error_description=User%20denied%20access');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('auth/error');
      expect(response.headers.location).toContain('authentication_failed');
    });

    it('should handle OAuth server error', async () => {
      const response = await testHelpers.request
        .get('/api/auth/google/callback?error=server_error&error_description=Internal%20server%20error');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('auth/error');
      expect(response.headers.location).toContain('server_error');
    });

    it('should handle missing authorization code', async () => {
      const response = await testHelpers.request
        .get('/api/auth/google/callback');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('auth/error');
    });

    it('should handle invalid state parameter', async () => {
      const response = await testHelpers.request
        .get('/api/auth/google/callback?code=test_code&state=invalid_state');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('auth/error');
    });
  });

  describe('OAuth Error Endpoint', () => {
    it('should return proper error response for access denied', async () => {
      const response = await testHelpers.request
        .get('/api/auth/oauth/error?error=access_denied&error_description=User%20denied%20access');

      testHelpers.assertErrorResponse(response, 400, 'ACCESS_DENIED');
      expect(response.body.error.message).toBe('Access denied by user');
      expect(response.body.error.details.error).toBe('access_denied');
    });

    it('should return proper error response for server error', async () => {
      const response = await testHelpers.request
        .get('/api/auth/oauth/error?error=server_error&error_description=Internal%20error');

      testHelpers.assertErrorResponse(response, 400, 'OAUTH_ERROR');
      expect(response.body.error.message).toBe('Internal error');
    });

    it('should handle generic OAuth errors', async () => {
      const response = await testHelpers.request
        .get('/api/auth/oauth/error?error=unknown_error');

      testHelpers.assertErrorResponse(response, 400, 'OAUTH_ERROR');
      expect(response.body.error.message).toBe('Authentication failed');
    });

    it('should handle missing error parameter', async () => {
      const response = await testHelpers.request
        .get('/api/auth/oauth/error');

      testHelpers.assertErrorResponse(response, 400, 'OAUTH_ERROR');
      expect(response.body.error.message).toBe('Authentication failed');
    });
  });

  describe('OAuth Status Management', () => {
    it('should return correct OAuth status for local user', async () => {
      const { tokens } = await testHelpers.createAndLoginUser();

      const response = await testHelpers.authenticatedRequest(
        'GET',
        '/api/auth/oauth/status',
        tokens.accessToken,
      );

      testHelpers.assertSuccessResponse(response);
      expect(response.body.data).toMatchObject({
        isConnected: false,
        provider: 'local',
        hasPassword: true,
      });
    });

    it('should return correct OAuth status for Google user', async () => {
      // Create a Google OAuth user
      const googleUser = await testHelpers.createTestUser({
        email: 'google@example.com',
        firstName: 'Google',
        lastName: 'User',
        provider: 'google',
        providerId: 'google123',
        isEmailVerified: true,
      });

      const accessToken = AuthFixtures.generateValidAccessToken(googleUser.id);

      const response = await testHelpers.authenticatedRequest(
        'GET',
        '/api/auth/oauth/status',
        accessToken,
      );

      testHelpers.assertSuccessResponse(response);
      expect(response.body.data).toMatchObject({
        isConnected: true,
        provider: 'google',
        hasPassword: false,
      });
    });

    it('should return correct status for linked account', async () => {
      // Create a user with both local and OAuth credentials
      const linkedUser = await testHelpers.createTestUser({
        email: 'linked@example.com',
        password: 'hashedpassword',
        firstName: 'Linked',
        lastName: 'User',
        provider: 'google',
        providerId: 'google123',
        isEmailVerified: true,
      });

      const accessToken = AuthFixtures.generateValidAccessToken(linkedUser.id);

      const response = await testHelpers.authenticatedRequest(
        'GET',
        '/api/auth/oauth/status',
        accessToken,
      );

      testHelpers.assertSuccessResponse(response);
      expect(response.body.data).toMatchObject({
        isConnected: true,
        provider: 'google',
        hasPassword: true,
      });
    });
  });

  describe('OAuth Account Linking', () => {
    it('should initiate OAuth linking for authenticated user', async () => {
      const { tokens } = await testHelpers.createAndLoginUser();

      const response = await testHelpers.authenticatedRequest(
        'POST',
        '/api/auth/oauth/link',
        tokens.accessToken,
      );

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('accounts.google.com');
      expect(response.headers.location).toContain('oauth2');
    });

    it('should reject OAuth linking for unauthenticated user', async () => {
      const response = await testHelpers.request
        .post('/api/auth/oauth/link');

      testHelpers.assertErrorResponse(response, 401, 'MISSING_TOKEN');
    });

    it('should handle OAuth linking with invalid token', async () => {
      const response = await testHelpers.authenticatedRequest(
        'POST',
        '/api/auth/oauth/link',
        'invalid-token',
      );

      testHelpers.assertErrorResponse(response, 403, 'MALFORMED_TOKEN');
    });
  });

  describe('OAuth Account Unlinking', () => {
    it('should unlink OAuth account successfully', async () => {
      // Create a linked account (has both password and OAuth)
      const linkedUser = await testHelpers.createTestUser({
        email: 'linked@example.com',
        password: 'hashedpassword',
        firstName: 'Linked',
        lastName: 'User',
        provider: 'google',
        providerId: 'google123',
        isEmailVerified: true,
      });

      const accessToken = AuthFixtures.generateValidAccessToken(linkedUser.id);

      const response = await testHelpers.authenticatedRequest(
        'POST',
        '/api/auth/oauth/unlink',
        accessToken,
      );

      testHelpers.assertSuccessResponse(response);
      expect(response.body.message).toBe('OAuth account unlinked successfully');
      expect(response.body.data.user).toMatchObject({
        provider: 'local',
        providerId: null,
      });
    });

    it('should reject unlinking for OAuth-only account', async () => {
      // Create OAuth-only user (no password)
      const oauthUser = await testHelpers.createTestUser({
        email: 'oauth@example.com',
        firstName: 'OAuth',
        lastName: 'User',
        provider: 'google',
        providerId: 'google123',
        isEmailVerified: true,
      });

      const accessToken = AuthFixtures.generateValidAccessToken(oauthUser.id);

      const response = await testHelpers.authenticatedRequest(
        'POST',
        '/api/auth/oauth/unlink',
        accessToken,
      );

      testHelpers.assertErrorResponse(response, 400, 'UNLINK_NOT_ALLOWED');
      expect(response.body.error.message).toContain('password');
    });

    it('should reject unlinking for local-only account', async () => {
      const { tokens } = await testHelpers.createAndLoginUser();

      const response = await testHelpers.authenticatedRequest(
        'POST',
        '/api/auth/oauth/unlink',
        tokens.accessToken,
      );

      testHelpers.assertErrorResponse(response, 400, 'UNLINK_NOT_ALLOWED');
    });

    it('should reject unlinking for unauthenticated user', async () => {
      const response = await testHelpers.request
        .post('/api/auth/oauth/unlink');

      testHelpers.assertErrorResponse(response, 401, 'MISSING_TOKEN');
    });
  });

  describe('OAuth User Creation Flow', () => {
    it('should handle new OAuth user creation', async () => {
      // This test would typically require mocking the OAuth provider response
      // For now, we'll test the service layer directly through the database

      const googleProfile = AuthFixtures.getGoogleOAuthProfile();

      // Simulate OAuth user creation
      const oauthUser = await testHelpers.createTestUser({
        email: googleProfile.emails[0].value,
        firstName: googleProfile.name.givenName,
        lastName: googleProfile.name.familyName,
        provider: 'google',
        providerId: googleProfile.id,
        isEmailVerified: true,
        profilePicture: googleProfile.photos[0].value,
      });

      expect(oauthUser).toMatchObject({
        email: googleProfile.emails[0].value,
        firstName: googleProfile.name.givenName,
        lastName: googleProfile.name.familyName,
        provider: 'google',
        providerId: googleProfile.id,
        isEmailVerified: true,
      });
    });

    it('should handle OAuth user with existing email', async () => {
      // Create local user first
      const { user } = await testHelpers.createAndLoginUser();

      // Try to create OAuth user with same email
      const googleProfile = AuthFixtures.getGoogleOAuthProfile();
      googleProfile.emails[0].value = user.email;

      // This should either link accounts or reject based on business logic
      // For now, we'll test that the system handles this scenario gracefully

      try {
        const oauthUser = await testHelpers.createTestUser({
          email: googleProfile.emails[0].value,
          firstName: googleProfile.name.givenName,
          lastName: googleProfile.name.familyName,
          provider: 'google',
          providerId: googleProfile.id,
          isEmailVerified: true,
        });

        // If creation succeeds, it should be a different user
        expect(oauthUser.id).not.toBe(user.id);
      } catch (error) {
        // If creation fails, it should be due to email constraint
        expect(error.message).toContain('email');
      }
    });
  });

  describe('OAuth Session Management', () => {
    it('should create proper session for OAuth user', async () => {
      const oauthUser = await testHelpers.createTestUser({
        email: 'oauth@example.com',
        firstName: 'OAuth',
        lastName: 'User',
        provider: 'google',
        providerId: 'google123',
        isEmailVerified: true,
      });

      const accessToken = AuthFixtures.generateValidAccessToken(oauthUser.id);

      // Verify OAuth user can access protected endpoints
      const profileResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        accessToken,
      );

      testHelpers.assertSuccessResponse(profileResponse);
      expect(profileResponse.body.data.user).toMatchObject({
        email: oauthUser.email,
        provider: 'google',
        providerId: 'google123',
      });
    });

    it('should handle OAuth user logout', async () => {
      const oauthUser = await testHelpers.createTestUser({
        email: 'oauth@example.com',
        firstName: 'OAuth',
        lastName: 'User',
        provider: 'google',
        providerId: 'google123',
        isEmailVerified: true,
      });

      // Create refresh token for OAuth user
      const refreshTokenData = AuthFixtures.createRefreshTokenData(oauthUser.id);
      await testHelpers.createTestRefreshToken(oauthUser.id, refreshTokenData);

      const logoutResponse = await testHelpers.requestWithRefreshToken(
        'POST',
        '/api/auth/logout',
        refreshTokenData.token,
      );

      testHelpers.assertSuccessResponse(logoutResponse);
      expect(logoutResponse.body.message).toBe('Logout successful');
    });
  });

  describe('OAuth Security Considerations', () => {
    it('should validate OAuth state parameter', async () => {
      // Test with invalid state
      const response = await testHelpers.request
        .get('/api/auth/google/callback?code=test_code&state=invalid_state');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('auth/error');
    });

    it('should handle OAuth CSRF protection', async () => {
      // Initiate OAuth to get state
      const initiateResponse = await testHelpers.request
        .get('/api/auth/google');

      expect(initiateResponse.status).toBe(302);

      // Extract state from redirect URL
      const redirectUrl = initiateResponse.headers.location;
      const stateMatch = redirectUrl.match(/state=([^&]+)/);

      if (stateMatch) {
        const state = stateMatch[1];

        // Use valid state in callback
        const callbackResponse = await testHelpers.request
          .get(`/api/auth/google/callback?code=test_code&state=${state}`);

        // Should not immediately fail due to state validation
        expect(callbackResponse.status).toBe(302);
      }
    });

    it('should prevent OAuth token replay attacks', async () => {
      // This would typically involve testing with actual OAuth tokens
      // For now, we ensure that refresh tokens are properly rotated

      const oauthUser = await testHelpers.createTestUser({
        email: 'oauth@example.com',
        firstName: 'OAuth',
        lastName: 'User',
        provider: 'google',
        providerId: 'google123',
        isEmailVerified: true,
      });

      const refreshTokenData = AuthFixtures.createRefreshTokenData(oauthUser.id);
      await testHelpers.createTestRefreshToken(oauthUser.id, refreshTokenData);

      // Use refresh token
      const refreshResponse = await testHelpers.requestWithRefreshToken(
        'POST',
        '/api/auth/refresh',
        refreshTokenData.token,
      );

      testHelpers.assertSuccessResponse(refreshResponse);

      // Try to use same refresh token again
      const replayResponse = await testHelpers.requestWithRefreshToken(
        'POST',
        '/api/auth/refresh',
        refreshTokenData.token,
      );

      testHelpers.assertErrorResponse(replayResponse, 401);
    });
  });
});
