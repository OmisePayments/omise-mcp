/**
 * Test Setup Configuration
 * 
 * Global test setup and configuration for the Omise MCP server tests.
 */

import { jest } from '@jest/globals';

// Global test timeout (redundant with package.json but kept for explicit setup)
jest.setTimeout(30000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.OMISE_SECRET_KEY = 'test-secret-key';
process.env.OMISE_API_URL = 'https://api.omise.co';
process.env.LOG_LEVEL = 'error';
process.env.AUDIT_LOGGING = 'true';
process.env.RATE_LIMIT_PER_MINUTE = '1000';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
process.env.SIGNING_KEY = 'test-signing-key-32-characters-long';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.CERT_PATH = './test-certs';
process.env.CERTIFICATE_VALIDITY_DAYS = '365';
process.env.KEY_SIZE = '2048';

// Global test hooks
beforeAll(() => {
  // Global setup before all tests
  console.log('Setting up test environment...');
});

afterAll(() => {
  // Global cleanup after all tests
  console.log('Cleaning up test environment...');
});

beforeEach(() => {
  // Setup before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  jest.clearAllTimers();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Mock console methods in test environment to reduce noise
if (process.env.NODE_ENV === 'test') {
  const originalConsole = { ...console };
  
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  // Restore console for test failures
  afterEach(() => {
    const currentTestName = expect.getState().currentTestName;
    if (currentTestName && currentTestName.includes('should')) {
      global.console = originalConsole;
    }
  });
}
