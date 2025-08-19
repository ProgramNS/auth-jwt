const passport = require('passport');
const OAuthService = require('../services/oauthService');

/**
 * OAuth Controller
 * Handles HTTP requests for OAuth authentication endpoints
 */
class OAuthController {
  /**
   * Initiate Google OAuth authentication
   * GET /api/auth/google
   */
  static initiateGoogleAuth(req, res, next) {
    // Store the redirect URL in session if provided
    if (req.query.redirect) {
      req.session.redirectUrl = req.query.redirect;
    }

    passport.authenticate('google', {
      scope: ['profile', 'email'],
    })(req, res, next);
  }

  /**
   * Handle Google OAuth callback
   * GET /api/auth/google/callback
   */
  static async handleGoogleCallback(req, res, next) {
    passport.authenticate('google', { session: false }, async (err, user, info) => {
      try {
        if (err) {
          console.error('OAuth authentication error:', err);
          return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/error?message=authentication_failed`);
        }

        if (!user) {
          console.error('OAuth authentication failed:', info);
          return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/error?message=user_not_found`);
        }

        // Generate tokens using OAuth service
        const authResult = await OAuthService.handleOAuthAuthentication(
          {
            id: user.providerId,
            emails: [{ value: user.email }],
            name: {
              givenName: user.firstName,
              familyName: user.lastName,
            },
            photos: user.profilePicture ? [{ value: user.profilePicture }] : [],
            displayName: `${user.firstName} ${user.lastName}`,
          },
          'google',
        );

        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', authResult.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Get redirect URL from session or use default
        const redirectUrl = req.session?.redirectUrl || `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/success`;

        // Clear redirect URL from session
        if (req.session?.redirectUrl) {
          delete req.session.redirectUrl;
        }

        // Redirect to client with access token
        const redirectUrlWithToken = `${redirectUrl}?token=${authResult.accessToken}`;
        res.redirect(redirectUrlWithToken);

      } catch (error) {
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/error?message=callback_failed`);
      }
    })(req, res, next);
  }

  /**
   * Handle OAuth authentication errors
   * GET /api/auth/oauth/error
   */
  static handleOAuthError(req, res) {
    const { error, error_description } = req.query;

    let errorMessage = 'Authentication failed';
    let errorCode = 'OAUTH_ERROR';

    if (error === 'access_denied') {
      errorMessage = 'Access denied by user';
      errorCode = 'ACCESS_DENIED';
    } else if (error_description) {
      errorMessage = error_description;
    }

    res.status(400).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: {
          error,
          error_description,
        },
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }

  /**
   * Get OAuth connection status for current user
   * GET /api/auth/oauth/status
   */
  static async getOAuthStatus(req, res) {
    try {
      // const userId = req.user.id; // Will be used for database queries in future

      // This would typically fetch from database
      // For now, we'll return basic info from the token
      res.status(200).json({
        success: true,
        data: {
          isConnected: req.user.provider !== 'local',
          provider: req.user.provider || 'local',
          connectedAt: req.user.lastLoginAt,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'OAUTH_STATUS_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Unlink OAuth account (convert back to local)
   * POST /api/auth/oauth/unlink
   */
  static async unlinkOAuthAccount(req, res) {
    try {
      const userId = req.user.id;

      const updatedUser = await OAuthService.unlinkOAuthAccount(userId);

      res.status(200).json({
        success: true,
        message: 'OAuth account unlinked successfully',
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      let statusCode = 500;
      let errorCode = 'OAUTH_UNLINK_FAILED';

      if (error.message.includes('User not found')) {
        statusCode = 404;
        errorCode = 'USER_NOT_FOUND';
      } else if (error.message.includes('Cannot unlink') ||
                 error.message.includes('password first')) {
        statusCode = 400;
        errorCode = 'UNLINK_NOT_ALLOWED';
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
   * Link local account with OAuth provider
   * POST /api/auth/oauth/link
   */
  static linkOAuthAccount(req, res, next) {
    // Store current user ID in session for linking
    req.session.linkUserId = req.user.id;

    // Initiate OAuth flow for linking
    passport.authenticate('google', {
      scope: ['profile', 'email'],
    })(req, res, next);
  }
}

module.exports = OAuthController;
