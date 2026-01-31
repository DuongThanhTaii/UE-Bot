/**
 * @fileoverview Core type definitions for UE-Bot Agent system
 * @module @ue-bot/agent-core/types
 */

// ============================================================================
// Tool Types
// ============================================================================

/**
 * Tool groups for categorization and permission control
 */
export type ToolGroup =
  | 'fs' // File system operations
  | 'runtime' // Command execution, process management
  | 'web' // Web search, fetch
  | 'memory' // Long-term memory storage
  | 'sessions'; // Session management

/**
 * JSON Schema type for tool parameters
 */
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: unknown;
}

/**
 * Tool parameter definition in JSON Schema format
 */
export interface ToolParameters {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required: string[];
  additionalProperties?: boolean;
}

/**
 * Tool definition for LLM function calling
 */
export interface ToolDefinition {
  name: string;
  group: ToolGroup;
  description: string;
  parameters: ToolParameters;
}

/**
 * Tool call from LLM response
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Result of tool execution
 */
export interface ToolResult {
  toolCallId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration?: number;
}

/**
 * Context passed to tool execution
 */
export interface ToolContext {
  sessionId: string;
  workingDirectory: string;
  abortSignal?: AbortSignal;
  onProgress?: (progress: ToolProgress) => void;
}

/**
 * Progress update during tool execution
 */
export interface ToolProgress {
  stage: string;
  progress?: number;
  message?: string;
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Role in conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Base message interface
 */
export interface BaseMessage {
  role: MessageRole;
  content: string;
}

/**
 * System message for agent instructions
 */
export interface SystemMessage extends BaseMessage {
  role: 'system';
}

/**
 * User message
 */
export interface UserMessage extends BaseMessage {
  role: 'user';
}

/**
 * Assistant message with optional tool calls
 */
export interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  toolCalls?: ToolCall[];
}

/**
 * Tool result message
 */
export interface ToolMessage extends BaseMessage {
  role: 'tool';
  toolCallId: string;
}

/**
 * Union type for all message types
 */
export type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage;

// ============================================================================
// LLM Provider Types
// ============================================================================

/**
 * LLM provider configuration
 */
export interface LLMConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
}

/**
 * LLM chat request
 */
