/**
 * Custom Error Classes for different error types
 * Provides structured error handling with appropriate HTTP status codes
 */

/**
 * Base Application Error class
 * All custom errors should extend this class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Authentication related errors (401)
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', code = 'AUTH_FAILED', details = null) {
    super(message, 401, code, details);
  }
}

/**
 * Authorization related errors (403)
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied', code = 'ACCESS_DENIED', details = null) {
    super(message, 403, code, details);
  }
}

/**
 * Validation related errors (400)
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', code = 'VALIDATION_ERROR', details = null) {
    super(message, 400, code, details);
  }
}

/**
 * Resource not found errors (404)
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND', details = null) {
    super(message, 404, code, details);
  }
}

/**
 * Conflict errors (409) - e.g., duplicate email
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT', details = null) {
    super(message, 409, code, details);
  }
}

/**
 * Rate limiting errors (429)
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests', code = 'RATE_LIMIT_EXCEEDED', details = null) {
    super(message, 429, code, details);
  }
}

/**
 * Database related errors (500)
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', code = 'DATABASE_ERROR', details = null) {
    super(message, 500, code, details);
  }
}

/**
 * External service errors (502)
 */
class ExternalServiceError extends AppError {
  constructor(message = 'External service unavailable', code = 'EXTERNAL_SERVICE_ERROR', details = null) {
    super(message, 502, code, details);
  }
}

/**
 * Token related errors (401)
 */
class TokenError extends AuthenticationError {
  constructor(message = 'Invalid or expired token', code = 'TOKEN_ERROR', details = null) {
    super(message, code, details);
  }
}

module.exports = {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  TokenError,
};
