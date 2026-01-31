/**
 * @fileoverview File-based session store
 * @module @ue-bot/agent-core/session/file-store
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { AgentConfig, Message, Session, SessionState, SessionStore } from '../types';
import { generateId } from '../utils';

/**
 * File-based session store configuration
 */
export interface FileSessionStoreConfig {
  /** Directory to store session files */
  directory: string;
}

/**
 * File-based session store
 * Each session is stored as a JSON file
 */
export class FileSessionStore implements SessionStore {
  private directory: string;

  constructor(config: FileSessionStoreConfig) {
    this.directory = config.directory;
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.directory, { recursive: true });
  }

  /**
   * Get session file path
   */
  private getFilePath(id: string): string {
    return path.join(this.directory, `${id}.json`);
  }

  /**
   * Create a new session
   */
  async create(config?: Partial<AgentConfig>): Promise<Session> {
    await this.ensureDirectory();

    const now = new Date();
    const session: Session = {
      id: generateId('sess'),
      messages: [],
      state: 'active',
      config: config || {},
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    await this.save(session);
    return session;
  }

  /**
   * Get a session by ID
   */
  async get(id: string): Promise<Session | null> {
    try {
      const filePath = this.getFilePath(id);
      const data = await fs.readFile(filePath, 'utf8');
      const session = JSON.parse(data) as Session;

      // Parse dates
      session.createdAt = new Date(session.createdAt);
      session.updatedAt = new Date(session.updatedAt);

      return session;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a session
   */
  async update(id: string, updates: Partial<Session>): Promise<Session> {
    const session = await this.get(id);
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }

    const updated: Session = {
      ...session,
      ...updates,
      id, // Ensure ID doesn't change
      createdAt: session.createdAt, // Ensure createdAt doesn't change
      updatedAt: new Date(),
    };

    await this.save(updated);
    return updated;
  }

  /**
   * Delete a session
   */
  async delete(id: string): Promise<void> {
    const filePath = this.getFilePath(id);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * List sessions
   */
  async list(options?: {
    state?: SessionState;
    limit?: number;
    offset?: number;
  }): Promise<Session[]> {
    await this.ensureDirectory();

    const files = await fs.readdir(this.directory);
    const sessions: Session[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const id = file.replace('.json', '');
      const session = await this.get(id);

      if (session) {
        // Filter by state
        if (options?.state && session.state !== options.state) {
          continue;
        }
        sessions.push(session);
      }
    }

    // Sort by updatedAt descending
    sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;

    return sessions.slice(offset, offset + limit);
  }

  /**
   * Add a message to a session
   */
  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.messages.push(message);
    session.updatedAt = new Date();

    // Update title from first user message if not set
    if (!session.title && message.role === 'user') {
      session.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
    }

    await this.save(session);
  }

  /**
   * Get messages from a session
   */
  async getMessages(sessionId: string): Promise<Message[]> {
    const session = await this.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session.messages;
  }

  /**
   * Save a session to file
   */
  private async save(session: Session): Promise<void> {
    const filePath = this.getFilePath(session.id);
    const data = JSON.stringify(session, null, 2);
    await fs.writeFile(filePath, data, 'utf8');
  }

  /**
   * Clear all sessions
   */
  async clear(): Promise<void> {
    const files = await fs.readdir(this.directory);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(this.directory, file));
      }
    }
  }
}
