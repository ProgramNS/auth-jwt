const request = require('supertest');
const AuthFixtures = require('../fixtures/authFixtures');
const UserFixtures = require('../fixtures/userFixtures');

/**
 * Test helper utilities for common test operations
 */
class TestHelpers {
  constructor(app) {
    this.app = app;
    this.request = request(app);
  }

  /**
   * Register a new user and return the response
   */
  async registerUser(userData = null) {
    const registrationData = userData || await UserFixtures.createValidUserData();

    return this.request
      .post('/api/auth/register')
      .send(registrationData);
  }

  /**
   * Login a user and return tokens
   */
  async loginUser(credentials) {
    const response = await this.request
      .post('/api/auth/login')
      .send(credentials);

    return response;
  }

  /**
   * Create a user and login, returning both user data and tokens
   */
  async createAndLoginUser(userData = null) {
    const registrationData = userData || await UserFixtures.createValidUserData();

    // Register user
    const registerResponse = await this.registerUser(registrationData);

    if (registerResponse.status !== 201) {
      throw new Error(`Registration failed: ${registerResponse.body.error?.message}`);
    }

    // Login user
    const loginResponse = await this.loginUser({
      email: registrationData.email,
      password: registrationData.password,
    });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.body.error?.message}`);
    }

    return {
      user: registerResponse.body.data.user,
      tokens: loginResponse.body.data,
      credentials: registrationData,
    };
  }

  /**
   * Make authenticated request with access token
   */
  authenticatedRequest(method, url, accessToken) {
    return this.request[method.toLowerCase()](url)
      .set('Authorization', `Bearer ${accessToken}`);
  }

  /**
   * Make request with refresh token cookie
   */
  requestWithRefreshToken(method, url, refreshToken) {
    return this.request[method.toLowerCase()](url)
      .set('Cookie', `refreshToken=${refreshToken}`);
  }

  /**
   * Extract cookies from response
   */
  extractCookies(response) {
    const cookies = {};
    const setCookieHeader = response.headers['set-cookie'];

    if (setCookieHeader) {
      setCookieHeader.forEach(cookie => {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');
        cookies[name] = value;
      });
    }

    return cookies;
  }

  /**
   * Wait for a specified amount of time (for rate limiting tests)
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate multiple requests for rate limiting tests
   */
  async makeMultipleRequests(method, url, count, data = {}) {
    const requests = [];

    for (let i = 0; i < count; i++) {
      const req = this.request[method.toLowerCase()](url);
      if (Object.keys(data).length > 0) {
        req.send(data);
      }
      requests.push(req);
    }

    return Promise.all(requests);
  }

  /**
   * Assert response structure for success responses
   */
  assertSuccessResponse(response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
  }

  /**
   * Assert response structure for error responses
   */
  assertErrorResponse(response, expectedStatus, expectedCode = null) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('message');

    if (expectedCode) {
      expect(response.body.error).toHaveProperty('code', expectedCode);
    }
  }

  /**
   * Assert JWT token structure
   */
  assertTokenStructure(token) {
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  }

  /**
   * Assert user object structure
   */
  assertUserStructure(user, includePassword = false) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('firstName');
    expect(user).toHaveProperty('lastName');
    expect(user).toHaveProperty('provider');
    expect(user).toHaveProperty('isEmailVerified');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');

    if (!includePassword) {
      expect(user).not.toHaveProperty('password');
    }
  }

  /**
   * Create test data in database directly
   */
  async createTestUser(userData = null) {
    const user = userData || await UserFixtures.createValidUser();
    return global.testUtils.createTestUser(user);
  }

  /**
   * Create test refresh token in database
   */
  async createTestRefreshToken(userId, tokenData = null) {
    const refreshTokenData = tokenData || AuthFixtures.createRefreshTokenData(userId);
    return global.testUtils.createTestRefreshToken(refreshTokenData);
  }
}

module.exports = TestHelpers;
