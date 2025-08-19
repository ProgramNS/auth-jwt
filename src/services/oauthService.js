const { PrismaClient } = require('@prisma/client');
const jwtService = require('./jwtService');

const prisma = new PrismaClient();

class OAuthService {
  /**
   * Process OAuth user profile and create/update user
   * @param {Object} profile - OAuth profile from provider
   * @param {string} provider - OAuth provider name ('google')
   * @returns {Promise<Object>} User object
   */
  async processOAuthProfile(profile, provider = 'google') {
    try {
      // Validate profile data
      if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
        throw new Error('Email is required from OAuth provider');
      }

      const email = profile.emails[0].value;
      const providerId = profile.id;

      // Check if user already exists
      const user = await this.findOrCreateOAuthUser({
        email,
        providerId,
        provider,
        profile,
      });

      return user;
    } catch (error) {
      throw new Error(`OAuth profile processing failed: ${error.message}`);
    }
  }

  /**
   * Find existing user or create new OAuth user
   * @param {Object} userData - User data from OAuth profile
   * @returns {Promise<Object>} User object
   */
  async findOrCreateOAuthUser({ email, providerId, provider, profile }) {
    try {
      // First, try to find user by provider ID and provider
      let user = await prisma.user.findFirst({
        where: {
          providerId,
          provider,
        },
      });

      if (user) {
        // Update existing OAuth user
        return await this.updateOAuthUser(user.id, profile);
      }

      // Check if user exists with same email but different provider
      user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        // Link existing account with OAuth provider
        return await this.linkOAuthAccount(user.id, providerId, provider, profile);
      }

      // Create new OAuth user
      return await this.createOAuthUser({ email, providerId, provider, profile });
    } catch (error) {
      throw new Error(`User lookup/creation failed: ${error.message}`);
    }
  }

  /**
   * Create new OAuth user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async createOAuthUser({ email, providerId, provider, profile }) {
    try {
      const userData = {
        email,
        firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User',
        lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
        profilePicture: profile.photos?.[0]?.value || null,
        provider,
        providerId,
        isEmailVerified: true,
        lastLoginAt: new Date(),
      };

      const user = await prisma.user.create({
        data: userData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          provider: true,
          providerId: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      return user;
    } catch (error) {
      throw new Error(`OAuth user creation failed: ${error.message}`);
    }
  }

  /**
   * Update existing OAuth user
   * @param {string} userId - User ID
   * @param {Object} profile - OAuth profile
   * @returns {Promise<Object>} Updated user
   */
  async updateOAuthUser(userId, profile) {
    try {
      const updateData = {
        lastLoginAt: new Date(),
      };

      // Update profile picture if available
      if (profile.photos?.[0]?.value) {
        updateData.profilePicture = profile.photos[0].value;
      }

      // Update name if available and current name is empty
      if (profile.name?.givenName) {
        updateData.firstName = profile.name.givenName;
      }
      if (profile.name?.familyName) {
        updateData.lastName = profile.name.familyName;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          provider: true,
          providerId: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      return user;
    } catch (error) {
      throw new Error(`OAuth user update failed: ${error.message}`);
    }
  }

  /**
   * Link existing local account with OAuth provider
   * @param {string} userId - Existing user ID
   * @param {string} providerId - OAuth provider ID
   * @param {string} provider - OAuth provider name
   * @param {Object} profile - OAuth profile
   * @returns {Promise<Object>} Updated user
   */
  async linkOAuthAccount(userId, providerId, provider, profile) {
    try {
      const updateData = {
        provider,
        providerId,
        isEmailVerified: true,
        lastLoginAt: new Date(),
      };

      // Update profile picture if not set and available from OAuth
      if (profile.photos?.[0]?.value) {
        updateData.profilePicture = profile.photos[0].value;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          provider: true,
          providerId: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      return user;
    } catch (error) {
      throw new Error(`OAuth account linking failed: ${error.message}`);
    }
  }

  /**
   * Generate JWT tokens for OAuth authenticated user
   * @param {Object} user - User object
   * @returns {Promise<Object>} Token response
   */
  async generateOAuthTokens(user) {
    try {
      const accessToken = jwtService.generateAccessToken(user);
      const refreshToken = jwtService.generateRefreshToken(user);

      // Store refresh token in database
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
          provider: user.provider,
          isEmailVerified: user.isEmailVerified,
        },
      };
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Handle OAuth authentication flow
   * @param {Object} profile - OAuth profile
   * @param {string} provider - OAuth provider
   * @returns {Promise<Object>} Authentication response
   */
  async handleOAuthAuthentication(profile, provider = 'google') {
    try {
      // Process OAuth profile and get/create user
      const user = await this.processOAuthProfile(profile, provider);

      // Generate tokens
      const tokens = await this.generateOAuthTokens(user);

      return {
        success: true,
        ...tokens,
      };
    } catch (error) {
      throw new Error(`OAuth authentication failed: ${error.message}`);
    }
  }

  /**
   * Unlink OAuth account (convert back to local account)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated user
   */
  async unlinkOAuthAccount(userId) {
    try {
      // Check if user has a password (can revert to local account)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true, provider: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.password) {
        throw new Error('Cannot unlink OAuth account without setting a password first');
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          provider: 'local',
          providerId: null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          provider: true,
          providerId: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      return updatedUser;
    } catch (error) {
      throw new Error(`OAuth account unlinking failed: ${error.message}`);
    }
  }
}

module.exports = new OAuthService();
