const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

async function query(text, params = []) {
  if (!pool) {
    throw new Error('Database is not configured. Set DATABASE_URL.');
  }
  return pool.query(text, params);
}

module.exports = { query, pool };