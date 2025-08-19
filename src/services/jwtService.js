const jwt = require('jsonwebtoken');

/**
 * JWT service for token generation, validation, and refresh operations
 */
class JWTService {
  /**
   * Generate an access token
   * @param {Object} payload - The payload to include in the token
   * @param {string} payload.userId - User ID
   * @param {string} payload.email - User email
   * @param {string} [payload.role] - User role (optional)
   * @returns {string} - The generated access token
   * @throws {Error} - If token generation fails
   */
  static generateAccessToken(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be an object');
    }

    if (!payload.userId) {
      throw new Error('Payload must include userId');
    }

    if (!payload.email) {
      throw new Error('Payload must include email');
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET environment variable is required');
    }

    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';

    try {
      return jwt.sign(
        {
          userId: payload.userId,
          email: payload.email,
          role: payload.role || 'user',
          type: 'access',
        },
        secret,
        {
          expiresIn,
          issuer: 'auth-service',
          audience: 'auth-client',
        },
      );
    } catch (error) {
      throw new Error(`Failed to generate access token: ${error.message}`);
    }
  }

  /**
   * Generate a refresh token
   * @param {Object} payload - The payload to include in the token
   * @param {string} payload.userId - User ID
   * @param {string} payload.email - User email
   * @returns {string} - The generated refresh token
   * @throws {Error} - If token generation fails
   */
  static generateRefreshToken(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be an object');
    }

    if (!payload.userId) {
      throw new Error('Payload must include userId');
    }

    if (!payload.email) {
      throw new Error('Payload must include email');
    }

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }

    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    try {
      return jwt.sign(
        {
          userId: payload.userId,
          email: payload.email,
          type: 'refresh',
        },
        secret,
        {
          expiresIn,
          issuer: 'auth-service',
          audience: 'auth-client',
        },
      );
    } catch (error) {
      throw new Error(`Failed to generate refresh token: ${error.message}`);
    }
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} payload - The payload to include in the tokens
   * @param {string} payload.userId - User ID
   * @param {string} payload.email - User email
   * @param {string} [payload.role] - User role (optional)
   * @returns {Object} - Object containing both tokens
   * @throws {Error} - If token generation fails
   */
  static generateTokenPair(payload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Verify and decode an access token
   * @param {string} token - The access token to verify
   * @returns {Object} - The decoded token payload
   * @throws {Error} - If token is invalid or verification fails
   */
  static verifyAccessToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a non-empty string');
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET environment variable is required');
    }

    try {
      const decoded = jwt.verify(token, secret, {
        issuer: 'auth-service',
        audience: 'auth-client',
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      }
      throw new Error(`Failed to verify access token: ${error.message}`);
    }
  }

  /**
   * Verify and decode a refresh token
   * @param {string} token - The refresh token to verify
   * @returns {Object} - The decoded token payload
   * @throws {Error} - If token is invalid or verification fails
   */
  static verifyRefreshToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a non-empty string');
    }

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }

    try {
      const decoded = jwt.verify(token, secret, {
        issuer: 'auth-service',
        audience: 'auth-client',
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw new Error(`Failed to verify refresh token: ${error.message}`);
    }
  }

  /**
   * Decode a token without verification (for debugging purposes)
   * @param {string} token - The token to decode
   * @returns {Object} - The decoded token payload
   * @throws {Error} - If token is malformed
   */
  static decodeToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a non-empty string');
    }

    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      throw new Error(`Failed to decode token: ${error.message}`);
    }
  }

  /**
   * Check if a token is expired without verification
   * @param {string} token - The token to check
   * @returns {boolean} - True if token is expired, false otherwise
   */
  static isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.payload || !decoded.payload.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time
   * @param {string} token - The token to check
   * @returns {Date|null} - Expiration date or null if invalid
   */
  static getTokenExpiration(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.payload || !decoded.payload.exp) {
        return null;
      }

      return new Date(decoded.payload.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh tokens with rotation (invalidate old refresh token)
   * @param {string} refreshToken - The current refresh token
   * @returns {Object} - New token pair
   * @throws {Error} - If refresh token is invalid
   */
  static refreshTokens(refreshToken) {
    // Verify the current refresh token
    const decoded = this.verifyRefreshToken(refreshToken);

    // Generate new token pair
    const payload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    return this.generateTokenPair(payload);
  }
}

module.exports = JWTService;
