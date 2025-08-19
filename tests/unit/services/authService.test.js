const PasswordService = require('../../../src/services/passwordService');
const JWTService = require('../../../src/services/jwtService');

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

// Mock services
jest.mock('../../../src/services/passwordService');
jest.mock('../../../src/services/jwtService');

// Import AuthService after mocking
const AuthService = require('../../../src/services/authService');

describe('AuthService', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset environment variables
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  describe('register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    beforeEach(() => {
      PasswordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      PasswordService.hashPassword.mockResolvedValue('hashedPassword123');
      JWTService.generateTokenPair.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: false,
        provider: 'local',
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await AuthService.register(validUserData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User registered successfully');
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(PasswordService.hashPassword).toHaveBeenCalledWith('TestPassword123!');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashedPassword123',
          firstName: 'John',
          lastName: 'Doe',
          provider: 'local',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isEmailVerified: true,
          provider: true,
          createdAt: true,
        },
      });
    });

    it('should throw error if required fields are missing', async () => {
      const invalidData = { email: 'test@example.com' };

      await expect(AuthService.register(invalidData))
        .rejects.toThrow('Email, password, firstName, and lastName are required');
    });

    it('should throw error for invalid email format', async () => {
      const invalidEmailData = { ...validUserData, email: 'invalid-email' };

      await expect(AuthService.register(invalidEmailData))
        .rejects.toThrow('Invalid email format');
    });

    it('should throw error for weak password', async () => {
      PasswordService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
      });

      await expect(AuthService.register(validUserData))
        .rejects.toThrow('Password validation failed: Password too weak');
    });

    it('should throw error if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(AuthService.register(validUserData))
        .rejects.toThrow('User with this email already exists');
    });

    it('should handle database errors', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockRejectedValue(new Error('Database error'));

      await expect(AuthService.register(validUserData))
        .rejects.toThrow('Registration failed: Database error');
    });
  });

  describe('login', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'TestPassword123!',
    };

    beforeEach(() => {
      PasswordService.comparePassword.mockResolvedValue(true);
      JWTService.generateTokenPair.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should login user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: false,
        provider: 'local',
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await AuthService.login(validCredentials);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful');
      expect(result.user.password).toBeUndefined();
      expect(result.tokens).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should throw error if required fields are missing', async () => {
      const invalidCredentials = { email: 'test@example.com' };

      await expect(AuthService.login(invalidCredentials))
        .rejects.toThrow('Email and password are required');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(AuthService.login(validCredentials))
        .rejects.toThrow('Invalid email or password');
    });

    it('should throw error for OAuth user without password', async () => {
      const oauthUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: null,
        provider: 'google',
      };

      mockPrisma.user.findUnique.mockResolvedValue(oauthUser);

      await expect(AuthService.login(validCredentials))
        .rejects.toThrow('This account uses OAuth authentication. Please login with Google.');
    });

    it('should throw error for invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword',
        provider: 'local',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      PasswordService.comparePassword.mockResolvedValue(false);

      await expect(AuthService.login(validCredentials))
        .rejects.toThrow('Invalid email or password');
    });
  });

  describe('logout', () => {
    const validRefreshToken = 'valid-refresh-token';

    beforeEach(() => {
      JWTService.verifyRefreshToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
      });
    });

    it('should logout user successfully', async () => {
      const mockTokenRecord = {
        id: 'token-123',
        token: validRefreshToken,
        userId: 'user-123',
        isRevoked: false,
      };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);
      mockPrisma.refreshToken.update.mockResolvedValue({});

      const result = await AuthService.logout(validRefreshToken);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logout successful');

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { token: validRefreshToken },
        data: { isRevoked: true },
      });
    });

    it('should throw error if refresh token is missing', async () => {
      await expect(AuthService.logout())
        .rejects.toThrow('Refresh token is required');
    });

    it('should throw error if token not found in database', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(AuthService.logout(validRefreshToken))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should throw error if token already revoked', async () => {
      const revokedTokenRecord = {
        id: 'token-123',
        token: validRefreshToken,
        userId: 'user-123',
        isRevoked: true,
      };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(revokedTokenRecord);

      await expect(AuthService.logout(validRefreshToken))
        .rejects.toThrow('Token already revoked');
    });
  });

  describe('refreshToken', () => {
    const validRefreshToken = 'valid-refresh-token';

    beforeEach(() => {
      JWTService.verifyRefreshToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
      });
      JWTService.generateTokenPair.mockReturnValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should refresh token successfully', async () => {
      const mockTokenRecord = {
        id: 'token-123',
        token: validRefreshToken,
        userId: 'user-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await AuthService.refreshToken(validRefreshToken);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Token refreshed successfully');
      expect(result.tokens).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { token: validRefreshToken },
        data: { isRevoked: true },
      });
    });

    it('should throw error if refresh token is missing', async () => {
      await expect(AuthService.refreshToken())
        .rejects.toThrow('Refresh token is required');
    });

    it('should throw error if token not found in database', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(AuthService.refreshToken(validRefreshToken))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should throw error if token is revoked', async () => {
      const revokedTokenRecord = {
        id: 'token-123',
        token: validRefreshToken,
        userId: 'user-123',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(revokedTokenRecord);

      await expect(AuthService.refreshToken(validRefreshToken))
        .rejects.toThrow('Refresh token has been revoked');
    });

    it('should throw error if token is expired', async () => {
      const expiredTokenRecord = {
        id: 'token-123',
        token: validRefreshToken,
        userId: 'user-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
      };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(expiredTokenRecord);

      await expect(AuthService.refreshToken(validRefreshToken))
        .rejects.toThrow('Refresh token has expired');
    });
  });

  describe('revokeAllTokens', () => {
    it('should revoke all tokens for a user successfully', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      const result = await AuthService.revokeAllTokens('user-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Revoked 3 refresh tokens');
      expect(result.revokedCount).toBe(3);

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });
    });

    it('should throw error if user ID is missing', async () => {
      await expect(AuthService.revokeAllTokens())
        .rejects.toThrow('User ID is required');
    });

    it('should handle database errors', async () => {
      mockPrisma.refreshToken.updateMany.mockRejectedValue(new Error('Database error'));

      await expect(AuthService.revokeAllTokens('user-123'))
        .rejects.toThrow('Failed to revoke tokens: Database error');
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens successfully', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      const result = await AuthService.cleanupExpiredTokens();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Cleaned up 5 expired/revoked tokens');
      expect(result.cleanedCount).toBe(5);

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { isRevoked: true },
          ],
        },
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.refreshToken.deleteMany.mockRejectedValue(new Error('Database error'));

      await expect(AuthService.cleanupExpiredTokens())
        .rejects.toThrow('Failed to cleanup tokens: Database error');
    });
  });
});
