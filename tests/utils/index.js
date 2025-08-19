/**
 * Test utilities index file for easy imports
 */

const TestDatabase = require('./testDb');
const TestHelpers = require('./testHelpers');
const mocks = require('./mocks');
const UserFixtures = require('../fixtures/userFixtures');
const AuthFixtures = require('../fixtures/authFixtures');
const testConfig = require('../config/testConfig');

module.exports = {
  TestDatabase,
  TestHelpers,
  UserFixtures,
  AuthFixtures,
  testConfig,
  ...mocks,
};
