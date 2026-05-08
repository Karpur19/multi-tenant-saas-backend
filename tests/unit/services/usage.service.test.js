const usageService = require('../../../src/services/usage.service');
const usageRepository = require('../../../src/repositories/usage.repository');
const subscriptionRepository = require('../../../src/repositories/subscription.repository');

// Mock the repositories
jest.mock('../../../src/repositories/usage.repository');
jest.mock('../../../src/repositories/subscription.repository');

describe('Usage Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getCurrentUsage', () => {
    test('should return usage data for active subscription', async () => {
      const tenantId = 'test-tenant-id';
      const mockSubscription = {
        id: 'sub-id',
        current_period_start: '2026-03-01',
        current_period_end: '2026-04-01',
        plan_limits: { api_calls: 1000 }
      };

      subscriptionRepository.findActiveByTenantId.mockResolvedValue(mockSubscription);
      usageRepository.getCurrentPeriodUsage.mockResolvedValue(100);

      const result = await usageService.getCurrentUsage(tenantId, 'api_calls');

      expect(result).toEqual({
        usage: 100,
        limit: 1000,
        percentage: 10,
        remaining: 900,
        period_start: '2026-03-01',
        period_end: '2026-04-01',
        reset_date: '2026-04-01'
      });
    });

    test('should return zero usage when no subscription', async () => {
      const tenantId = 'test-tenant-id';

      subscriptionRepository.findActiveByTenantId.mockResolvedValue(null);

      const result = await usageService.getCurrentUsage(tenantId, 'api_calls');

      expect(result).toEqual({
        usage: 0,
        limit: 0,
        percentage: 0,
        remaining: 0
      });
    });
  });

  describe('hasExceededLimit', () => {
    test('should return exceeded true when usage >= limit', async () => {
      const tenantId = 'test-tenant-id';
      const mockSubscription = {
        id: 'sub-id',
        current_period_start: '2026-03-01',
        current_period_end: '2026-04-01',
        plan_limits: { api_calls: 100 }
      };

      subscriptionRepository.findActiveByTenantId.mockResolvedValue(mockSubscription);
      usageRepository.getCurrentPeriodUsage.mockResolvedValue(100);

      const result = await usageService.hasExceededLimit(tenantId, 'api_calls');

      expect(result.exceeded).toBe(true);
      expect(result.usage).toBe(100);
      expect(result.limit).toBe(100);
    });

    test('should return exceeded false when usage < limit', async () => {
      const tenantId = 'test-tenant-id';
      const mockSubscription = {
        id: 'sub-id',
        current_period_start: '2026-03-01',
        current_period_end: '2026-04-01',
        plan_limits: { api_calls: 1000 }
      };

      subscriptionRepository.findActiveByTenantId.mockResolvedValue(mockSubscription);
      usageRepository.getCurrentPeriodUsage.mockResolvedValue(50);

      const result = await usageService.hasExceededLimit(tenantId, 'api_calls');

      expect(result.exceeded).toBe(false);
      expect(result.usage).toBe(50);
      expect(result.limit).toBe(1000);
      expect(result.remaining).toBe(950);
    });

    test('should return exceeded true when no subscription', async () => {
      const tenantId = 'test-tenant-id';

      subscriptionRepository.findActiveByTenantId.mockResolvedValue(null);

      const result = await usageService.hasExceededLimit(tenantId, 'api_calls');

      expect(result.exceeded).toBe(true);
      expect(result.reason).toBe('No active subscription');
    });

    test('should handle unlimited limit (-1)', async () => {
      const tenantId = 'test-tenant-id';
      const mockSubscription = {
        id: 'sub-id',
        current_period_start: '2026-03-01',
        current_period_end: '2026-04-01',
        plan_limits: { api_calls: -1 }
      };

      subscriptionRepository.findActiveByTenantId.mockResolvedValue(mockSubscription);

      const result = await usageService.hasExceededLimit(tenantId, 'api_calls');

      expect(result.exceeded).toBe(false);
      expect(result.limit).toBe(-1);
    });
  });
});
