/**
 * Morgan Logging Configuration
 * Provides structured logging for HTTP requests and application events
 */

const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

/**
 * Custom Morgan token for request ID (if available)
 */
morgan.token('id', (req) => req.id || 'N/A');

/**
 * Custom Morgan token for user ID (if authenticated)
 */
morgan.token('user', (req) => {
  return req.user ? req.user.id : 'anonymous';
});

/**
 * Custom Morgan token for response time in milliseconds
 */
morgan.token('response-time-ms', (req, res) => {
  const responseTime = morgan['response-time'](req, res);
  return responseTime ? `${responseTime}ms` : 'N/A';
});

/**
 * Custom Morgan token for request body size
 */
morgan.token('req-size', (req) => {
  return req.get('content-length') || '0';
});

/**
 * Custom Morgan token for response body size
 */
morgan.token('res-size', (req, res) => {
  return res.get('content-length') || '0';
});

/**
 * Custom format for development logging
 */
const developmentFormat = ':method :url :status :response-time-ms - :res[content-length] bytes - User: :user';

/**
 * Custom format for production logging (JSON)
 */
const productionFormat = JSON.stringify({
  timestamp: ':date[iso]',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time-ms',
  userAgent: ':user-agent',
  ip: ':remote-addr',
  userId: ':user',
  requestId: ':id',
  requestSize: ':req-size',
  responseSize: ':res-size',
  referrer: ':referrer',
});

/**
 * Create logs directory if it doesn't exist
 */
function ensureLogDirectory() {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

/**
 * Create write stream for log files
 */
function createLogStream(filename) {
  const logDir = ensureLogDirectory();
  return fs.createWriteStream(path.join(logDir, filename), { flags: 'a' });
}

/**
 * Skip function for logging - skip successful requests in production
 */
function skipSuccessfulRequests(req, res) {
  // In production, only log errors and warnings
  if (process.env.NODE_ENV === 'production') {
    return res.statusCode < 400;
  }
  return false;
}

/**
 * Skip function for error logging - only log errors
 */
// Helper function for filtering non-error logs (currently unused but kept for future use)
// function skipNonErrors(_req, res) {
//   return res.statusCode < 400;
// }

/**
 * Get Morgan middleware configuration based on environment
 */
function getMorganMiddleware() {
  const middlewares = [];

  if (process.env.NODE_ENV === 'production') {
    // Production: JSON format to file and console
    middlewares.push(
      morgan(productionFormat, {
        stream: createLogStream('access.log'),
      }),
    );

    // Error logs to separate file
    middlewares.push(
      morgan(productionFormat, {
        skip: skipSuccessfulRequests,
        stream: createLogStream('error.log'),
      }),
    );

    // Console logging for errors only
    middlewares.push(
      morgan('combined', {
        skip: skipSuccessfulRequests,
      }),
    );
  } else {
    // Development: colorful console output
    middlewares.push(
      morgan(developmentFormat, {
        // Custom color function
        stream: {
          write: (message) => {
            // Color code based on status
            const status = message.match(/\s(\d{3})\s/)?.[1];
            let coloredMessage = message;

            if (status) {
              if (status.startsWith('2')) {
                coloredMessage = `\x1b[32m${message}\x1b[0m`; // Green for 2xx
              } else if (status.startsWith('3')) {
                coloredMessage = `\x1b[36m${message}\x1b[0m`; // Cyan for 3xx
              } else if (status.startsWith('4')) {
                coloredMessage = `\x1b[33m${message}\x1b[0m`; // Yellow for 4xx
              } else if (status.startsWith('5')) {
                coloredMessage = `\x1b[31m${message}\x1b[0m`; // Red for 5xx
              }
            }

            process.stdout.write(coloredMessage);
          },
        },
      }),
    );

    // Also log to file in development for debugging
    middlewares.push(
      morgan('combined', {
        stream: createLogStream('development.log'),
      }),
    );
  }

  return middlewares;
}

/**
 * Application logger for non-HTTP events
 */
class AppLogger {
  static log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta,
    };

    // Console output
    const colorMap = {
      error: '\x1b[31m',   // Red
      warn: '\x1b[33m',    // Yellow
      info: '\x1b[36m',    // Cyan
      debug: '\x1b[35m',   // Magenta
    };

    const color = colorMap[level] || '';
    const reset = '\x1b[0m';

    console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${reset}`);

    if (meta && Object.keys(meta).length > 0) {console.log(`${color}Meta: ${JSON.stringify(meta, null, 2)}${reset}`);}

    // File output in production
    if (process.env.NODE_ENV === 'production') {
      const logDir = ensureLogDirectory();
      const logFile = level === 'error' ? 'app-error.log' : 'app.log';
      const logPath = path.join(logDir, logFile);

      fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    }
  }

  static error(message, meta = {}) {
    this.log('error', message, meta);
  }

  static warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  static info(message, meta = {}) {
    this.log('info', message, meta);
  }

  static debug(message, meta = {}) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, meta);
    }
  }
}

module.exports = {
  getMorganMiddleware,
  AppLogger,
  createLogStream,
  ensureLogDirectory,
};
