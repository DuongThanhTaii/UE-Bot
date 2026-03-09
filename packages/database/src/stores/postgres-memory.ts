/**
 * @fileoverview PostgreSQL Memory Store - implements MemoryStore from agent-core
 * @module @ue-bot/database/stores/postgres-memory
 */

import type { MemoryEntry, MemorySearchOptions, MemoryStore } from '@ue-bot/agent-core';
import type { Database } from '../client';
import { MemoryRepository } from '../repositories/memory.repo';

/**
 * PostgreSQL-backed memory store using Neon
 */
export class PostgresMemoryStore implements MemoryStore {
  private repo: MemoryRepository;
  private userId?: string;

  constructor(db: Database, userId?: string) {
    this.repo = new MemoryRepository(db);
    this.userId = userId;
  }

  async add(content: string, metadata?: Record<string, unknown>): Promise<MemoryEntry> {
    const row = await this.repo.add(content, metadata, this.userId);
    return this.toEntry(row);
  }

  async search(options: MemorySearchOptions): Promise<MemoryEntry[]> {
    const rows = await this.repo.search({
      query: options.query,
      limit: options.limit,
      userId: this.userId,
    });
    return rows.map((r) => this.toEntry(r));
  }

  async get(id: string): Promise<MemoryEntry | null> {
    const row = await this.repo.findById(id);
    return row ? this.toEntry(row) : null;
  }

  async update(
    id: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryEntry> {
    const row = await this.repo.update(id, content, metadata);
    if (!row) throw new Error(`Memory ${id} not found`);
    return this.toEntry(row);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async clear(): Promise<void> {
    await this.repo.clear(this.userId);
  }

  private toEntry(row: {
    id: string;
    content: string;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): MemoryEntry {
    return {
      id: row.id,
      content: row.content,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
