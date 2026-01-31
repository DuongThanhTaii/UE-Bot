/**
 * @fileoverview Session manager for conversation management
 * @module @ue-bot/agent-core/session/manager
 */

import type { AgentConfig, Message, Session, SessionState, SessionStore } from '../types';

/**
 * Session manager configuration
 */
export interface SessionManagerConfig {
  /** Session store implementation */
  store: SessionStore;
  /** Maximum messages to keep in session */
  maxMessages?: number;
  /** Auto-archive sessions after inactivity (ms) */
  autoArchiveAfter?: number;
}

/**
 * Session manager for handling conversations
 */
export class SessionManager {
  private store: SessionStore;
  private maxMessages: number;
  private autoArchiveAfter?: number;

  constructor(config: SessionManagerConfig) {
    this.store = config.store;
    this.maxMessages = config.maxMessages || 100;
    this.autoArchiveAfter = config.autoArchiveAfter;
  }

  /**
   * Create a new session
   */
  async create(config?: Partial<AgentConfig>): Promise<Session> {
    return this.store.create(config);
  }

  /**
   * Get a session by ID
   */
  async get(id: string): Promise<Session | null> {
    return this.store.get(id);
  }

  /**
   * Get or create a session
   */
  async getOrCreate(id: string | undefined, config?: Partial<AgentConfig>): Promise<Session> {
    if (id) {
      const session = await this.store.get(id);
      if (session) {
        // Reactivate if archived
        if (session.state === 'archived') {
          return this.store.update(id, { state: 'active' });
        }
        return session;
      }
    }
    return this.store.create(config);
  }

  /**
   * Add a message to a session
   */
  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = await this.store.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Trim old messages if over limit
    if (session.messages.length >= this.maxMessages) {
      // Keep system message and trim oldest non-system messages
      const systemMessages = session.messages.filter((m) => m.role === 'system');
      const nonSystemMessages = session.messages.filter((m) => m.role !== 'system');

      // Keep last N messages (minus system messages)
      const keepCount = this.maxMessages - systemMessages.length - 1;
      const trimmedMessages = [...systemMessages, ...nonSystemMessages.slice(-keepCount)];

      await this.store.update(sessionId, { messages: trimmedMessages });
    }

    await this.store.addMessage(sessionId, message);
  }

  /**
   * Get messages from a session
   */
  async getMessages(sessionId: string): Promise<Message[]> {
    return this.store.getMessages(sessionId);
  }

  /**
   * List sessions
   */
  async list(options?: {
    state?: SessionState;
    limit?: number;
    offset?: number;
  }): Promise<Session[]> {
    return this.store.list(options);
  }

  /**
   * Archive a session
   */
  async archive(sessionId: string): Promise<Session> {
    return this.store.update(sessionId, { state: 'archived' });
  }

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<void> {
    return this.store.delete(sessionId);
  }

  /**
   * Update session metadata
   */
  async updateMetadata(sessionId: string, metadata: Record<string, unknown>): Promise<Session> {
    const session = await this.store.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return this.store.update(sessionId, {
      metadata: { ...session.metadata, ...metadata },
    });
  }

  /**
   * Set session title
   */
  async setTitle(sessionId: string, title: string): Promise<Session> {
    return this.store.update(sessionId, { title });
  }

  /**
   * Archive old sessions
   */
  async archiveOldSessions(): Promise<number> {
    if (!this.autoArchiveAfter) return 0;

    const sessions = await this.store.list({ state: 'active' });
    const cutoff = Date.now() - this.autoArchiveAfter;
    let archived = 0;

    for (const session of sessions) {
      if (session.updatedAt.getTime() < cutoff) {
        await this.archive(session.id);
        archived++;
      }
    }

    return archived;
  }
}
