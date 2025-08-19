const JWTService = require('../../../src/services/jwtService');

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    JWT_ACCESS_SECRET: 'test-access-secret-key',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('JWTService', () => {
  const validPayload = {
    userId: 'user123',
    email: 'test@example.com',
    role: 'user',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = JWTService.generateAccessToken(validPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include required payload fields', () => {
      const token = JWTService.generateAccessToken(validPayload);
      const decoded = JWTService.decodeToken(token);

      expect(decoded.payload.userId).toBe(validPayload.userId);
      expect(decoded.payload.email).toBe(validPayload.email);
      expect(decoded.payload.role).toBe(validPayload.role);
      expect(decoded.payload.type).toBe('access');
    });

    it('should set default role to user if not provided', () => {
      const payloadWithoutRole = {
        userId: 'user123',
        email: 'test@example.com',
      };

      const token = JWTService.generateAccessToken(payloadWithoutRole);
      const decoded = JWTService.decodeToken(token);

      expect(decoded.payload.role).toBe('user');
    });

    it('should throw error for invalid payload', () => {
      expect(() => JWTService.generateAccessToken(null)).toThrow('Payload must be an object');
      expect(() => JWTService.generateAccessToken('string')).toThrow('Payload must be an object');
      expect(() => JWTService.generateAccessToken(123)).toThrow('Payload must be an object');
    });

    it('should throw error for missing userId', () => {
      const invalidPayload = { email: 'test@example.com' };
      expect(() => JWTService.generateAccessToken(invalidPayload)).toThrow('Payload must include userId');
    });

    it('should throw error for missing email', () => {
      const invalidPayload = { userId: 'user123' };
      expect(() => JWTService.generateAccessToken(invalidPayload)).toThrow('Payload must include email');
    });

    it('should throw error when JWT_ACCESS_SECRET is missing', () => {
      delete process.env.JWT_ACCESS_SECRET;
      expect(() => JWTService.generateAccessToken(validPayload))
        .toThrow('JWT_ACCESS_SECRET environment variable is required');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = JWTService.generateRefreshToken(validPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include required payload fields', () => {
      const token = JWTService.generateRefreshToken(validPayload);
      const decoded = JWTService.decodeToken(token);

      expect(decoded.payload.userId).toBe(validPayload.userId);
      expect(decoded.payload.email).toBe(validPayload.email);
      expect(decoded.payload.type).toBe('refresh');
    });

    it('should not include role in refresh token', () => {
      const token = JWTService.generateRefreshToken(validPayload);
      const decoded = JWTService.decodeToken(token);

      expect(decoded.payload.role).toBeUndefined();
    });

    it('should throw error for invalid payload', () => {
      expect(() => JWTService.generateRefreshToken(null)).toThrow('Payload must be an object');
    });

    it('should throw error for missing userId', () => {
      const invalidPayload = { email: 'test@example.com' };
      expect(() => JWTService.generateRefreshToken(invalidPayload)).toThrow('Payload must include userId');
    });

    it('should throw error for missing email', () => {
      const invalidPayload = { userId: 'user123' };
      expect(() => JWTService.generateRefreshToken(invalidPayload)).toThrow('Payload must include email');
    });

    it('should throw error when JWT_REFRESH_SECRET is missing', () => {
      delete process.env.JWT_REFRESH_SECRET;
      expect(() => JWTService.generateRefreshToken(validPayload))
        .toThrow('JWT_REFRESH_SECRET environment variable is required');
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = JWTService.generateTokenPair(validPayload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should generate different tokens', () => {
      const tokens = JWTService.generateTokenPair(validPayload);

      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = JWTService.generateAccessToken(validPayload);
      const decoded = JWTService.verifyAccessToken(token);

      expect(decoded.userId).toBe(validPayload.userId);
      expect(decoded.email).toBe(validPayload.email);
      expect(decoded.type).toBe('access');
    });

    it('should throw error for invalid token', () => {
      expect(() => JWTService.verifyAccessToken('invalid.token.here'))
        .toThrow('Invalid access token');
    });

    it('should throw error for empty token', () => {
      expect(() => JWTService.verifyAccessToken(''))
        .toThrow('Token must be a non-empty string');
    });

    it('should throw error for null token', () => {
      expect(() => JWTService.verifyAccessToken(null))
        .toThrow('Token must be a non-empty string');
    });

    it('should throw error for refresh token used as access token', () => {
      const refreshToken = JWTService.generateRefreshToken(validPayload);
      expect(() => JWTService.verifyAccessToken(refreshToken))
        .toThrow('Invalid token type');
    });

    it('should throw error when JWT_ACCESS_SECRET is missing', () => {
      const token = JWTService.generateAccessToken(validPayload);
      delete process.env.JWT_ACCESS_SECRET;

      expect(() => JWTService.verifyAccessToken(token))
        .toThrow('JWT_ACCESS_SECRET environment variable is required');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = JWTService.generateRefreshToken(validPayload);
      const decoded = JWTService.verifyRefreshToken(token);

      expect(decoded.userId).toBe(validPayload.userId);
      expect(decoded.email).toBe(validPayload.email);
      expect(decoded.type).toBe('refresh');
    });

    it('should throw error for invalid token', () => {
      expect(() => JWTService.verifyRefreshToken('invalid.token.here'))
        .toThrow('Invalid refresh token');
    });

    it('should throw error for empty token', () => {
      expect(() => JWTService.verifyRefreshToken(''))
        .toThrow('Token must be a non-empty string');
    });

    it('should throw error for access token used as refresh token', () => {
      const accessToken = JWTService.generateAccessToken(validPayload);
      expect(() => JWTService.verifyRefreshToken(accessToken))
        .toThrow('Invalid token type');
    });

    it('should throw error when JWT_REFRESH_SECRET is missing', () => {
      const token = JWTService.generateRefreshToken(validPayload);
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => JWTService.verifyRefreshToken(token))
        .toThrow('JWT_REFRESH_SECRET environment variable is required');
    });
  });

  describe('decodeToken', () => {
    it('should decode a token without verification', () => {
      const token = JWTService.generateAccessToken(validPayload);
      const decoded = JWTService.decodeToken(token);

      expect(decoded).toHaveProperty('header');
      expect(decoded).toHaveProperty('payload');
      expect(decoded).toHaveProperty('signature');
      expect(decoded.payload.userId).toBe(validPayload.userId);
    });

    it('should throw error for invalid token format', () => {
      expect(() => JWTService.decodeToken('invalid-token'))
        .toThrow('Failed to decode token');
    });

    it('should throw error for empty token', () => {
      expect(() => JWTService.decodeToken(''))
        .toThrow('Token must be a non-empty string');
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid non-expired token', () => {
      const token = JWTService.generateAccessToken(validPayload);
      const isExpired = JWTService.isTokenExpired(token);

      expect(isExpired).toBe(false);
    });

    it('should return true for invalid token', () => {
      const isExpired = JWTService.isTokenExpired('invalid-token');

      expect(isExpired).toBe(true);
    });

    it('should return true for empty token', () => {
      const isExpired = JWTService.isTokenExpired('');

      expect(isExpired).toBe(true);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const token = JWTService.generateAccessToken(validPayload);
      const expiration = JWTService.getTokenExpiration(token);

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      const expiration = JWTService.getTokenExpiration('invalid-token');

      expect(expiration).toBeNull();
    });

    it('should return null for empty token', () => {
      const expiration = JWTService.getTokenExpiration('');

      expect(expiration).toBeNull();
    });
  });

  describe('refreshTokens', () => {
    it('should generate new token pair from valid refresh token', () => {
      const originalTokens = JWTService.generateTokenPair(validPayload);
      const newTokens = JWTService.refreshTokens(originalTokens.refreshToken);

      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens).toHaveProperty('refreshToken');
      expect(newTokens.accessToken).not.toBe(originalTokens.accessToken);
      expect(newTokens.refreshToken).not.toBe(originalTokens.refreshToken);
    });

    it('should preserve user data in new tokens', () => {
      const originalTokens = JWTService.generateTokenPair(validPayload);
      const newTokens = JWTService.refreshTokens(originalTokens.refreshToken);

      const decodedAccess = JWTService.verifyAccessToken(newTokens.accessToken);
      const decodedRefresh = JWTService.verifyRefreshToken(newTokens.refreshToken);

      expect(decodedAccess.userId).toBe(validPayload.userId);
      expect(decodedAccess.email).toBe(validPayload.email);
      expect(decodedRefresh.userId).toBe(validPayload.userId);
      expect(decodedRefresh.email).toBe(validPayload.email);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => JWTService.refreshTokens('invalid-token'))
        .toThrow('Invalid refresh token');
    });

    it('should throw error for access token used as refresh token', () => {
      const accessToken = JWTService.generateAccessToken(validPayload);
      expect(() => JWTService.refreshTokens(accessToken))
        .toThrow('Invalid token type');
    });
  });
});
