const subscriptionRepository = require('../repositories/subscription.repository');
const subscriptionPlanRepository = require('../repositories/subscriptionPlan.repository');
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get all available subscription plans
 */
const getAvailablePlans = async () => {
  return await subscriptionPlanRepository.findAllActive();
};

/**
 * Get plan by slug
 */
const getPlanBySlug = async (slug) => {
  const plan = await subscriptionPlanRepository.findBySlug(slug);
  
  if (!plan) {
    const error = new Error('Plan not found');
    error.statusCode = 404;
    error.code = 'PLAN_NOT_FOUND';
    throw error;
  }
  
  return plan;
};

/**
 * Get tenant's current subscription
 */
const getCurrentSubscription = async (tenantId) => {
  return await subscriptionRepository.findActiveByTenantId(tenantId);
};

/**
 * Get subscription history
 */
const getSubscriptionHistory = async (tenantId) => {
  return await subscriptionRepository.findAllByTenantId(tenantId);
};

/**
 * Subscribe tenant to a plan
 */
const subscribeToPlan = async (tenantId, planSlug, billingCycle = 'monthly', userId = null) => {
  return await db.transaction(async (client) => {
    // Get the plan
    const plan = await subscriptionPlanRepository.findBySlug(planSlug);
    
    if (!plan) {
      const error = new Error('Plan not found');
      error.statusCode = 404;
      error.code = 'PLAN_NOT_FOUND';
      throw error;
    }
    
    // Check if tenant already has an active subscription
    const existing = await subscriptionRepository.findActiveByTenantId(tenantId);
    
    if (existing) {
      const error = new Error('Tenant already has an active subscription. Please cancel or upgrade existing subscription.');
      error.statusCode = 409;
      error.code = 'SUBSCRIPTION_EXISTS';
      throw error;
    }
    
    // Calculate period dates
    const periodStart = new Date();
    const periodEnd = new Date();
    
    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    
    // Create subscription
    const subscription = await subscriptionRepository.create({
      tenant_id: tenantId,
      plan_id: plan.id,
      status: 'active',
      billing_cycle: billingCycle,
      current_period_start: periodStart.toISOString().split('T')[0],
      current_period_end: periodEnd.toISOString().split('T')[0],
      next_payment_date: periodEnd,
      metadata: {
        created_by: userId,
        initial_plan: plan.slug
      }
    });
    
    // Log event
    await logSubscriptionEvent(tenantId, subscription.id, 'created', null, plan.id, userId, 'Initial subscription');
    
    logger.info('Subscription created', {
      tenantId,
      planSlug,
      subscriptionId: subscription.id
    });
    
    return subscription;
  });
};

/**
 * Upgrade subscription to a higher tier
 */
/**
 * Upgrade subscription to a higher tier
 */
const upgradeSubscription = async (tenantId, newPlanSlug, userId = null) => {
  return await db.transaction(async (client) => {
    // Get current subscription
    const currentSub = await subscriptionRepository.findActiveByTenantId(tenantId);
    
    if (!currentSub) {
      const error = new Error('No active subscription found');
      error.statusCode = 404;
      error.code = 'NO_SUBSCRIPTION';
      throw error;
    }
    
    // Get new plan
    const newPlan = await subscriptionPlanRepository.findBySlug(newPlanSlug);
    
    if (!newPlan) {
      const error = new Error('Plan not found');
      error.statusCode = 404;
      error.code = 'PLAN_NOT_FOUND';
      throw error;
    }
    
    // Get current plan details for comparison
    const currentPlan = await subscriptionPlanRepository.findById(currentSub.plan_id);
    
    if (!currentPlan) {
      const error = new Error('Current plan not found');
      error.statusCode = 404;
      error.code = 'CURRENT_PLAN_NOT_FOUND';
      throw error;
    }
    
    // Validate it's an upgrade (higher price)
    const currentPrice = currentSub.billing_cycle === 'yearly' 
      ? parseFloat(currentPlan.price_yearly) 
      : parseFloat(currentPlan.price_monthly);
      
    const newPrice = currentSub.billing_cycle === 'yearly'
      ? parseFloat(newPlan.price_yearly)
      : parseFloat(newPlan.price_monthly);
    
    if (newPrice <= currentPrice) {
      const error = new Error('Use downgrade endpoint for moving to a lower tier');
      error.statusCode = 400;
      error.code = 'INVALID_UPGRADE';
      throw error;
    }
    
    // Update subscription
    const updated = await subscriptionRepository.update(currentSub.id, tenantId, {
      plan_id: newPlan.id
    });
    
    // Log event
    await logSubscriptionEvent(
      tenantId, 
      currentSub.id, 
      'upgraded', 
      currentSub.plan_id, 
      newPlan.id, 
      userId, 
      `Upgraded from ${currentPlan.slug} to ${newPlanSlug}`
    );
    
    logger.info('Subscription upgraded', {
      tenantId,
      from: currentPlan.slug,
      to: newPlanSlug,
      fromPrice: currentPrice,
      toPrice: newPrice
    });
    
    return updated;
  });
};

