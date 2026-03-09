/**
 * @fileoverview Shared database utilities for webapp API routes
 * Uses Neon PostgreSQL via @ue-bot/database when DATABASE_URL is set,
 * falls back to local SQLite/file stores for development.
 */

import type { MemoryStore, SessionStore } from '@ue-bot/agent-core';
import {
  FileSessionStore,
  SQLiteMemoryStore,
  SessionManager,
  setMemoryStore,
} from '@ue-bot/agent-core';
import * as os from 'os';
import * as path from 'path';

// Local fallback directory
const LOCAL_DATA_DIR = process.env.DATA_DIR || path.join(os.homedir(), '.ue-bot', 'data');

/**
 * Check if Neon PostgreSQL is configured
 */
export function isPostgresConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

// ─── Lazy singletons ───────────────────────────────────────

let _memoryStore: MemoryStore | null = null;
let _sessionManager: SessionManager | null = null;

/**
 * Get the memory store (Postgres or SQLite based on env)
 */
export async function getMemoryStore(): Promise<MemoryStore> {
  if (_memoryStore) return _memoryStore;

  if (isPostgresConfigured()) {
    // Dynamic import to avoid bundling @ue-bot/database when not needed
    const { getDb, PostgresMemoryStore } = await import('@ue-bot/database');
    const db = getDb();
    _memoryStore = new PostgresMemoryStore(db);
  } else {
    _memoryStore = new SQLiteMemoryStore({
      dbPath: path.join(LOCAL_DATA_DIR, 'memory.db'),
    });
  }

  setMemoryStore(_memoryStore);
  return _memoryStore;
}

/**
 * Get the session store (Postgres or file-based on env)
 */
export async function getSessionStore(): Promise<SessionStore> {
  if (isPostgresConfigured()) {
    const { getDb, PostgresSessionStore } = await import('@ue-bot/database');
    const db = getDb();
    return new PostgresSessionStore(db);
  }

  return new FileSessionStore({
    directory: path.join(LOCAL_DATA_DIR, 'sessions'),
  });
}

/**
 * Get the session manager (uses the appropriate store)
 */
export async function getSessionManager(): Promise<SessionManager> {
  if (_sessionManager) return _sessionManager;

  const store = await getSessionStore();

  _sessionManager = new SessionManager({
    store,
    maxMessages: 100,
    autoArchiveAfter: 7 * 24 * 60 * 60 * 1000,
  });

  return _sessionManager;
}

/**
 * Get the database instance directly (for auth, devices, settings)
 * Returns null if DATABASE_URL not set
 */
export async function getDatabase() {
  if (!isPostgresConfigured()) return null;

  const { getDb } = await import('@ue-bot/database');
  return getDb();
}
