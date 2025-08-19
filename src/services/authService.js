const { PrismaClient } = require('@prisma/client');
const PasswordService = require('./passwordService');
const JWTService = require('./jwtService');

const prisma = new PrismaClient();

/**
 * Authentication service for user registration, login, logout, and token management
 */
class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.firstName - User first name
   * @param {string} userData.lastName - User last name
   * @returns {Promise<Object>} - Registration response with user data and tokens
   * @throws {Error} - If registration fails
   */
  static async register(userData) {
    const { email, password, firstName, lastName } = userData;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      throw new Error('Email, password, firstName, and lastName are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    const passwordValidation = PasswordService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await PasswordService.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          provider: 'local',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isEmailVerified: true,
          provider: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
      };
      const tokens = JWTService.generateTokenPair(tokenPayload);

      // Store refresh token in database
      const refreshTokenExpiry = new Date();
      refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: refreshTokenExpiry,
        },
      });

      return {
        success: true,
        message: 'User registered successfully',
        user,
        tokens,
      };
    } catch (error) {
      if (error.message.includes('already exists') ||
          error.message.includes('validation failed') ||
          error.message.includes('Invalid email')) {
        throw error;
      }
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Login user with email and password
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @returns {Promise<Object>} - Login response with user data and tokens
   * @throws {Error} - If login fails
   */
  static async login(credentials) {
    const { email, password } = credentials;

    // Validate required fields
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user has a password (not OAuth user)
      if (!user.password) {
        throw new Error('This account uses OAuth authentication. Please login with Google.');
      }

      // Verify password
      const isPasswordValid = await PasswordService.comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
      };
      const tokens = JWTService.generateTokenPair(tokenPayload);

      // Store refresh token in database
      const refreshTokenExpiry = new Date();
      refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: refreshTokenExpiry,
        },
      });

      // Return user data without password
      const { password, ...userWithoutPassword } = user;
      // password is excluded from response for security

      return {
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
        tokens,
      };
    } catch (error) {
      if (error.message.includes('Invalid email') ||
          error.message.includes('OAuth authentication')) {
        throw error;
      }
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Logout user and revoke refresh token
   * @param {string} refreshToken - The refresh token to revoke
   * @returns {Promise<Object>} - Logout response
   * @throws {Error} - If logout fails
   */
  static async logout(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    try {
      // Verify refresh token
      JWTService.verifyRefreshToken(refreshToken); // Verify token validity

      // Find and revoke the refresh token in database
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!tokenRecord) {
        throw new Error('Invalid refresh token');
      }

      if (tokenRecord.isRevoked) {
        throw new Error('Token already revoked');
      }

      // Revoke the token
      await prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { isRevoked: true },
      });

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      if (error.message.includes('Invalid refresh token') ||
          error.message.includes('already revoked')) {
        throw error;
      }
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - The refresh token
   * @returns {Promise<Object>} - New token pair
   * @throws {Error} - If token refresh fails
   */
  static async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    try {
      // Verify refresh token
      JWTService.verifyRefreshToken(refreshToken); // Verify token validity

      // Check if token exists and is not revoked in database
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!tokenRecord) {
        throw new Error('Invalid refresh token');
      }

      if (tokenRecord.isRevoked) {
        throw new Error('Refresh token has been revoked');
      }

      if (tokenRecord.expiresAt < new Date()) {
        throw new Error('Refresh token has expired');
      }

      // Revoke old refresh token
      await prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { isRevoked: true },
      });

      // Generate new token pair
      const tokenPayload = {
        userId: tokenRecord.user.id,
        email: tokenRecord.user.email,
      };
      const newTokens = JWTService.generateTokenPair(tokenPayload);

      // Store new refresh token in database
      const refreshTokenExpiry = new Date();
      refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

      await prisma.refreshToken.create({
        data: {
          token: newTokens.refreshToken,
          userId: tokenRecord.user.id,
          expiresAt: refreshTokenExpiry,
        },
      });

      return {
        success: true,
        message: 'Token refreshed successfully',
        tokens: newTokens,
      };
    } catch (error) {
      if (error.message.includes('Invalid refresh token') ||
          error.message.includes('revoked') ||
          error.message.includes('expired')) {
        throw error;
      }
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Revoke all refresh tokens for a user (useful for security purposes)
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - Revocation response
   * @throws {Error} - If revocation fails
   */
  static async revokeAllTokens(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Revoke all refresh tokens for the user
      const result = await prisma.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });

      return {
        success: true,
        message: `Revoked ${result.count} refresh tokens`,
        revokedCount: result.count,
      };
    } catch (error) {
      throw new Error(`Failed to revoke tokens: ${error.message}`);
    }
  }

  /**
   * Clean up expired refresh tokens (maintenance function)
   * @returns {Promise<Object>} - Cleanup response
   */
  static async cleanupExpiredTokens() {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true },
          ],
        },
      });

      return {
        success: true,
        message: `Cleaned up ${result.count} expired/revoked tokens`,
        cleanedCount: result.count,
      };
    } catch (error) {
      throw new Error(`Failed to cleanup tokens: ${error.message}`);
    }
  }
}

module.exports = AuthService;
