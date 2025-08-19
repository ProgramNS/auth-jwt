#!/usr/bin/env node

/**
 * Test runner script for CI/CD and development
 */

const { execSync } = require('child_process');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';
const watch = args.includes('--watch');
const coverage = args.includes('--coverage');
const ci = args.includes('--ci');

// Test commands
const commands = {
  unit: 'jest --selectProjects unit',
  integration: 'jest --selectProjects integration',
  all: 'jest',
  coverage: 'jest --coverage',
  ci: 'jest --ci --coverage --watchAll=false',
};

// Build command
let command = commands[testType] || commands.all;

if (watch && !ci) {
  command += ' --watch';
}

if (coverage && !ci) {
  command += ' --coverage';
}

if (ci) {
  command = commands.ci;
}

console.log(`Running tests: ${command}`);

try {
  // Set environment variables
  process.env.NODE_ENV = 'test';
  // Run the command
  execSync(command, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });
  console.log('Tests completed successfully!');
} catch (error) {
  console.error('Tests failed:', error.message);
  process.exit(1);
}
