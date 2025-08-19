const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
const userRoutes = require('../../src/routes/userRoutes');
const authRoutes = require('../../src/routes/authRoutes');
// const rateLimiter = require('../../src/middleware/rateLimiter'); // Currently unused
const cors = require('../../src/middleware/cors');
const security = require('../../src/middleware/security');

// Mock environment variables
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient();

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors);
  app.use(security);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  return app;
};

describe('User Management Integration Tests', () => {
  let app;
  let testUser;
  let accessToken;
  let secondUser;
  let secondAccessToken; // eslint-disable-line no-unused-vars

  beforeAll(async () => {
    app = createTestApp();

    // Clean up test data
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test users
    const firstUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test1@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      });

    testUser = firstUserResponse.body.data.user;
    accessToken = firstUserResponse.body.data.tokens.accessToken;

    const secondUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test2@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
      });

    secondUser = secondUserResponse.body.data.user;
    secondAccessToken = secondUserResponse.body.data.tokens.accessToken; // eslint-disable-line no-unused-vars
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile for authenticated user', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        provider: 'local',
      });
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 403 for invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MALFORMED_TOKEN');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile successfully', async () => {
      const updates = {
        firstName: 'Johnny',
        lastName: 'Updated',
        profilePicture: 'https://example.com/avatar.jpg',
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.data.user).toMatchObject({
        firstName: updates.firstName,
        lastName: updates.lastName,
        profilePicture: updates.profilePicture,
      });
    });

    it('should update email successfully', async () => {
      const updates = {
        email: 'newemail@example.com',
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(updates.email);
    });

    it('should return 400 for no updates provided', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_UPDATES_PROVIDED');
    });

    it('should return 400 for invalid field updates', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: '', // Empty string
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for disallowed field updates', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'newpassword', // Not allowed
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for duplicate email', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: secondUser.email, // Email already taken by second user
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({ firstName: 'Updated' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('DELETE /api/users/profile', () => {
    it('should delete user account successfully', async () => {
      const response = await request(app)
        .delete('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User account deleted successfully');
      expect(response.body.data.deletedUser).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      });

      // Verify user is actually deleted
      const deletedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .delete('/api/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('GET /api/users', () => {
    beforeEach(async () => {
      // Create additional test users for pagination testing
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test3@example.com',
          password: 'SecurePass123!',
          firstName: 'Alice',
          lastName: 'Johnson',
        });

      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test4@example.com',
          password: 'SecurePass123!',
          firstName: 'Bob',
          lastName: 'Wilson',
        });
    });

    it('should return paginated list of users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(4); // 4 users total
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 4,
        totalPages: 1,
      });
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(2);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 4,
        totalPages: 2,
      });
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/users?search=Alice')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.users[0].firstName).toBe('Alice');
    });

    it('should support provider filtering', async () => {
      const response = await request(app)
        .get('/api/users?provider=local')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(4);
      expect(response.body.data.users.every(user => user.provider === 'local')).toBe(true);
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users?page=0')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PAGE');
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/users?limit=101')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_LIMIT');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('GET /api/users/stats', () => {
    it('should return user statistics', async () => {
      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toMatchObject({
        total: expect.any(Number),
        byProvider: {
          local: expect.any(Number),
          google: expect.any(Number),
        },
        verified: expect.any(Number),
        unverified: expect.any(Number),
      });
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/users/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });
});
