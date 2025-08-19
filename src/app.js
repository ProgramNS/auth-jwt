/**
 * Express Application Configuration
 * Main application setup with middleware and routes
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const passport = require('passport');

// Import middleware
const { getMorganMiddleware } = require('./config/logger');
const { getSecurityMiddleware, customSecurityHeaders } = require('./middleware/security');
const { getCorsMiddleware, corsErrorHandler } = require('./middleware/cors');
const { generalLimiter } = require('./middleware/rateLimiter');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

// Import passport configuration
require('./config/passport');

/**
 * Create Express application
 */
function createApp() {
  const app = express();

  // Trust proxy for accurate IP addresses (important for rate limiting)
  app.set('trust proxy', 1);

  // Security middleware (should be first)
  app.use(getSecurityMiddleware());
  app.use(customSecurityHeaders);

  // CORS middleware
  app.use(getCorsMiddleware());

  // Request parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Passport middleware
  app.use(passport.initialize());

  // Logging middleware
  const morganMiddlewares = getMorganMiddleware();
  morganMiddlewares.forEach(middleware => app.use(middleware));

  // Rate limiting middleware (after logging)
  app.use('/api/', generalLimiter);

  // Health check endpoint (before rate limiting for monitoring)
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Auth & User Management API',
      version: '1.0.0',
      documentation: '/api/docs',
      health: '/health',
    });
  });

  // CORS error handler
  app.use(corsErrorHandler);

  // 404 handler for undefined routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(globalErrorHandler);

  return app;
}

module.exports = { createApp };
