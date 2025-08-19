/**
 * Error Response Formatting Utilities
 * Provides consistent error response formatting across the application
 */

const { AppError } = require('./errors');

/**
 * Format error response for API endpoints
 * @param {Error} error - The error to format
 * @param {string} path - Request path where error occurred
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(error, path = '') {
  const timestamp = new Date().toISOString();

  // Handle custom AppError instances
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      timestamp,
      path,
    };
  }

  // Handle Prisma errors
  if (error.code && error.code.startsWith('P')) {
    return formatPrismaError(error, path, timestamp);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return {
      success: false,
      error: {
        code: 'TOKEN_ERROR',
        message: error.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
        details: null,
      },
      timestamp,
      path,
    };
  }

  // Handle validation errors from express-validator or similar
  if (error.name === 'ValidationError' && error.errors) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors,
      },
      timestamp,
      path,
    };
  }

  // Handle bcrypt errors
  if (error.message && error.message.includes('bcrypt')) {
    return {
      success: false,
      error: {
        code: 'ENCRYPTION_ERROR',
        message: 'Password processing failed',
        details: null,
      },
      timestamp,
      path,
    };
  }

  // Handle generic errors (fallback)
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An internal server error occurred'
        : error.message,
      details: process.env.NODE_ENV === 'production' ? null : error.stack,
    },
    timestamp,
    path,
  };
}

/**
 * Format Prisma database errors
 * @param {Error} error - Prisma error
 * @param {string} path - Request path
 * @param {string} timestamp - Error timestamp
 * @returns {Object} Formatted error response
 */
function formatPrismaError(error, path, timestamp) {
  const errorMap = {
    P2002: {
      code: 'DUPLICATE_ENTRY',
      message: 'A record with this information already exists',
    },
    P2025: {
      code: 'RECORD_NOT_FOUND',
      message: 'The requested record was not found',
    },
    P2003: {
      code: 'FOREIGN_KEY_CONSTRAINT',
      message: 'Foreign key constraint failed',
    },
    P2014: {
      code: 'INVALID_ID',
      message: 'The provided ID is invalid',
    },
    P1001: {
      code: 'DATABASE_CONNECTION_ERROR',
      message: 'Cannot connect to database',
    },
    P1002: {
      code: 'DATABASE_TIMEOUT',
      message: 'Database connection timed out',
    },
  };

  const mappedError = errorMap[error.code] || {
    code: 'DATABASE_ERROR',
    message: 'A database error occurred',
  };

  return {
    success: false,
    error: {
      code: mappedError.code,
      message: mappedError.message,
      details: process.env.NODE_ENV === 'production' ? null : {
        prismaCode: error.code,
        meta: error.meta,
      },
    },
    timestamp,
    path,
  };
}

/**
 * Sanitize error message for production
 * Removes sensitive information from error messages
 * @param {string} message - Original error message
 * @returns {string} Sanitized message
 */
function sanitizeErrorMessage(message) {
  if (process.env.NODE_ENV === 'production') {
    // Remove file paths, line numbers, and other sensitive info
    return message
      .replace(/\/[^\s)]+/g, '[path]') // Remove file paths
      .replace(/at .+:\d+:\d+/g, '[location]') // Remove stack trace locations
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]'); // Remove IP addresses
  }
  return message;
}

/**
 * Check if error should be logged
 * @param {Error} error - Error to check
 * @returns {boolean} Whether error should be logged
 */
function shouldLogError(error) {
  // Don't log client errors (4xx) in production
  if (process.env.NODE_ENV === 'production' && error instanceof AppError) {
    return error.statusCode >= 500;
  }

  // Log all errors in development
  return true;
}

/**
 * Get log level for error
 * @param {Error} error - Error to check
 * @returns {string} Log level (error, warn, info)
 */
function getErrorLogLevel(error) {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) return 'error';
    if (error.statusCode >= 400) return 'warn';
    return 'info';
  }
  return 'error';
}

module.exports = {
  formatErrorResponse,
  formatPrismaError,
  sanitizeErrorMessage,
  shouldLogError,
  getErrorLogLevel,
};
