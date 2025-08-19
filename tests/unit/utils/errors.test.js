/**
 * Unit tests for custom error classes
 */

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
} = require('../../../src/utils/errors');

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('should create an AppError with default values', () => {
      const error = new AppError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.details).toBeNull();
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should create an AppError with custom values', () => {
      const details = { field: 'email' };
      const error = new AppError('Custom error', 400, 'CUSTOM_ERROR', details);

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.details).toEqual(details);
    });

    it('should convert to JSON format correctly', () => {
      const details = { field: 'email' };
      const error = new AppError('Test error', 400, 'TEST_ERROR', details);
      const json = error.toJSON();

      expect(json).toEqual({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details,
        },
        timestamp: expect.any(String),
      });

      // Verify timestamp is valid ISO string
      expect(new Date(json.timestamp)).toBeInstanceOf(Date);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create with default values', () => {
      const error = new AuthenticationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_FAILED');
      expect(error.details).toBeNull();
    });

    it('should create with custom values', () => {
      const error = new AuthenticationError('Invalid credentials', 'INVALID_CREDS', { attempts: 3 });

      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_CREDS');
      expect(error.details).toEqual({ attempts: 3 });
    });
  });

  describe('AuthorizationError', () => {
    it('should create with default values', () => {
      const error = new AuthorizationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('ACCESS_DENIED');
    });

    it('should create with custom values', () => {
      const error = new AuthorizationError('Insufficient permissions', 'INSUFFICIENT_PERMS');

      expect(error.message).toBe('Insufficient permissions');
      expect(error.code).toBe('INSUFFICIENT_PERMS');
    });
  });

  describe('ValidationError', () => {
    it('should create with default values', () => {
      const error = new ValidationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should create with validation details', () => {
      const details = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ];
      const error = new ValidationError('Multiple validation errors', 'MULTI_VALIDATION', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('NotFoundError', () => {
    it('should create with default values', () => {
      const error = new NotFoundError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create with custom resource type', () => {
      const error = new NotFoundError('User not found', 'USER_NOT_FOUND', { userId: '123' });

      expect(error.message).toBe('User not found');
      expect(error.code).toBe('USER_NOT_FOUND');
      expect(error.details).toEqual({ userId: '123' });
    });
  });

  describe('ConflictError', () => {
    it('should create with default values', () => {
      const error = new ConflictError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Resource conflict');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('should create with conflict details', () => {
      const error = new ConflictError('Email already exists', 'EMAIL_EXISTS', { email: 'test@example.com' });

      expect(error.message).toBe('Email already exists');
      expect(error.code).toBe('EMAIL_EXISTS');
      expect(error.details).toEqual({ email: 'test@example.com' });
    });
  });

  describe('RateLimitError', () => {
    it('should create with default values', () => {
      const error = new RateLimitError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should create with rate limit details', () => {
      const details = { limit: 100, window: '15m', retryAfter: 900 };
      const error = new RateLimitError('Rate limit exceeded', 'RATE_LIMIT', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('DatabaseError', () => {
    it('should create with default values', () => {
      const error = new DatabaseError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Database operation failed');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
    });

    it('should create with database operation details', () => {
      const details = { operation: 'INSERT', table: 'users' };
      const error = new DatabaseError('Insert failed', 'INSERT_FAILED', details);

      expect(error.message).toBe('Insert failed');
      expect(error.code).toBe('INSERT_FAILED');
      expect(error.details).toEqual(details);
    });
  });

  describe('ExternalServiceError', () => {
    it('should create with default values', () => {
      const error = new ExternalServiceError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('External service unavailable');
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    });

    it('should create with service details', () => {
      const details = { service: 'Google OAuth', status: 503 };
      const error = new ExternalServiceError('OAuth service down', 'OAUTH_DOWN', details);

      expect(error.message).toBe('OAuth service down');
      expect(error.code).toBe('OAUTH_DOWN');
      expect(error.details).toEqual(details);
    });
  });

  describe('TokenError', () => {
    it('should create with default values', () => {
      const error = new TokenError();

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid or expired token');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('TOKEN_ERROR');
    });

    it('should create with token details', () => {
      const details = { tokenType: 'access', expiredAt: '2023-01-01T00:00:00Z' };
      const error = new TokenError('Access token expired', 'ACCESS_TOKEN_EXPIRED', details);

      expect(error.message).toBe('Access token expired');
      expect(error.code).toBe('ACCESS_TOKEN_EXPIRED');
      expect(error.details).toEqual(details);
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const authError = new AuthenticationError();
      const tokenError = new TokenError();

      expect(authError instanceof Error).toBe(true);
      expect(authError instanceof AppError).toBe(true);
      expect(authError instanceof AuthenticationError).toBe(true);

      expect(tokenError instanceof Error).toBe(true);
      expect(tokenError instanceof AppError).toBe(true);
      expect(tokenError instanceof AuthenticationError).toBe(true);
      expect(tokenError instanceof TokenError).toBe(true);
    });
  });
});
