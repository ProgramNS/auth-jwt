#!/usr/bin/env node

/**
 * Development Server Startup Script
 * Demonstrates the server startup with proper environment setup
 */

const { startServer } = require('../src/server');
const { AppLogger } = require('../src/config/logger');

// Set development environment variables for demo
process.env.NODE_ENV = 'development';
process.env.DATABASE_URL = 'mysql://auth_user:auth_password@localhost:3306/auth_db';
process.env.JWT_ACCESS_SECRET = 'demo-access-secret-key-for-development-only';
process.env.JWT_REFRESH_SECRET = 'demo-refresh-secret-key-for-development-only';
process.env.PORT = '3000';

AppLogger.info('Starting development server with demo configuration...');
AppLogger.info('Note: This is for demonstration purposes only');
AppLogger.info('In production, use proper environment variables from .env file');

startServer().catch((error) => {
  AppLogger.error('Failed to start development server', {
    error: error.message,
  });
  process.exit(1);
});