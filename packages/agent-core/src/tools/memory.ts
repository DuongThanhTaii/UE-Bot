/**
 * @fileoverview Memory tools for long-term storage
 * @module @ue-bot/agent-core/tools/memory
 */

import { z } from 'zod';

import type { MemoryStore, ToolContext } from '../types';

import { BaseTool } from './base-tool';

/**
 * Shared memory store instance
 * Set via setMemoryStore before using memory tools
 */
let sharedMemoryStore: MemoryStore | null = null;

/**
 * Set the shared memory store for memory tools
 */
export function setMemoryStore(store: MemoryStore): void {
  sharedMemoryStore = store;
}

/**
 * Get the shared memory store
 */
function getStore(): MemoryStore {
  if (!sharedMemoryStore) {
    throw new Error('Memory store not configured. Call setMemoryStore first.');
  }
  return sharedMemoryStore;
}

// ============================================================================
// Memory Add Tool
// ============================================================================

/**
 * Tool for storing memories
 */
export class MemoryAddTool extends BaseTool {
  name = 'memory_add';
  group = 'memory' as const;
  description =
    'Store information in long-term memory for later recall. Use for important facts, preferences, or context.';

  parameters = z.object({
    content: z.string().describe('The information to remember'),
    tags: z.array(z.string()).optional().describe('Tags for categorization'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    _context: ToolContext
  ): Promise<{ id: string; message: string }> {
    const store = getStore();

    const entry = await store.add(params.content, {
      tags: params.tags || [],
      timestamp: Date.now(),
    });

    return {
      id: entry.id,
      message: 'Memory stored successfully',
    };
  }
}

// ============================================================================
// Memory Search Tool
// ============================================================================

/**
 * Tool for searching memories
 */
export class MemorySearchTool extends BaseTool {
  name = 'memory_search';
  group = 'memory' as const;
  description =
    'Search long-term memory for relevant information. Returns matching memories based on query.';

  parameters = z.object({
    query: z.string().describe('Search query to find relevant memories'),
    limit: z.number().int().min(1).max(20).default(5).describe('Maximum number of results'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    _context: ToolContext
  ): Promise<{ results: MemoryResult[]; total: number }> {
    const store = getStore();

    const entries = await store.search({
      query: params.query,
      limit: params.limit,
    });

    const results: MemoryResult[] = entries.map((entry) => ({
      id: entry.id,
      content: entry.content,
      tags: (entry.metadata['tags'] as string[]) || [],
      createdAt: entry.createdAt.toISOString(),
    }));

    return {
      results,
      total: results.length,
    };
  }
}

interface MemoryResult {
  id: string;
  content: string;
  tags: string[];
  createdAt: string;
}

// ============================================================================
// Memory Delete Tool
// ============================================================================

/**
 * Tool for deleting memories
 */
export class MemoryDeleteTool extends BaseTool {
  name = 'memory_delete';
  group = 'memory' as const;
  description = 'Delete a specific memory by ID.';

  parameters = z.object({
    id: z.string().describe('The ID of the memory to delete'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    _context: ToolContext
  ): Promise<{ message: string }> {
    const store = getStore();

    await store.delete(params.id);

    return {
      message: `Memory ${params.id} deleted successfully`,
    };
  }
}

// ============================================================================
// Memory Update Tool
// ============================================================================

/**
 * Tool for updating memories
 */
export class MemoryUpdateTool extends BaseTool {
  name = 'memory_update';
  group = 'memory' as const;
  description = 'Update an existing memory with new content.';

  parameters = z.object({
    id: z.string().describe('The ID of the memory to update'),
    content: z.string().describe('The new content for the memory'),
    tags: z.array(z.string()).optional().describe('New tags (optional)'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    _context: ToolContext
  ): Promise<{ message: string }> {
    const store = getStore();

    const metadata = params.tags ? { tags: params.tags, timestamp: Date.now() } : undefined;

    await store.update(params.id, params.content, metadata);

    return {
      message: `Memory ${params.id} updated successfully`,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create all memory tools
 * Note: Call setMemoryStore before using these tools
 */
export function createMemoryTools(): BaseTool[] {
  return [
    new MemoryAddTool(),
    new MemorySearchTool(),
    new MemoryDeleteTool(),
    new MemoryUpdateTool(),
  ];
}
