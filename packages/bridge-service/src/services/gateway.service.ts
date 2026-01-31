/**
 * Gateway Service
 * Wrapper for OpenClaw Gateway communication
 * Provides unified API for webapp and ESP32 devices
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { getMoltbotEndpoints, moltbotConfig } from '../moltbot-config';

// ============================================
// Local Type Definitions
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

export interface WebChatError {
  code: string;
  message: string;
  details?: unknown;
}

// ============================================
// Types
// ============================================

export interface GatewayServiceConfig {
  wsUrl: string;
  httpUrl: string;
  token?: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  messageTimeout: number;
  healthCheckInterval: number;
  maxQueueSize: number;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  content: string;
  sessionId: string;
  messageId: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  content: string;
  done: boolean;
  sessionId: string;
}

export interface GatewayStatus {
  connected: boolean;
  healthy: boolean;
  sessionCount: number;
  queueSize: number;
  lastError?: string;
  uptime?: number;
}

interface QueuedMessage {
  id: string;
  request: ChatRequest;
  resolve: (response: ChatResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeout: NodeJS.Timeout;
}

// ============================================
// Gateway Service
// ============================================

export class GatewayService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: GatewayServiceConfig;
  private connected = false;
  private reconnecting = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;

  private messageQueue: Map<string, QueuedMessage> = new Map();
  private sessions: Map<string, { lastActivity: Date; messageCount: number }> = new Map();

  constructor(config?: Partial<GatewayServiceConfig>) {
    super();
    this.config = {
      wsUrl: moltbotConfig.wsUrl,
      httpUrl: moltbotConfig.baseUrl,
      token: moltbotConfig.apiToken,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      messageTimeout: 60000,
      healthCheckInterval: 30000,
      maxQueueSize: 100,
      ...config,
    };
  }

  // ============================================
  // Connection Management
  // ============================================

  /**
   * Initialize and connect to Gateway
   */
  async start(): Promise<void> {
    console.log('[GatewayService] Starting...');
    await this.connect();
    this.startHealthCheck();
  }

  /**
   * Stop service and cleanup
   */
  async stop(): Promise<void> {
    console.log('[GatewayService] Stopping...');
    this.stopHealthCheck();
    this.clearReconnect();

    // Reject all pending messages
    for (const [_id, msg] of this.messageQueue) {
      msg.reject(new Error('Service stopped'));
      clearTimeout(msg.timeout);
    }
    this.messageQueue.clear();

    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, 'Service stopped');
      this.ws = null;
    }

    this.connected = false;
  }

  /**
   * Connect to Gateway WebSocket
   */
  private async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      const wsUrl = this.buildWsUrl();
      console.log(`[GatewayService] Connecting to ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      const connectTimeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
        this.ws?.close();
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(connectTimeout);
        console.log('[GatewayService] Connected');
        this.connected = true;
        this.reconnecting = false;
        this.reconnectAttempts = 0;
        this.startPing();
        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[GatewayService] Disconnected: ${code} ${reason.toString()}`);
        this.connected = false;
        this.stopPing();
        this.emit('disconnected', { code, reason: reason.toString() });

        if (!this.reconnecting) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (error) => {
        console.error('[GatewayService] WebSocket error:', error.message);
        this.emit('error', error);
      });
    });
  }

  private buildWsUrl(): string {
    const url = new URL(this.config.wsUrl);
    if (this.config.token) {
      url.searchParams.set('token', this.config.token);
    }
    return url.toString();
  }

  // ============================================
  // Chat API
  // ============================================

  /**
   * Send a chat message and get response
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.connected) {
      throw new Error('Not connected to Gateway');
    }

    if (this.messageQueue.size >= this.config.maxQueueSize) {
      throw new Error('Message queue full');
    }

    const messageId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.messageQueue.delete(messageId);
        reject(new Error('Message timeout'));
      }, this.config.messageTimeout);

      const queuedMessage: QueuedMessage = {
        id: messageId,
        request,
        resolve,
        reject,
        timestamp: Date.now(),
        timeout,
      };

      this.messageQueue.set(messageId, queuedMessage);

      // Send to Gateway
      this.send({
        type: 'chat',
        id: messageId,
        payload: {
          message: request.message,
          sessionId: request.sessionId,
          metadata: request.metadata,
        },
      });

      // Update session tracking
      if (request.sessionId) {
        const session = this.sessions.get(request.sessionId) || {
          lastActivity: new Date(),
          messageCount: 0,
        };
        session.lastActivity = new Date();
        session.messageCount++;
        this.sessions.set(request.sessionId, session);
      }
    });
  }

  /**
   * Send a chat message with streaming response
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    if (!this.connected) {
      throw new Error('Not connected to Gateway');
    }

    const messageId = crypto.randomUUID();
    const chunks: StreamChunk[] = [];
    let done = false;
    let error: Error | null = null;

    const onStream = (chunk: StreamChunk) => {
      if (chunk.sessionId === request.sessionId || !request.sessionId) {
        chunks.push(chunk);
        if (chunk.done) {
          done = true;
        }
      }
    };

    const onError = (err: WebChatError) => {
      error = new Error(err.message);
      done = true;
    };

    this.on('stream', onStream);
    this.on('chatError', onError);

    // Send request
    this.send({
      type: 'chat',
      id: messageId,
      payload: {
        message: request.message,
        sessionId: request.sessionId,
        stream: true,
      },
    });

    try {
      const startTime = Date.now();
      while (!done && Date.now() - startTime < this.config.messageTimeout) {
        if (chunks.length > 0) {
          yield chunks.shift()!;
        } else {
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      // Yield remaining chunks
      while (chunks.length > 0) {
        yield chunks.shift()!;
      }

      if (error) {
        throw error;
      }
    } finally {
      this.off('stream', onStream);
      this.off('chatError', onError);
    }
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Create a new chat session
   */
  async createSession(userId?: string): Promise<string> {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, {
      lastActivity: new Date(),
      messageCount: 0,
    });

    this.emit('sessionCreated', { sessionId, userId });
    return sessionId;
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): { lastActivity: Date; messageCount: number } | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * End a session
   */
  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.emit('sessionEnded', { sessionId });
  }

  // ============================================
  // Health & Status
  // ============================================

  /**
   * Get service status
   */
  getStatus(): GatewayStatus {
    return {
      connected: this.connected,
      healthy: this.connected,
      sessionCount: this.sessions.size,
      queueSize: this.messageQueue.size,
    };
  }

  /**
   * Check Gateway health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const endpoints = getMoltbotEndpoints(moltbotConfig);
      const response = await fetch(endpoints.health, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  // ============================================
  // Private Methods
  // ============================================

  private send(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      const { type, id, payload } = message;

      switch (type) {
        case 'chat_response':
        case 'message': {
          const queuedMsg = id ? this.messageQueue.get(id) : null;
          if (queuedMsg) {
            clearTimeout(queuedMsg.timeout);
            this.messageQueue.delete(id);

            queuedMsg.resolve({
              content: payload?.content || '',
              sessionId: payload?.sessionId || '',
              messageId: id,
              model: payload?.model,
              usage: payload?.usage,
            });
          }

          this.emit('message', payload);
          break;
        }

        case 'stream': {
          const chunk: StreamChunk = {
            content: payload?.content || '',
            done: payload?.done || false,
            sessionId: payload?.sessionId || '',
          };
          this.emit('stream', chunk);
          break;
        }

        case 'error': {
          const queuedMsg = id ? this.messageQueue.get(id) : null;
          if (queuedMsg) {
            clearTimeout(queuedMsg.timeout);
            this.messageQueue.delete(id);
            queuedMsg.reject(new Error(payload?.message || 'Unknown error'));
          }

          this.emit('chatError', payload);
          break;
        }

        case 'pong':
          // Heartbeat response
          break;

        default:
          console.log(`[GatewayService] Unknown message type: ${type}`);
      }
    } catch (err) {
      console.error('[GatewayService] Failed to parse message:', err);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[GatewayService] Max reconnect attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    console.log(`[GatewayService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (err) {
        console.error('[GatewayService] Reconnect failed:', err);
        this.scheduleReconnect();
      }
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnecting = false;
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      const healthy = await this.healthCheck();
      if (!healthy && this.connected) {
        console.warn('[GatewayService] Health check failed');
        this.emit('healthCheckFailed');
      }
    }, this.config.healthCheckInterval);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

let gatewayServiceInstance: GatewayService | null = null;

export function getGatewayService(): GatewayService {
  if (!gatewayServiceInstance) {
    gatewayServiceInstance = new GatewayService();
  }
  return gatewayServiceInstance;
}

export function createGatewayService(config?: Partial<GatewayServiceConfig>): GatewayService {
  return new GatewayService(config);
}
