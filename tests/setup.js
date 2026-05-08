// Test setup and global configurations

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';

// Mock database password for tests
process.env.DB_PASSWORD = 'test-password';

// Increase timeout for database operations
jest.setTimeout(10000);

// Mock the database module for unit tests
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
  end: jest.fn().mockResolvedValue(undefined)
}));

// Global test utilities
global.testHelpers = {
  // Add helper functions here if needed
};
