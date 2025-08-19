/**
 * Example Usage of Security Middleware
 * This file demonstrates how to use all the security middleware components
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

// Import all middleware
const {
  // Authentication
  authenticateToken,
  optionalAuth,

  // Rate Limiting
  generalLimiter,
  authLimiter,
  createAccountLimiter,
  passwordResetLimiter,

  // CORS
  getCorsMiddleware,
  corsErrorHandler,

  // Security
  getSecurityMiddleware,
  customSecurityHeaders,

  // Validation
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  sanitizeRequestBody,
  validateContentType,
} = require('./index');

/**
 * Example Express App Setup with Security Middleware
 */
function createSecureApp() {
  const app = express();

  // 1. Basic Express middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // 2. Logging middleware
  app.use(morgan('combined'));

  // 3. Security headers (should be early in middleware stack)
  app.use(getSecurityMiddleware());
  app.use(customSecurityHeaders);

  // 4. CORS configuration
  app.use(getCorsMiddleware());

  // 5. General rate limiting (applies to all routes)
  app.use('/api/', generalLimiter);

  // 6. Request sanitization
  app.use(sanitizeRequestBody);

  // 7. Content type validation for API routes
  app.use('/api/', validateContentType);

  // Example Routes with Specific Middleware

  // Public routes (no authentication required)
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // Authentication routes with strict rate limiting
  app.post('/api/auth/register',
    createAccountLimiter,     // Rate limiting
    validateRegistration,     // Input validation
    (req, res) => {
      res.json({
        success: true,
        message: 'Registration endpoint (implementation needed)',
        data: req.body,
      });
    },
  );

  app.post('/api/auth/login',
    authLimiter,             // Rate limiting
    validateLogin,           // Input validation
    (req, res) => {
      res.json({
        success: true,
        message: 'Login endpoint (implementation needed)',
        data: { email: req.body.email },
      });
    },
  );

  app.post('/api/auth/refresh',
    authLimiter,             // Rate limiting
    (req, res) => {
      res.json({
        success: true,
        message: 'Token refresh endpoint (implementation needed)',
      });
    },
  );

  app.post('/api/auth/logout',
    authenticateToken,       // Requires authentication
    (req, res) => {
      res.json({
        success: true,
        message: 'Logout endpoint (implementation needed)',
        user: req.user,
      });
    },
  );

  // Password reset with very strict rate limiting
  app.post('/api/auth/forgot-password',
    passwordResetLimiter,    // Very strict rate limiting
    validateContentType,     // Ensure JSON
    (req, res) => {
      res.json({
        success: true,
        message: 'Password reset endpoint (implementation needed)',
      });
    },
  );

  // Protected user routes
  app.get('/api/users/profile',
    authenticateToken,       // Requires authentication
    (req, res) => {
      res.json({
        success: true,
        message: 'User profile endpoint (implementation needed)',
        user: req.user,
      });
    },
  );

  app.put('/api/users/profile',
    authenticateToken,       // Requires authentication
    validateProfileUpdate,   // Input validation
    (req, res) => {
      res.json({
        success: true,
        message: 'Profile update endpoint (implementation needed)',
        user: req.user,
        updates: req.body,
      });
    },
  );

  app.put('/api/users/change-password',
    authenticateToken,       // Requires authentication
    validatePasswordChange,  // Input validation
    (req, res) => {
      res.json({
        success: true,
        message: 'Password change endpoint (implementation needed)',
        user: req.user,
      });
    },
  );

  // Optional authentication route (user info if logged in, but works without)
  app.get('/api/public/info',
    optionalAuth,            // Optional authentication
    (req, res) => {
      res.json({
        success: true,
        message: 'Public info endpoint',
        isAuthenticated: !!req.user,
        user: req.user || null,
      });
    },
  );

  // CORS error handler
  app.use(corsErrorHandler);

  // Global error handler (should be last)
  app.use((err, req, res, _next) => {

    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'production'
          ? 'An internal server error occurred'
          : err.message,
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  });

  return app;
}

/**
 * Example of middleware usage patterns
 */
const middlewarePatterns = {
  // For public API endpoints
  public: [
    generalLimiter,
    sanitizeRequestBody,
  ],

  // For authentication endpoints
  auth: [
    authLimiter,
    validateContentType,
    sanitizeRequestBody,
  ],

  // For protected user endpoints
  protected: [
    authenticateToken,
    sanitizeRequestBody,
  ],

  // For admin endpoints (future use)
  admin: [
    authenticateToken,
    // Add role-based authorization middleware here
    sanitizeRequestBody,
  ],

  // For high-security endpoints (password reset, etc.)
  highSecurity: [
    passwordResetLimiter,
    validateContentType,
    sanitizeRequestBody,
  ],
};

module.exports = {
  createSecureApp,
  middlewarePatterns,
};

// Example usage:
// const { createSecureApp } = require('./middleware/example');
// const app = createSecureApp();
// app.listen(3000, () => console.log('Secure server running on port 3000'));
