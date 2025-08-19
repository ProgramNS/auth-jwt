# Error Handling System

This directory contains a comprehensive error handling system for the authentication and user management application. The system provides structured error handling with consistent response formats, logging, and proper HTTP status codes.

## Components

### 1. Custom Error Classes (`errors.js`)

The system includes several custom error classes that extend the base `AppError` class:

- **AppError**: Base error class with structured properties
- **AuthenticationError**: For authentication failures (401)
- **AuthorizationError**: For authorization failures (403)
- **ValidationError**: For input validation errors (400)
- **NotFoundError**: For resource not found errors (404)
- **ConflictError**: For resource conflicts like duplicate entries (409)
- **RateLimitError**: For rate limiting violations (429)
- **DatabaseError**: For database operation failures (500)
- **ExternalServiceError**: For external service failures (502)
- **TokenError**: For JWT token related errors (401)

#### Usage Example

```javascript
const { ValidationError, NotFoundError } = require('../utils/errors');

// Validation error with details
throw new ValidationError(
  'Invalid input data',
  'VALIDATION_FAILED',
  [
    { field: 'email', message: 'Email is required' },
    { field: 'password', message: 'Password too short' }
  ]
);

// Not found error
throw new NotFoundError(
  'User not found',
  'USER_NOT_FOUND',
  { userId: '123' }
);
```

### 2. Error Response Formatter (`errorFormatter.js`)

Provides utilities for formatting error responses consistently across the application:

- **formatErrorResponse**: Converts any error to a standardized API response
- **formatPrismaError**: Specifically handles Prisma database errors
- **sanitizeErrorMessage**: Removes sensitive information in production
- **shouldLogError**: Determines if an error should be logged
- **getErrorLogLevel**: Returns appropriate log level for an error

#### Usage Example

```javascript
const { formatErrorResponse } = require('../utils/errorFormatter');

const error = new ValidationError('Invalid data');
const response = formatErrorResponse(error, '/api/users');
// Returns:
// {
//   success: false,
//   error: {
//     code: 'VALIDATION_ERROR',
//     message: 'Invalid data',
//     details: null
//   },
//   timestamp: '2023-01-01T00:00:00.000Z',
//   path: '/api/users'
// }
```

### 3. Global Error Handler Middleware (`../middleware/errorHandler.js`)

Provides Express middleware for centralized error handling:

- **globalErrorHandler**: Main error handling middleware
- **notFoundHandler**: Handles 404 errors for non-existent routes
- **asyncErrorHandler**: Wraps async functions to catch errors
- **processError**: Converts unknown errors to AppError instances

#### Usage Example

```javascript
const { globalErrorHandler, notFoundHandler, asyncErrorHandler } = require('../middleware/errorHandler');

// Wrap async route handlers
app.get('/users/:id', asyncErrorHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  res.json(user);
}));

// Apply error handling middleware (order matters!)
app.use(notFoundHandler);      // Handle 404s first
app.use(globalErrorHandler);   // Handle all other errors
```

### 4. Logger Configuration (`../config/logger.js`)

Provides Morgan HTTP request logging and application logging:

- **getMorganMiddleware**: Returns configured Morgan middleware for different environments
- **AppLogger**: Application logger with different log levels
- **createLogStream**: Creates file streams for log output
- **ensureLogDirectory**: Ensures log directory exists

#### Usage Example

```javascript
const { getMorganMiddleware, AppLogger } = require('../config/logger');

// Apply Morgan middleware
const morganMiddlewares = getMorganMiddleware();
morganMiddlewares.forEach(middleware => app.use(middleware));

// Application logging
AppLogger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
AppLogger.error('Database connection failed', { error: error.message });
AppLogger.warn('Rate limit exceeded', { ip: '192.168.1.1', attempts: 5 });
AppLogger.debug('Debug information', { data: debugData });
```

## Environment-Specific Behavior

### Development
- Detailed error messages and stack traces
- Colorful console logging
- All errors are logged
- Debug information included in responses

### Production
- Sanitized error messages
- JSON structured logging to files
- Only server errors (5xx) are logged for AppErrors
- Sensitive information removed from logs and responses

## Log Files

In production, logs are written to the `logs/` directory:

- `access.log`: All HTTP requests
- `error.log`: HTTP errors (4xx, 5xx)
- `app.log`: Application events
- `app-error.log`: Application errors

## Integration with Express App

```javascript
const express = require('express');
const { getMorganMiddleware, AppLogger } = require('./config/logger');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Apply logging middleware
getMorganMiddleware().forEach(middleware => app.use(middleware));

// Your routes here...

// Error handling (must be last)
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Graceful error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  AppLogger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  AppLogger.error('Unhandled Rejection:', { promise, reason });
  process.exit(1);
});
```

## Testing

The error handling system includes comprehensive unit tests:

- `tests/unit/utils/errors.test.js`: Tests for custom error classes
- `tests/unit/utils/errorFormatter.test.js`: Tests for error formatting utilities
- `tests/unit/middleware/errorHandler.test.js`: Tests for error handling middleware
- `tests/unit/config/logger.test.js`: Tests for logger configuration

Run tests with:
```bash
npm test -- tests/unit/utils/errors.test.js
npm test -- tests/unit/utils/errorFormatter.test.js
npm test -- tests/unit/middleware/errorHandler.test.js
npm test -- tests/unit/config/logger.test.js
```

## Best Practices

1. **Use specific error classes**: Choose the most appropriate error class for your use case
2. **Include helpful details**: Add context information that helps with debugging
3. **Wrap async functions**: Always use `asyncErrorHandler` for async route handlers
4. **Log appropriately**: Use the right log level for different types of events
5. **Handle edge cases**: Consider database errors, external service failures, etc.
6. **Test error scenarios**: Write tests for both success and error cases
7. **Sanitize production errors**: Never expose sensitive information in production error responses

## Example Implementation

See `src/examples/errorHandlingExample.js` for a complete example of how to use the error handling system in an Express application.