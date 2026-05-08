const subscriptionService = require('../services/subscription.service');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Get all available subscription plans
 * GET /api/v1/subscriptions/plans
 */
const getPlans = async (req, res) => {
  try {
    const plans = await subscriptionService.getAvailablePlans();
    
    return success(res, { plans });
  } catch (err) {
    logger.error('Get plans error', { error: err.message });
    return error(res, err.message, err.code || 'INTERNAL_ERROR', err.statusCode || 500);
  }
};

/**
 * Get specific plan by slug
 * GET /api/v1/subscriptions/plans/:slug
 */
const getPlanBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const plan = await subscriptionService.getPlanBySlug(slug);
    
    return success(res, { plan });
  } catch (err) {
    logger.error('Get plan error', { error: err.message, slug: req.params.slug });
    return error(res, err.message, err.code || 'INTERNAL_ERROR', err.statusCode || 500);
  }
};

/**
 * Get current subscription for tenant
 * GET /api/v1/subscriptions/current
 */
const getCurrentSubscription = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const subscription = await subscriptionService.getCurrentSubscription(tenantId);
    
    if (!subscription) {
      return success(res, {
        subscription: null,
        message: 'No active subscription found'
      });
    }
    
    return success(res, { subscription });
  } catch (err) {
    logger.error('Get current subscription error', { 
      error: err.message, 
      tenantId: req.user.tenantId 
    });
    return error(res, err.message, err.code || 'INTERNAL_ERROR', err.statusCode || 500);
  }
};

/**
 * Get subscription history for tenant
 * GET /api/v1/subscriptions/history
 */
const getSubscriptionHistory = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const history = await subscriptionService.getSubscriptionHistory(tenantId);
    
    return success(res, {
      subscriptions: history,
      count: history.length
    });
  } catch (err) {
    logger.error('Get subscription history error', { 
      error: err.message, 
      tenantId: req.user.tenantId 
    });
    return error(res, err.message, err.code || 'INTERNAL_ERROR', err.statusCode || 500);
  }
};

/**
 * Subscribe to a plan
 * POST /api/v1/subscriptions/subscribe
 * Body: { planSlug, billingCycle }
 */
const subscribe = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const { planSlug, billingCycle } = req.body;
    
    // Validation
    if (!planSlug) {
      return error(res, 'Plan slug is required', 'MISSING_PLAN_SLUG', 400);
    }
    
    if (billingCycle && !['monthly', 'yearly'].includes(billingCycle)) {
      return error(res, 'Billing cycle must be monthly or yearly', 'INVALID_BILLING_CYCLE', 400);
    }
    
    const subscription = await subscriptionService.subscribeToPlan(
      tenantId, 
      planSlug, 
      billingCycle || 'monthly',
      userId
    );
    
    return success(res, { subscription }, 201);
  } catch (err) {
    logger.error('Subscribe error', { 
      error: err.message, 
      tenantId: req.user.tenantId,
      planSlug: req.body.planSlug
    });
    return error(res, err.message, err.code || 'INTERNAL_ERROR', err.statusCode || 500);
  }
};

/**
 * Upgrade subscription
 * PUT /api/v1/subscriptions/upgrade
 * Body: { planSlug }
 */
const upgrade = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const { planSlug } = req.body;
    
    if (!planSlug) {
      return error(res, 'Plan slug is required', 'MISSING_PLAN_SLUG', 400);
    }
    
    const subscription = await subscriptionService.upgradeSubscription(
      tenantId,
      planSlug,
      userId
    );
    
    return success(res, { subscription });
  } catch (err) {
    logger.error('Upgrade error', { 
      error: err.message, 
      tenantId: req.user.tenantId,
      planSlug: req.body.planSlug
    });
    return error(res, err.message, err.code || 'INTERNAL_ERROR', err.statusCode || 500);
  }
};

/**
 * Downgrade subscription
 * PUT /api/v1/subscriptions/downgrade
 * Body: { planSlug }
 */
const downgrade = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const { planSlug } = req.body;
    
    if (!planSlug) {
      return error(res, 'Plan slug is required', 'MISSING_PLAN_SLUG', 400);
    }
    
    const subscription = await subscriptionService.downgradeSubscription(
      tenantId,
      planSlug,
      userId
    );
    
    return success(res, { subscription });
  } catch (err) {
    logger.error('Downgrade error', { 
      error: err.message, 
      tenantId: req.user.tenantId,
      planSlug: req.body.planSlug
    });
    return error(res, err.message, err.code || 'INTERNAL_ERROR', err.statusCode || 500);
  }
};

/**
 * Cancel subscription
 * DELETE /api/v1/subscriptions/cancel
 * Body: { cancelImmediately, reason }
 */
const cancel = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const { cancelImmediately, reason } = req.body;
    
    const subscription = await subscriptionService.cancelSubscription(
      tenantId,
      cancelImmediately || false,
      reason || '',
      userId
    );
    
    return success(res, {
      subscription,
      message: cancelImmediately 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will be cancelled at the end of billing period'
    });
  } catch (err) {
    logger.error('Cancel subscription error', { 
      error: err.message, 
      tenantId: req.user.tenantId
    });
    return error(res, err.message, err.code || 'INTERNAL_ERROR', err.statusCode || 500);
  }
};

module.exports = {
  getPlans,
  getPlanBySlug,
  getCurrentSubscription,
  getSubscriptionHistory,
  subscribe,
  upgrade,
  downgrade,
  cancel
};