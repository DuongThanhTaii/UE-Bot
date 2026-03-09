/**
 * @fileoverview Settings repository
 * @module @ue-bot/database/repositories/settings
 */

import { and, eq } from 'drizzle-orm';

import type { Database } from '../client';
import { type Setting, settings } from '../schema';

export class SettingsRepository {
  constructor(private db: Database) {}

  async get(userId: string, key: string): Promise<unknown | undefined> {
    const [row] = await this.db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, userId), eq(settings.key, key)));

    return row?.value;
  }

  async getAll(userId: string): Promise<Record<string, unknown>> {
    const rows = await this.db.select().from(settings).where(eq(settings.userId, userId));

    const result: Record<string, unknown> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async set(userId: string, key: string, value: unknown): Promise<Setting> {
    // Upsert: try update first, then insert
    const existing = await this.db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, userId), eq(settings.key, key)));

    if (existing.length > 0) {
      const [updated] = await this.db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(and(eq(settings.userId, userId), eq(settings.key, key)))
        .returning();

      return updated!;
    }

    const [created] = await this.db.insert(settings).values({ userId, key, value }).returning();

    return created!;
  }

  async setMany(userId: string, data: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await this.set(userId, key, value);
    }
  }

  async delete(userId: string, key: string): Promise<void> {
    await this.db.delete(settings).where(and(eq(settings.userId, userId), eq(settings.key, key)));
  }

  async deleteAll(userId: string): Promise<void> {
    await this.db.delete(settings).where(eq(settings.userId, userId));
  }
}
