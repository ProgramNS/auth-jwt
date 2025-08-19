// Mock Prisma Client
const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

// Mock JWT Service
jest.mock('../../../src/services/jwtService', () => ({
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
}));

const oauthService = require('../../../src/services/oauthService');
const jwtService = require('../../../src/services/jwtService');

describe('OAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processOAuthProfile', () => {
    const mockProfile = {
      id: 'google123',
      emails: [{ value: 'test@example.com' }],
      name: {
        givenName: 'John',
        familyName: 'Doe',
      },
      photos: [{ value: 'https://example.com/photo.jpg' }],
    };

    it('should process OAuth profile successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        provider: 'google',
        providerId: 'google123',
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await oauthService.processOAuthProfile(mockProfile, 'google');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          providerId: 'google123',
          provider: 'google',
        },
      });
    });

    it('should throw error if email is missing from profile', async () => {
      const invalidProfile = {
        id: 'google123',
        emails: [],
      };

      await expect(oauthService.processOAuthProfile(invalidProfile))
        .rejects.toThrow('OAuth profile processing failed: Email is required from OAuth provider');
    });

    it('should throw error if emails array is missing', async () => {
      const invalidProfile = {
        id: 'google123',
      };

      await expect(oauthService.processOAuthProfile(invalidProfile))
        .rejects.toThrow('OAuth profile processing failed: Email is required from OAuth provider');
    });
  });

  describe('createOAuthUser', () => {
    const mockProfile = {
      id: 'google123',
      emails: [{ value: 'test@example.com' }],
      name: {
        givenName: 'John',
        familyName: 'Doe',
      },
      photos: [{ value: 'https://example.com/photo.jpg' }],
    };

    it('should create new OAuth user successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        profilePicture: 'https://example.com/photo.jpg',
        provider: 'google',
        providerId: 'google123',
        isEmailVerified: true,
      };

      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await oauthService.createOAuthUser({
        email: 'test@example.com',
        providerId: 'google123',
        provider: 'google',
        profile: mockProfile,
      });

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          profilePicture: 'https://example.com/photo.jpg',
          provider: 'google',
          providerId: 'google123',
          isEmailVerified: true,
          lastLoginAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
    });

    it('should handle profile without photos', async () => {
      const profileWithoutPhoto = {
        ...mockProfile,
        photos: [],
      };

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        profilePicture: null,
        provider: 'google',
        providerId: 'google123',
      };

      mockPrisma.user.create.mockResolvedValue(mockUser);

      await oauthService.createOAuthUser({
        email: 'test@example.com',
        providerId: 'google123',
        provider: 'google',
        profile: profileWithoutPhoto,
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          profilePicture: null,
        }),
        select: expect.any(Object),
      });
    });

    it('should handle profile with displayName only', async () => {
      const profileWithDisplayName = {
        id: 'google123',
        emails: [{ value: 'test@example.com' }],
        displayName: 'John Doe Smith',
      };

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe Smith',
      };

      mockPrisma.user.create.mockResolvedValue(mockUser);

      await oauthService.createOAuthUser({
        email: 'test@example.com',
        providerId: 'google123',
        provider: 'google',
        profile: profileWithDisplayName,
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe Smith',
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('linkOAuthAccount', () => {
    it('should link existing local account with OAuth provider', async () => {
      const mockProfile = {
        photos: [{ value: 'https://example.com/photo.jpg' }],
      };

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        provider: 'google',
        providerId: 'google123',
        profilePicture: 'https://example.com/photo.jpg',
      };

      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await oauthService.linkOAuthAccount('user123', 'google123', 'google', mockProfile);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          provider: 'google',
          providerId: 'google123',
          isEmailVerified: true,
          lastLoginAt: expect.any(Date),
          profilePicture: 'https://example.com/photo.jpg',
        },
        select: expect.any(Object),
      });
    });
  });

  describe('generateOAuthTokens', () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should generate tokens for OAuth user', async () => {
      const mockAccessToken = 'access-token';
      const mockRefreshToken = 'refresh-token';

      jwtService.generateAccessToken.mockReturnValue(mockAccessToken);
      jwtService.generateRefreshToken.mockReturnValue(mockRefreshToken);
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await oauthService.generateOAuthTokens(mockUser);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        user: {
          id: 'user123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          profilePicture: undefined,
          provider: undefined,
          isEmailVerified: undefined,
        },
      });

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: mockRefreshToken,
          userId: 'user123',
          expiresAt: expect.any(Date),
        },
      });
    });
  });

  describe('handleOAuthAuthentication', () => {
    const mockProfile = {
      id: 'google123',
      emails: [{ value: 'test@example.com' }],
      name: {
        givenName: 'John',
        familyName: 'Doe',
      },
    };

    it('should handle complete OAuth authentication flow', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      };

      // Mock the internal methods
      jest.spyOn(oauthService, 'processOAuthProfile').mockResolvedValue(mockUser);
      jest.spyOn(oauthService, 'generateOAuthTokens').mockResolvedValue(mockTokens);

      const result = await oauthService.handleOAuthAuthentication(mockProfile, 'google');

      expect(result).toEqual({
        success: true,
        ...mockTokens,
      });

      expect(oauthService.processOAuthProfile).toHaveBeenCalledWith(mockProfile, 'google');
      expect(oauthService.generateOAuthTokens).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('unlinkOAuthAccount', () => {
    it('should unlink OAuth account successfully', async () => {
      const mockUser = {
        password: 'hashed-password',
        provider: 'google',
      };

      const mockUpdatedUser = {
        id: 'user123',
        provider: 'local',
        providerId: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await oauthService.unlinkOAuthAccount('user123');

      expect(result).toEqual(mockUpdatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          provider: 'local',
          providerId: null,
        },
        select: expect.any(Object),
      });
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(oauthService.unlinkOAuthAccount('user123'))
        .rejects.toThrow('OAuth account unlinking failed: User not found');
    });

    it('should throw error if user has no password', async () => {
      const mockUser = {
        password: null,
        provider: 'google',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(oauthService.unlinkOAuthAccount('user123'))
        .rejects.toThrow('OAuth account unlinking failed: Cannot unlink OAuth account without setting a password first');
    });
  });
});
