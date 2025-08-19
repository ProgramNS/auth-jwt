const helmet = require('helmet');

/**
 * Security Headers Configuration using Helmet
 * Configures various HTTP security headers
 */

/**
 * Basic Helmet Configuration
 * Applies essential security headers
 */
const basicSecurity = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
      imgSrc: ['\'self\'', 'data:', 'https:'],
      scriptSrc: ['\'self\''],
      connectSrc: ['\'self\''],
      frameSrc: ['\'none\''],
      objectSrc: ['\'none\''],
      mediaSrc: ['\'self\''],
      manifestSrc: ['\'self\''],
    },
  },

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Disabled for API compatibility

  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: 'same-origin' },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },

  // Frame Options
  frameguard: { action: 'deny' },

  // Hide Powered-By Header
  hidePoweredBy: true,

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // IE No Open
  ieNoOpen: true,

  // No Sniff
  noSniff: true,

  // Origin Agent Cluster
  originAgentCluster: true,

  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: false,

  // Referrer Policy
  referrerPolicy: { policy: 'no-referrer' },

  // X-XSS-Protection
  xssFilter: true,
});

/**
 * Development Security Configuration
 * More relaxed settings for development
 */
const devSecurity = helmet({
  contentSecurityPolicy: false, // Disabled in development for easier debugging
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: true },
  frameguard: { action: 'sameorigin' },
  hidePoweredBy: true,
  hsts: false, // Disabled in development (no HTTPS)
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'no-referrer-when-downgrade' },
  xssFilter: true,
});

/**
 * API-Specific Security Configuration
 * Optimized for API endpoints
 */
const apiSecurity = helmet({
  contentSecurityPolicy: false, // Not needed for API endpoints
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true,
});

/**
 * Get Security Middleware based on environment
 */
const getSecurityMiddleware = () => {
  if (process.env.NODE_ENV === 'development') {
    return devSecurity;
  } else if (process.env.NODE_ENV === 'production') {
    return basicSecurity;
  }
  return apiSecurity;
};

/**
 * Custom Security Headers Middleware
 * Adds additional custom security headers
 */
const customSecurityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');

  // Add custom security headers
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Cache control for sensitive endpoints
  if (req.path.includes('/auth/') || req.path.includes('/users/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  next();
};

module.exports = {
  basicSecurity,
  devSecurity,
  apiSecurity,
  getSecurityMiddleware,
  customSecurityHeaders,
};
