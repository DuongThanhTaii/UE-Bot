/**
 * WebChat Client for OpenClaw Gateway
 * Handles WebSocket communication with the Gateway
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { moltbotConfig } from '../moltbot-config';

// ============================================
// Local Type Definitions
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

export interface WebChatClientEvents {
  connected: (sessionId: string) => void;
  disconnected: (reason?: string) => void;
  message: (message: WebChatMessage) => void;
  stream: (chunk: string, done: boolean) => void;
  typing: (isTyping: boolean) => void;
  error: (error: WebChatError) => void;
  stateChange: (state: WebChatConnectionState) => void;
}

export class WebChatClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebChatConfig;
  private state: WebChatConnectionState = {
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<WebChatConfig>) {
    super();
    this.config = {
      gatewayUrl: moltbotConfig.baseUrl,
      wsUrl: moltbotConfig.wsUrl,
      token: moltbotConfig.apiToken,
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      ...config,
    };
  }

  /**
   * Connect to the Gateway WebSocket
   */
  async connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve(this.state.sessionId || '');
        return;
      }

      const wsUrl = this.buildWsUrl();
      console.log(`[WebChatClient] Connecting to ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('[WebChatClient] Connected');
        this.updateState({ connected: true, reconnecting: false, reconnectAttempts: 0 });
        this.startPing();

        // Send auth if token provided
        if (this.config.token) {
          this.send({ type: 'auth', payload: { token: this.config.token } });
        }
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);

          // Resolve on first successful connection
          if (message.type === 'connected' || message.type === 'auth_ok') {
            this.state.sessionId = message.sessionId || message.payload?.sessionId;
            this.emit('connected', this.state.sessionId);
            resolve(this.state.sessionId || '');
          }
        } catch (err) {
          console.error('[WebChatClient] Failed to parse message:', err);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[WebChatClient] Disconnected: ${code} ${reason.toString()}`);
        this.cleanup();
        this.updateState({ connected: false });
        this.emit('disconnected', reason.toString());

        if (this.config.reconnect && !this.state.reconnecting) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (error) => {
        console.error('[WebChatClient] WebSocket error:', error);
        const wsError: WebChatError = {
          code: 'WS_ERROR',
          message: error.message,
        };
        this.emit('error', wsError);
        reject(error);
      });

      // Connection timeout
      setTimeout(() => {
        if (!this.state.connected) {
          reject(new Error('Connection timeout'));
          this.ws?.close();
        }
      }, 10000);
    });
  }

  /**
   * Disconnect from the Gateway
   */
  disconnect(): void {
    this.config.reconnect = false;
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Send a chat message
   */
  async sendMessage(content: string, sessionId?: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to Gateway');
    }

    this.send({
      type: 'chat',
      payload: {
        message: content,
        sessionId: sessionId || this.state.sessionId,
      },
    });
  }

  /**
   * Send a message and wait for complete response
   */
  async chat(content: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let response = '';

      const onStream = (chunk: string, done: boolean) => {
        response += chunk;
        if (done) {
          this.off('stream', onStream);
          resolve(response);
        }
      };

      const onError = (error: WebChatError) => {
        this.off('stream', onStream);
        this.off('error', onError);
        reject(new Error(error.message));
      };

      this.on('stream', onStream);
      this.on('error', onError);

      this.sendMessage(content).catch(reject);

      // Timeout after 60 seconds
      setTimeout(() => {
        this.off('stream', onStream);
        this.off('error', onError);
        if (!response) {
          reject(new Error('Response timeout'));
        }
      }, 60000);
    });
  }

  /**
   * Get current connection state
   */
  getState(): WebChatConnectionState {
    return { ...this.state };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  // ============================================
  // Private Methods
  // ============================================

  private buildWsUrl(): string {
    const url = new URL(this.config.wsUrl);
    if (this.config.token) {
      url.searchParams.set('token', this.config.token);
    }
    if (this.config.sessionId) {
      url.searchParams.set('sessionId', this.config.sessionId);
    }
    return url.toString();
  }

  private send(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(message: Record<string, unknown>): void {
    const type = message['type'] as string;
    const payload = message['payload'] as Record<string, unknown> | undefined;

    switch (type) {
      case 'connected':
      case 'auth_ok':
        // Handled in connect()
        break;

      case 'chat_response':
      case 'message':
        if (payload) {
          const chatMessage: WebChatMessage = {
            id: (payload['id'] as string) || crypto.randomUUID(),
            sessionId: (payload['sessionId'] as string) || this.state.sessionId || '',
            content: (payload['content'] as string) || '',
            role: 'assistant',
            timestamp: new Date(),
          };
          this.emit('message', chatMessage);
        }
        break;

      case 'stream':
        if (payload) {
          this.emit('stream', payload['content'] as string, payload['done'] as boolean);
        }
        break;

      case 'typing':
        this.emit('typing', (payload?.['isTyping'] as boolean) || false);
        break;

      case 'error':
        const error: WebChatError = {
          code: (payload?.['code'] as string) || 'UNKNOWN',
          message: (payload?.['message'] as string) || 'Unknown error',
          details: payload?.['details'],
        };
        this.emit('error', error);
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log(`[WebChatClient] Unknown message type: ${type}`);
    }
  }

  private updateState(updates: Partial<WebChatConnectionState>): void {
    this.state = { ...this.state, ...updates };
    this.emit('stateChange', this.state);
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  private scheduleReconnect(): void {
    if (this.state.reconnectAttempts >= (this.config.maxReconnectAttempts || 5)) {
      console.log('[WebChatClient] Max reconnect attempts reached');
      return;
    }

    this.updateState({ reconnecting: true, reconnectAttempts: this.state.reconnectAttempts + 1 });
    console.log(
      `[WebChatClient] Reconnecting in ${this.config.reconnectInterval}ms (attempt ${this.state.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((err) => {
        console.error('[WebChatClient] Reconnect failed:', err);
      });
    }, this.config.reconnectInterval);
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Factory function
export function createWebChatClient(config?: Partial<WebChatConfig>): WebChatClient {
  return new WebChatClient(config);
}
