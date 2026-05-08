// Integration test setup - uses REAL database
require('dotenv').config();

// Verify environment variables are loaded
if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD not found in environment');
}

// Set test mode but keep real database credentials
process.env.NODE_ENV = 'integration-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key';

// Increase timeout for real database operations
jest.setTimeout(30000);

// No global database cleanup - each test handles its own
