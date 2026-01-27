import pg from 'pg';
import dns from 'dns';
import { env } from './env.js';

// Force IPv4 DNS resolution to avoid ENETUNREACH errors with IPv6
dns.setDefaultResultOrder('ipv4first');

const { Pool } = pg;

// PostgreSQL connection pool
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

// Helper for single queries
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// Helper for single row queries
export async function queryOne<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

// Test connection on startup
pool.on('connect', () => {
  console.log('PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('PostgreSQL error:', err);
});
