/**
 * Agent Service - Direct integration with @ue-bot/agent-core
 * Provides AI chat capabilities without requiring external Moltbot gateway
 */

import {
  Agent,
  FileSessionStore,
  GroqProvider,
  SQLiteMemoryStore,
  SessionManager,
  ToolRegistry,
  createMemoryTools,
  createWebTools,
  setMemoryStore,
} from '@ue-bot/agent-core';
import * as os from 'os';
import * as path from 'path';

import { config } from '../config';
import { logger } from '../utils/logger';

export interface AgentChatRequest {
  message: string;
  sessionId?: string;
  deviceId?: string;
}

export interface AgentChatResponse {
  content: string;
  sessionId: string;
}

export class AgentService {
  private agent: Agent | null = null;
  private sessionManager: SessionManager | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const apiKey = config.GROQ_API_KEY;
    if (!apiKey) {
      logger.warn('GROQ_API_KEY not set, agent service disabled');
      return;
    }

    const provider = new GroqProvider({
      apiKey,
      model: config.GROQ_MODEL || 'llama-3.3-70b-versatile',
    });

    const dataDir = path.join(os.homedir(), '.ue-bot', 'bridge-data');

    // Initialize memory
    const memoryStore = new SQLiteMemoryStore({
      dbPath: path.join(dataDir, 'memory.db'),
    });
    setMemoryStore(memoryStore);

    // Initialize session store
    const sessionStore = new FileSessionStore({
      directory: path.join(dataDir, 'sessions'),
    });

    this.sessionManager = new SessionManager({
      store: sessionStore,
      maxMessages: 50,
      autoArchiveAfter: 24 * 60 * 60 * 1000,
    });

    // Register tools
    const registry = new ToolRegistry();
    registry.registerMany([...createMemoryTools(), ...createWebTools(config.BRAVE_SEARCH_API_KEY)]);

    this.agent = new Agent(provider, registry, {
      maxIterations: 5,
    });

    this.initialized = true;
    logger.info('Agent service initialized');
  }

  async chat(request: AgentChatRequest): Promise<AgentChatResponse> {
    if (!this.agent || !this.sessionManager) {
      throw new Error('Agent service not initialized');
    }

    const session = await this.sessionManager.getOrCreate(request.sessionId);

    await this.sessionManager.addMessage(session.id, {
      role: 'user',
      content: request.message,
    });

    const result = await this.agent.chat(request.message, {
      sessionId: session.id,
    });

    await this.sessionManager.addMessage(session.id, {
      role: 'assistant',
      content: result.content,
    });

    return {
      content: result.content,
      sessionId: session.id,
    };
  }

  isAvailable(): boolean {
    return this.initialized && this.agent !== null;
  }
}

// Singleton
let _agentService: AgentService | null = null;

export function getAgentService(): AgentService {
  if (!_agentService) {
    _agentService = new AgentService();
  }
  return _agentService;
}
