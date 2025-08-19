const cors = require('cors');

/**
 * CORS Configuration
 * Configures Cross-Origin Resource Sharing settings
 */

// Define allowed origins based on environment
const getAllowedOrigins = () => {
  const origins = [];

  // Always allow localhost for development
  if (process.env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:8080',
    );
  }

  // Add production origins from environment variable
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
    origins.push(...envOrigins);
  }

  return origins;
};

// CORS options configuration
const corsOptions = {
  origin (origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours - how long the browser should cache CORS preflight responses
};

/**
 * Development CORS Configuration
 * More permissive for development environment
 */
const devCorsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
};

/**
 * Get CORS middleware based on environment
 */
const getCorsMiddleware = () => {
  if (process.env.NODE_ENV === 'development') {
    return cors(devCorsOptions);
  }
  return cors(corsOptions);
};

/**
 * CORS Error Handler
 * Custom error handler for CORS-related errors
 */
const corsErrorHandler = (err, req, res, next) => {
  if (err.message === 'Not allowed by CORS policy') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CORS_ERROR',
        message: 'Cross-origin request blocked by CORS policy',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }
  next(err);
};

module.exports = {
  corsOptions,
  devCorsOptions,
  getCorsMiddleware,
  corsErrorHandler,
};
