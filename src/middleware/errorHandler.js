/**
 * Global Error Handling Middleware
 * Centralized error processing for the Express application
 */

const { AppError } = require('../utils/errors');
const { formatErrorResponse, shouldLogError, getErrorLogLevel } = require('../utils/errorFormatter');
const { AppLogger } = require('../config/logger');

/**
 * Global error handling middleware
 * This should be the last middleware in the Express app
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function globalErrorHandler(err, req, res, next) {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Log error if needed
  if (shouldLogError(err)) {
    const logLevel = getErrorLogLevel(err);
    const logMeta = {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      requestId: req.id,
      body: req.body,
      params: req.params,
      query: req.query,
    };

    AppLogger[logLevel](`Error in ${req.method} ${req.url}`, logMeta);
  }

  // Format error response
  const errorResponse = formatErrorResponse(err, req.path);

  // Determine status code
  let statusCode = 500;
  if (err instanceof AppError) {
    statusCode = err.statusCode;
  } else if (err.statusCode) {
    statusCode = err.statusCode;
  } else if (err.status) {
    statusCode = err.status;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 * Handles requests to non-existent routes
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(
    `Route ${req.method} ${req.path} not found`,
    404,
    'ROUTE_NOT_FOUND',
    {
      method: req.method,
      path: req.path,
      availableRoutes: req.app._router?.stack
        ?.filter(layer => layer.route)
        ?.map(layer => ({
          method: Object.keys(layer.route.methods)[0]?.toUpperCase(),
          path: layer.route.path,
        })) || [],
    },
  );

  next(error);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass them to error middleware
 *
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error handler
 * Handles validation errors from express-validator or similar libraries
 *
 * @param {Array} errors - Array of validation errors
 * @returns {AppError} Formatted validation error
 */
function handleValidationErrors(errors) {
  const formattedErrors = errors.map(error => ({
    field: error.param || error.path,
    message: error.msg || error.message,
    value: error.value,
    location: error.location,
  }));

  return new AppError(
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    formattedErrors,
  );
}

/**
 * Database error handler
 * Converts database errors to appropriate AppError instances
 *
 * @param {Error} error - Database error
 * @returns {AppError} Formatted database error
 */
function handleDatabaseError(error) {
  // Handle Prisma errors
  if (error.code && error.code.startsWith('P')) {
    const errorMap = {
      P2002: () => new AppError('Duplicate entry', 409, 'DUPLICATE_ENTRY', {
        field: error.meta?.target,
      }),
      P2025: () => new AppError('Record not found', 404, 'RECORD_NOT_FOUND'),
      P2003: () => new AppError('Foreign key constraint failed', 400, 'FOREIGN_KEY_CONSTRAINT'),
      P2014: () => new AppError('Invalid ID', 400, 'INVALID_ID'),
      P1001: () => new AppError('Database connection failed', 503, 'DATABASE_CONNECTION_ERROR'),
      P1002: () => new AppError('Database timeout', 503, 'DATABASE_TIMEOUT'),
    };

    const errorHandler = errorMap[error.code];
    if (errorHandler) {
      return errorHandler();
    }
  }

  // Generic database error
  return new AppError(
    'Database operation failed',
    500,
    'DATABASE_ERROR',
    process.env.NODE_ENV === 'production' ? null : { originalError: error.message },
  );
}

/**
 * JWT error handler
 * Converts JWT errors to appropriate AppError instances
 *
 * @param {Error} error - JWT error
 * @returns {AppError} Formatted JWT error
 */
function handleJWTError(error) {
  if (error.name === 'TokenExpiredError') {
    return new AppError('Token has expired', 401, 'TOKEN_EXPIRED');
  }

  if (error.name === 'JsonWebTokenError') {
    return new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  if (error.name === 'NotBeforeError') {
    return new AppError('Token not active', 401, 'TOKEN_NOT_ACTIVE');
  }

  return new AppError('Token error', 401, 'TOKEN_ERROR');
}

/**
 * Process unhandled errors
 * Converts unknown errors to AppError instances
 *
 * @param {Error} error - Unknown error
 * @returns {AppError} Processed error
 */
function processError(error) {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // JWT errors
  if (error.name && error.name.includes('Token')) {
    return handleJWTError(error);
  }

  // Database errors
  if (error.code && (error.code.startsWith('P') || error.code === 'ER_')) {
    return handleDatabaseError(error);
  }

  // Validation errors
  if (error.name === 'ValidationError' && error.errors) {
    return handleValidationErrors(error.errors);
  }

  // Generic error
  return new AppError(
    process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : error.message,
    500,
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'production' ? null : { stack: error.stack },
  );
}

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  asyncErrorHandler,
  handleValidationErrors,
  handleDatabaseError,
  handleJWTError,
  processError,
};