/**
 * Downgrade subscription to a lower tier
 */
/**
 * Downgrade subscription to a lower tier
 */
const downgradeSubscription = async (tenantId, newPlanSlug, userId = null) => {
  return await db.transaction(async (client) => {
    // Get current subscription
    const currentSub = await subscriptionRepository.findActiveByTenantId(tenantId);
    
    if (!currentSub) {
      const error = new Error('No active subscription found');
      error.statusCode = 404;
      error.code = 'NO_SUBSCRIPTION';
      throw error;
    }
    
    // Get new plan
    const newPlan = await subscriptionPlanRepository.findBySlug(newPlanSlug);
    
    if (!newPlan) {
      const error = new Error('Plan not found');
      error.statusCode = 404;
      error.code = 'PLAN_NOT_FOUND';
      throw error;
    }
    
    // Get current plan details for comparison
    const currentPlan = await subscriptionPlanRepository.findById(currentSub.plan_id);
    
    if (!currentPlan) {
      const error = new Error('Current plan not found');
      error.statusCode = 404;
      error.code = 'CURRENT_PLAN_NOT_FOUND';
      throw error;
    }
    
    // Validate it's a downgrade (lower price)
    const currentPrice = currentSub.billing_cycle === 'yearly' 
      ? parseFloat(currentPlan.price_yearly) 
      : parseFloat(currentPlan.price_monthly);
      
    const newPrice = currentSub.billing_cycle === 'yearly'
      ? parseFloat(newPlan.price_yearly)
      : parseFloat(newPlan.price_monthly);
    
    if (newPrice >= currentPrice) {
      const error = new Error('Use upgrade endpoint for moving to a higher tier');
      error.statusCode = 400;
      error.code = 'INVALID_DOWNGRADE';
      throw error;
    }
    
    // Update subscription
    const updated = await subscriptionRepository.update(currentSub.id, tenantId, {
      plan_id: newPlan.id
    });
    
    // Log event
    await logSubscriptionEvent(
      tenantId,
      currentSub.id,
      'downgraded',
      currentSub.plan_id,
      newPlan.id,
      userId,
      `Downgraded from ${currentPlan.slug} to ${newPlanSlug}`
    );
    
    logger.info('Subscription downgraded', {
      tenantId,
      from: currentPlan.slug,
      to: newPlanSlug,
      fromPrice: currentPrice,
      toPrice: newPrice
    });
    
    return updated;
  });
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (tenantId, cancelImmediately = false, reason = '', userId = null) => {
  const subscription = await subscriptionRepository.findActiveByTenantId(tenantId);
  
  if (!subscription) {
    const error = new Error('No active subscription found');
    error.statusCode = 404;
    error.code = 'NO_SUBSCRIPTION';
    throw error;
  }
  
  if (cancelImmediately) {
    // Cancel immediately
    const updated = await subscriptionRepository.update(subscription.id, tenantId, {
      status: 'cancelled',
      cancelled_at: new Date(),
      cancellation_reason: reason
    });
    
    await logSubscriptionEvent(
      tenantId,
      subscription.id,
      'cancelled',
      subscription.plan_id,
      null,
      userId,
      reason || 'Immediate cancellation'
    );
    
    return updated;
  } else {
    // Cancel at period end
    const updated = await subscriptionRepository.update(subscription.id, tenantId, {
      cancel_at_period_end: true,
      cancellation_reason: reason
    });
    
    await logSubscriptionEvent(
      tenantId,
      subscription.id,
      'scheduled_cancellation',
      subscription.plan_id,
      null,
      userId,
      reason || 'Scheduled cancellation at period end'
    );
    
    return updated;
  }
};

/**
 * Helper: Log subscription event
 */
const logSubscriptionEvent = async (tenantId, subscriptionId, eventType, oldPlanId, newPlanId, userId, reason) => {
  const query = `
    INSERT INTO subscription_events 
    (tenant_id, subscription_id, event_type, old_plan_id, new_plan_id, performed_by, reason)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  
  const values = [tenantId, subscriptionId, eventType, oldPlanId, newPlanId, userId, reason];
  
  try {
    await db.query(query, values, tenantId);
  } catch (error) {
    logger.error('Failed to log subscription event', { error: error.message, tenantId });
  }
};

module.exports = {
  getAvailablePlans,
  getPlanBySlug,
  getCurrentSubscription,
  getSubscriptionHistory,
  subscribeToPlan,
  upgradeSubscription,
  downgradeSubscription,
  cancelSubscription
};