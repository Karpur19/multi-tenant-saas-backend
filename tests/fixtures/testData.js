const crypto = require('crypto');

// Generate unique IDs for tests
const generateId = () => crypto.randomUUID();

// Test tenant data
const testTenant = {
  id: generateId(),
  name: 'Test Company Inc',
  subdomain: 'test-company',
  is_active: true
};

// Test user data
const testUser = {
  id: generateId(),
  tenant_id: testTenant.id,
  email: 'test@example.com',
  password: 'TestPassword123!',
  first_name: 'Test',
  last_name: 'User',
  role: 'admin',
  is_active: true
};

// Test subscription plan
const testPlan = {
  id: generateId(),
  name: 'Test Plan',
  slug: 'test-plan',
  price_monthly: 99.00,
  price_yearly: 990.00,
  features: ['Feature 1', 'Feature 2'],
  limits: {
    api_calls: 10000,
    storage_gb: 100,
    users: 10
  }
};

// Test subscription
const testSubscription = {
  id: generateId(),
  tenant_id: testTenant.id,
  plan_id: testPlan.id,
  status: 'active',
  billing_cycle: 'monthly',
  current_period_start: new Date().toISOString().split('T')[0],
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
};

module.exports = {
  testTenant,
  testUser,
  testPlan,
  testSubscription,
  generateId
};
