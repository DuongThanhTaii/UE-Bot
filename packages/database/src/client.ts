/**
 * @fileoverview Neon PostgreSQL database client
 * @module @ue-bot/database/client
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

/**
 * Create a Drizzle database instance connected to Neon
 */
export function createDb(databaseUrl?: string) {
  const url = databaseUrl || process.env['DATABASE_URL'];
  if (!url) {
    throw new Error(
      'DATABASE_URL is required. Set it in environment variables or pass it directly.'
    );
  }

  const sql = neon(url);
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;

/** Singleton database instance */
let _db: Database | null = null;

/**
 * Get or create the singleton database instance
 */
export function getDb(databaseUrl?: string): Database {
  if (!_db) {
    _db = createDb(databaseUrl);
  }
  return _db;
}

/**
 * Reset the singleton (for testing)
 */
export function resetDb(): void {
  _db = null;
}
