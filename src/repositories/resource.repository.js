const db = require('../config/database');

/**
 * Create new resource
 */
const create = async (data) => {
  const query = `
    INSERT INTO resources (tenant_id, name, description, status, metadata, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  
  const values = [
    data.tenantId,
    data.name,
    data.description,
    data.status || 'active',
    JSON.stringify(data.metadata || {}),
    data.createdBy
  ];
  
  const result = await db.query(query, values, data.tenantId);
  return result.rows[0];
};

/**
 * Find resource by ID (automatically filtered by tenant via RLS)
 */
const findById = async (id, tenantId) => {
  const query = 'SELECT * FROM resources WHERE id = $1 AND tenant_id = $2';
  const result = await db.query(query, [id, tenantId], tenantId);
  return result.rows[0];
};

/**
 * Update resource
 */
const update = async (id, tenantId, data) => {
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
  
  if (data.status) {
    fields.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  
  if (data.metadata) {
    fields.push(`metadata = $${paramIndex++}`);
    values.push(JSON.stringify(data.metadata));
  }
  
  if (fields.length === 0) {
    throw new Error('No fields to update');
  }
  
  values.push(id, tenantId);
  
  const query = `
    UPDATE resources 
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
    RETURNING *
  `;
  
  const result = await db.query(query, values, tenantId);
  return result.rows[0];
};

/**
 * Delete resource
 */
const remove = async (id, tenantId) => {
  const query = 'DELETE FROM resources WHERE id = $1 AND tenant_id = $2 RETURNING *';
  const result = await db.query(query, [id, tenantId], tenantId);
  return result.rows[0];
};

/**
 * List resources with pagination and filtering
 */
const findAll = async (tenantId, { page = 1, limit = 20, status = null, sortBy = 'created_at', order = 'desc' }) => {
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM resources WHERE tenant_id = $1';
  const values = [tenantId];
  let paramIndex = 2;
  
  // Apply filters
  if (status) {
    query += ` AND status = $${paramIndex++}`;
    values.push(status);
  }
  
  // Apply sorting
  const validSortFields = ['name', 'created_at', 'updated_at'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  
  query += ` ORDER BY ${sortField} ${sortOrder}`;
  
  // Apply pagination
  query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  values.push(limit, offset);
  
  const result = await db.query(query, values, tenantId);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM resources WHERE tenant_id = $1';
  const countValues = [tenantId];
  
  if (status) {
    countQuery += ' AND status = $2';
    countValues.push(status);
  }
  
  const countResult = await db.query(countQuery, countValues, tenantId);
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
  update,
  remove,
  findAll
};
