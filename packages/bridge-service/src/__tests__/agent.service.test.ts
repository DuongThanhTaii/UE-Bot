/**
 * @fileoverview Agent Service tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentService } from '../services/agent.service';

// Mock agent-core modules
vi.mock('@ue-bot/agent-core', () => {
  const mockAgent = {
    chat: vi.fn().mockResolvedValue({ content: 'Hello from AI' }),
  };
  const mockSessionManager = {
    getOrCreate: vi.fn().mockResolvedValue({ id: 'sess_test', messages: [] }),
    addMessage: vi.fn().mockResolvedValue(undefined),
  };

  return {
    Agent: vi.fn().mockImplementation(() => mockAgent),
    GroqProvider: vi.fn().mockImplementation(() => ({})),
    ToolRegistry: vi.fn().mockImplementation(() => ({
      registerMany: vi.fn(),
    })),
    SessionManager: vi.fn().mockImplementation(() => mockSessionManager),
    FileSessionStore: vi.fn().mockImplementation(() => ({})),
    SQLiteMemoryStore: vi.fn().mockImplementation(() => ({})),
    createMemoryTools: vi.fn().mockReturnValue([]),
    createWebTools: vi.fn().mockReturnValue([]),
    setMemoryStore: vi.fn(),
  };
});

// Mock config
vi.mock('../config', () => ({
  config: {
    GROQ_API_KEY: 'test-key',
    GROQ_MODEL: 'llama-3.3-70b-versatile',
    BRAVE_SEARCH_API_KEY: undefined,
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    service = new AgentService();
  });

  describe('initialize', () => {
    it('should initialize successfully with API key', async () => {
      await service.initialize();

      expect(service.isAvailable()).toBe(true);
    });

    it('should not double-initialize', async () => {
      await service.initialize();
      await service.initialize();

      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('chat', () => {
    it('should return AI response for a message', async () => {
      await service.initialize();

      const result = await service.chat({ message: 'Hello' });

      expect(result.content).toBe('Hello from AI');
      expect(result.sessionId).toBe('sess_test');
    });

    it('should throw when not initialized', async () => {
      await expect(service.chat({ message: 'Hello' })).rejects.toThrow(
        'Agent service not initialized'
      );
    });
  });

  describe('isAvailable', () => {
    it('should return false before initialization', () => {
      expect(service.isAvailable()).toBe(false);
    });
  });
});
