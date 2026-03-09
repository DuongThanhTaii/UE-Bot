/**
 * @fileoverview Push schema to Neon database
 * Usage: DATABASE_URL=... tsx src/migrate.ts
 */

import { neon } from '@neondatabase/serverless';

async function migrate() {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }

  console.log('🔄 Pushing schema to Neon...');

  const sql = neon(url);

  // Create tables manually (for environments where drizzle-kit isn't available)
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name VARCHAR(255) NOT NULL,
      avatar TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(500),
      state VARCHAR(20) NOT NULL DEFAULT 'active',
      config JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      tool_calls JSONB,
      tool_call_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      mac_address VARCHAR(17),
      ip_address VARCHAR(45),
      status VARCHAR(20) NOT NULL DEFAULT 'offline',
      firmware_version VARCHAR(20),
      capabilities JSONB DEFAULT '[]',
      last_seen TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key VARCHAR(255) NOT NULL,
      value JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_settings_user_key ON settings(user_id, key)`;

  console.log('✅ Schema pushed successfully!');
}

migrate().catch((err: unknown) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
