const db = require('../config/database');

const findActiveByTenantId = async (tenantId) => {
  const query = `
    SELECT s.*, 
           sp.name as plan_name, 
           sp.slug as plan_slug,
           sp.limits as plan_limits,
           sp.features as plan_features
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.tenant_id = $1 
    AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1
  `;
  
  const result = await db.query(query, [tenantId], tenantId);
  return result.rows[0];
};

const findById = async (id, tenantId) => {
  const query = `
    SELECT s.*, 
           sp.name as plan_name, 
           sp.slug as plan_slug,
           sp.limits as plan_limits
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.id = $1 AND s.tenant_id = $2
  `;
  
  const result = await db.query(query, [id, tenantId], tenantId);
  return result.rows[0];
};

const findAllByTenantId = async (tenantId) => {
  const query = `
    SELECT s.*, 
           sp.name as plan_name, 
           sp.slug as plan_slug
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.tenant_id = $1
    ORDER BY s.created_at DESC
  `;
  
  const result = await db.query(query, [tenantId], tenantId);
  return result.rows;
};

const create = async (data) => {
  const query = `
    INSERT INTO subscriptions 
    (tenant_id, plan_id, status, billing_cycle, 
     current_period_start, current_period_end,
     trial_start, trial_end, is_trial,
     next_payment_date, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;
  
  const values = [
    data.tenant_id,
    data.plan_id,
    data.status || 'active',
    data.billing_cycle || 'monthly',
    data.current_period_start,
    data.current_period_end,
    data.trial_start || null,
    data.trial_end || null,
    data.is_trial || false,
    data.next_payment_date || null,
    JSON.stringify(data.metadata || {})
  ];
  
  const result = await db.query(query, values, data.tenant_id);
  return result.rows[0];
};

const update = async (id, tenantId, data) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;
  
  if (data.plan_id) {
    fields.push(`plan_id = $${paramIndex++}`);
    values.push(data.plan_id);
  }
  
  if (data.status) {
    fields.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  
  if (data.billing_cycle) {
    fields.push(`billing_cycle = $${paramIndex++}`);
    values.push(data.billing_cycle);
  }
  
  if (data.current_period_end) {
    fields.push(`current_period_end = $${paramIndex++}`);
    values.push(data.current_period_end);
  }
  
  if (data.cancel_at_period_end !== undefined) {
    fields.push(`cancel_at_period_end = $${paramIndex++}`);
    values.push(data.cancel_at_period_end);
  }
  
  if (data.cancelled_at) {
    fields.push(`cancelled_at = $${paramIndex++}`);
    values.push(data.cancelled_at);
  }
  
  if (data.cancellation_reason) {
    fields.push(`cancellation_reason = $${paramIndex++}`);
    values.push(data.cancellation_reason);
  }
  
  if (fields.length === 0) {
    throw new Error('No fields to update');
  }
  
  values.push(id, tenantId);
  
  const query = `
    UPDATE subscriptions 
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
    RETURNING *
  `;
  
  const result = await db.query(query, values, tenantId);
  return result.rows[0];
};

const cancelAllActiveByTenantId = async (tenantId, reason = 'Plan change') => {
  const query = `
    UPDATE subscriptions
    SET status = 'cancelled',
        cancelled_at = CURRENT_TIMESTAMP,
        cancellation_reason = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = $1 AND status = 'active'
    RETURNING *
  `;
  
  const result = await db.query(query, [tenantId, reason], tenantId);
  return result.rows;
};

module.exports = {
  findActiveByTenantId,
  findById,
  findAllByTenantId,
  create,
  update,
  cancelAllActiveByTenantId
};
