const db = require('../config/database');

/**
 * Create new user
 */
const create = async (data, client = null) => {
  const queryFunc = client || db;
  
  const query = `
    INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, tenant_id, email, first_name, last_name, role, is_active, created_at, updated_at
  `;
  
  const values = [
    data.tenantId,
    data.email,
    data.passwordHash,
    data.firstName,
    data.lastName,
    data.role || 'user',
    data.isActive !== undefined ? data.isActive : true
  ];
  
  const result = await queryFunc.query(query, values);
  return result.rows[0];
};

/**
 * Find user by ID (within current tenant context)
 */
const findById = async (id, tenantId = null) => {
  let query = 'SELECT * FROM users WHERE id = $1';
  const values = [id];
  
  if (tenantId) {
    query += ' AND tenant_id = $2';
    values.push(tenantId);
  }
  
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Find user by email within a specific tenant
 */
const findByEmail = async (email, tenantId) => {
  const query = 'SELECT * FROM users WHERE email = $1 AND tenant_id = $2';
  const result = await db.query(query, [email, tenantId]);
  return result.rows[0];
};

/**
 * Find user by email across all tenants (for login)
 */
const findByEmailGlobal = async (email, client = null) => {
  const queryFunc = client || db;
  
  const query = 'SELECT * FROM users WHERE email = $1';
  const result = await queryFunc.query(query, [email]);
  return result.rows[0];
};

/**
 * Update user
 */
const update = async (id, data, tenantId = null) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;
  
  if (data.email) {
    fields.push(`email = $${paramIndex++}`);
    values.push(data.email);
  }
  
  if (data.firstName) {
    fields.push(`first_name = $${paramIndex++}`);
    values.push(data.firstName);
  }
  
  if (data.lastName) {
    fields.push(`last_name = $${paramIndex++}`);
    values.push(data.lastName);
  }
  
  if (data.role) {
    fields.push(`role = $${paramIndex++}`);
    values.push(data.role);
  }
  
  if (data.isActive !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(data.isActive);
  }
  
  if (fields.length === 0) {
    throw new Error('No fields to update');
  }
  
  values.push(id);
  
  let query = `
    UPDATE users 
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex++}
  `;
  
  if (tenantId) {
    query += ` AND tenant_id = $${paramIndex}`;
    values.push(tenantId);
  }
  
  query += ' RETURNING id, tenant_id, email, first_name, last_name, role, is_active, created_at, updated_at';
  
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Update user password
 */
const updatePassword = async (id, passwordHash) => {
  const query = `
    UPDATE users 
    SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id
  `;
  
  const result = await db.query(query, [passwordHash, id]);
  return result.rows[0];
};

/**
 * Delete user
 */
const remove = async (id, tenantId = null) => {
  let query = 'DELETE FROM users WHERE id = $1';
  const values = [id];
  
  if (tenantId) {
    query += ' AND tenant_id = $2';
    values.push(tenantId);
  }
  
  query += ' RETURNING id';
  
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * List users with pagination (automatically filtered by tenant via RLS)
 */
const findAll = async (tenantId, { page = 1, limit = 20, role = null, isActive = null }) => {
  const offset = (page - 1) * limit;
  
  let query = 'SELECT id, tenant_id, email, first_name, last_name, role, is_active, created_at FROM users WHERE tenant_id = $1';
  const values = [tenantId];
  let paramIndex = 2;
  
  if (role) {
    query += ` AND role = $${paramIndex++}`;
    values.push(role);
  }
  
  if (isActive !== null) {
    query += ` AND is_active = $${paramIndex++}`;
    values.push(isActive);
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  values.push(limit, offset);
  
  const result = await db.query(query, values);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM users WHERE tenant_id = $1';
  const countValues = [tenantId];
  let countParamIndex = 2;
  
  if (role) {
    countQuery += ` AND role = $${countParamIndex++}`;
    countValues.push(role);
  }
  
  if (isActive !== null) {
    countQuery += ` AND is_active = $${countParamIndex}`;
    countValues.push(isActive);
  }
  
  const countResult = await db.query(countQuery, countValues);
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
  findByEmail,
  findByEmailGlobal,
  update,
  updatePassword,
  remove,
  findAll
};
