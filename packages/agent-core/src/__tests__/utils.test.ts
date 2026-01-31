/**
 * @fileoverview Tests for utility functions
 * @module @ue-bot/agent-core/__tests__/utils.test
 */

import { describe, expect, it } from 'vitest';
import type { ToolCall, ToolResult } from '../types';
import {
  deepClone,
  deepMerge,
  formatToolResult,
  generateId,
  matchGlob,
  parseToolCall,
  sleep,
  truncate,
  withTimeout,
} from '../utils';

describe('Utility functions', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).not.toBe(id2);
    });

    it('should include prefix if provided', () => {
      const id = generateId('msg');

      expect(id.startsWith('msg_')).toBe(true);
    });

    it('should generate IDs of correct length', () => {
      const id = generateId();

      // Should be at least 10 chars (8 random + timestamp components)
      expect(id.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('formatToolResult', () => {
    it('should format successful result with string', () => {
      const result: ToolResult = {
        toolCallId: 'test-1',
        success: true,
        result: 'hello',
      };
      expect(formatToolResult(result)).toBe('hello');
    });

    it('should format successful result with object', () => {
      const result: ToolResult = {
        toolCallId: 'test-2',
        success: true,
        result: { key: 'value' },
      };
      const formatted = formatToolResult(result);
      expect(formatted).toContain('key');
      expect(formatted).toContain('value');
    });

    it('should format error result', () => {
      const result: ToolResult = {
        toolCallId: 'test-3',
        success: false,
        error: 'Something went wrong',
      };
      expect(formatToolResult(result)).toContain('Error');
      expect(formatToolResult(result)).toContain('Something went wrong');
    });

    it('should handle success with no output', () => {
      const result: ToolResult = {
        toolCallId: 'test-4',
        success: true,
      };
      expect(formatToolResult(result)).toBe('Success (no output)');
    });
  });

  describe('parseToolCall', () => {
    it('should parse stringified arguments', () => {
      const toolCall: ToolCall = {
        id: 'call-1',
        name: 'test_tool',
        arguments: '{"key":"value"}' as unknown as Record<string, unknown>,
      };
      const result = parseToolCall(toolCall);

      expect(result.name).toBe('test_tool');
      expect(result.arguments).toEqual({ key: 'value' });
    });

    it('should return same object if arguments are already parsed', () => {
      const toolCall: ToolCall = {
        id: 'call-2',
        name: 'test_tool',
        arguments: { key: 'value' },
      };
      const result = parseToolCall(toolCall);

      expect(result).toBe(toolCall);
      expect(result.arguments).toEqual({ key: 'value' });
    });

    it('should handle invalid JSON gracefully', () => {
      const toolCall: ToolCall = {
        id: 'call-3',
        name: 'test_tool',
        arguments: 'invalid json' as unknown as Record<string, unknown>,
      };
      const result = parseToolCall(toolCall);

      // Should return original toolCall without crashing
      expect(result).toBe(toolCall);
    });
  });

  describe('truncate', () => {
    it('should not truncate short strings', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should truncate long strings', () => {
      const result = truncate('hello world', 8);
      expect(result.length).toBe(8);
      expect(result).toBe('hello...');
    });
  });

  describe('matchGlob', () => {
    it('should match exact string', () => {
      expect(matchGlob('test', 'test')).toBe(true);
      expect(matchGlob('test', 'other')).toBe(false);
    });

    it('should match wildcard', () => {
      expect(matchGlob('*', 'anything')).toBe(true);
      expect(matchGlob('test_*', 'test_tool')).toBe(true);
      expect(matchGlob('*_tool', 'my_tool')).toBe(true);
    });

    it('should match multiple wildcards', () => {
      expect(matchGlob('*_*', 'test_tool')).toBe(true);
      expect(matchGlob('test_*_end', 'test_middle_end')).toBe(true);
    });
  });

  describe('sleep', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45);
    });
  });

  describe('deepClone', () => {
    it('should clone objects', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });

    it('should clone arrays', () => {
      const original = [1, 2, [3, 4]];
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should handle primitives', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('test')).toBe('test');
      expect(deepClone(null)).toBe(null);
    });
  });

  describe('deepMerge', () => {
    it('should merge objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 } as typeof target & { c: number };
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should merge nested objects', () => {
      const target = { a: { x: 1, y: 2, z: 0 } };
      const source = { a: { y: 3, z: 4 } };
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: { x: 1, y: 3, z: 4 } });
    });

    it('should not modify original objects', () => {
      const target = { a: 1, b: 0 };
      const source = { b: 2 };
      deepMerge(target, source);

      expect(target).toEqual({ a: 1, b: 0 });
    });
  });

  describe('withTimeout', () => {
    it('should resolve before timeout', async () => {
      const promise = Promise.resolve('success');

      const result = await withTimeout(promise, 100);
      expect(result).toBe('success');
    });

    it('should reject after timeout', async () => {
      const promise = new Promise((resolve) => setTimeout(() => resolve('success'), 200));

      await expect(withTimeout(promise, 50)).rejects.toThrow();
    });

    it('should use custom timeout message', async () => {
      const promise = new Promise((resolve) => setTimeout(() => resolve('success'), 200));

      await expect(withTimeout(promise, 50, 'Custom timeout')).rejects.toThrow('Custom timeout');
    });
  });
});
