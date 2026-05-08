const request = require('supertest');
const app = require('../../src/app');
const { Pool } = require('pg');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken } = require('../../src/utils/jwt');

// Create a real database connection for integration tests
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5433,
  database: process.env.DB_NAME || 'saas_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'shashi',
  max: 5
});

// Helper to create test tenant
const createTestTenant = async () => {
  const tenantData = {
    name: `Test Tenant ${Date.now()}`,
    subdomain: `test-${Date.now()}`,
    is_active: true
  };

  const result = await pool.query(
    'INSERT INTO tenants (name, subdomain, is_active) VALUES ($1, $2, $3) RETURNING *',
    [tenantData.name, tenantData.subdomain, tenantData.is_active]
  );

  return result.rows[0];
};

// Helper to create test user
const createTestUser = async (tenantId, role = 'admin') => {
  const passwordHash = await hashPassword('TestPassword123!');
  
  const userData = {
    tenant_id: tenantId,
    email: `test-${Date.now()}@example.com`,
    password_hash: passwordHash,
    first_name: 'Test',
    last_name: 'User',
    role,
    is_active: true
  };

  const result = await pool.query(
    `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userData.tenant_id, userData.email, userData.password_hash, userData.first_name, userData.last_name, userData.role, userData.is_active]
  );

  return result.rows[0];
};

// Helper to generate auth token
const getAuthToken = (user) => {
  return generateAccessToken({
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role
  });
};

// Helper to clean up test data
const cleanupTestData = async (tenantId) => {
  if (!tenantId) return;
  
  try {
    // Delete in correct order (respecting foreign keys)
    await pool.query('DELETE FROM usage_records WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM usage_aggregates WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM subscription_events WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM subscriptions WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM resources WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM users WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
};

module.exports = {
  app,
  request,
  createTestTenant,
  createTestUser,
  getAuthToken,
  cleanupTestData,
  pool
};
