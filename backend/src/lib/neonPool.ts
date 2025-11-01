import pkg from 'pg';
const { Pool } = pkg;

// Neon PostgreSQL pool (alternative to Supabase)
let pool: typeof Pool.prototype | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });
  console.log('[neonPool] Connected to Neon PostgreSQL');
} else {
  console.warn('[neonPool] DATABASE_URL not set; Neon pool unavailable');
}

export { pool };
