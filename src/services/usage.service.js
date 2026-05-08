const usageRepository = require('../repositories/usage.repository');
const subscriptionRepository = require('../repositories/subscription.repository');
const logger = require('../utils/logger');

/**
 * Record usage for a tenant
 */
const recordUsage = async (tenantId, metricType = 'api_calls', quantity = 1, metadata = {}) => {
  try {
    // Get active subscription to determine billing period
    const subscription = await subscriptionRepository.findActiveByTenantId(tenantId);
    
    if (!subscription) {
      logger.warn('No active subscription found for usage recording', { tenantId });
      return null;
    }
    
    const usageData = {
      tenant_id: tenantId,
      subscription_id: subscription.id,
      metric_type: metricType,
      quantity,
      recorded_at: new Date(),
      period_start: subscription.current_period_start,
      period_end: subscription.current_period_end,
      metadata
    };
    
    const usage = await usageRepository.recordUsage(usageData);
    
    // Also update aggregate (for performance)
    await usageRepository.upsertUsageAggregate(
      tenantId,
      subscription.id,
      metricType,
      new Date().toISOString().split('T')[0],
      quantity
    );
    
    return usage;
  } catch (error) {
    logger.error('Error recording usage', { 
      error: error.message, 
      tenantId, 
      metricType 
    });
    // Don't throw - we don't want to block API requests if usage tracking fails
    return null;
  }
};

/**
 * Get current usage for tenant
 */
const getCurrentUsage = async (tenantId, metricType = 'api_calls') => {
  const subscription = await subscriptionRepository.findActiveByTenantId(tenantId);
  
  if (!subscription) {
    return {
      usage: 0,
      limit: 0,
      percentage: 0,
      remaining: 0
    };
  }
  
  const usage = await usageRepository.getCurrentPeriodUsage(
    tenantId,
    metricType,
    subscription.current_period_start,
    subscription.current_period_end
  );
  
  const limit = subscription.plan_limits?.[metricType] || 0;
  const percentage = limit > 0 ? Math.round((usage / limit) * 100) : 0;
  const remaining = limit > 0 ? Math.max(0, limit - usage) : Infinity;
  
  return {
    usage,
    limit,
    percentage,
    remaining,
    period_start: subscription.current_period_start,
    period_end: subscription.current_period_end,
    reset_date: subscription.current_period_end
  };
};

/**
 * Check if tenant has exceeded limit
 */
const hasExceededLimit = async (tenantId, metricType = 'api_calls') => {
  const subscription = await subscriptionRepository.findActiveByTenantId(tenantId);
  
  if (!subscription) {
    // No subscription = block access
    return {
      exceeded: true,
      reason: 'No active subscription'
    };
  }
  
  const limit = subscription.plan_limits?.[metricType];
  
  // Unlimited (-1) or no limit set
  if (!limit || limit === -1) {
    return {
      exceeded: false,
      limit: -1,
      usage: 0
    };
  }
  
  const usage = await usageRepository.getCurrentPeriodUsage(
    tenantId,
    metricType,
    subscription.current_period_start,
    subscription.current_period_end
  );
  
  const exceeded = usage >= limit;
  
  return {
    exceeded,
    usage,
    limit,
    remaining: Math.max(0, limit - usage),
    percentage: Math.round((usage / limit) * 100)
  };
};

/**
 * Get usage analytics
 */
const getUsageAnalytics = async (tenantId) => {
  const subscription = await subscriptionRepository.findActiveByTenantId(tenantId);
  
  if (!subscription) {
    return null;
  }
  
  // Get current period usage
  const apiCallsUsage = await getCurrentUsage(tenantId, 'api_calls');
  
  // Get usage trend (last 30 days)
  const trend = await usageRepository.getUsageTrend(tenantId, 'api_calls', 30);
  
  // Get top endpoints
  const topEndpoints = await usageRepository.getUsageBreakdownByEndpoint(tenantId, 10);
  
  return {
    current_period: apiCallsUsage,
    trend,
    top_endpoints: topEndpoints,
    plan: {
      name: subscription.plan_name,
      slug: subscription.plan_slug,
      limits: subscription.plan_limits
    }
  };
};

/**
 * Get usage history
 */
const getUsageHistory = async (tenantId, metricType = 'api_calls', days = 30) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await usageRepository.getUsageByDateRange(
    tenantId,
    metricType,
    startDate.toISOString(),
    endDate.toISOString()
  );
};

module.exports = {
  recordUsage,
  getCurrentUsage,
  hasExceededLimit,
  getUsageAnalytics,
  getUsageHistory
};
