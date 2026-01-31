/**
 * @fileoverview Tests for streaming utilities
 * @module @ue-bot/agent-core/__tests__/streaming.test
 */

import { describe, expect, it } from 'vitest';
import { createTextAccumulator, eventToSSE, parseSSE } from '../streaming';
import type { AgentEvent } from '../types';
import { ErrorCode } from '../types';

describe('Streaming utilities', () => {
  describe('eventToSSE', () => {
    it('should format start event', () => {
      const event: AgentEvent = { type: 'start', sessionId: 'test-123', timestamp: Date.now() };
      const sse = eventToSSE(event);

      expect(sse).toContain('event: start');
      expect(sse).toContain('data: ');
      expect(sse).toContain('"sessionId":"test-123"');
    });

    it('should format text_delta event', () => {
      const event: AgentEvent = {
        type: 'text_delta',
        content: 'Hello world',
        timestamp: Date.now(),
      };
      const sse = eventToSSE(event);

      expect(sse).toContain('event: text_delta');
      expect(sse).toContain('"content":"Hello world"');
    });

    it('should format tool_start event', () => {
      const event: AgentEvent = {
        type: 'tool_start',
        toolName: 'test_tool',
        arguments: { arg: 'value' },
        timestamp: Date.now(),
      };
      const sse = eventToSSE(event);

      expect(sse).toContain('event: tool_start');
      expect(sse).toContain('"toolName":"test_tool"');
    });

    it('should format error event', () => {
      const event: AgentEvent = {
        type: 'error',
        error: {
          code: ErrorCode.UNKNOWN_ERROR,
          message: 'Test error',
          retryable: false,
          timestamp: 123,
        },
        timestamp: Date.now(),
      };
      const sse = eventToSSE(event);

      expect(sse).toContain('event: error');
      expect(sse).toContain('"message":"Test error"');
    });

    it('should format complete event', () => {
      const event: AgentEvent = {
        type: 'complete',
        result: {
          content: 'Done',
          toolCalls: [],
          iterations: 1,
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        },
        timestamp: Date.now(),
      };
      const sse = eventToSSE(event);

      expect(sse).toContain('event: complete');
      expect(sse).toContain('"promptTokens":10');
    });
  });

  describe('parseSSE', () => {
    it('should parse start event', () => {
      const ts = Date.now();
      const sse = `event: start\ndata: {"type":"start","sessionId":"test-123","timestamp":${ts}}\n\n`;
      const event = parseSSE(sse);

      expect(event).not.toBeNull();
      expect(event!.type).toBe('start');
      expect((event as any).sessionId).toBe('test-123');
    });

    it('should parse text_delta event', () => {
      const ts = Date.now();
      const sse = `event: text_delta\ndata: {"type":"text_delta","content":"Hello","timestamp":${ts}}\n\n`;
      const event = parseSSE(sse);

      expect(event).not.toBeNull();
      expect(event!.type).toBe('text_delta');
      expect((event as any).content).toBe('Hello');
    });

    it('should return null for invalid SSE', () => {
      const event = parseSSE('invalid data');
      expect(event).toBeNull();
    });

    it('should return null for empty string', () => {
      const event = parseSSE('');
      expect(event).toBeNull();
    });

    it('should handle multi-line data', () => {
      const ts = Date.now();
      const sse = `event: text_delta\ndata: {"type":"text_delta","content":"line1\\nline2","timestamp":${ts}}\n\n`;
      const event = parseSSE(sse);

      expect(event).not.toBeNull();
      expect((event as any).content).toBe('line1\nline2');
    });
  });

  describe('createTextAccumulator', () => {
    it('should accumulate text', () => {
      const accumulator = createTextAccumulator();

      accumulator.add('Hello');
      accumulator.add(' ');
      accumulator.add('World');

      expect(accumulator.get()).toBe('Hello World');
    });

    it('should clear accumulated text', () => {
      const accumulator = createTextAccumulator();

      accumulator.add('test');
      accumulator.clear();

      expect(accumulator.get()).toBe('');
    });

    it('should handle empty adds', () => {
      const accumulator = createTextAccumulator();

      accumulator.add('');
      accumulator.add('test');
      accumulator.add('');

      expect(accumulator.get()).toBe('test');
    });
  });
});
