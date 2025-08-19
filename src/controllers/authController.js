const AuthService = require('../services/authService');

/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */
class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  static async register(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'Email, password, firstName, and lastName are required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const result = await AuthService.register({
        email,
        password,
        firstName,
        lastName,
      });

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return response without refresh token in body (stored in httpOnly cookie)
      const { refreshToken: refreshTokenRegister, ...tokensWithoutRefresh } = result.tokens;
      void refreshTokenRegister; // Mark as used (stored in cookie)

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
          tokens: tokensWithoutRefresh,
        },
      });
    } catch (error) {
      let statusCode = 500;
      let errorCode = 'REGISTRATION_FAILED';

      if (error.message.includes('already exists')) {
        statusCode = 409;
        errorCode = 'USER_EXISTS';
      } else if (
        error.message.includes('validation failed') ||
        error.message.includes('Invalid email') ||
        error.message.includes('required')
      ) {
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
   * Login user
   * POST /api/auth/login
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Email and password are required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const result = await AuthService.login({ email, password });

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return response without refresh token in body (stored in httpOnly cookie)
      const { refreshToken: refreshTokenLogin, ...tokensWithoutRefresh } = result.tokens;
      void refreshTokenLogin; // Mark as used (stored in cookie)

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
          tokens: tokensWithoutRefresh,
        },
      });
    } catch (error) {
      let statusCode = 500;
      let errorCode = 'LOGIN_FAILED';

      if (
        error.message.includes('Invalid email') ||
        error.message.includes('OAuth authentication')
      ) {
        statusCode = 401;
        errorCode = 'INVALID_CREDENTIALS';
      } else if (error.message.includes('required')) {
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
   * Refresh access token
   * POST /api/auth/refresh
   */
  static async refreshToken(req, res) {
    try {
      // Get refresh token from httpOnly cookie
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const result = await AuthService.refreshToken(refreshToken);

      // Set new refresh token as httpOnly cookie
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return response without refresh token in body (stored in httpOnly cookie)
      const { refreshToken: refreshTokenRefresh, ...tokensWithoutRefresh } = result.tokens;
      void refreshTokenRefresh; // Mark as used (stored in cookie)

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          tokens: tokensWithoutRefresh,
        },
      });
    } catch (error) {
      let statusCode = 500;
      let errorCode = 'TOKEN_REFRESH_FAILED';

      if (
        error.message.includes('Invalid refresh token') ||
        error.message.includes('revoked') ||
        error.message.includes('expired')
      ) {
        statusCode = 401;
        errorCode = 'INVALID_REFRESH_TOKEN';
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
   * Logout user
   * POST /api/auth/logout
   */
  static async logout(req, res) {
    try {
      // Get refresh token from httpOnly cookie
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const result = await AuthService.logout(refreshToken);

      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      let statusCode = 500;
      let errorCode = 'LOGOUT_FAILED';

      if (
        error.message.includes('Invalid refresh token') ||
        error.message.includes('already revoked')
      ) {
        statusCode = 400;
        errorCode = 'INVALID_REFRESH_TOKEN';
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
}

module.exports = AuthController;
