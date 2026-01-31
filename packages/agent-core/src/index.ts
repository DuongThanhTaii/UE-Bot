/**
 * @fileoverview Public exports for @ue-bot/agent-core
 * @module @ue-bot/agent-core
 */

// Types
export * from './types';

// LLM Provider
export { GroqProvider } from './llm/groq';
export type { GroqConfig } from './llm/groq';

// Tools
export { BaseTool } from './tools/base-tool';
export { createFsTools } from './tools/fs';
export { createMemoryTools, setMemoryStore } from './tools/memory';
export { ToolRegistry, createToolRegistry } from './tools/registry';
export { createRuntimeTools } from './tools/runtime';
export { createWebTools } from './tools/web';
export { createOpenTools } from './tools/open';

// System Prompt
export { buildSystemPrompt, getDefaultSystemPrompt } from './system-prompt';
export type { SystemPromptParams } from './system-prompt';

// Agent
export { Agent } from './agent';

// Session
export { FileSessionStore } from './session/file-store';
export { SessionManager } from './session/manager';

// Memory
export { MemoryManager } from './memory/manager';
export { SQLiteMemoryStore } from './memory/sqlite-store';

// Streaming
export {
  agentStreamToSSE,
  collectStreamEvents,
  createTextAccumulator,
  eventToSSE,
  parseSSE,
  parseSSEStream,
} from './streaming';

// Approval
export { ApprovalCheckerImpl, createApprovalChecker } from './approval/checker';
export type { ApprovalRule } from './approval/checker';

// Errors
export { AgentErrorClass, classifyError, getUserFriendlyMessage, withRetry } from './errors';

// Recovery
export {
  CircuitBreaker,
  createErrorToolResult,
  withGracefulDegradation,
  withRecovery,
} from './recovery';
export type { RecoveryOptions, RecoveryResult, RecoveryStrategy } from './recovery';

// Utils
export {
  formatToolResult,
  generateId,
  matchGlob,
  parseToolCall,
  sleep,
  withTimeout,
} from './utils';
