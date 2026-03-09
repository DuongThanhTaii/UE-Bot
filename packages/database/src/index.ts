/**
 * @fileoverview UE-Bot Database Package
 * @module @ue-bot/database
 *
 * Provides Drizzle ORM + Neon PostgreSQL integration for UE-Bot.
 *
 * @example
 * import { getDb, UserRepository } from '@ue-bot/database';
 *
 * const db = getDb();
 * const users = new UserRepository(db);
 * const user = await users.findByEmail('test@example.com');
 */

// Client
export { createDb, getDb, resetDb } from './client';
export type { Database } from './client';

// Schema
export * from './schema';

// Repositories
export {
  DeviceRepository,
  MemoryRepository,
  SessionRepository,
  SettingsRepository,
  UserRepository,
} from './repositories';

// Store adapters (implement agent-core interfaces)
export { PostgresMemoryStore, PostgresSessionStore } from './stores';
