const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Validates JWT tokens from Authorization header or cookies
 */
const authenticateToken = (req, res, next) => {
  // Try to get token from Authorization header first
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // If no token in header, try to get from cookies (for refresh token scenarios)
  if (!token && req.cookies) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Access token is required',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      let errorCode = 'INVALID_TOKEN';
      let message = 'Invalid or expired token';

      if (err.name === 'TokenExpiredError') {
        errorCode = 'TOKEN_EXPIRED';
        message = 'Token has expired';
      } else if (err.name === 'JsonWebTokenError') {
        errorCode = 'MALFORMED_TOKEN';
        message = 'Malformed token';
      }

      return res.status(403).json({
        success: false,
        error: {
          code: errorCode,
          message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }

    // Add user info to request object
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  });
};

/**
 * Optional Authentication Middleware
 * Similar to authenticateToken but doesn't fail if no token is provided
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.cookies) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    // No token provided, continue without user info
    return next();
  }

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (!err && decoded) {
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    }
    // Continue regardless of token validity for optional auth
    next();
  });
};

module.exports = {
  authenticateToken,
  optionalAuth,
};
