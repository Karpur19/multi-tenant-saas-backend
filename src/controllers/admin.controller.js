const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Get overview statistics
 */
const getStats = async (req, res) => {
  try {
    // Get total counts
    const tenantsResult = await db.query('SELECT COUNT(*) as count FROM tenants WHERE is_active = true');
    const usersResult = await db.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
    const subscriptionsResult = await db.query('SELECT COUNT(*) as count FROM subscriptions WHERE status = $1', ['active']);
    
    // Get total API calls (safe query - returns 0 if table is empty)
    const usageResult = await db.query(`
      SELECT COALESCE(COUNT(*), 0) as total_calls
      FROM usage_records
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `);
    
    // Calculate MRR
    const revenueResult = await db.query(`
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN s.billing_cycle = 'monthly' THEN sp.price_monthly
            WHEN s.billing_cycle = 'yearly' THEN sp.price_yearly / 12
            ELSE 0
          END
        ), 0) as mrr
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status = 'active'
    `);

    const stats = {
      tenants: parseInt(tenantsResult.rows[0].count) || 0,
      users: parseInt(usersResult.rows[0].count) || 0,
      activeSubscriptions: parseInt(subscriptionsResult.rows[0].count) || 0,
      apiCalls: parseInt(usageResult.rows[0].total_calls) || 0,
      mrr: parseFloat(revenueResult.rows[0].mrr || 0).toFixed(2)
    };

    return successResponse(res, stats, 'Stats retrieved successfully');
  } catch (error) {
    logger.error('Get stats error', { error: error.message, stack: error.stack });
    return errorResponse(res, 'Failed to retrieve stats: ' + error.message, 500);
  }
};

/**
 * Get all tenants with subscription info
 */
const getTenants = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        t.id,
        t.name,
        t.subdomain,
        t.is_active,
        t.created_at,
        COUNT(DISTINCT u.id) as user_count,
        s.status as subscription_status,
        sp.name as plan_name,
        sp.slug as plan_slug,
        0 as total_api_calls
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id AND u.is_active = true
      LEFT JOIN subscriptions s ON t.id = s.tenant_id AND s.status = 'active'
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      GROUP BY t.id, t.name, t.subdomain, t.is_active, t.created_at, s.status, sp.name, sp.slug
      ORDER BY t.created_at DESC
    `);

    return successResponse(res, { tenants: result.rows }, 'Tenants retrieved successfully');
  } catch (error) {
    logger.error('Get tenants error', { error: error.message, stack: error.stack });
    return errorResponse(res, 'Failed to retrieve tenants: ' + error.message, 500);
  }
};

/**
 * Get revenue breakdown by plan
 */
const getRevenueBreakdown = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        sp.name as plan_name,
        sp.slug as plan_slug,
        COUNT(s.id) as subscription_count,
        COALESCE(SUM(
          CASE 
            WHEN s.billing_cycle = 'monthly' THEN sp.price_monthly
            WHEN s.billing_cycle = 'yearly' THEN sp.price_yearly / 12
            ELSE 0
          END
        ), 0) as mrr,
        COALESCE(SUM(
          CASE 
            WHEN s.billing_cycle = 'yearly' THEN sp.price_yearly
            ELSE sp.price_monthly * 12
          END
        ), 0) as arr
      FROM subscription_plans sp
      LEFT JOIN subscriptions s ON sp.id = s.plan_id AND s.status = 'active'
      WHERE sp.is_active = true
      GROUP BY sp.id, sp.name, sp.slug, sp.display_order
      ORDER BY sp.display_order
    `);

    return successResponse(res, { revenue: result.rows }, 'Revenue breakdown retrieved successfully');
  } catch (error) {
    logger.error('Get revenue error', { error: error.message, stack: error.stack });
    return errorResponse(res, 'Failed to retrieve revenue: ' + error.message, 500);
  }
};

/**
 * Get usage analytics (last 7 days)
 */
const getUsageAnalytics = async (req, res) => {
  try {
    // Return empty analytics for now since usage_aggregates might not have data
    const result = { rows: [] };

    return successResponse(res, { analytics: result.rows }, 'Usage analytics retrieved successfully');
  } catch (error) {
    logger.error('Get usage analytics error', { error: error.message });
    return errorResponse(res, 'Failed to retrieve usage analytics: ' + error.message, 500);
  }
};

/**
 * Get top endpoints by usage
 */
const getTopEndpoints = async (req, res) => {
  try {
    // Return empty for now
    const result = { rows: [] };

    return successResponse(res, { endpoints: result.rows }, 'Top endpoints retrieved successfully');
  } catch (error) {
    logger.error('Get top endpoints error', { error: error.message });
    return errorResponse(res, 'Failed to retrieve top endpoints: ' + error.message, 500);
  }
};

module.exports = {
  getStats,
  getTenants,
  getRevenueBreakdown,
  getUsageAnalytics,
  getTopEndpoints
};
