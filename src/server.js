/**
 * Server Entry Point
 * Main server startup script with environment validation and graceful shutdown
 */

const { createApp } = require('./app');
const { AppLogger } = require('./config/logger');

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

/**
 * Optional environment variables with defaults
 */
const DEFAULT_ENV_VARS = {
  PORT: 3000,
  NODE_ENV: 'development',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  BCRYPT_SALT_ROUNDS: 12,
};

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const missingVars = [];

  // Check required variables
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    AppLogger.error('Missing required environment variables', {
      missingVariables: missingVars,
      hint: 'Please check your .env file and ensure all required variables are set',
    });
    process.exit(1);
  }

  // Set default values for optional variables
  Object.entries(DEFAULT_ENV_VARS).forEach(([key, defaultValue]) => {
    if (!process.env[key]) {
      process.env[key] = defaultValue.toString();
      AppLogger.info(`Using default value for ${key}`, { value: defaultValue });
    }
  });

  AppLogger.info('Environment validation completed successfully');
}

/**
 * Start the server
 */
async function startServer() {
  try {
    // Validate environment
    validateEnvironment();

    // Create Express app
    const app = createApp();
    const port = parseInt(process.env.PORT, 10);

    // Start server
    const server = app.listen(port, () => {
      AppLogger.info('Server started successfully', {
        port,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        pid: process.pid,
      });

      // Log available routes in development
      if (process.env.NODE_ENV === 'development') {
        AppLogger.info('Available endpoints:', {
          health: `http://localhost:${port}/health`,
          api: `http://localhost:${port}/api`,
          auth: `http://localhost:${port}/api/auth`,
          users: `http://localhost:${port}/api/users`,
        });
      }
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        AppLogger.error(`Port ${port} is already in use`, {
          port,
          suggestion: 'Try using a different port by setting the PORT environment variable',
        });
      } else {
        AppLogger.error('Server error occurred', {
          error: error.message,
          code: error.code,
        });
      }
      process.exit(1);
    });

    // Graceful shutdown handling
    setupGracefulShutdown(server);

    return server;
  } catch (error) {
    AppLogger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(server) {
  const gracefulShutdown = (signal) => {
    AppLogger.info(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new connections
    server.close((err) => {
      if (err) {
        AppLogger.error('Error during server shutdown', {
          error: err.message,
        });
        process.exit(1);
      }

      AppLogger.info('Server closed successfully');

      // Close database connections and other cleanup
      cleanup()
        .then(() => {
          AppLogger.info('Cleanup completed, exiting process');
          process.exit(0);
        })
        .catch((cleanupError) => {
          AppLogger.error('Error during cleanup', {
            error: cleanupError.message,
          });
          process.exit(1);
        });
    });

    // Force shutdown after timeout
    setTimeout(() => {
      AppLogger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000); // 10 seconds timeout
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    AppLogger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    AppLogger.error('Unhandled promise rejection', {
      reason: reason?.message || reason,
      promise: promise.toString(),
    });
    process.exit(1);
  });
}

/**
 * Cleanup function for graceful shutdown
 */
async function cleanup() {
  try {
    // Close database connections
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$disconnect();
    AppLogger.info('Database connections closed');

    // Add other cleanup tasks here (Redis, message queues, etc.)

  } catch (error) {
    AppLogger.error('Error during cleanup', {
      error: error.message,
    });
    throw error;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
  validateEnvironment,
  setupGracefulShutdown,
  cleanup,
};
