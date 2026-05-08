const db = require('../config/database');

/**
 * Create new tenant
 */
const create = async (data, client = null) => {
  const queryFunc = client || db;
  
  const query = `
    INSERT INTO tenants (name, subdomain, settings, is_active)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  
  const values = [
    data.name,
    data.subdomain,
    JSON.stringify(data.settings || {}),
    data.isActive !== undefined ? data.isActive : true
  ];
  
  const result = await queryFunc.query(query, values);
  return result.rows[0];
};

/**
 * Find tenant by ID
 */
const findById = async (id, client = null) => {
  const queryFunc = client || db;
  
  const query = 'SELECT * FROM tenants WHERE id = $1';
  const result = await queryFunc.query(query, [id]);
  return result.rows[0];
};

/**
 * Find tenant by subdomain
 */
const findBySubdomain = async (subdomain, client = null) => {
  const queryFunc = client || db;
  
  const query = 'SELECT * FROM tenants WHERE subdomain = $1';
  const result = await queryFunc.query(query, [subdomain]);
  return result.rows[0];
};

/**
 * Update tenant
 */
const update = async (id, data) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;
  
  if (data.name) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  
  if (data.subdomain) {
    fields.push(`subdomain = $${paramIndex++}`);
    values.push(data.subdomain);
  }
  
  if (data.settings) {
    fields.push(`settings = $${paramIndex++}`);
    values.push(JSON.stringify(data.settings));
  }
  
  if (data.isActive !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(data.isActive);
  }
  
  if (fields.length === 0) {
    throw new Error('No fields to update');
  }
  
  values.push(id);
  
  const query = `
    UPDATE tenants 
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Delete tenant
 */
const remove = async (id) => {
  const query = 'DELETE FROM tenants WHERE id = $1 RETURNING *';
  const result = await db.query(query, [id]);
  return result.rows[0];
};

/**
 * List all tenants with pagination
 */
const findAll = async ({ page = 1, limit = 20, isActive = null }) => {
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM tenants';
  const values = [];
  let paramIndex = 1;
  
  if (isActive !== null) {
    query += ` WHERE is_active = $${paramIndex++}`;
    values.push(isActive);
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  values.push(limit, offset);
  
  const result = await db.query(query, values);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM tenants';
  if (isActive !== null) {
    countQuery += ' WHERE is_active = $1';
  }
  const countResult = await db.query(
    countQuery, 
    isActive !== null ? [isActive] : []
  );
  const total = parseInt(countResult.rows[0].count);
  
  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  create,
  findById,
  findBySubdomain,
  update,
  remove,
  findAll
};
