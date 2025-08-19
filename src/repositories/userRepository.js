const { PrismaClient } = require('@prisma/client');

class UserRepository {
  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new user
   * @param {Object} userData - User data to create
   * @returns {Promise<Object>} Created user
   */
  async create(userData) {
    return await this.prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        isEmailVerified: true,
        provider: true,
        providerId: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} User or null if not found
   */
  async findById(id) {
    return await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        isEmailVerified: true,
        provider: true,
        providerId: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User or null if not found
   */
  async findByEmail(email) {
    return await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        isEmailVerified: true,
        provider: true,
        providerId: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });
  }

  /**
   * Find user by provider ID (for OAuth)
   * @param {string} providerId - Provider ID
   * @param {string} provider - Provider name
   * @returns {Promise<Object|null>} User or null if not found
   */
  async findByProviderId(providerId, provider = 'google') {
    return await this.prisma.user.findFirst({
      where: {
        providerId,
        provider,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        isEmailVerified: true,
        provider: true,
        providerId: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });
  }

  /**
   * Update user by ID
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   */
  async update(id, updateData) {
    return await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        isEmailVerified: true,
        provider: true,
        providerId: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });
  }

  /**
   * Delete user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object>} Deleted user
   */
  async delete(id) {
    return await this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  /**
   * Search and filter users with pagination
   * @param {Object} filters - Search and filter options
   * @param {string} filters.search - Search term for name or email
   * @param {string} filters.provider - Filter by provider
   * @param {boolean} filters.isEmailVerified - Filter by email verification status
   * @param {number} filters.page - Page number (default: 1)
   * @param {number} filters.limit - Items per page (default: 10)
   * @returns {Promise<Object>} Paginated users with metadata
   */
  async findMany(filters = {}) {
    const {
      search,
      provider,
      isEmailVerified,
      page = 1,
      limit = 10,
    } = filters;

    const skip = (page - 1) * limit;
    const where = {};

    // Build search conditions
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (provider) {
      where.provider = provider;
    }

    if (typeof isEmailVerified === 'boolean') {
      where.isEmailVerified = isEmailVerified;
    }

    // Get total count for pagination
    const total = await this.prisma.user.count({ where });

    // Get users with pagination
    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        isEmailVerified: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Update user's last login timestamp
   * @param {string} id - User ID
   * @returns {Promise<Object>} Updated user
   */
  async updateLastLogin(id) {
    return await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
      select: {
        id: true,
        lastLoginAt: true,
      },
    });
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @param {string} excludeId - User ID to exclude from check (for updates)
   * @returns {Promise<boolean>} True if email exists
   */
  async emailExists(email, excludeId = null) {
    const where = { email };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const user = await this.prisma.user.findFirst({ where });
    return !!user;
  }

  /**
   * Close Prisma connection
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = UserRepository;
