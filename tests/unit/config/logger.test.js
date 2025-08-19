/**
 * Unit tests for logger configuration
 */

const fs = require('fs');
const path = require('path');
const {
  getMorganMiddleware,
  AppLogger,
  createLogStream,
  ensureLogDirectory,
} = require('../../../src/config/logger');

// Mock fs module
jest.mock('fs');

describe('Logger Configuration', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalConsoleLog = console.log;
  const originalStdoutWrite = process.stdout.write;

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockImplementation(() => {});
    fs.createWriteStream.mockReturnValue({
      write: jest.fn(),
    });
    fs.appendFileSync.mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    console.log = originalConsoleLog;
    process.stdout.write = originalStdoutWrite;
  });

  describe('ensureLogDirectory', () => {
    it('should create logs directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = ensureLogDirectory();

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'logs'),
        { recursive: true },
      );
      expect(result).toBe(path.join(process.cwd(), 'logs'));
    });

    it('should not create directory if it already exists', () => {
      fs.existsSync.mockReturnValue(true);

      const result = ensureLogDirectory();

      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(result).toBe(path.join(process.cwd(), 'logs'));
    });
  });

  describe('createLogStream', () => {
    it('should create write stream for log file', () => {
      const mockStream = { write: jest.fn() };
      fs.createWriteStream.mockReturnValue(mockStream);

      const result = createLogStream('test.log');

      expect(fs.createWriteStream).toHaveBeenCalledWith(
        path.join(process.cwd(), 'logs', 'test.log'),
        { flags: 'a' },
      );
      expect(result).toBe(mockStream);
    });

    it('should ensure log directory exists before creating stream', () => {
      fs.existsSync.mockReturnValue(false);

      createLogStream('test.log');

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.createWriteStream).toHaveBeenCalled();
    });
  });

  describe('getMorganMiddleware', () => {
    it('should return development middleware in development mode', () => {
      process.env.NODE_ENV = 'development';

      const middlewares = getMorganMiddleware();

      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares.length).toBeGreaterThan(0);
    });

    it('should return production middleware in production mode', () => {
      process.env.NODE_ENV = 'production';

      const middlewares = getMorganMiddleware();

      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares.length).toBeGreaterThan(0);
    });

    it('should create log streams in production', () => {
      process.env.NODE_ENV = 'production';

      getMorganMiddleware();

      expect(fs.createWriteStream).toHaveBeenCalledWith(
        expect.stringContaining('access.log'),
        { flags: 'a' },
      );
      expect(fs.createWriteStream).toHaveBeenCalledWith(
        expect.stringContaining('error.log'),
        { flags: 'a' },
      );
    });
  });

  describe('AppLogger', () => {
    let mockConsoleLog;

    beforeEach(() => {
      mockConsoleLog = jest.fn();
      console.log = mockConsoleLog;
    });

    describe('log method', () => {
      it('should log with timestamp and level', () => {
        AppLogger.log('info', 'Test message');

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('INFO: Test message'),
        );
      });

      it('should log with metadata', () => {
        const meta = { userId: '123', action: 'login' };

        AppLogger.log('info', 'User action', meta);

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('INFO: User action'),
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('Meta:'),
          meta,
        );
      });

      it('should write to file in production', () => {
        process.env.NODE_ENV = 'production';

        AppLogger.log('info', 'Test message', { key: 'value' });

        expect(fs.appendFileSync).toHaveBeenCalledWith(
          expect.stringContaining('app.log'),
          expect.stringContaining('"message":"Test message"'),
        );
      });

      it('should write errors to separate file in production', () => {
        process.env.NODE_ENV = 'production';

        AppLogger.log('error', 'Error message');

        expect(fs.appendFileSync).toHaveBeenCalledWith(
          expect.stringContaining('app-error.log'),
          expect.stringContaining('"message":"Error message"'),
        );
      });
    });

    describe('error method', () => {
      it('should call log with error level', () => {
        const spy = jest.spyOn(AppLogger, 'log');

        AppLogger.error('Error message', { code: 500 });

        expect(spy).toHaveBeenCalledWith('error', 'Error message', { code: 500 });
      });
    });

    describe('warn method', () => {
      it('should call log with warn level', () => {
        const spy = jest.spyOn(AppLogger, 'log');

        AppLogger.warn('Warning message');

        expect(spy).toHaveBeenCalledWith('warn', 'Warning message', {});
      });
    });

    describe('info method', () => {
      it('should call log with info level', () => {
        const spy = jest.spyOn(AppLogger, 'log');

        AppLogger.info('Info message');

        expect(spy).toHaveBeenCalledWith('info', 'Info message', {});
      });
    });

    describe('debug method', () => {
      it('should call log with debug level in development', () => {
        process.env.NODE_ENV = 'development';
        const spy = jest.spyOn(AppLogger, 'log');

        AppLogger.debug('Debug message');

        expect(spy).toHaveBeenCalledWith('debug', 'Debug message', {});
      });

      it('should not log in production', () => {
        process.env.NODE_ENV = 'production';
        const spy = jest.spyOn(AppLogger, 'log');

        AppLogger.debug('Debug message');

        expect(spy).not.toHaveBeenCalled();
      });
    });
  });

  describe('Morgan tokens', () => {
    // These tests would require more complex mocking of morgan internals
    // For now, we'll test that the middleware creation doesn't throw errors
    it('should create middleware without errors', () => {
      expect(() => getMorganMiddleware()).not.toThrow();
    });
  });

  describe('Color coding in development', () => {
    let mockStdoutWrite;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      mockStdoutWrite = jest.fn();
      process.stdout.write = mockStdoutWrite;
    });

    // Note: Testing the color coding would require mocking morgan's internal behavior
    // which is complex. The color coding is tested through integration tests.
    it('should set up development logging without errors', () => {
      expect(() => getMorganMiddleware()).not.toThrow();
    });
  });
});
