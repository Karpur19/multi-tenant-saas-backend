const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
  process.exit(-1);
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Error connecting to PostgreSQL database', { error: err.message });
    return;
  }
  logger.info('Successfully connected to PostgreSQL database');
  release();
});

/**
 * Execute a query with automatic tenant isolation
 */
const query = async (text, params, tenantId = null) => {
  const start = Date.now();
  
  try {
    // Set tenant context if provided
    if (tenantId) {
      await pool.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
    }
    
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Executed query', { 
      query: text, 
      duration, 
      rows: result.rowCount,
      tenantId 
    });
    
    return result;
  } catch (error) {
    logger.error('Database query error', { 
      error: error.message, 
      query: text,
      tenantId 
    });
    throw error;
  }
};

/**
 * Execute query within a transaction
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get a client from the pool for complex operations
 */
const getClient = async () => {
  return await pool.connect();
};

/**
 * Graceful shutdown
 */
const close = async () => {
  await pool.end();
  logger.info('Database pool closed');
};

module.exports = {
  query,
  transaction,
  getClient,
  pool,
  close
};
