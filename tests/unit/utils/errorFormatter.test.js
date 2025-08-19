/**
 * Unit tests for error response formatting utilities
 */

const {
  formatErrorResponse,
  formatPrismaError,
  sanitizeErrorMessage,
  shouldLogError,
  getErrorLogLevel,
} = require('../../../src/utils/errorFormatter');

const {
  AppError,
  // AuthenticationError, // Currently unused
  // ValidationError, // Currently unused
} = require('../../../src/utils/errors');

describe('Error Formatter Utilities', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('formatErrorResponse', () => {
    it('should format AppError correctly', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'email' });
      const result = formatErrorResponse(error, '/api/test');

      expect(result).toEqual({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: { field: 'email' },
        },
        timestamp: expect.any(String),
        path: '/api/test',
      });

      // Verify timestamp is valid ISO string
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    it('should format JWT TokenExpiredError', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      const result = formatErrorResponse(error, '/api/auth');

      expect(result).toEqual({
        success: false,
        error: {
          code: 'TOKEN_ERROR',
          message: 'Token has expired',
          details: null,
        },
        timestamp: expect.any(String),
        path: '/api/auth',
      });
    });

    it('should format JWT JsonWebTokenError', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      const result = formatErrorResponse(error, '/api/auth');

      expect(result.error.code).toBe('TOKEN_ERROR');
      expect(result.error.message).toBe('Invalid token');
    });

    it('should format validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ];

      const result = formatErrorResponse(error, '/api/register');

      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Validation failed');
      expect(result.error.details).toEqual(error.errors);
    });

    it('should format bcrypt errors', () => {
      const error = new Error('bcrypt operation failed');

      const result = formatErrorResponse(error, '/api/auth');

      expect(result.error.code).toBe('ENCRYPTION_ERROR');
      expect(result.error.message).toBe('Password processing failed');
      expect(result.error.details).toBeNull();
    });

    it('should format generic errors in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Generic error');
      error.stack = 'Error stack trace';

      const result = formatErrorResponse(error, '/api/test');

      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.message).toBe('Generic error');
      expect(result.error.details).toBe('Error stack trace');
    });

    it('should format generic errors in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Generic error');
      error.stack = 'Error stack trace';

      const result = formatErrorResponse(error, '/api/test');

      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.message).toBe('An internal server error occurred');
      expect(result.error.details).toBeNull();
    });

    it('should handle Prisma errors', () => {
      const error = new Error('Prisma error');
      error.code = 'P2002';
      error.meta = { target: ['email'] };

      const result = formatErrorResponse(error, '/api/users');

      expect(result.error.code).toBe('DUPLICATE_ENTRY');
      expect(result.error.message).toBe('A record with this information already exists');
    });
  });

  describe('formatPrismaError', () => {
    it('should format P2002 (duplicate entry) error', () => {
      process.env.NODE_ENV = 'production';
      const error = { code: 'P2002', meta: { target: ['email'] } };
      const result = formatPrismaError(error, '/api/users', '2023-01-01T00:00:00Z');

      expect(result).toEqual({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this information already exists',
          details: null,
        },
        timestamp: '2023-01-01T00:00:00Z',
        path: '/api/users',
      });
    });

    it('should format P2025 (record not found) error', () => {
      const error = { code: 'P2025' };
      const result = formatPrismaError(error, '/api/users/123', '2023-01-01T00:00:00Z');

      expect(result.error.code).toBe('RECORD_NOT_FOUND');
      expect(result.error.message).toBe('The requested record was not found');
    });

    it('should format unknown Prisma error', () => {
      const error = { code: 'P9999', meta: { some: 'data' } };
      const result = formatPrismaError(error, '/api/test', '2023-01-01T00:00:00Z');

      expect(result.error.code).toBe('DATABASE_ERROR');
      expect(result.error.message).toBe('A database error occurred');
    });

    it('should include debug details in development', () => {
      process.env.NODE_ENV = 'development';
      const error = { code: 'P2002', meta: { target: ['email'] } };
      const result = formatPrismaError(error, '/api/users', '2023-01-01T00:00:00Z');

      expect(result.error.details).toEqual({
        prismaCode: 'P2002',
        meta: { target: ['email'] },
      });
    });

    it('should not include debug details in production', () => {
      process.env.NODE_ENV = 'production';
      const error = { code: 'P2002', meta: { target: ['email'] } };
      const result = formatPrismaError(error, '/api/users', '2023-01-01T00:00:00Z');

      expect(result.error.details).toBeNull();
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should not sanitize in development', () => {
      process.env.NODE_ENV = 'development';
      const message = 'Error at /home/user/app.js:123:45 from 192.168.1.1';
      const result = sanitizeErrorMessage(message);

      expect(result).toBe(message);
    });

    it('should sanitize file paths in production', () => {
      process.env.NODE_ENV = 'production';
      const message = 'Error at /home/user/app.js:123:45';
      const result = sanitizeErrorMessage(message);

      expect(result).toBe('Error at [path]');
    });

    it('should sanitize stack trace locations in production', () => {
      process.env.NODE_ENV = 'production';
      const message = 'Error at Object.method (/path/file.js:10:5)';
      const result = sanitizeErrorMessage(message);

      expect(result).toBe('Error at Object.method ([path])');
    });

    it('should sanitize IP addresses in production', () => {
      process.env.NODE_ENV = 'production';
      const message = 'Request from 192.168.1.100 failed';
      const result = sanitizeErrorMessage(message);

      expect(result).toBe('Request from [ip] failed');
    });
  });

  describe('shouldLogError', () => {
    it('should log all errors in development', () => {
      process.env.NODE_ENV = 'development';

      const clientError = new AppError('Client error', 400);
      const serverError = new AppError('Server error', 500);
      const genericError = new Error('Generic error');

      expect(shouldLogError(clientError)).toBe(true);
      expect(shouldLogError(serverError)).toBe(true);
      expect(shouldLogError(genericError)).toBe(true);
    });

    it('should only log server errors in production for AppErrors', () => {
      process.env.NODE_ENV = 'production';

      const clientError = new AppError('Client error', 400);
      const serverError = new AppError('Server error', 500);

      expect(shouldLogError(clientError)).toBe(false);
      expect(shouldLogError(serverError)).toBe(true);
    });

    it('should log all non-AppErrors in production', () => {
      process.env.NODE_ENV = 'production';

      const genericError = new Error('Generic error');

      expect(shouldLogError(genericError)).toBe(true);
    });
  });

  describe('getErrorLogLevel', () => {
    it('should return "error" for 5xx status codes', () => {
      const error = new AppError('Server error', 500);
      expect(getErrorLogLevel(error)).toBe('error');
    });

    it('should return "warn" for 4xx status codes', () => {
      const error = new AppError('Client error', 400);
      expect(getErrorLogLevel(error)).toBe('warn');
    });

    it('should return "info" for other status codes', () => {
      const error = new AppError('Redirect', 301);
      expect(getErrorLogLevel(error)).toBe('info');
    });

    it('should return "error" for non-AppError instances', () => {
      const error = new Error('Generic error');
      expect(getErrorLogLevel(error)).toBe('error');
    });
  });
});
