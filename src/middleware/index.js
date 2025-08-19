/**
 * Middleware Index
 * Central export point for all middleware modules
 */

const auth = require('./auth');
const rateLimiter = require('./rateLimiter');
const cors = require('./cors');
const security = require('./security');
const validation = require('./validation');
const errorHandler = require('./errorHandler');

module.exports = {
  // Authentication middleware
  ...auth,

  // Rate limiting middleware
  ...rateLimiter,

  // CORS middleware
  ...cors,

  // Security middleware
  ...security,

  // Validation middleware
  ...validation,

  // Error handling middleware
  ...errorHandler,
};
