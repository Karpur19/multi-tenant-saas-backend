const db = require('../config/database');

/**
 * Record a usage event
 */
const recordUsage = async (data) => {
  const query = `
    INSERT INTO usage_records 
    (tenant_id, subscription_id, metric_type, quantity, 
     recorded_at, period_start, period_end, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  
  const values = [
    data.tenant_id,
    data.subscription_id,
    data.metric_type,
    data.quantity || 1,
    data.recorded_at || new Date(),
    data.period_start,
    data.period_end,
    JSON.stringify(data.metadata || {})
  ];
  
  const result = await db.query(query, values, data.tenant_id);
  return result.rows[0];
};

/**
 * Get current period usage for tenant
 */
const getCurrentPeriodUsage = async (tenantId, metricType, periodStart, periodEnd) => {
  const query = `
    SELECT COALESCE(SUM(quantity), 0) as total_usage
    FROM usage_records
    WHERE tenant_id = $1 
    AND metric_type = $2
    AND period_start = $3
    AND period_end = $4
  `;
  
  const result = await db.query(
    query, 
    [tenantId, metricType, periodStart, periodEnd], 
    tenantId
  );
  
  return parseInt(result.rows[0].total_usage) || 0;
};

/**
 * Get usage by date range
 */
const getUsageByDateRange = async (tenantId, metricType, startDate, endDate) => {
  const query = `
    SELECT 
      DATE(recorded_at) as date,
      SUM(quantity) as total_quantity,
      COUNT(*) as request_count
    FROM usage_records
    WHERE tenant_id = $1
    AND metric_type = $2
    AND recorded_at >= $3
    AND recorded_at <= $4
    GROUP BY DATE(recorded_at)
    ORDER BY date DESC
  `;
  
  const result = await db.query(
    query,
    [tenantId, metricType, startDate, endDate],
    tenantId
  );
  
  return result.rows;
};

/**
 * Get current month usage aggregate
 */
const getCurrentMonthUsage = async (tenantId, metricType) => {
  const query = `
    SELECT COALESCE(SUM(quantity), 0) as total_usage
    FROM usage_records
    WHERE tenant_id = $1
    AND metric_type = $2
    AND DATE_TRUNC('month', recorded_at) = DATE_TRUNC('month', CURRENT_DATE)
  `;
  
  const result = await db.query(query, [tenantId, metricType], tenantId);
  return parseInt(result.rows[0].total_usage) || 0;
};

/**
 * Get usage breakdown by endpoint (top endpoints)
 */
const getUsageBreakdownByEndpoint = async (tenantId, limit = 10) => {
  const query = `
    SELECT 
      metadata->>'endpoint' as endpoint,
      metadata->>'method' as method,
      COUNT(*) as request_count,
      SUM(quantity) as total_quantity
    FROM usage_records
    WHERE tenant_id = $1
    AND metadata->>'endpoint' IS NOT NULL
    AND DATE_TRUNC('month', recorded_at) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY metadata->>'endpoint', metadata->>'method'
    ORDER BY request_count DESC
    LIMIT $2
  `;
  
  const result = await db.query(query, [tenantId, limit], tenantId);
  return result.rows;
};

/**
 * Update or create usage aggregate
 */
const upsertUsageAggregate = async (tenantId, subscriptionId, metricType, date, quantity) => {
  const query = `
    INSERT INTO usage_aggregates 
    (tenant_id, subscription_id, metric_type, date, total_quantity)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (tenant_id, metric_type, date)
    DO UPDATE SET 
      total_quantity = usage_aggregates.total_quantity + EXCLUDED.total_quantity,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  
  const result = await db.query(
    query,
    [tenantId, subscriptionId, metricType, date, quantity],
    tenantId
  );
  
  return result.rows[0];
};

/**
 * Get usage trend (last N days)
 */
const getUsageTrend = async (tenantId, metricType, days = 30) => {
  const query = `
    SELECT 
      date,
      total_quantity
    FROM usage_aggregates
    WHERE tenant_id = $1
    AND metric_type = $2
    AND date >= CURRENT_DATE - INTERVAL '${days} days'
    ORDER BY date ASC
  `;
  
  const result = await db.query(query, [tenantId, metricType], tenantId);
  return result.rows;
};

module.exports = {
  recordUsage,
  getCurrentPeriodUsage,
  getUsageByDateRange,
  getCurrentMonthUsage,
  getUsageBreakdownByEndpoint,
  upsertUsageAggregate,
  getUsageTrend
};
