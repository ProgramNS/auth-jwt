const UserService = require('../../../src/services/userService');
const UserRepository = require('../../../src/repositories/userRepository');

// Mock UserRepository
jest.mock('../../../src/repositories/userRepository');

describe('UserService', () => {
  let userService;
  let mockUserRepository;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateLastLogin: jest.fn(),
      emailExists: jest.fn(),
      disconnect: jest.fn(),
    };

    UserRepository.mockImplementation(() => mockUserRepository);
    userService = new UserService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile successfully', async () => {
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

      mockUserRepository.findById.mockResolvedValue(expectedUser);

      const result = await userService.getUserProfile(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedUser);
    });

    it('should throw error when user ID is not provided', async () => {
      await expect(userService.getUserProfile()).rejects.toThrow('User ID is required');
      await expect(userService.getUserProfile('')).rejects.toThrow('User ID is required');
      await expect(userService.getUserProfile(null)).rejects.toThrow('User ID is required');
    });

    it('should throw error when user not found', async () => {
      const userId = 'nonexistent';
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserProfile(userId)).rejects.toThrow('User not found');
    });
  });

  describe('updateUserProfile', () => {
    const userId = 'user123';
    const existingUser = {
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

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(existingUser);
    });

    it('should update user profile successfully', async () => {
      const updates = {
        firstName: 'Jane',
        lastName: 'Smith',
        profilePicture: 'https://example.com/photo.jpg',
      };

      const updatedUser = { ...existingUser, ...updates };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUserProfile(userId, updates);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updates);
      expect(result).toEqual(updatedUser);
    });

    it('should throw error when user ID is not provided', async () => {
      const updates = { firstName: 'Jane' };

      await expect(userService.updateUserProfile('', updates)).rejects.toThrow('User ID is required');
      await expect(userService.updateUserProfile(null, updates)).rejects.toThrow('User ID is required');
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      const updates = { firstName: 'Jane' };

      await expect(userService.updateUserProfile(userId, updates)).rejects.toThrow('User not found');
    });

    it('should validate firstName correctly', async () => {
      await expect(userService.updateUserProfile(userId, { firstName: '' }))
        .rejects.toThrow('First name must be a non-empty string');

      await expect(userService.updateUserProfile(userId, { firstName: 123 }))
        .rejects.toThrow('First name must be a non-empty string');

      await expect(userService.updateUserProfile(userId, { firstName: 'a'.repeat(51) }))
        .rejects.toThrow('First name must be less than 50 characters');
    });

    it('should validate lastName correctly', async () => {
      await expect(userService.updateUserProfile(userId, { lastName: '' }))
        .rejects.toThrow('Last name must be a non-empty string');

      await expect(userService.updateUserProfile(userId, { lastName: 123 }))
        .rejects.toThrow('Last name must be a non-empty string');

      await expect(userService.updateUserProfile(userId, { lastName: 'a'.repeat(51) }))
        .rejects.toThrow('Last name must be less than 50 characters');
    });

    it('should validate email correctly', async () => {
      await expect(userService.updateUserProfile(userId, { email: '' }))
        .rejects.toThrow('Email must be a non-empty string');

      await expect(userService.updateUserProfile(userId, { email: 'invalid-email' }))
        .rejects.toThrow('Email must be a valid email address');

      await expect(userService.updateUserProfile(userId, { email: 123 }))
        .rejects.toThrow('Email must be a non-empty string');
    });

    it('should validate profilePicture correctly', async () => {
      await expect(userService.updateUserProfile(userId, { profilePicture: 123 }))
        .rejects.toThrow('Profile picture must be a string URL');

      await expect(userService.updateUserProfile(userId, { profilePicture: 'a'.repeat(501) }))
        .rejects.toThrow('Profile picture URL must be less than 500 characters');
    });

    it('should check email uniqueness when updating email', async () => {
      const updates = { email: 'newemail@example.com' };
      mockUserRepository.emailExists.mockResolvedValue(true);

      await expect(userService.updateUserProfile(userId, updates))
        .rejects.toThrow('Email is already in use');

      expect(mockUserRepository.emailExists).toHaveBeenCalledWith('newemail@example.com', userId);
    });

    it('should allow email update when email is not taken', async () => {
      const updates = { email: 'newemail@example.com' };
      const updatedUser = { ...existingUser, email: 'newemail@example.com' };

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUserProfile(userId, updates);

      expect(mockUserRepository.emailExists).toHaveBeenCalledWith('newemail@example.com', userId);
      expect(result).toEqual(updatedUser);
    });

    it('should reject disallowed fields', async () => {
      const updates = { password: 'newpassword', isEmailVerified: true };

      await expect(userService.updateUserProfile(userId, updates))
        .rejects.toThrow('Cannot update fields: password, isEmailVerified');
    });

    it('should throw error when no valid updates provided', async () => {
      await expect(userService.updateUserProfile(userId, {}))
        .rejects.toThrow('No valid updates provided');

      await expect(userService.updateUserProfile(userId, { invalidField: 'value' }))
        .rejects.toThrow('Cannot update fields: invalidField');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const userId = 'user123';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.delete.mockResolvedValue(existingUser);

      const result = await userService.deleteUser(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        deletedAt: expect.any(Date),
      });
    });

    it('should throw error when user ID is not provided', async () => {
      await expect(userService.deleteUser()).rejects.toThrow('User ID is required');
      await expect(userService.deleteUser('')).rejects.toThrow('User ID is required');
      await expect(userService.deleteUser(null)).rejects.toThrow('User ID is required');
    });

    it('should throw error when user not found', async () => {
      const userId = 'nonexistent';
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.deleteUser(userId)).rejects.toThrow('User not found');
    });
  });

  describe('getUsers', () => {
    it('should return paginated users successfully', async () => {
      const filters = { page: 1, limit: 10 };
      const expectedResult = {
        users: [
          {
            id: 'user1',
            email: 'user1@example.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockUserRepository.findMany.mockResolvedValue(expectedResult);

      const result = await userService.getUsers(filters);

      expect(mockUserRepository.findMany).toHaveBeenCalledWith(filters);
      expect(result).toEqual(expectedResult);
    });

    it('should validate page parameter', async () => {
      await expect(userService.getUsers({ page: 0 }))
        .rejects.toThrow('Page must be a positive integer');

      await expect(userService.getUsers({ page: -1 }))
        .rejects.toThrow('Page must be a positive integer');

      await expect(userService.getUsers({ page: 1.5 }))
        .rejects.toThrow('Page must be a positive integer');
    });

    it('should validate limit parameter', async () => {
      await expect(userService.getUsers({ limit: 0 }))
        .rejects.toThrow('Limit must be between 1 and 100');

      await expect(userService.getUsers({ limit: 101 }))
        .rejects.toThrow('Limit must be between 1 and 100');

      await expect(userService.getUsers({ limit: 1.5 }))
        .rejects.toThrow('Limit must be between 1 and 100');
    });

    it('should validate provider parameter', async () => {
      await expect(userService.getUsers({ provider: 'invalid' }))
        .rejects.toThrow('Provider must be either "local" or "google"');
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login successfully', async () => {
      const userId = 'user123';
      const expectedResult = {
        id: userId,
        lastLoginAt: new Date(),
      };

      mockUserRepository.updateLastLogin.mockResolvedValue(expectedResult);

      const result = await userService.updateLastLogin(userId);

      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedResult);
    });

    it('should throw error when user ID is not provided', async () => {
      await expect(userService.updateLastLogin()).rejects.toThrow('User ID is required');
      await expect(userService.updateLastLogin('')).rejects.toThrow('User ID is required');
      await expect(userService.updateLastLogin(null)).rejects.toThrow('User ID is required');
    });
  });

  describe('userExists', () => {
    it('should return true when user exists', async () => {
      const userId = 'user123';
      mockUserRepository.findById.mockResolvedValue({ id: userId });

      const result = await userService.userExists(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      const userId = 'nonexistent';
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.userExists(userId);

      expect(result).toBe(false);
    });

    it('should return false when user ID is not provided', async () => {
      expect(await userService.userExists()).toBe(false);
      expect(await userService.userExists('')).toBe(false);
      expect(await userService.userExists(null)).toBe(false);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics successfully', async () => {
      // Mock the findMany calls for statistics
      mockUserRepository.findMany
        .mockResolvedValueOnce({ pagination: { total: 100 } }) // total users
        .mockResolvedValueOnce({ pagination: { total: 60 } })  // local users
        .mockResolvedValueOnce({ pagination: { total: 40 } })  // google users
        .mockResolvedValueOnce({ pagination: { total: 80 } }); // verified users

      const result = await userService.getUserStats();

      expect(result).toEqual({
        total: 100,
        byProvider: {
          local: 60,
          google: 40,
        },
        verified: 80,
        unverified: 20,
      });

      expect(mockUserRepository.findMany).toHaveBeenCalledTimes(4);
      expect(mockUserRepository.findMany).toHaveBeenNthCalledWith(1, { limit: 1 });
      expect(mockUserRepository.findMany).toHaveBeenNthCalledWith(2, { provider: 'local', limit: 1 });
      expect(mockUserRepository.findMany).toHaveBeenNthCalledWith(3, { provider: 'google', limit: 1 });
      expect(mockUserRepository.findMany).toHaveBeenNthCalledWith(4, { isEmailVerified: true, limit: 1 });
    });
  });

  describe('disconnect', () => {
    it('should disconnect repository', async () => {
      await userService.disconnect();
      expect(mockUserRepository.disconnect).toHaveBeenCalled();
    });
  });

  describe('_validateProfileUpdates', () => {
    it('should throw error for invalid updates object', async () => {
      await expect(userService.updateUserProfile('user123', null))
        .rejects.toThrow('Updates must be an object');

      await expect(userService.updateUserProfile('user123', 'invalid'))
        .rejects.toThrow('Updates must be an object');
    });
  });
});
