/**
 * Unit tests for error handling middleware
 */

const {
  globalErrorHandler,
  notFoundHandler,
  asyncErrorHandler,
  handleValidationErrors,
  handleDatabaseError,
  handleJWTError,
  processError,
} = require('../../../src/middleware/errorHandler');

const {
  AppError,
  // AuthenticationError, // Currently unused
  // ValidationError, // Currently unused
} = require('../../../src/utils/errors');

// Mock the logger
jest.mock('../../../src/config/logger', () => ({
  AppLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      url: '/api/test',
      method: 'GET',
      path: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      body: {},
      params: {},
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    };

    next = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('globalErrorHandler', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'email' });

      globalErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: { field: 'email' },
        },
        timestamp: expect.any(String),
        path: '/api/test',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle generic errors with status code', () => {
      const error = new Error('Generic error');
      error.statusCode = 422;

      globalErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
        }),
      }));
    });

    it('should handle generic errors with status property', () => {
      const error = new Error('Generic error');
      error.status = 418;

      globalErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(418);
    });

    it('should default to 500 status code', () => {
      const error = new Error('Generic error');

      globalErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should delegate to Express if headers already sent', () => {
      res.headersSent = true;
      const error = new Error('Test error');

      globalErrorHandler(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should include user context in logs when available', () => {
      req.user = { id: 'user123' };
      req.id = 'req123';
      const error = new AppError('Test error', 500);

      globalErrorHandler(error, req, res, next);

      // Verify logging was called with user context
      const { AppLogger } = require('../../../src/config/logger');
      expect(AppLogger.error).toHaveBeenCalledWith(
        'Error in GET /api/test',
        expect.objectContaining({
          userId: 'user123',
          requestId: 'req123',
        }),
      );
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error for non-existent routes', () => {
      req.method = 'POST';
      req.path = '/api/nonexistent';
      req.app = {};

      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route POST /api/nonexistent not found',
          statusCode: 404,
          code: 'ROUTE_NOT_FOUND',
        }),
      );
    });

    it('should include available routes in error details', () => {
      req.app = {
        _router: {
          stack: [
            {
              route: {
                path: '/api/users',
                methods: { get: true },
              },
            },
            {
              route: {
                path: '/api/auth',
                methods: { post: true },
              },
            },
          ],
        },
      };

      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            availableRoutes: [
              { method: 'GET', path: '/api/users' },
              { method: 'POST', path: '/api/auth' },
            ],
          }),
        }),
      );
    });

    it('should handle missing router stack gracefully', () => {
      req.app = {};

      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            availableRoutes: [],
          }),
        }),
      );
    });
  });

  describe('asyncErrorHandler', () => {
    it('should handle successful async functions', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncErrorHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch and pass async errors to next', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncErrorHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous functions that return promises', async () => {
      const syncFn = (_req, _res, _next) => Promise.resolve('success');
      const wrappedFn = asyncErrorHandler(syncFn);

      await wrappedFn(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('handleValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const errors = [
        {
          param: 'email',
          msg: 'Invalid email format',
          value: 'invalid-email',
          location: 'body',
        },
        {
          path: 'password',
          message: 'Password too short',
          value: '123',
        },
      ];

      const result = handleValidationErrors(errors);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Validation failed');
      expect(result.statusCode).toBe(400);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.details).toEqual([
        {
          field: 'email',
          message: 'Invalid email format',
          value: 'invalid-email',
          location: 'body',
        },
        {
          field: 'password',
          message: 'Password too short',
          value: '123',
          location: undefined,
        },
      ]);
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle P2002 (duplicate entry) error', () => {
      const error = {
        code: 'P2002',
        meta: { target: ['email'] },
      };

      const result = handleDatabaseError(error);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Duplicate entry');
      expect(result.statusCode).toBe(409);
      expect(result.code).toBe('DUPLICATE_ENTRY');
      expect(result.details).toEqual({ field: ['email'] });
    });

    it('should handle P2025 (record not found) error', () => {
      const error = { code: 'P2025' };

      const result = handleDatabaseError(error);

      expect(result.message).toBe('Record not found');
      expect(result.statusCode).toBe(404);
      expect(result.code).toBe('RECORD_NOT_FOUND');
    });

    it('should handle unknown Prisma errors', () => {
      const error = { code: 'P9999', message: 'Unknown error' };

      const result = handleDatabaseError(error);

      expect(result.message).toBe('Database operation failed');
      expect(result.statusCode).toBe(500);
      expect(result.code).toBe('DATABASE_ERROR');
    });

    it('should handle non-Prisma database errors', () => {
      const error = { message: 'Connection failed' };

      const result = handleDatabaseError(error);

      expect(result.message).toBe('Database operation failed');
      expect(result.statusCode).toBe(500);
      expect(result.code).toBe('DATABASE_ERROR');
    });
  });

  describe('handleJWTError', () => {
    it('should handle TokenExpiredError', () => {
      const error = { name: 'TokenExpiredError' };

      const result = handleJWTError(error);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Token has expired');
      expect(result.statusCode).toBe(401);
      expect(result.code).toBe('TOKEN_EXPIRED');
    });

    it('should handle JsonWebTokenError', () => {
      const error = { name: 'JsonWebTokenError' };

      const result = handleJWTError(error);

      expect(result.message).toBe('Invalid token');
      expect(result.code).toBe('INVALID_TOKEN');
    });

    it('should handle NotBeforeError', () => {
      const error = { name: 'NotBeforeError' };

      const result = handleJWTError(error);

      expect(result.message).toBe('Token not active');
      expect(result.code).toBe('TOKEN_NOT_ACTIVE');
    });

    it('should handle unknown JWT errors', () => {
      const error = { name: 'UnknownTokenError' };

      const result = handleJWTError(error);

      expect(result.message).toBe('Token error');
      expect(result.code).toBe('TOKEN_ERROR');
    });
  });

  describe('processError', () => {
    it('should return AppError as-is', () => {
      const error = new AppError('Test error');

      const result = processError(error);

      expect(result).toBe(error);
    });

    it('should process JWT errors', () => {
      const error = { name: 'TokenExpiredError' };

      const result = processError(error);

      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('TOKEN_EXPIRED');
    });

    it('should process Prisma errors', () => {
      const error = { code: 'P2002' };

      const result = processError(error);

      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('DUPLICATE_ENTRY');
    });

    it('should process validation errors', () => {
      const error = {
        name: 'ValidationError',
        errors: [{ param: 'email', msg: 'Invalid' }],
      };

      const result = processError(error);

      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should process generic errors', () => {
      const error = new Error('Generic error');

      const result = processError(error);

      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('INTERNAL_ERROR');
    });
  });
});
