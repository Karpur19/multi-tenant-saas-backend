const { app, request, createTestTenant, createTestUser, cleanupTestData, closePool } = require('./helpers');

describe('Authentication API Integration Tests', () => {
  let testTenant;
  let testUser;

  beforeAll(async () => {
    try {
      testTenant = await createTestTenant();
      testUser = await createTestUser(testTenant.id);
    } catch (error) {
      console.error('Setup error:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      if (testTenant?.id) {
        await cleanupTestData(testTenant.id);
      }
      // Note: closePool is called by subscriptions.test.js
      // Don't call it here to avoid closing the pool twice
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('POST /api/v1/auth/login', () => {
    test('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    test('should fail login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
