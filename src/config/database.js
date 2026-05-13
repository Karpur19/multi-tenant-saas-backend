const { Pool } = require('pg');
const logger = require('../utils/logger');

// Create connection pool with proper SSL config for Neon
const pool = new Pool(
  process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false // Required for Neon
        }
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
);

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Error connecting to PostgreSQL database', { error: err.message });
  } else {
    logger.info('Successfully connected to PostgreSQL database');
    release();
  }
});

// Query helper with logging
const query = async (text, params, tenantId = null) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Database query executed', { 
      query: text.substring(0, 100), 
      duration: `${duration}ms`,
      rows: result.rowCount,
      tenantId 
    });
    return result;
  } catch (error) {
    logger.error('Database query error', { 
      error: error.message,
      query: text.substring(0, 100),
      tenantId 
    });
    throw error;
  }
};

// Transaction helper
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

module.exports = {
  query,
  transaction,
  pool
};