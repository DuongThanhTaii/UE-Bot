/**
 * @fileoverview Tool approval system for security-sensitive operations
 * @module @ue-bot/agent-core/approval
 */

import type { ApprovalChecker, ApprovalRequest, ApprovalState } from '../types';
import { generateId } from '../utils';

/**
 * Approval rule definition
 */
export interface ApprovalRule {
  /** Tool name pattern (glob) */
  pattern: string;
  /** Whether this rule requires approval */
  requiresApproval: boolean;
  /** Optional condition function */
  condition?: (args: Record<string, unknown>) => boolean;
  /** Reason to show user */
  reason?: string;
}

/**
 * Default approval rules
 */
const DEFAULT_RULES: ApprovalRule[] = [
  // File system rules
  {
    pattern: 'delete',
    requiresApproval: true,
    reason: 'Deleting files requires approval',
  },
  {
    pattern: 'write',
    requiresApproval: true,
    condition: (args) => {
      // Require approval for writing outside current directory
      const path = args['path'] as string;
      return path.includes('..') || path.startsWith('/');
    },
    reason: 'Writing files outside current directory requires approval',
  },

  // Runtime rules
  {
    pattern: 'exec',
    requiresApproval: true,
    condition: (args) => {
      const command = (args['command'] as string).toLowerCase();
      // Dangerous commands
      const dangerous = ['rm ', 'del ', 'format ', 'mkfs', 'dd ', 'sudo ', 'chmod ', 'chown '];
      return dangerous.some((d) => command.includes(d));
    },
    reason: 'Executing potentially dangerous commands requires approval',
  },
  {
    pattern: 'bash',
    requiresApproval: true,
    reason: 'Running bash scripts requires approval',
  },
  {
    pattern: 'process',
    requiresApproval: true,
    condition: (args) => args['action'] === 'start',
    reason: 'Starting background processes requires approval',
  },

  // Web rules
  {
    pattern: 'api_request',
    requiresApproval: true,
    condition: (args) => args['method'] !== 'GET',
    reason: 'Non-GET API requests require approval',
  },
];

/**
 * Approval checker implementation
 */
export class ApprovalCheckerImpl implements ApprovalChecker {
  private rules: ApprovalRule[];
  private requests = new Map<string, ApprovalRequest>();
  private resolvers = new Map<string, { resolve: () => void; reject: () => void }>();

  constructor(rules?: ApprovalRule[]) {
    this.rules = rules || DEFAULT_RULES;
  }

  /**
   * Check if a tool call requires approval
   */
  requiresApproval(toolName: string, args: Record<string, unknown>): boolean {
    for (const rule of this.rules) {
      // Check pattern match
      if (!this.matchPattern(rule.pattern, toolName)) {
        continue;
      }

      // If no condition, just check requiresApproval
      if (!rule.condition) {
        return rule.requiresApproval;
      }

      // Check condition
      if (rule.condition(args)) {
        return rule.requiresApproval;
      }
    }

    return false;
  }

  /**
   * Create an approval request
   */
  createRequest(toolName: string, args: Record<string, unknown>): ApprovalRequest {
    const rule = this.rules.find((r) => this.matchPattern(r.pattern, toolName));
    const reason = rule?.reason || `Tool "${toolName}" requires approval`;

    const request: ApprovalRequest = {
      id: generateId('apr'),
      toolName,
      arguments: args,
      reason,
      state: 'pending',
      createdAt: new Date(),
    };

    this.requests.set(request.id, request);
    return request;
  }

  /**
   * Wait for approval
   */
  async waitForApproval(requestId: string): Promise<boolean> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.state !== 'pending') {
      return request.state === 'approved';
    }

    // Wait for approval/denial
    return new Promise<boolean>((resolve) => {
      this.resolvers.set(requestId, {
        resolve: () => { resolve(true); },
        reject: () => { resolve(false); },
      });
    });
  }

  /**
   * Approve a request
   */
  async approve(requestId: string): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    request.state = 'approved';
    request.resolvedAt = new Date();

    const resolver = this.resolvers.get(requestId);
    if (resolver) {
      resolver.resolve();
      this.resolvers.delete(requestId);
    }
  }

  /**
   * Deny a request
   */
  async deny(requestId: string): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    request.state = 'denied';
    request.resolvedAt = new Date();

    const resolver = this.resolvers.get(requestId);
    if (resolver) {
      resolver.reject();
      this.resolvers.delete(requestId);
    }
  }

  /**
   * Get request status
   */
  async getStatus(requestId: string): Promise<ApprovalState> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }
    return request.state;
  }

  /**
   * Get pending requests
   */
  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.state === 'pending');
  }

  /**
   * Get request by ID
   */
  getRequest(requestId: string): ApprovalRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Clear old requests (cleanup)
   */
  clearOldRequests(maxAge = 3600000): void {
    const cutoff = Date.now() - maxAge;
    for (const [id, request] of Array.from(this.requests.entries())) {
      if (request.createdAt.getTime() < cutoff) {
        this.requests.delete(id);
        this.resolvers.delete(id);
      }
    }
  }

  /**
   * Add a custom rule
   */
  addRule(rule: ApprovalRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove rules by pattern
   */
  removeRule(pattern: string): void {
    this.rules = this.rules.filter((r) => r.pattern !== pattern);
  }

  /**
   * Match pattern against tool name
   */
  private matchPattern(pattern: string, toolName: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('*')) {
      return toolName.startsWith(pattern.slice(0, -1));
    }
    return pattern === toolName;
  }
}

/**
 * Create default approval checker
 */
export function createApprovalChecker(rules?: ApprovalRule[]): ApprovalCheckerImpl {
  return new ApprovalCheckerImpl(rules);
}
