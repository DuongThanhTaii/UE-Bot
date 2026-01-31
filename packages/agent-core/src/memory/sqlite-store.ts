/**
 * @fileoverview SQLite-based memory store with FTS5 full-text search
 * @module @ue-bot/agent-core/memory/sqlite-store
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import type { MemoryEntry, MemorySearchOptions, MemoryStore } from '../types';
import { generateId } from '../utils';

/**
 * SQLite memory store configuration
 */
export interface SQLiteMemoryConfig {
  /** Path to SQLite database file */
  dbPath: string;
  /** Table name for memories */
  tableName?: string;
}

/**
 * SQLite-based memory store with FTS5 full-text search
 */
export class SQLiteMemoryStore implements MemoryStore {
  private db: Database.Database;
  private tableName: string;

  constructor(config: SQLiteMemoryConfig) {
    this.tableName = config.tableName || 'memories';

    // Ensure directory exists
    const dir = path.dirname(config.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(config.dbPath);

    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.initializeTables();
  }

  /**
   * Initialize database tables
   */
  private initializeTables(): void {
    // Main memories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // FTS5 virtual table for full-text search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${this.tableName}_fts USING fts5(
        id,
        content,
        content=${this.tableName},
        content_rowid=rowid
      )
    `);

    // Triggers to keep FTS in sync
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS ${this.tableName}_ai AFTER INSERT ON ${this.tableName} BEGIN
        INSERT INTO ${this.tableName}_fts(rowid, id, content)
        VALUES (NEW.rowid, NEW.id, NEW.content);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS ${this.tableName}_ad AFTER DELETE ON ${this.tableName} BEGIN
        INSERT INTO ${this.tableName}_fts(${this.tableName}_fts, rowid, id, content)
        VALUES ('delete', OLD.rowid, OLD.id, OLD.content);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS ${this.tableName}_au AFTER UPDATE ON ${this.tableName} BEGIN
        INSERT INTO ${this.tableName}_fts(${this.tableName}_fts, rowid, id, content)
        VALUES ('delete', OLD.rowid, OLD.id, OLD.content);
        INSERT INTO ${this.tableName}_fts(rowid, id, content)
        VALUES (NEW.rowid, NEW.id, NEW.content);
      END
    `);
  }

  /**
   * Add a new memory entry
   */
  async add(content: string, metadata?: Record<string, unknown>): Promise<MemoryEntry> {
    const id = generateId('mem');
    const now = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (id, content, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, content, JSON.stringify(metadata || {}), now.toISOString(), now.toISOString());

    return {
      id,
      content,
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Search memories using FTS5
   */
  async search(options: MemorySearchOptions): Promise<MemoryEntry[]> {
    const limit = options.limit || 10;

    // Build search query
    // Escape special FTS5 characters
    const escapedQuery = options.query
      .replace(/['"]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `"${term}"*`)
      .join(' OR ');

    if (!escapedQuery) {
      return [];
    }

    const stmt = this.db.prepare(`
      SELECT m.id, m.content, m.metadata, m.created_at, m.updated_at,
             bm25(${this.tableName}_fts) as rank
      FROM ${this.tableName}_fts fts
      JOIN ${this.tableName} m ON fts.id = m.id
      WHERE ${this.tableName}_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    const rows = stmt.all(escapedQuery, limit) as Array<{
      id: string;
      content: string;
      metadata: string;
      created_at: string;
      updated_at: string;
      rank: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      content: row.content,
      metadata: JSON.parse(row.metadata),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  /**
   * Get a memory by ID
   */
  async get(id: string): Promise<MemoryEntry | null> {
    const stmt = this.db.prepare(`
      SELECT id, content, metadata, created_at, updated_at
      FROM ${this.tableName}
      WHERE id = ?
    `);

    const row = stmt.get(id) as
      | {
          id: string;
          content: string;
          metadata: string;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) return null;

    return {
      id: row.id,
      content: row.content,
      metadata: JSON.parse(row.metadata),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Update a memory entry
   */
  async update(
    id: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryEntry> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Memory ${id} not found`);
    }

    const now = new Date();
    const newMetadata = metadata || existing.metadata;

    const stmt = this.db.prepare(`
      UPDATE ${this.tableName}
      SET content = ?, metadata = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(content, JSON.stringify(newMetadata), now.toISOString(), id);

    return {
      id,
      content,
      metadata: newMetadata,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
  }

  /**
   * Delete a memory entry
   */
  async delete(id: string): Promise<void> {
    const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
    stmt.run(id);
  }

  /**
   * Clear all memories
   */
  async clear(): Promise<void> {
    this.db.exec(`DELETE FROM ${this.tableName}`);
  }

  /**
   * Get all memories (with pagination)
   */
  async list(options?: { limit?: number; offset?: number }): Promise<MemoryEntry[]> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    const stmt = this.db.prepare(`
      SELECT id, content, metadata, created_at, updated_at
      FROM ${this.tableName}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(limit, offset) as Array<{
      id: string;
      content: string;
      metadata: string;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      content: row.content,
      metadata: JSON.parse(row.metadata),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  /**
   * Get memory count
   */
  async count(): Promise<number> {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`);
    const row = stmt.get() as { count: number };
    return row.count;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}
