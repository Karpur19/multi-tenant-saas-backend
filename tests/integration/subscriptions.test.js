const { app, request, createTestTenant, createTestUser, getAuthToken, cleanupTestData } = require('./helpers');

describe('Subscription API Integration Tests', () => {
  let testTenant;
  let testUser;
  let authToken;

  beforeAll(async () => {
    testTenant = await createTestTenant();
    testUser = await createTestUser(testTenant.id);
    authToken = getAuthToken(testUser);
  });

  afterAll(async () => {
    await cleanupTestData(testTenant.id);
  });

  describe('GET /api/v1/subscriptions/plans', () => {
    test('should get all subscription plans without auth', async () => {
      const response = await request(app)
        .get('/api/v1/subscriptions/plans');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.plans).toBeDefined();
      expect(Array.isArray(response.body.data.plans)).toBe(true);
      expect(response.body.data.plans.length).toBeGreaterThan(0);
    });

    test('should return plans with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/subscriptions/plans');

      const plan = response.body.data.plans[0];
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('slug');
      expect(plan).toHaveProperty('price_monthly');
      expect(plan).toHaveProperty('price_yearly');
      expect(plan).toHaveProperty('features');
      expect(plan).toHaveProperty('limits');
    });
  });

  describe('POST /api/v1/subscriptions/subscribe', () => {
    test('should subscribe to a plan successfully', async () => {
      const response = await request(app)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planSlug: 'free',
          billingCycle: 'monthly'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription).toBeDefined();
      expect(response.body.data.subscription.status).toBe('active');
    });

    test('should fail to subscribe without auth', async () => {
      const response = await request(app)
        .post('/api/v1/subscriptions/subscribe')
        .send({
          planSlug: 'free',
          billingCycle: 'monthly'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should fail with invalid plan slug', async () => {
      const response = await request(app)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planSlug: 'nonexistent-plan',
          billingCycle: 'monthly'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PLAN_NOT_FOUND');
    });
  });

  describe('GET /api/v1/subscriptions/current', () => {
    test('should get current subscription after subscribing', async () => {
      const response = await request(app)
        .get('/api/v1/subscriptions/current')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription).toBeDefined();
      expect(response.body.data.subscription.status).toBe('active');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/subscriptions/current');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
