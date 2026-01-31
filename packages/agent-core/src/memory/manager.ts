/**
 * @fileoverview Memory manager with tool integration
 * @module @ue-bot/agent-core/memory/manager
 */

import type { MemoryEntry, MemoryStore } from '../types';

/**
 * Memory manager configuration
 */
export interface MemoryManagerConfig {
  /** Memory store implementation */
  store: MemoryStore;
  /** Maximum memories to return in search */
  maxSearchResults?: number;
  /** Minimum relevance score for search results */
  minRelevance?: number;
}

/**
 * Memory manager for long-term storage
 */
export class MemoryManager {
  private store: MemoryStore;
  private maxSearchResults: number;

  constructor(config: MemoryManagerConfig) {
    this.store = config.store;
    this.maxSearchResults = config.maxSearchResults || 10;
  }

  /**
   * Store a new memory
   */
  async remember(content: string, metadata?: Record<string, unknown>): Promise<MemoryEntry> {
    return this.store.add(content, metadata);
  }

  /**
   * Search memories
   */
  async recall(query: string, limit?: number): Promise<MemoryEntry[]> {
    return this.store.search({
      query,
      limit: limit || this.maxSearchResults,
    });
  }

  /**
   * Get a specific memory
   */
  async get(id: string): Promise<MemoryEntry | null> {
    return this.store.get(id);
  }

  /**
   * Update a memory
   */
  async update(
    id: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryEntry> {
    return this.store.update(id, content, metadata);
  }

  /**
   * Delete a memory
   */
  async forget(id: string): Promise<void> {
    return this.store.delete(id);
  }

  /**
   * Clear all memories
   */
  async clearAll(): Promise<void> {
    return this.store.clear();
  }
}
