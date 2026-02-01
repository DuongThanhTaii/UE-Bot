/**
 * @fileoverview Public exports for @ue-bot/agent-core
 * @module @ue-bot/agent-core
 */

// Types
export * from './types';

// LLM Providers
export { ClaudeProvider } from './llm/claude';
export type { ClaudeConfig } from './llm/claude';
export { GroqProvider } from './llm/groq';
export type { GroqConfig } from './llm/groq';
export { OpenAIProvider } from './llm/openai';
export type { OpenAIConfig } from './llm/openai';

// Provider Factory
export {
  AVAILABLE_MODELS,
  DEFAULT_MODELS,
  PROVIDER_NAMES,
  createProvider,
  createProviderFromOptions,
  getApiKeyPlaceholder,
  validateApiKey,
} from './llm/factory';
export type { ProviderConfig, ProviderType } from './llm/factory';

// Tools
export { BaseTool } from './tools/base-tool';
export { createFsTools } from './tools/fs';
export { createMemoryTools, setMemoryStore } from './tools/memory';
export { createOpenTools } from './tools/open';
export { ToolRegistry, createToolRegistry } from './tools/registry';
export { createRuntimeTools } from './tools/runtime';
export { createWebTools } from './tools/web';

// System Prompt
export { buildSystemPrompt, getDefaultSystemPrompt } from './system-prompt';
export type { SystemPromptParams } from './system-prompt';

// Agent
export { Agent } from './agent';

// Session
export { FileSessionStore } from './session/file-store';
export { SessionManager } from './session/manager';

// Memory
export { InMemoryStore } from './memory/inmemory-store';
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

// Security
export {
  BLOCKED_COMMANDS,
  Security,
  SENSITIVE_PATHS,
  SUSPICIOUS_COMMANDS,
  checkCommandSecurity,
  checkPathSecurity,
  isBlockedCommand,
  isSensitivePath,
  isSuspiciousCommand,
  sanitizeInput,
} from './security';
export type { SecurityCheckResult } from './security';

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
