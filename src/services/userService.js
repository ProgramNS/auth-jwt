const UserRepository = require('../repositories/userRepository');

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Get user profile by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile
   * @throws {Error} If user not found
   */
  async getUserProfile(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user profile with validation
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @param {string} updates.firstName - First name
   * @param {string} updates.lastName - Last name
   * @param {string} updates.profilePicture - Profile picture URL
   * @returns {Promise<Object>} Updated user profile
   * @throws {Error} If validation fails or user not found
   */
  async updateUserProfile(userId, updates) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate updates
    this._validateProfileUpdates(updates);

    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // If email is being updated, check if it's already taken
    if (updates.email && updates.email !== existingUser.email) {
      const emailExists = await this.userRepository.emailExists(updates.email, userId);
      if (emailExists) {
        throw new Error('Email is already in use');
      }
    }

    // Prepare update data (only allow specific fields)
    const allowedUpdates = {
      firstName: updates.firstName,
      lastName: updates.lastName,
      profilePicture: updates.profilePicture,
      email: updates.email,
    };

    // Remove undefined values
    const updateData = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined),
    );

    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid updates provided');
    }

    return await this.userRepository.update(userId, updateData);
  }

  /**
   * Delete user account with cleanup
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deleted user info
   * @throws {Error} If user not found
   */
  async deleteUser(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Delete user (refresh tokens will be cascade deleted due to foreign key constraint)
    const deletedUser = await this.userRepository.delete(userId);

    return {
      id: deletedUser.id,
      email: deletedUser.email,
      firstName: deletedUser.firstName,
      lastName: deletedUser.lastName,
      deletedAt: new Date(),
    };
  }

  /**
   * Get paginated list of users with search and filtering
   * @param {Object} filters - Search and filter options
   * @param {string} filters.search - Search term
   * @param {string} filters.provider - Filter by provider
   * @param {boolean} filters.isEmailVerified - Filter by email verification
   * @param {number} filters.page - Page number
   * @param {number} filters.limit - Items per page
   * @returns {Promise<Object>} Paginated users list
   */
  async getUsers(filters = {}) {
    // Validate pagination parameters
    if (filters.page !== undefined && (typeof filters.page !== 'number' || filters.page < 1 || !Number.isInteger(filters.page))) {
      throw new Error('Page must be a positive integer');
    }

    if (filters.limit !== undefined && (typeof filters.limit !== 'number' || filters.limit < 1 || filters.limit > 100 || !Number.isInteger(filters.limit))) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Validate provider filter
    if (filters.provider && !['local', 'google'].includes(filters.provider)) {
      throw new Error('Provider must be either "local" or "google"');
    }

    return await this.userRepository.findMany(filters);
  }

  /**
   * Update user's last login timestamp
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated user info
   */
  async updateLastLogin(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return await this.userRepository.updateLastLogin(userId);
  }

  /**
   * Check if user exists by ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if user exists
   */
  async userExists(userId) {
    if (!userId) {
      return false;
    }

    const user = await this.userRepository.findById(userId);
    return !!user;
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats() {
    const [totalUsers, localUsers, googleUsers, verifiedUsers] = await Promise.all([
      this.userRepository.findMany({ limit: 1 }).then(result => result.pagination.total),
      this.userRepository.findMany({ provider: 'local', limit: 1 }).then(result => result.pagination.total),
      this.userRepository.findMany({ provider: 'google', limit: 1 }).then(result => result.pagination.total),
      this.userRepository.findMany({ isEmailVerified: true, limit: 1 }).then(result => result.pagination.total),
    ]);

    return {
      total: totalUsers,
      byProvider: {
        local: localUsers,
        google: googleUsers,
      },
      verified: verifiedUsers,
      unverified: totalUsers - verifiedUsers,
    };
  }

  /**
   * Validate profile update data
   * @private
   * @param {Object} updates - Update data to validate
   * @throws {Error} If validation fails
   */
  _validateProfileUpdates(updates) {
    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates must be an object');
    }

    // Validate firstName
    if (updates.firstName !== undefined) {
      if (typeof updates.firstName !== 'string' || updates.firstName.trim().length === 0) {
        throw new Error('First name must be a non-empty string');
      }
      if (updates.firstName.trim().length > 50) {
        throw new Error('First name must be less than 50 characters');
      }
    }

    // Validate lastName
    if (updates.lastName !== undefined) {
      if (typeof updates.lastName !== 'string' || updates.lastName.trim().length === 0) {
        throw new Error('Last name must be a non-empty string');
      }
      if (updates.lastName.trim().length > 50) {
        throw new Error('Last name must be less than 50 characters');
      }
    }

    // Validate email
    if (updates.email !== undefined) {
      if (typeof updates.email !== 'string' || updates.email.trim().length === 0) {
        throw new Error('Email must be a non-empty string');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email.trim())) {
        throw new Error('Email must be a valid email address');
      }
    }

    // Validate profilePicture
    if (updates.profilePicture !== undefined && updates.profilePicture !== null) {
      if (typeof updates.profilePicture !== 'string') {
        throw new Error('Profile picture must be a string URL');
      }
      if (updates.profilePicture.trim().length > 500) {
        throw new Error('Profile picture URL must be less than 500 characters');
      }
    }

    // Check for disallowed fields
    const allowedFields = ['firstName', 'lastName', 'email', 'profilePicture'];
    const providedFields = Object.keys(updates);
    const disallowedFields = providedFields.filter(field => !allowedFields.includes(field));

    if (disallowedFields.length > 0) {
      throw new Error(`Cannot update fields: ${disallowedFields.join(', ')}`);
    }
  }

  /**
   * Close repository connection
   */
  async disconnect() {
    await this.userRepository.disconnect();
  }
}

module.exports = UserService;
