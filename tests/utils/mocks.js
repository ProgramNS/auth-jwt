/**
 * Mock factories for external dependencies and services
 */

/**
 * Mock Prisma client for unit tests
 */
const createMockPrismaClient = () => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
});

/**
 * Mock Express request object
 */
const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  cookies: {},
  user: null,
  ...overrides,
});

/**
 * Mock Express response object
 */
const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res;
};

/**
 * Mock Express next function
 */
const createMockNext = () => jest.fn();

/**
 * Mock bcrypt functions
 */
const createMockBcrypt = () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
});

/**
 * Mock jsonwebtoken functions
 */
const createMockJwt = () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 'test-user-id', type: 'access' }),
  decode: jest.fn().mockReturnValue({ userId: 'test-user-id', type: 'access' }),
});

/**
 * Mock Passport strategy
 */
const createMockPassportStrategy = () => ({
  authenticate: jest.fn((req, res, next) => next()),
});

/**
 * Mock logger
 */
const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

/**
 * Mock rate limiter
 */
const createMockRateLimiter = () => jest.fn((req, res, next) => next());

/**
 * Mock CORS middleware
 */
const createMockCors = () => jest.fn((req, res, next) => next());

/**
 * Mock Helmet middleware
 */
const createMockHelmet = () => jest.fn((req, res, next) => next());

/**
 * Create mock user data
 */
const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  provider: 'local',
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create mock refresh token data
 */
const createMockRefreshToken = (overrides = {}) => ({
  id: 'test-token-id',
  token: 'mock-refresh-token',
  userId: 'test-user-id',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  isRevoked: false,
  ...overrides,
});

/**
 * Mock Google OAuth profile
 */
const createMockGoogleProfile = (overrides = {}) => ({
  id: 'google-user-id',
  emails: [{ value: 'test@gmail.com', verified: true }],
  name: {
    givenName: 'Google',
    familyName: 'User',
  },
  photos: [{ value: 'https://example.com/avatar.jpg' }],
  provider: 'google',
  ...overrides,
});

module.exports = {
  createMockPrismaClient,
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockBcrypt,
  createMockJwt,
  createMockPassportStrategy,
  createMockLogger,
  createMockRateLimiter,
  createMockCors,
  createMockHelmet,
  createMockUser,
  createMockRefreshToken,
  createMockGoogleProfile,
};
