/**
 * @fileoverview Tests for error handling
 * @module @ue-bot/agent-core/__tests__/errors.test
 */

import { describe, expect, it, vi } from 'vitest';
import { AgentErrorClass, classifyError, getUserFriendlyMessage, withRetry } from '../errors';
import { ErrorCode } from '../types';

describe('Error handling', () => {
  describe('AgentErrorClass', () => {
    it('should create error with correct properties', () => {
      const error = new AgentErrorClass(
        ErrorCode.LLM_API_ERROR,
        'API failed',
        { details: 'test' },
        true
      );

      expect(error.code).toBe(ErrorCode.LLM_API_ERROR);
      expect(error.message).toBe('API failed');
      expect(error.details).toEqual({ details: 'test' });
      expect(error.retryable).toBe(true);
      expect(error.timestamp).toBeDefined();
    });

    it('should convert to JSON', () => {
      const error = new AgentErrorClass(ErrorCode.TOOL_NOT_FOUND, 'Not found');
      const json = error.toJSON();

      expect(json.code).toBe(ErrorCode.TOOL_NOT_FOUND);
      expect(json.message).toBe('Not found');
      expect(json.timestamp).toBeDefined();
    });

    it('should create from unknown error', () => {
      const original = new Error('Network failed');
      const error = AgentErrorClass.fromError(original);

      expect(error).toBeInstanceOf(AgentErrorClass);
      expect(error.message).toBe('Network failed');
    });

    it('should return same instance if already AgentErrorClass', () => {
      const original = new AgentErrorClass(ErrorCode.ABORTED, 'Aborted');
      const error = AgentErrorClass.fromError(original);

      expect(error).toBe(original);
    });
  });

  describe('classifyError', () => {
    it('should classify rate limit errors', () => {
      const error = new Error('rate limit exceeded');
      const result = classifyError(error);

      expect(result.code).toBe(ErrorCode.LLM_RATE_LIMIT);
      expect(result.retryable).toBe(true);
    });

    it('should classify timeout errors', () => {
      const error = new Error('request timed out');
      const result = classifyError(error);

      expect(result.code).toBe(ErrorCode.LLM_TIMEOUT);
      expect(result.retryable).toBe(true);
    });

    it('should classify network errors', () => {
      const error = new Error('ECONNREFUSED');
      const result = classifyError(error);

      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(result.retryable).toBe(true);
    });

    it('should classify permission errors', () => {
      const error = new Error('permission denied');
      const result = classifyError(error);

      expect(result.code).toBe(ErrorCode.TOOL_PERMISSION_DENIED);
      expect(result.retryable).toBe(false);
    });

    it('should classify validation errors', () => {
      const error = new Error('validation failed');
      const result = classifyError(error);

      expect(result.code).toBe(ErrorCode.TOOL_VALIDATION_ERROR);
      expect(result.retryable).toBe(false);
    });

    it('should classify 5xx errors as retryable', () => {
      const error = { status: 503, message: 'Service unavailable' };
      const result = classifyError(error);

      expect(result.code).toBe(ErrorCode.LLM_API_ERROR);
      expect(result.retryable).toBe(true);
    });

    it('should return unknown for unrecognized errors', () => {
      const error = new Error('something went wrong');
      const result = classifyError(error);

      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.retryable).toBe(false);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return friendly message for rate limit', () => {
      const error = { code: ErrorCode.LLM_RATE_LIMIT, message: '', timestamp: 0, retryable: true };
      const message = getUserFriendlyMessage(error);

      expect(message).toContain('busy');
    });

    it('should return friendly message for timeout', () => {
      const error = { code: ErrorCode.LLM_TIMEOUT, message: '', timestamp: 0, retryable: true };
      const message = getUserFriendlyMessage(error);

      expect(message).toContain('too long');
    });

    it('should return friendly message for permission denied', () => {
      const error = {
        code: ErrorCode.TOOL_PERMISSION_DENIED,
        message: '',
        timestamp: 0,
        retryable: false,
      };
      const message = getUserFriendlyMessage(error);

      expect(message).toContain('Permission denied');
    });

    it('should return original message for unknown errors', () => {
      const error = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Custom error',
        timestamp: 0,
        retryable: false,
      };
      const message = getUserFriendlyMessage(error);

      expect(message).toBe('Custom error');
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('rate limit'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 3, initialDelay: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('permission denied'));

      await expect(withRetry(fn, { maxRetries: 3, initialDelay: 10 })).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('rate limit'))
        .mockResolvedValue('success');

      await withRetry(fn, { maxRetries: 3, initialDelay: 10, onRetry });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 10);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('rate limit'));

      await expect(withRetry(fn, { maxRetries: 2, initialDelay: 10 })).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('should respect custom retry condition', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('custom error'));
      const retryOn = vi.fn().mockReturnValue(true);

      await expect(withRetry(fn, { maxRetries: 1, initialDelay: 10, retryOn })).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(2);
      expect(retryOn).toHaveBeenCalled();
    });
  });
});
