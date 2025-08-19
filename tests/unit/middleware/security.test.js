const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const {
  authenticateToken,
  optionalAuth,
  // generalLimiter, // Currently unused
  // authLimiter, // Currently unused
  // getCorsMiddleware, // Currently unused
  // getSecurityMiddleware, // Currently unused
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  sanitizeRequestBody,
  validateContentType,
} = require('../../../src/middleware');

// Mock environment variables
process.env.JWT_ACCESS_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

describe('Security Middleware Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('JWT Authentication Middleware', () => {
    test('should authenticate valid token', async () => {
      const token = jwt.sign({ userId: '123', email: 'test@example.com' }, process.env.JWT_ACCESS_SECRET);

      app.get('/protected', authenticateToken, (req, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe('123');
      expect(response.body.user.email).toBe('test@example.com');
    });

    test('should reject invalid token', async () => {
      app.get('/protected', authenticateToken, (req, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MALFORMED_TOKEN');
    });

    test('should reject missing token', async () => {
      app.get('/protected', authenticateToken, (req, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    test('should handle expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: '123', email: 'test@example.com' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '-1h' },
      );

      app.get('/protected', authenticateToken, (req, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('Optional Authentication Middleware', () => {
    test('should continue without token', async () => {
      app.get('/optional', optionalAuth, (req, res) => {
        res.json({ hasUser: !!req.user });
      });

      const response = await request(app).get('/optional');

      expect(response.status).toBe(200);
      expect(response.body.hasUser).toBe(false);
    });

    test('should add user if valid token provided', async () => {
      const token = jwt.sign({ userId: '123', email: 'test@example.com' }, process.env.JWT_ACCESS_SECRET);

      app.get('/optional', optionalAuth, (req, res) => {
        res.json({ hasUser: !!req.user, userId: req.user?.id });
      });

      const response = await request(app)
        .get('/optional')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.hasUser).toBe(true);
      expect(response.body.userId).toBe('123');
    });
  });

  describe('Validation Middleware', () => {
    test('should validate registration data', async () => {
      app.post('/register', validateRegistration, (req, res) => {
        res.json({ success: true, data: req.body });
      });

      const validData = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/register')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
    });

    test('should reject invalid email in registration', async () => {
      app.post('/register', validateRegistration, (req, res) => {
        res.json({ success: true });
      });

      const invalidData = {
        email: 'invalid-email',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.field).toBe('email');
    });

    test('should reject weak password in registration', async () => {
      app.post('/register', validateRegistration, (req, res) => {
        res.json({ success: true });
      });

      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.details.field).toBe('password');
    });

    test('should validate login data', async () => {
      app.post('/login', validateLogin, (req, res) => {
        res.json({ success: true, data: req.body });
      });

      const validData = {
        email: 'test@example.com',
        password: 'anypassword',
      };

      const response = await request(app)
        .post('/login')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should validate profile update data', async () => {
      app.put('/profile', validateProfileUpdate, (req, res) => {
        res.json({ success: true, data: req.body });
      });

      const validData = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const response = await request(app)
        .put('/profile')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Content Type Validation', () => {
    test('should accept JSON content type', async () => {
      app.post('/api/test', validateContentType, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/api/test')
        .set('Content-Type', 'application/json')
        .send({ test: 'data' });

      expect(response.status).toBe(200);
    });

    test('should reject non-JSON content type for POST', async () => {
      app.post('/api/test', validateContentType, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/api/test')
        .set('Content-Type', 'text/plain')
        .send('test data');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_CONTENT_TYPE');
    });
  });

  describe('Request Sanitization', () => {
    test('should sanitize request body', async () => {
      app.post('/sanitize', sanitizeRequestBody, (req, res) => {
        res.json({ data: req.body });
      });

      const response = await request(app)
        .post('/sanitize')
        .send({
          name: '  John Doe  ',
          email: '  test@example.com  ',
          nullValue: null,
          undefinedValue: undefined,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('John Doe');
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.nullValue).toBeUndefined();
      expect(response.body.data.undefinedValue).toBeUndefined();
    });
  });
});
