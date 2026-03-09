/**
 * @fileoverview PostgreSQL Session Store - implements SessionStore from agent-core
 * @module @ue-bot/database/stores/postgres-session
 */

import type {
  AgentConfig,
  Message,
  MessageRole,
  Session,
  SessionState,
  SessionStore,
  ToolCall,
} from '@ue-bot/agent-core';
import type { Database } from '../client';
import { SessionRepository } from '../repositories/session.repo';

/**
 * PostgreSQL-backed session store using Neon
 */
export class PostgresSessionStore implements SessionStore {
  private repo: SessionRepository;
  private userId?: string;

  constructor(db: Database, userId?: string) {
    this.repo = new SessionRepository(db);
    this.userId = userId;
  }

  async create(config?: Partial<AgentConfig>): Promise<Session> {
    const row = await this.repo.create(this.userId, config as Record<string, unknown>);
    return this.toSession(row, []);
  }

  async get(id: string): Promise<Session | null> {
    const row = await this.repo.findById(id);
    if (!row) return null;

    const msgs = await this.repo.getMessages(id);
    return this.toSession(
      row,
      msgs.map((m) => this.toMessage(m))
    );
  }

  async update(id: string, updates: Partial<Session>): Promise<Session> {
    const data: Record<string, unknown> = {};
    if (updates.title !== undefined) data['title'] = updates.title;
    if (updates.state !== undefined) data['state'] = updates.state;
    if (updates.config !== undefined) data['config'] = updates.config;
    if (updates.metadata !== undefined) data['metadata'] = updates.metadata;

    const row = await this.repo.update(id, data as never);
    if (!row) throw new Error(`Session ${id} not found`);

    const msgs = await this.repo.getMessages(id);
    return this.toSession(
      row,
      msgs.map((m) => this.toMessage(m))
    );
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async list(options?: {
    state?: SessionState;
    limit?: number;
    offset?: number;
  }): Promise<Session[]> {
    const rows = await this.repo.list({
      userId: this.userId,
      state: options?.state,
      limit: options?.limit,
      offset: options?.offset,
    });

    return rows.map((r) => this.toSession(r, []));
  }

  async addMessage(sessionId: string, message: Message): Promise<void> {
    await this.repo.addMessage(
      sessionId,
      message.role,
      message.content,
      'toolCalls' in message ? message.toolCalls : undefined,
      'toolCallId' in message ? message.toolCallId : undefined
    );
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    const rows = await this.repo.getMessages(sessionId);
    return rows.map((m) => this.toMessage(m));
  }

  private toSession(
    row: {
      id: string;
      title: string | null;
      state: string;
      config: unknown;
      metadata: unknown;
      createdAt: Date;
      updatedAt: Date;
    },
    messages: Message[]
  ): Session {
    return {
      id: row.id,
      title: row.title || undefined,
      messages,
      state: (row.state as SessionState) || 'active',
      config: (row.config as Partial<AgentConfig>) || {},
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toMessage(row: {
    role: string;
    content: string;
    toolCalls: unknown;
    toolCallId: string | null;
  }): Message {
    const role = row.role as MessageRole;
    if (role === 'tool') {
      return { role, content: row.content, toolCallId: row.toolCallId || '' };
    }
    if (role === 'assistant') {
      return {
        role,
        content: row.content,
        ...(row.toolCalls ? { toolCalls: row.toolCalls as ToolCall[] } : {}),
      };
    }
    return { role, content: row.content } as Message;
  }
}
