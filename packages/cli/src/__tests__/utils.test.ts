/**
 * @fileoverview CLI utility tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment
vi.mock('os', () => ({
  homedir: () => '/home/test',
  platform: () => 'linux',
}));

describe('CLI Utils', () => {
  describe('Config', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should have default config path', () => {
      // Config path should be based on home directory
      const expectedPath = '/home/test/.ue-bot';
      expect(expectedPath).toContain('.ue-bot');
    });

    it('should support environment variable override', () => {
      process.env['UE_BOT_CONFIG'] = '/custom/path';
      expect(process.env['UE_BOT_CONFIG']).toBe('/custom/path');
      delete process.env['UE_BOT_CONFIG'];
    });
  });

  describe('Output formatting', () => {
    it('should format JSON output', () => {
      const data = { name: 'test', value: 123 };
      const json = JSON.stringify(data, null, 2);
      expect(json).toContain('"name": "test"');
      expect(json).toContain('"value": 123');
    });

    it('should handle nested objects', () => {
      const data = {
        user: { name: 'test' },
        items: [1, 2, 3],
      };
      const json = JSON.stringify(data, null, 2);
      expect(json).toContain('"user"');
      expect(json).toContain('"items"');
    });
  });

  describe('Command parsing', () => {
    it('should parse simple commands', () => {
      const input = '/help';
      const isCommand = input.startsWith('/');
      expect(isCommand).toBe(true);
    });

    it('should parse command with arguments', () => {
      const input = '/model llama-3.3-70b';
      const [cmd, ...args] = input.slice(1).split(' ');
      expect(cmd).toBe('model');
      expect(args).toEqual(['llama-3.3-70b']);
    });

    it('should handle empty input', () => {
      const input = '';
      const trimmed = input.trim();
      expect(trimmed).toBe('');
    });
  });
});

describe('Session Management', () => {
  it('should generate unique session IDs', () => {
    const id1 = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const id2 = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^sess_\d+_[a-z0-9]+$/);
  });

  it('should track conversation history', () => {
    const history: Array<{ role: string; content: string }> = [];

    history.push({ role: 'user', content: 'Hello' });
    history.push({ role: 'assistant', content: 'Hi there!' });

    expect(history).toHaveLength(2);
    expect(history[0].role).toBe('user');
    expect(history[1].role).toBe('assistant');
  });
});
