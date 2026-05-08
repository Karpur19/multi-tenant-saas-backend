const usageService = require('../services/usage.service');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Get current usage for tenant
 * GET /api/v1/usage/current
 */
const getCurrentUsage = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { metric } = req.query;
    
    const usage = await usageService.getCurrentUsage(
      tenantId, 
      metric || 'api_calls'
    );
    
    return success(res, { usage });
  } catch (err) {
    logger.error('Get current usage error', {
      error: err.message,
      tenantId: req.user.tenantId
    });
    return error(res, err.message, err.code || 'INTERNAL_ERROR', err.statusCode || 500);
  }
};

/**
 * Get usage analytics
 * GET /api/v1/usage/analytics
 */
const getAnalytics = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    
    const analytics = await usageService.getUsageAnalytics(tenantId);
    
    if (!analytics) {
      return error(res, 'No active subscription found', 'NO_SUBSCRIPTION', 404);
    }
    
    return success(res, { analytics });
  } catch (err) {
    logger.error('Get usage analytics error', {
      error: err.message,
      tenantId: req.user.tenantId
    });
    return error(res, err.message, err.code || 'INTERNAL_ERROR', err.statusCode || 500);
  }
};

/**
 * Get usage history
 * GET /api/v1/usage/history
 */
const getHistory = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { metric, days } = req.query;
    
    const history = await usageService.getUsageHistory(
      tenantId,
      metric || 'api_calls',
      parseInt(days) || 30
    );
    
    return success(res, {
      history,
      metric: metric || 'api_calls',
      days: parseInt(days) || 30
    });
  } catch (err) {
    logger.error('Get usage history error', {
      error: err.message,
      tenantId: req.user.tenantId
    });
    return error(res, err.message, err.code || 'INTERNAL_ERROR', err.statusCode || 500);
  }
};

module.exports = {
  getCurrentUsage,
  getAnalytics,
  getHistory
};
