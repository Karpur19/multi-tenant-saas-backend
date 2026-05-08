const db = require('../config/database');

/**
 * Find all active subscription plans
 */
const findAllActive = async () => {
  const query = `
    SELECT 
      id, name, slug, description,
      price_monthly, price_yearly,
      features, limits,
      is_public, display_order
    FROM subscription_plans
    WHERE is_active = true AND is_public = true
    ORDER BY display_order ASC
  `;
  
  const result = await db.query(query);
  return result.rows;
};

/**
 * Find plan by ID
 */
const findById = async (id) => {
  const query = 'SELECT * FROM subscription_plans WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0];
};

/**
 * Find plan by slug
 */
const findBySlug = async (slug) => {
  const query = 'SELECT * FROM subscription_plans WHERE slug = $1';
  const result = await db.query(query, [slug]);
  return result.rows[0];
};

/**
 * Get all plans (admin only)
 */
const findAll = async () => {
  const query = `
    SELECT * FROM subscription_plans 
    ORDER BY display_order ASC
  `;
  
  const result = await db.query(query);
  return result.rows;
};

/**
 * Create new plan (admin only)
 */
const create = async (data) => {
  const query = `
    INSERT INTO subscription_plans 
    (name, slug, description, price_monthly, price_yearly, features, limits, is_public, display_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  
  const values = [
    data.name,
    data.slug,
    data.description,
    data.price_monthly,
    data.price_yearly,
    JSON.stringify(data.features || []),
    JSON.stringify(data.limits || {}),
    data.is_public !== false,
    data.display_order || 0
  ];
  
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Update plan (admin only)
 */
const update = async (id, data) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;
  
  if (data.name) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  
  if (data.price_monthly !== undefined) {
    fields.push(`price_monthly = $${paramIndex++}`);
    values.push(data.price_monthly);
  }
  
  if (data.price_yearly !== undefined) {
    fields.push(`price_yearly = $${paramIndex++}`);
    values.push(data.price_yearly);
  }
  
  if (data.features) {
    fields.push(`features = $${paramIndex++}`);
    values.push(JSON.stringify(data.features));
  }
  
  if (data.limits) {
    fields.push(`limits = $${paramIndex++}`);
    values.push(JSON.stringify(data.limits));
  }
  
  if (data.is_public !== undefined) {
    fields.push(`is_public = $${paramIndex++}`);
    values.push(data.is_public);
  }
  
  if (data.display_order !== undefined) {
    fields.push(`display_order = $${paramIndex++}`);
    values.push(data.display_order);
  }
  
  if (fields.length === 0) {
    throw new Error('No fields to update');
  }
  
  values.push(id);
  
  const query = `
    UPDATE subscription_plans 
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  
  const result = await db.query(query, values);
  return result.rows[0];
};

module.exports = {
  findAllActive,
  findById,
  findBySlug,
  findAll,
  create,
  update
};