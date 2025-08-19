/**
 * Error Handling Usage Examples
 * Demonstrates how to use the error handling system
 */

const express = require('express');
const { getMorganMiddleware, AppLogger } = require('../config/logger');
const {
  globalErrorHandler,
  notFoundHandler,
  asyncErrorHandler,
} = require('../middleware/errorHandler');
const {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
} = require('../utils/errors');

const app = express();

// Apply Morgan logging middleware
const morganMiddlewares = getMorganMiddleware();
morganMiddlewares.forEach(middleware => app.use(middleware));

// Example routes demonstrating different error types
app.get('/example/validation-error', (req, res, next) => {
  // Example of throwing a validation error
  const error = new ValidationError(
    'Invalid input data',
    'INVALID_INPUT',
    [
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password must be at least 8 characters' },
    ],
  );
  next(error);
});

app.get('/example/not-found-error', (req, res, next) => {
  // Example of throwing a not found error
  const error = new NotFoundError(
    'User not found',
    'USER_NOT_FOUND',
    { userId: req.query.id },
  );
  next(error);
});

app.get('/example/auth-error', (req, res, next) => {
  // Example of throwing an authentication error
  const error = new AuthenticationError(
    'Invalid token',
    'INVALID_TOKEN',
    { tokenType: 'access' },
  );
  next(error);
});

app.get('/example/async-error', asyncErrorHandler(async (req, res, _next) => {
  // Example of async error handling
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new AppError('Async operation failed', 500, 'ASYNC_ERROR'));
    }, 100);
  });

  res.json({ message: 'This will not be reached' });
}));

app.get('/example/generic-error', (_req, _res, _next) => {
  // Example of generic error that will be processed
  throw new Error('Something went wrong');
});

app.get('/example/success', (req, res) => {
  // Example of successful response
  AppLogger.info('Successful request processed', {
    endpoint: '/example/success',
    userId: 'user123',
  });

  res.json({
    success: true,
    message: 'Request processed successfully',
    timestamp: new Date().toISOString(),
  });
});

// Apply error handling middleware (order is important)
app.use(notFoundHandler);      // Handle 404 errors
app.use(globalErrorHandler);   // Handle all other errors

// Example of how to start the server with error handling
function startServer() {
  const PORT = process.env.PORT || 3000;

  const server = app.listen(PORT, () => {
    AppLogger.info(`Error handling example server started on port ${PORT}`);
    console.log('\nTry these endpoints to see error handling in action:');
    console.log(`  GET http://localhost:${PORT}/example/validation-error`);
    console.log(`  GET http://localhost:${PORT}/example/not-found-error`);
    console.log(`  GET http://localhost:${PORT}/example/auth-error`);
    console.log(`  GET http://localhost:${PORT}/example/async-error`);
    console.log(`  GET http://localhost:${PORT}/example/generic-error`);
    console.log(`  GET http://localhost:${PORT}/example/success`);
    console.log(`  GET http://localhost:${PORT}/nonexistent-route`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    AppLogger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      AppLogger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    AppLogger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      AppLogger.info('Server closed');
      process.exit(0);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    AppLogger.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    AppLogger.error('Unhandled Rejection at:', {
      promise,
      reason: reason?.message || reason,
    });
    process.exit(1);
  });
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
