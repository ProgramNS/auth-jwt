const UserRepository = require('../../../src/repositories/userRepository');

// Mock Prisma Client
const mockPrismaClient = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $disconnect: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

describe('UserRepository', () => {
  let userRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await userRepository.disconnect();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
      };

      const expectedUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        profilePicture: null,
        isEmailVerified: false,
        provider: 'local',
        providerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      mockPrismaClient.user.create.mockResolvedValue(expectedUser);

      const result = await userRepository.create(userData);

      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: userData,
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          isEmailVerified: true,
          provider: true,
          providerId: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        }),
      });
      expect(result).toEqual(expectedUser);
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      const userId = 'user123';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        profilePicture: null,
        isEmailVerified: false,
        provider: 'local',
        providerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(expectedUser);

      const result = await userRepository.findById(userId);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }),
      });
      expect(result).toEqual(expectedUser);
    });

    it('should return null when user not found', async () => {
      const userId = 'nonexistent';
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const result = await userRepository.findById(userId);

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      const email = 'test@example.com';
      const expectedUser = {
        id: 'user123',
        email,
        password: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        profilePicture: null,
        isEmailVerified: false,
        provider: 'local',
        providerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(expectedUser);

      const result = await userRepository.findByEmail(email);

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        select: expect.objectContaining({
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
        }),
      });
      expect(result).toEqual(expectedUser);
    });
  });

  describe('findByProviderId', () => {
    it('should find user by provider ID successfully', async () => {
      const providerId = 'google123';
      const provider = 'google';
      const expectedUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        profilePicture: 'https://example.com/photo.jpg',
        isEmailVerified: true,
        provider: 'google',
        providerId: 'google123',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      mockPrismaClient.user.findFirst.mockResolvedValue(expectedUser);

      const result = await userRepository.findByProviderId(providerId, provider);

      expect(mockPrismaClient.user.findFirst).toHaveBeenCalledWith({
        where: { providerId, provider },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }),
      });
      expect(result).toEqual(expectedUser);
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const userId = 'user123';
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
      };
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        profilePicture: null,
        isEmailVerified: false,
        provider: 'local',
        providerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      mockPrismaClient.user.update.mockResolvedValue(expectedUser);

      const result = await userRepository.update(userId, updateData);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }),
      });
      expect(result).toEqual(expectedUser);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const userId = 'user123';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockPrismaClient.user.delete.mockResolvedValue(expectedUser);

      const result = await userRepository.delete(userId);

      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });
      expect(result).toEqual(expectedUser);
    });
  });

  describe('findMany', () => {
    it('should return paginated users with default filters', async () => {
      const mockUsers = [
        {
          id: 'user1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          profilePicture: null,
          isEmailVerified: false,
          provider: 'local',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
        },
      ];

      mockPrismaClient.user.count.mockResolvedValue(1);
      mockPrismaClient.user.findMany.mockResolvedValue(mockUsers);

      const result = await userRepository.findMany();

      expect(mockPrismaClient.user.count).toHaveBeenCalledWith({ where: {} });
      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });

      expect(result).toEqual({
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should apply search filter correctly', async () => {
      const filters = { search: 'john', page: 1, limit: 5 };
      const mockUsers = [];

      mockPrismaClient.user.count.mockResolvedValue(0);
      mockPrismaClient.user.findMany.mockResolvedValue(mockUsers);

      await userRepository.findMany(filters);

      expect(mockPrismaClient.user.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
          ],
        },
      });
    });

    it('should apply provider filter correctly', async () => {
      const filters = { provider: 'google' };

      mockPrismaClient.user.count.mockResolvedValue(0);
      mockPrismaClient.user.findMany.mockResolvedValue([]);

      await userRepository.findMany(filters);

      expect(mockPrismaClient.user.count).toHaveBeenCalledWith({
        where: { provider: 'google' },
      });
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const userId = 'user123';
      const expectedResult = {
        id: userId,
        lastLoginAt: expect.any(Date),
      };

      mockPrismaClient.user.update.mockResolvedValue(expectedResult);

      const result = await userRepository.updateLastLogin(userId);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { lastLoginAt: expect.any(Date) },
        select: {
          id: true,
          lastLoginAt: true,
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('emailExists', () => {
    it('should return true when email exists', async () => {
      const email = 'test@example.com';
      mockPrismaClient.user.findFirst.mockResolvedValue({ id: 'user123' });

      const result = await userRepository.emailExists(email);

      expect(mockPrismaClient.user.findFirst).toHaveBeenCalledWith({
        where: { email },
      });
      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      const email = 'nonexistent@example.com';
      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      const result = await userRepository.emailExists(email);

      expect(result).toBe(false);
    });

    it('should exclude specific user ID when checking email existence', async () => {
      const email = 'test@example.com';
      const excludeId = 'user123';
      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      const result = await userRepository.emailExists(email, excludeId);

      expect(mockPrismaClient.user.findFirst).toHaveBeenCalledWith({
        where: { email, id: { not: excludeId } },
      });
      expect(result).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Prisma', async () => {
      await userRepository.disconnect();
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });
  });
});