export interface LLMChatRequest {
  messages: Message[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * LLM chat response
 */
export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Streaming chunk types
 */
export type StreamChunk =
  | { type: 'text_delta'; content: string }
  | { type: 'tool_call_start'; toolCall: Partial<ToolCall> }
  | { type: 'tool_call_delta'; toolCallId: string; argumentsDelta: string }
  | { type: 'tool_call_complete'; toolCall: ToolCall }
  | { type: 'done'; finishReason: string };

/**
 * LLM provider interface
 */
export interface LLMProvider {
  chat(request: LLMChatRequest): Promise<LLMResponse>;
  chatStream(request: LLMChatRequest): AsyncGenerator<StreamChunk>;
}

// ============================================================================
// Agent Types
// ============================================================================

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** LLM model identifier */
  model: string;
  /** System prompt for agent behavior */
  systemPrompt: string;
  /** Temperature for response randomness (0-1) */
  temperature: number;
  /** Maximum tokens in response */
  maxTokens: number;
  /** Maximum tool call iterations per request */
  maxIterations: number;
  /** Maximum tool calls per iteration */
  maxToolCallsPerIteration: number;
  /** Tool permission configuration */
  tools: {
    /** Allowed tools (glob patterns) */
    allow: string[];
    /** Denied tools (glob patterns, takes precedence) */
    deny: string[];
  };
  /** Working directory for file operations */
  workingDirectory: string;
}

/**
 * Default agent configuration
 */
export const DEFAULT_AGENT_CONFIG: Partial<AgentConfig> = {
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  maxTokens: 4096,
  maxIterations: 10,
  maxToolCallsPerIteration: 5,
  tools: {
    allow: ['*'],
    deny: [],
  },
};

/**
 * Agent execution options
 */
export interface AgentExecuteOptions {
  /** Session ID for context */
  sessionId: string;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  /** Callback for streaming events */
  onEvent?: (event: AgentEvent) => void;
}

/**
 * Agent execution result
 */
export interface AgentExecuteResult {
  /** Final response content */
  content: string;
  /** All tool calls made */
  toolCalls: Array<{
    tool: string;
    arguments: Record<string, unknown>;
    result: ToolResult;
  }>;
  /** Number of iterations */
  iterations: number;
  /** Total tokens used */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Agent event types for streaming/logging
 */
export type AgentEvent =
  | { type: 'start'; sessionId: string; timestamp: number }
  | { type: 'thinking'; timestamp: number }
  | { type: 'text_delta'; content: string; timestamp: number }
  | { type: 'tool_start'; toolName: string; arguments: Record<string, unknown>; timestamp: number }
  | { type: 'tool_progress'; toolName: string; progress: ToolProgress; timestamp: number }
  | { type: 'tool_end'; toolName: string; result: ToolResult; timestamp: number }
  | { type: 'iteration'; iteration: number; timestamp: number }
  | { type: 'complete'; result: AgentExecuteResult; timestamp: number }
  | { type: 'error'; error: AgentError; timestamp: number };

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session state
 */
export type SessionState = 'active' | 'idle' | 'archived';

/**
 * Session data
 */
export interface Session {
  id: string;
  title?: string;
  messages: Message[];
  state: SessionState;
  config: Partial<AgentConfig>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session store interface
 */
export interface SessionStore {
  create(config?: Partial<AgentConfig>): Promise<Session>;
  get(id: string): Promise<Session | null>;
  update(id: string, updates: Partial<Session>): Promise<Session>;
  delete(id: string): Promise<void>;
  list(options?: { state?: SessionState; limit?: number; offset?: number }): Promise<Session[]>;
  addMessage(sessionId: string, message: Message): Promise<void>;
  getMessages(sessionId: string): Promise<Message[]>;
}

// ============================================================================
// Memory Types
// ============================================================================

/**
 * Memory entry for long-term storage
 */
export interface MemoryEntry {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Memory search options
 */
export interface MemorySearchOptions {
  query: string;
  limit?: number;
  filter?: Record<string, unknown>;
}

/**
 * Memory store interface
 */
export interface MemoryStore {
  add(content: string, metadata?: Record<string, unknown>): Promise<MemoryEntry>;
  search(options: MemorySearchOptions): Promise<MemoryEntry[]>;
  get(id: string): Promise<MemoryEntry | null>;
  update(id: string, content: string, metadata?: Record<string, unknown>): Promise<MemoryEntry>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for agent errors
 */
export enum ErrorCode {
  // LLM errors
  LLM_API_ERROR = 'LLM_API_ERROR',
  LLM_RATE_LIMIT = 'LLM_RATE_LIMIT',
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_INVALID_RESPONSE = 'LLM_INVALID_RESPONSE',

  // Tool errors
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',
  TOOL_PERMISSION_DENIED = 'TOOL_PERMISSION_DENIED',
  TOOL_VALIDATION_ERROR = 'TOOL_VALIDATION_ERROR',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',

  // Agent errors
  MAX_ITERATIONS_EXCEEDED = 'MAX_ITERATIONS_EXCEEDED',
  ABORTED = 'ABORTED',

  // Session errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',

  // General errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Agent error interface
 */
export interface AgentError {
  code: ErrorCode;
  message: string;
  details?: unknown;
  retryable: boolean;
  timestamp: number;
}

/**
 * Create an agent error
 */
export function createAgentError(
  code: ErrorCode,
  message: string,
  details?: unknown,
  retryable = false
): AgentError {
  return {
    code,
    message,
    details,
    retryable,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Approval Types
// ============================================================================

/**
 * Approval state
 */
export type ApprovalState = 'pending' | 'approved' | 'denied';

/**
 * Approval request for dangerous operations
 */
export interface ApprovalRequest {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  reason: string;
  state: ApprovalState;
  createdAt: Date;
  resolvedAt?: Date;
}

/**
 * Approval checker interface
 */
export interface ApprovalChecker {
  requiresApproval(toolName: string, args: Record<string, unknown>): boolean;
  createRequest(toolName: string, args: Record<string, unknown>): ApprovalRequest;
  approve(requestId: string): Promise<void>;
  deny(requestId: string): Promise<void>;
  getStatus(requestId: string): Promise<ApprovalState>;
}
