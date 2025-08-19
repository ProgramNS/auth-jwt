const TestDatabase = require('../utils/testDb');

// Global test database instance
let testDb;

// Setup before all integration tests
beforeAll(async () => {
  testDb = new TestDatabase();
  global.testDb = await testDb.setup();
  global.testDbInstance = testDb;
});

// Cleanup after each integration test
afterEach(async () => {
  if (testDb) {
    await testDb.cleanup();
  }
});

// Teardown after all integration tests
afterAll(async () => {
  if (testDb) {
    await testDb.teardown();
  }
});

// Make test utilities available globally
global.testUtils = {
  async createTestUser(userData) {
    return await global.testDb.user.create({
      data: userData,
    });
  },

  async createTestRefreshToken(tokenData) {
    return await global.testDb.refreshToken.create({
      data: tokenData,
    });
  },

  async clearAllData() {
    await global.testDb.refreshToken.deleteMany();
    await global.testDb.user.deleteMany();
  },
};
