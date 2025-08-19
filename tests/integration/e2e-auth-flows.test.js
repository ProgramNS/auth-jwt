const { TestHelpers, UserFixtures, AuthFixtures } = require('../utils');
const app = require('../../src/app');

describe('End-to-End Authentication Flows', () => {
  let testHelpers;

  beforeAll(() => {
    testHelpers = new TestHelpers(app);
  });

  beforeEach(async () => {
    await global.testUtils.clearAllData();
  });

  describe('Complete User Registration and Login Flow', () => {
    it('should complete full registration, login, and profile access flow', async () => {
      const userData = await UserFixtures.createValidUserData();

      // Step 1: Register user
      const registerResponse = await testHelpers.registerUser(userData);
      testHelpers.assertSuccessResponse(registerResponse, 201);

      const { user, tokens } = registerResponse.body.data;
      testHelpers.assertUserStructure(user);
      testHelpers.assertTokenStructure(tokens.accessToken);

      // Verify refresh token cookie is set
      const cookies = testHelpers.extractCookies(registerResponse);
      expect(cookies.refreshToken).toBeDefined();

      // Step 2: Access protected profile endpoint
      const profileResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        tokens.accessToken,
      );
      testHelpers.assertSuccessResponse(profileResponse);
      expect(profileResponse.body.data.user.email).toBe(userData.email.toLowerCase());

      // Step 3: Logout
      const logoutResponse = await testHelpers.requestWithRefreshToken(
        'POST',
        '/api/auth/logout',
        cookies.refreshToken,
      );
      testHelpers.assertSuccessResponse(logoutResponse);

      // Step 4: Login again
      const loginResponse = await testHelpers.loginUser({
        email: userData.email,
        password: userData.password,
      });
      testHelpers.assertSuccessResponse(loginResponse);

      const newTokens = loginResponse.body.data.tokens;
      testHelpers.assertTokenStructure(newTokens.accessToken);

      // Step 5: Verify new token works
      const verifyResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        newTokens.accessToken,
      );
      testHelpers.assertSuccessResponse(verifyResponse);
    });

    it('should handle registration with duplicate email gracefully', async () => {
      const userData = await UserFixtures.createValidUserData();

      // First registration
      const firstResponse = await testHelpers.registerUser(userData);
      testHelpers.assertSuccessResponse(firstResponse, 201);

      // Second registration with same email
      const secondResponse = await testHelpers.registerUser(userData);
      testHelpers.assertErrorResponse(secondResponse, 409, 'USER_EXISTS');

      // Verify first user can still login
      const loginResponse = await testHelpers.loginUser({
        email: userData.email,
        password: userData.password,
      });
      testHelpers.assertSuccessResponse(loginResponse);
    });
  });

  describe('Token Refresh Flow', () => {
    it('should complete full token refresh cycle', async () => {
      // Create and login user
      const { tokens } = await testHelpers.createAndLoginUser();
      const refreshTokenCookie = testHelpers.extractCookies({
        headers: { 'set-cookie': [`refreshToken=${tokens.refreshToken}`] },
      }).refreshToken;

      // Wait a moment to ensure new token timestamps
      await testHelpers.wait(100);

      // Refresh token
      const refreshResponse = await testHelpers.requestWithRefreshToken(
        'POST',
        '/api/auth/refresh',
        refreshTokenCookie,
      );
      testHelpers.assertSuccessResponse(refreshResponse);

      const newTokens = refreshResponse.body.data.tokens;
      testHelpers.assertTokenStructure(newTokens.accessToken);

      // Verify new access token works
      const profileResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        newTokens.accessToken,
      );
      testHelpers.assertSuccessResponse(profileResponse);

      // Verify old refresh token is invalidated
      const oldRefreshResponse = await testHelpers.requestWithRefreshToken(
        'POST',
        '/api/auth/refresh',
        refreshTokenCookie,
      );
      testHelpers.assertErrorResponse(oldRefreshResponse, 401);
    });

    it('should handle expired refresh token gracefully', async () => {
      const { user } = await testHelpers.createAndLoginUser();

      // Create expired refresh token
      const expiredTokenData = AuthFixtures.createExpiredRefreshTokenData(user.id);
      await testHelpers.createTestRefreshToken(user.id, expiredTokenData);

      // Try to refresh with expired token
      const refreshResponse = await testHelpers.requestWithRefreshToken(
        'POST',
        '/api/auth/refresh',
        expiredTokenData.token,
      );
      testHelpers.assertErrorResponse(refreshResponse, 401, 'INVALID_REFRESH_TOKEN');
    });
  });

  describe('User Profile Management Flow', () => {
    it('should complete full profile management cycle', async () => {
      const { tokens } = await testHelpers.createAndLoginUser();

      // Step 1: Get initial profile
      const initialProfileResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        tokens.accessToken,
      );
      testHelpers.assertSuccessResponse(initialProfileResponse);

      // Step 2: Update profile
      const updates = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        profilePicture: 'https://example.com/new-avatar.jpg',
      };

      const updateResponse = await testHelpers.authenticatedRequest(
        'PUT',
        '/api/users/profile',
        tokens.accessToken,
      ).send(updates);
      testHelpers.assertSuccessResponse(updateResponse);

      expect(updateResponse.body.data.user).toMatchObject(updates);

      // Step 3: Verify updates persisted
      const verifyResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        tokens.accessToken,
      );
      testHelpers.assertSuccessResponse(verifyResponse);
      expect(verifyResponse.body.data.user).toMatchObject(updates);

      // Step 4: Update email
      const newEmail = 'newemail@example.com';
      const emailUpdateResponse = await testHelpers.authenticatedRequest(
        'PUT',
        '/api/users/profile',
        tokens.accessToken,
      ).send({ email: newEmail });
      testHelpers.assertSuccessResponse(emailUpdateResponse);

      // Step 5: Login with new email
      const loginResponse = await testHelpers.loginUser({
        email: newEmail,
        password: 'Password123!', // Original password
      });
      testHelpers.assertSuccessResponse(loginResponse);
    });

    it('should handle profile deletion flow', async () => {
      const { user, tokens } = await testHelpers.createAndLoginUser();

      // Delete profile
      const deleteResponse = await testHelpers.authenticatedRequest(
        'DELETE',
        '/api/users/profile',
        tokens.accessToken,
      );
      testHelpers.assertSuccessResponse(deleteResponse);

      expect(deleteResponse.body.data.deletedUser.id).toBe(user.id);

      // Verify user cannot access profile after deletion
      const profileResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        tokens.accessToken,
      );
      testHelpers.assertErrorResponse(profileResponse, 404);

      // Verify user cannot login after deletion
      const loginResponse = await testHelpers.loginUser({
        email: user.email,
        password: 'Password123!',
      });
      testHelpers.assertErrorResponse(loginResponse, 401);
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should handle multiple users with proper isolation', async () => {
      // Create two users
      const user1Data = await UserFixtures.createValidUserData();
      const user2Data = await UserFixtures.createValidUserData();

      const { user: user1, tokens: tokens1 } = await testHelpers.createAndLoginUser(user1Data);
      const { user: user2, tokens: tokens2 } = await testHelpers.createAndLoginUser(user2Data);

      // Verify each user can only access their own profile
      const user1ProfileResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        tokens1.accessToken,
      );
      testHelpers.assertSuccessResponse(user1ProfileResponse);
      expect(user1ProfileResponse.body.data.user.id).toBe(user1.id);

      const user2ProfileResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        tokens2.accessToken,
      );
      testHelpers.assertSuccessResponse(user2ProfileResponse);
      expect(user2ProfileResponse.body.data.user.id).toBe(user2.id);

      // Verify users can see each other in user list
      const usersListResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users',
        tokens1.accessToken,
      );
      testHelpers.assertSuccessResponse(usersListResponse);
      expect(usersListResponse.body.data.users).toHaveLength(2);

      // Verify user1 cannot update user2's profile
      const unauthorizedUpdateResponse = await testHelpers.authenticatedRequest(
        'PUT',
        '/api/users/profile',
        tokens1.accessToken,
      ).send({ firstName: 'Hacked' });

      // This should update user1's profile, not user2's
      testHelpers.assertSuccessResponse(unauthorizedUpdateResponse);

      // Verify user2's profile is unchanged
      const user2VerifyResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        tokens2.accessToken,
      );
      expect(user2VerifyResponse.body.data.user.firstName).toBe(user2Data.firstName);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle network interruption during registration', async () => {
      const userData = await UserFixtures.createValidUserData();

      // Simulate partial registration (user created but no tokens)
      await testHelpers.createTestUser(await UserFixtures.createValidUser({
        email: userData.email,
        password: userData.password,
      }));

      // User should still be able to login
      const loginResponse = await testHelpers.loginUser({
        email: userData.email,
        password: userData.password,
      });
      testHelpers.assertSuccessResponse(loginResponse);
    });

    it('should handle concurrent login attempts', async () => {
      const userData = await UserFixtures.createValidUserData();
      await testHelpers.registerUser(userData);

      // Make multiple concurrent login requests
      const loginPromises = Array(3).fill().map(() =>
        testHelpers.loginUser({
          email: userData.email,
          password: userData.password,
        }),
      );

      const responses = await Promise.all(loginPromises);

      // All should succeed
      responses.forEach(response => {
        testHelpers.assertSuccessResponse(response);
      });

      // All should have different tokens
      const tokens = responses.map(r => r.body.data.tokens.accessToken);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });
  });

  describe('Session Management', () => {
    it('should handle multiple active sessions', async () => {
      const userData = await UserFixtures.createValidUserData();
      await testHelpers.registerUser(userData);

      // Create multiple sessions
      const session1 = await testHelpers.loginUser({
        email: userData.email,
        password: userData.password,
      });
      const session2 = await testHelpers.loginUser({
        email: userData.email,
        password: userData.password,
      });

      testHelpers.assertSuccessResponse(session1);
      testHelpers.assertSuccessResponse(session2);

      // Both sessions should work independently
      const profile1Response = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        session1.body.data.tokens.accessToken,
      );
      const profile2Response = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        session2.body.data.tokens.accessToken,
      );

      testHelpers.assertSuccessResponse(profile1Response);
      testHelpers.assertSuccessResponse(profile2Response);

      // Logout from one session shouldn't affect the other
      const cookies1 = testHelpers.extractCookies(session1);
      const logoutResponse = await testHelpers.requestWithRefreshToken(
        'POST',
        '/api/auth/logout',
        cookies1.refreshToken,
      );
      testHelpers.assertSuccessResponse(logoutResponse);

      // Session 2 should still work
      const profile2AfterLogoutResponse = await testHelpers.authenticatedRequest(
        'GET',
        '/api/users/profile',
        session2.body.data.tokens.accessToken,
      );
      testHelpers.assertSuccessResponse(profile2AfterLogoutResponse);
    });
  });
});
