const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function makeAdmin() {
  try {
    const result = await pool.query(
      "UPDATE users SET role = 'admin' WHERE email = 'demo@example.com' RETURNING email, role"
    );
    console.log('✅ User updated:', result.rows[0]);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

makeAdmin();
