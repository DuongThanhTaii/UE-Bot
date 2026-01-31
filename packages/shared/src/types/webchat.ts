/**
 * WebChat Channel Types
 * Types for WebChat communication with OpenClaw Gateway
 */

// ============================================
// Message Types
// ============================================

export interface WebChatMessage {
  id: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    processingTime?: number;
  };
}

export interface WebChatSession {
  id: string;
  userId?: string;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  metadata?: Record<string, unknown>;
}

// ============================================
// Request/Response Types
// ============================================

export interface WebChatRequest {
  sessionId?: string;
  message: string;
  context?: {
    previousMessages?: number;
    systemPrompt?: string;
  };
}

export interface WebChatResponse {
  sessionId: string;
  message: WebChatMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface WebChatError {
  code: string;
  message: string;
  details?: unknown;
}

// ============================================
// WebSocket Event Types
// ============================================

export type WebChatEvent =
  | { type: 'connected'; sessionId: string }
  | { type: 'message'; data: WebChatMessage }
  | { type: 'typing'; isTyping: boolean }
  | { type: 'error'; error: WebChatError }
  | { type: 'disconnected'; reason?: string };

// ============================================
// Configuration Types
// ============================================

export interface WebChatConfig {
  gatewayUrl: string;
  wsUrl: string;
  token?: string;
  sessionId?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface WebChatConnectionState {
  connected: boolean;
  sessionId?: string;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastError?: WebChatError;
}

// ============================================
// OpenClaw WebSocket Protocol Types
// ============================================

export interface OpenClawWSMessage {
  type: string;
  payload?: unknown;
  id?: string;
}

export interface OpenClawChatRequest {
  type: 'chat';
  payload: {
    message: string;
    sessionId?: string;
  };
}

export interface OpenClawChatResponse {
  type: 'chat_response';
  payload: {
    content: string;
    done: boolean;
    sessionId: string;
  };
}

export interface OpenClawStreamChunk {
  type: 'stream';
  payload: {
    content: string;
    done: boolean;
  };
}
