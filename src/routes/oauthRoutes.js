const express = require('express');
const OAuthController = require('../controllers/oauthController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * OAuth Routes
 * Routes for Google OAuth authentication
 */

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth authentication
 * @access  Public
 * @query   redirect - Optional redirect URL after successful authentication
 */
router.get('/google', OAuthController.initiateGoogleAuth);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Handle Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', OAuthController.handleGoogleCallback);

/**
 * @route   GET /api/auth/oauth/error
 * @desc    Handle OAuth authentication errors
 * @access  Public
 */
router.get('/oauth/error', OAuthController.handleOAuthError);

/**
 * @route   GET /api/auth/oauth/status
 * @desc    Get OAuth connection status for current user
 * @access  Private
 */
router.get('/oauth/status', authenticateToken, OAuthController.getOAuthStatus);

/**
 * @route   POST /api/auth/oauth/unlink
 * @desc    Unlink OAuth account (convert back to local)
 * @access  Private
 */
router.post('/oauth/unlink', authenticateToken, OAuthController.unlinkOAuthAccount);

/**
 * @route   POST /api/auth/oauth/link
 * @desc    Link local account with OAuth provider
 * @access  Private
 */
router.post('/oauth/link', authenticateToken, OAuthController.linkOAuthAccount);

module.exports = router;
