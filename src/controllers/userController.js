const UserService = require('../services/userService');

/**
 * User Management Controller
 * Handles HTTP requests for user management endpoints
 */
class UserController {
  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get current user profile
   * GET /api/users/profile
   */
  async getUserProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await this.userService.getUserProfile(userId);

      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      let statusCode = 500;
      let errorCode = 'PROFILE_FETCH_FAILED';

      if (error.message.includes('User not found')) {
        statusCode = 404;
        errorCode = 'USER_NOT_FOUND';
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Update user profile
   * PUT /api/users/profile
   */
  async updateUserProfile(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;

      // Validate that there are updates to make
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_UPDATES_PROVIDED',
            message: 'No updates provided',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const updatedUser = await this.userService.updateUserProfile(userId, updates);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      let statusCode = 500;
      let errorCode = 'PROFILE_UPDATE_FAILED';

      if (error.message.includes('User not found')) {
        statusCode = 404;
        errorCode = 'USER_NOT_FOUND';
      } else if (error.message.includes('Email is already in use')) {
        statusCode = 409;
        errorCode = 'EMAIL_ALREADY_EXISTS';
      } else if (error.message.includes('validation') ||
                 error.message.includes('must be') ||
                 error.message.includes('Cannot update') ||
                 error.message.includes('No valid updates')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Delete user account
   * DELETE /api/users/profile
   */
  async deleteUser(req, res) {
    try {
      const userId = req.user.id;
      const deletedUser = await this.userService.deleteUser(userId);

      res.status(200).json({
        success: true,
        message: 'User account deleted successfully',
        data: {
          deletedUser,
        },
      });
    } catch (error) {
      let statusCode = 500;
      let errorCode = 'USER_DELETION_FAILED';

      if (error.message.includes('User not found')) {
        statusCode = 404;
        errorCode = 'USER_NOT_FOUND';
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get list of users (admin functionality)
   * GET /api/users
   */
  async getUsers(req, res) {
    try {
      // Extract query parameters
      const {
        search,
        provider,
        isEmailVerified,
        page = 1,
        limit = 10,
      } = req.query;

      // Parse and validate pagination parameters
      const parsedPage = parseInt(page, 10);
      const parsedLimit = parseInt(limit, 10);

      if (isNaN(parsedPage) || parsedPage < 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAGE',
            message: 'Page must be a positive integer',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_LIMIT',
            message: 'Limit must be between 1 and 100',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Parse boolean parameters
      let parsedIsEmailVerified;
      if (isEmailVerified !== undefined) {
        if (isEmailVerified === 'true') {
          parsedIsEmailVerified = true;
        } else if (isEmailVerified === 'false') {
          parsedIsEmailVerified = false;
        } else {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_EMAIL_VERIFIED_FILTER',
              message: 'isEmailVerified must be "true" or "false"',
            },
            timestamp: new Date().toISOString(),
            path: req.path,
          });
        }
      }

      const filters = {
        search,
        provider,
        isEmailVerified: parsedIsEmailVerified,
        page: parsedPage,
        limit: parsedLimit,
      };

      const result = await this.userService.getUsers(filters);

      res.status(200).json({
        success: true,
        data: {
          users: result.users,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      let statusCode = 500;
      let errorCode = 'USERS_FETCH_FAILED';

      if (error.message.includes('Page must be') ||
          error.message.includes('Limit must be') ||
          error.message.includes('Provider must be')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get user statistics (admin functionality)
   * GET /api/users/stats
   */
  async getUserStats(req, res) {
    try {
      const stats = await this.userService.getUserStats();

      res.status(200).json({
        success: true,
        data: {
          stats,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}

module.exports = UserController;
