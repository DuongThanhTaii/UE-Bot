/**
 * @fileoverview In-memory implementation of MemoryStore
 * @module @ue-bot/agent-core/memory/inmemory-store
 */

import type { MemoryEntry, MemorySearchOptions, MemoryStore } from '../types';

/**
 * Simple in-memory implementation of MemoryStore
 * Useful for testing or when persistence is not needed
 */
export class InMemoryStore implements MemoryStore {
  private entries: Map<string, MemoryEntry> = new Map();

  async add(content: string, metadata?: Record<string, unknown>): Promise<MemoryEntry> {
    const id = crypto.randomUUID();
    const now = new Date();
    const entry: MemoryEntry = {
      id,
      content,
      metadata: metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.entries.set(id, entry);
    return entry;
  }

  async search(options: MemorySearchOptions): Promise<MemoryEntry[]> {
    const { query, limit = 10 } = options;
    const queryLower = query.toLowerCase();

    // Simple text search
    const results: MemoryEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.content.toLowerCase().includes(queryLower)) {
        results.push(entry);
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  async get(id: string): Promise<MemoryEntry | null> {
    return this.entries.get(id) ?? null;
  }

  async update(
    id: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryEntry> {
    const existing = this.entries.get(id);
    if (!existing) {
      throw new Error(`Memory entry not found: ${id}`);
    }

    const updated: MemoryEntry = {
      ...existing,
      content,
      metadata: metadata ?? existing.metadata,
      updatedAt: new Date(),
    };
    this.entries.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.entries.delete(id);
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }
}
