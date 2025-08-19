const jwt = require('jsonwebtoken');

/**
 * Authentication test data factories and fixtures
 */
class AuthFixtures {
  static generateValidAccessToken(userId, expiresIn = '15m') {
    return jwt.sign(
      {
        userId,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn },
    );
  }

  static generateValidRefreshToken(userId, expiresIn = '7d') {
    return jwt.sign(
      {
        userId,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn },
    );
  }

  static generateExpiredAccessToken(userId) {
    return jwt.sign(
      {
        userId,
        type: 'access',
        iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '-1h' }, // Already expired
    );
  }

  static generateExpiredRefreshToken(userId) {
    return jwt.sign(
      {
        userId,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000) - 86400 * 8, // 8 days ago
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '-1d' }, // Already expired
    );
  }

  static generateInvalidToken() {
    return 'invalid.jwt.token';
  }

  static generateTokenWithWrongSecret(userId) {
    return jwt.sign(
      {
        userId,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
      },
      'wrong-secret',
      { expiresIn: '15m' },
    );
  }

  static createRefreshTokenData(userId, token = null) {
    return {
      token: token || this.generateValidRefreshToken(userId),
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isRevoked: false,
    };
  }

  static createExpiredRefreshTokenData(userId) {
    return {
      token: this.generateExpiredRefreshToken(userId),
      userId,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      isRevoked: false,
    };
  }

  static createRevokedRefreshTokenData(userId) {
    return {
      token: this.generateValidRefreshToken(userId),
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: true,
    };
  }

  static getGoogleOAuthProfile() {
    return {
      id: `google_${Date.now()}`,
      emails: [{ value: `oauth${Date.now()}@gmail.com`, verified: true }],
      name: {
        givenName: 'Google',
        familyName: 'User',
      },
      photos: [{ value: 'https://example.com/google-avatar.jpg' }],
      provider: 'google',
    };
  }

  static getAuthHeaders(token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  static getCookieHeader(refreshToken) {
    return `refreshToken=${refreshToken}; Path=/; HttpOnly; SameSite=Lax`;
  }

  static getValidRegistrationData() {
    return {
      email: `test${Date.now()}@example.com`,
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
    };
  }

  static getValidLoginData() {
    return {
      email: 'test@example.com',
      password: 'Password123!',
    };
  }

  static getInvalidAuthData() {
    return [
      {
        description: 'missing email',
        data: {
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        },
      },
      {
        description: 'invalid email',
        data: {
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        },
      },
      {
        description: 'weak password',
        data: {
          email: 'test@example.com',
          password: '123',
          firstName: 'Test',
          lastName: 'User',
        },
      },
    ];
  }
}

module.exports = AuthFixtures;
