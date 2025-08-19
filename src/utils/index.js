/**
 * Utility modules index
 * Provides centralized exports for all utility functions
 */

// Error classes
const {
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
} = require('./errors');

// Error formatting utilities
const {
  formatErrorResponse,
  formatPrismaError,
  sanitizeErrorMessage,
  shouldLogError,
  getErrorLogLevel,
} = require('./errorFormatter');

module.exports = {
  // Error classes
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

  // Error formatting utilities
  formatErrorResponse,
  formatPrismaError,
  sanitizeErrorMessage,
  shouldLogError,
  getErrorLogLevel,
};
