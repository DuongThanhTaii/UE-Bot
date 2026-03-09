/**
 * @fileoverview Memory repository
 * @module @ue-bot/database/repositories/memory
 */

import { desc, eq, ilike, or, sql } from 'drizzle-orm';

import type { Database } from '../client';
import { memories, type Memory } from '../schema';

function generateId(): string {
  return 'mem_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

export class MemoryRepository {
  constructor(private db: Database) {}

  async add(content: string, metadata?: Record<string, unknown>, userId?: string): Promise<Memory> {
    const id = generateId();

    const [memory] = await this.db
      .insert(memories)
      .values({ id, content, metadata: metadata || {}, userId })
      .returning();

    return memory!;
  }

  async search(options: { query: string; limit?: number; userId?: string }): Promise<Memory[]> {
    const limit = options.limit || 5;
    const words = options.query.split(/\s+/).filter(Boolean);

    // Build search conditions using ILIKE for each word
    const searchConditions = words.map((word) => ilike(memories.content, `%${word}%`));

    let query = this.db.select().from(memories).$dynamic();

    if (options.userId) {
      query = query.where(eq(memories.userId, options.userId));
    }

    if (searchConditions.length > 0) {
      // Match any word (OR)
      const existing = options.userId ? eq(memories.userId, options.userId) : undefined;
      const searchOr = or(...searchConditions);

      if (existing && searchOr) {
        query = this.db
          .select()
          .from(memories)
          .where(sql`${existing} AND ${searchOr}`)
          .$dynamic();
      } else if (searchOr) {
        query = this.db.select().from(memories).where(searchOr).$dynamic();
      }
    }

    return query.orderBy(desc(memories.updatedAt)).limit(limit);
  }

  async findById(id: string): Promise<Memory | undefined> {
    const [memory] = await this.db.select().from(memories).where(eq(memories.id, id));

    return memory;
  }

  async update(
    id: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<Memory | undefined> {
    const updates: Record<string, unknown> = { content, updatedAt: new Date() };
    if (metadata) updates['metadata'] = metadata;

    const [memory] = await this.db
      .update(memories)
      .set(updates)
      .where(eq(memories.id, id))
      .returning();

    return memory;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(memories).where(eq(memories.id, id));
  }

  async clear(userId?: string): Promise<void> {
    if (userId) {
      await this.db.delete(memories).where(eq(memories.userId, userId));
    } else {
      await this.db.delete(memories);
    }
  }
}
