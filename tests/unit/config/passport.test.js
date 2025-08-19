// Mock environment variables
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/auth/google/callback';

describe('Passport Configuration', () => {
  it('should load passport configuration without errors', () => {
    expect(() => {
      require('../../../src/config/passport');
    }).not.toThrow();
  });

  it('should export passport instance', () => {
    const passportConfig = require('../../../src/config/passport');
    expect(passportConfig).toBeDefined();
    expect(typeof passportConfig.authenticate).toBe('function');
    expect(typeof passportConfig.serializeUser).toBe('function');
    expect(typeof passportConfig.deserializeUser).toBe('function');
  });

  it('should have Google strategy configured', () => {
    const passportConfig = require('../../../src/config/passport');
    expect(passportConfig._strategies).toBeDefined();
    expect(passportConfig._strategies.google).toBeDefined();
  });
});
