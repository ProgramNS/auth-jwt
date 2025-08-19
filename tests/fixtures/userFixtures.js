const bcrypt = require('bcrypt');

/**
 * User test data factories and fixtures
 */
class UserFixtures {
  static async createValidUser(overrides = {}) {
    const defaultUser = {
      email: `test${Date.now()}@example.com`,
      password: await bcrypt.hash('Password123!', 12),
      firstName: 'John',
      lastName: 'Doe',
      isEmailVerified: true,
      provider: 'local',
      ...overrides,
    };

    return defaultUser;
  }

  static async createValidUserData(overrides = {}) {
    return {
      email: `test${Date.now()}@example.com`,
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      ...overrides,
    };
  }

  static async createOAuthUser(overrides = {}) {
    return {
      email: `oauth${Date.now()}@gmail.com`,
      firstName: 'Jane',
      lastName: 'Smith',
      provider: 'google',
      providerId: `google_${Date.now()}`,
      isEmailVerified: true,
      profilePicture: 'https://example.com/avatar.jpg',
      ...overrides,
    };
  }

  static createMultipleUsers(count = 3) {
    return Promise.all(
      Array.from({ length: count }, (_, index) =>
        this.createValidUser({
          email: `user${index}${Date.now()}@example.com`,
          firstName: `User${index}`,
        }),
      ),
    );
  }

  static getInvalidUserData() {
    return [
      {
        description: 'missing email',
        data: {
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
      {
        description: 'invalid email format',
        data: {
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
      {
        description: 'weak password',
        data: {
          email: 'test@example.com',
          password: '123',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
      {
        description: 'missing firstName',
        data: {
          email: 'test@example.com',
          password: 'Password123!',
          lastName: 'Doe',
        },
      },
      {
        description: 'missing lastName',
        data: {
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
        },
      },
    ];
  }

  static getValidLoginCredentials() {
    return {
      email: 'test@example.com',
      password: 'Password123!',
    };
  }

  static getInvalidLoginCredentials() {
    return [
      {
        description: 'wrong password',
        data: {
          email: 'test@example.com',
          password: 'WrongPassword123!',
        },
      },
      {
        description: 'non-existent email',
        data: {
          email: 'nonexistent@example.com',
          password: 'Password123!',
        },
      },
      {
        description: 'missing email',
        data: {
          password: 'Password123!',
        },
      },
      {
        description: 'missing password',
        data: {
          email: 'test@example.com',
        },
      },
    ];
  }

  static getUserUpdateData() {
    return {
      firstName: 'UpdatedJohn',
      lastName: 'UpdatedDoe',
      profilePicture: 'https://example.com/new-avatar.jpg',
    };
  }

  static getInvalidUserUpdateData() {
    return [
      {
        description: 'invalid email format',
        data: {
          email: 'invalid-email-format',
        },
      },
      {
        description: 'empty firstName',
        data: {
          firstName: '',
        },
      },
      {
        description: 'empty lastName',
        data: {
          lastName: '',
        },
      },
    ];
  }
}

module.exports = UserFixtures;
