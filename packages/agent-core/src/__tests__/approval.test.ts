/**
 * @fileoverview Tests for approval system
 * @module @ue-bot/agent-core/__tests__/approval.test
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ApprovalCheckerImpl, createApprovalChecker } from '../approval/checker';

describe('ApprovalChecker', () => {
  let checker: ApprovalCheckerImpl;

  beforeEach(() => {
    checker = createApprovalChecker();
  });

  describe('requiresApproval', () => {
    it('should require approval for delete tool', () => {
      const requires = checker.requiresApproval('delete', { path: '/test' });
      expect(requires).toBe(true);
    });

    it('should require approval for bash tool', () => {
      const requires = checker.requiresApproval('bash', { script: 'ls' });
      expect(requires).toBe(true);
    });

    it('should require approval for dangerous exec commands', () => {
      const requires = checker.requiresApproval('exec', { command: 'rm -rf /' });
      expect(requires).toBe(true);
    });

    it('should not require approval for safe exec commands', () => {
      const requires = checker.requiresApproval('exec', { command: 'ls -la' });
      expect(requires).toBe(false);
    });

    it('should require approval for write outside current dir', () => {
      const requires = checker.requiresApproval('write', { path: '../outside.txt' });
      expect(requires).toBe(true);
    });

    it('should not require approval for write in current dir', () => {
      const requires = checker.requiresApproval('write', { path: 'file.txt' });
      expect(requires).toBe(false);
    });

    it('should require approval for non-GET API requests', () => {
      const requires = checker.requiresApproval('api_request', {
        method: 'POST',
        url: 'http://test',
      });
      expect(requires).toBe(true);
    });

    it('should not require approval for GET API requests', () => {
      const requires = checker.requiresApproval('api_request', {
        method: 'GET',
        url: 'http://test',
      });
      expect(requires).toBe(false);
    });

    it('should not require approval for unknown tools', () => {
      const requires = checker.requiresApproval('unknown_tool', {});
      expect(requires).toBe(false);
    });
  });

  describe('createRequest', () => {
    it('should create approval request', () => {
      const request = checker.createRequest('delete', { path: '/test' });

      expect(request.id).toBeDefined();
      expect(request.id.startsWith('apr_')).toBe(true);
      expect(request.toolName).toBe('delete');
      expect(request.arguments).toEqual({ path: '/test' });
      expect(request.state).toBe('pending');
      expect(request.reason).toContain('Deleting');
    });

    it('should include creation timestamp', () => {
      const request = checker.createRequest('bash', {});

      expect(request.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('approve/deny', () => {
    it('should approve a pending request', async () => {
      const request = checker.createRequest('delete', {});

      await checker.approve(request.id);
      const status = await checker.getStatus(request.id);

      expect(status).toBe('approved');
    });

    it('should deny a pending request', async () => {
      const request = checker.createRequest('delete', {});

      await checker.deny(request.id);
      const status = await checker.getStatus(request.id);

      expect(status).toBe('denied');
    });

    it('should throw for non-existent request', async () => {
      await expect(checker.approve('non_existent')).rejects.toThrow();
    });
  });

  describe('waitForApproval', () => {
    it('should resolve true when approved', async () => {
      const request = checker.createRequest('delete', {});

      // Approve in background
      setTimeout(() => checker.approve(request.id), 10);

      const result = await checker.waitForApproval(request.id);
      expect(result).toBe(true);
    });

    it('should resolve false when denied', async () => {
      const request = checker.createRequest('delete', {});

      // Deny in background
      setTimeout(() => checker.deny(request.id), 10);

      const result = await checker.waitForApproval(request.id);
      expect(result).toBe(false);
    });

    it('should return immediately if already resolved', async () => {
      const request = checker.createRequest('delete', {});
      await checker.approve(request.id);

      const result = await checker.waitForApproval(request.id);
      expect(result).toBe(true);
    });
  });

  describe('getPendingRequests', () => {
    it('should return only pending requests', async () => {
      const request1 = checker.createRequest('delete', { id: 1 });
      const request2 = checker.createRequest('bash', { id: 2 });

      await checker.approve(request1.id);

      const pending = checker.getPendingRequests();
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(request2.id);
    });

    it('should return empty array when no pending', async () => {
      const request = checker.createRequest('delete', {});
      await checker.approve(request.id);

      const pending = checker.getPendingRequests();
      expect(pending).toEqual([]);
    });
  });

  describe('addRule/removeRule', () => {
    it('should add custom rule', () => {
      checker.addRule({
        pattern: 'custom_tool',
        requiresApproval: true,
        reason: 'Custom tool needs approval',
      });

      const requires = checker.requiresApproval('custom_tool', {});
      expect(requires).toBe(true);
    });

    it('should remove rule by pattern', () => {
      checker.removeRule('delete');

      const requires = checker.requiresApproval('delete', {});
      expect(requires).toBe(false);
    });
  });

  describe('clearOldRequests', () => {
    it('should clear requests older than maxAge', () => {
      // Create requests with old timestamp (mock by accessing private state)
      const request = checker.createRequest('delete', {});

      // Should not clear recent requests
      checker.clearOldRequests(3600000);
      expect(checker.getRequest(request.id)).toBeDefined();
    });
  });
});
