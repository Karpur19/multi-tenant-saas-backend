const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get overview statistics
 */
const getStats = async (req, res) => {
  try {
    // Get total counts with safe defaults
    const tenantsResult = await db.query('SELECT COUNT(*) as count FROM tenants WHERE is_active = true');
    const usersResult = await db.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
    const subscriptionsResult = await db.query('SELECT COUNT(*) as count FROM subscriptions WHERE status = $1', ['active']);
    
    // Simple API calls count
    const usageResult = await db.query('SELECT COUNT(*) as total FROM usage_records WHERE created_at >= DATE_TRUNC(\'month\', CURRENT_DATE)');
    
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

    return res.json({
      success: true,
      data: {
        tenants: parseInt(tenantsResult.rows[0].count) || 0,
        users: parseInt(usersResult.rows[0].count) || 0,
        activeSubscriptions: parseInt(subscriptionsResult.rows[0].count) || 0,
        apiCalls: parseInt(usageResult.rows[0].total) || 0,
        mrr: parseFloat(revenueResult.rows[0].mrr || 0).toFixed(2)
      }
    });
  } catch (error) {
    logger.error('Get stats error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to retrieve stats: ' + error.message
      }
    });
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
        sp.slug as plan_slug
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id AND u.is_active = true
      LEFT JOIN subscriptions s ON t.id = s.tenant_id AND s.status = 'active'
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      GROUP BY t.id, t.name, t.subdomain, t.is_active, t.created_at, s.status, sp.name, sp.slug
      ORDER BY t.created_at DESC
    `);

    // Add total_api_calls as 0 for now
    const tenants = result.rows.map(t => ({
      ...t,
      total_api_calls: 0
    }));

    return res.json({
      success: true,
      data: { tenants }
    });
  } catch (error) {
    logger.error('Get tenants error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      error: {
        code: 'TENANTS_ERROR',
        message: 'Failed to retrieve tenants: ' + error.message
      }
    });
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

    return res.json({
      success: true,
      data: { revenue: result.rows }
    });
  } catch (error) {
    logger.error('Get revenue error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      error: {
        code: 'REVENUE_ERROR',
        message: 'Failed to retrieve revenue: ' + error.message
      }
    });
  }
};

/**
 * Get usage analytics (last 7 days)
 */
const getUsageAnalytics = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: { analytics: [] }
    });
  } catch (error) {
    logger.error('Get usage analytics error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to retrieve analytics: ' + error.message
      }
    });
  }
};

/**
 * Get top endpoints by usage
 */
const getTopEndpoints = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: { endpoints: [] }
    });
  } catch (error) {
    logger.error('Get top endpoints error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'ENDPOINTS_ERROR',
        message: 'Failed to retrieve endpoints: ' + error.message
      }
    });
  }
};

module.exports = {
  getStats,
  getTenants,
  getRevenueBreakdown,
  getUsageAnalytics,
  getTopEndpoints
};
