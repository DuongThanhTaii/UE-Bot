/**
 * @fileoverview Session repository
 * @module @ue-bot/database/repositories/session
 */

import { desc, eq } from 'drizzle-orm';

import type { Database } from '../client';
import { type DbMessage, messages, type Session, sessions } from '../schema';

function generateId(): string {
  return 'sess_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

function generateMsgId(): string {
  return 'msg_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

export class SessionRepository {
  constructor(private db: Database) {}

  async create(userId?: string, config?: Record<string, unknown>): Promise<Session> {
    const id = generateId();

    const [session] = await this.db
      .insert(sessions)
      .values({ id, userId, config: config || {}, metadata: {} })
      .returning();

    return session!;
  }

  async findById(id: string): Promise<Session | undefined> {
    const [session] = await this.db.select().from(sessions).where(eq(sessions.id, id));

    return session;
  }

  async list(options?: {
    userId?: string;
    state?: string;
    limit?: number;
    offset?: number;
  }): Promise<Session[]> {
    let query = this.db.select().from(sessions).$dynamic();

    if (options?.userId) {
      query = query.where(eq(sessions.userId, options.userId));
    }
    if (options?.state) {
      query = query.where(eq(sessions.state, options.state));
    }

    return query
      .orderBy(desc(sessions.updatedAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async update(
    id: string,
    data: Partial<Pick<Session, 'title' | 'state' | 'config' | 'metadata'>>
  ): Promise<Session | undefined> {
    const [session] = await this.db
      .update(sessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sessions.id, id))
      .returning();

    return session;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, id));
  }

  // ─── Messages ──────────────────────────────────────────────

  async addMessage(
    sessionId: string,
    role: string,
    content: string,
    toolCalls?: unknown,
    toolCallId?: string
  ): Promise<DbMessage> {
    const id = generateMsgId();

    const [msg] = await this.db
      .insert(messages)
      .values({ id, sessionId, role, content, toolCalls, toolCallId })
      .returning();

    // Update session timestamp
    await this.db.update(sessions).set({ updatedAt: new Date() }).where(eq(sessions.id, sessionId));

    return msg!;
  }

  async getMessages(sessionId: string): Promise<DbMessage[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt);
  }
}
