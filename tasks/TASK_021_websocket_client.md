# TASK-021: Implement WebSocket Client

## Task Information

- **ID**: T021
- **Phase**: 2 - Core Integration
- **Priority**: High
- **Estimated Hours**: 4h
- **Dependencies**: T020 (Chat Interface)

---

## Objective

Implement WebSocket client cho webapp để:

- Real-time communication với Bridge Service
- Auto-reconnect on disconnect
- Message queuing khi offline
- Event-driven architecture

---

## Acceptance Criteria

- [ ] WebSocket connection established
- [ ] Messages sent/received real-time
- [ ] Auto-reconnect working
- [ ] Offline message queue
- [ ] Connection status indicator
- [ ] Error handling
- [ ] TypeScript types complete

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     WebSocket Flow                           │
└─────────────────────────────────────────────────────────────┘

   Webapp                    Bridge Service               Moltbot
     │                             │                          │
     │  1. Connect WS              │                          │
     ├────────────────────────────>│                          │
     │                             │                          │
     │  2. Connection ACK          │                          │
     │<────────────────────────────┤                          │
     │                             │                          │
     │  3. Send Message            │                          │
     ├────────────────────────────>│  4. Forward to Gateway   │
     │                             ├─────────────────────────>│
     │                             │                          │
     │                             │  5. AI Response          │
     │                             │<─────────────────────────┤
     │  6. Receive Response        │                          │
     │<────────────────────────────┤                          │
     │                             │                          │
     │  7. Heartbeat (ping/pong)   │                          │
     │<───────────────────────────>│                          │
     │                             │                          │
```

---

## Instructions

### Step 1: Create WebSocket Types

Tạo file `packages/webapp/src/types/websocket.ts`:

```typescript
export type WebSocketMessageType =
  | 'connect'
  | 'disconnect'
  | 'message'
  | 'typing'
  | 'error'
  | 'ping'
  | 'pong'
  | 'device_status';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  payload?: T;
  timestamp?: string;
  id?: string;
}

export interface ChatMessage {
  content: string;
  sessionId?: string;
  userId?: string;
}

export interface TypingPayload {
  isTyping: boolean;
  sessionId: string;
}

export interface DeviceStatusPayload {
  deviceId: string;
  status: 'online' | 'offline' | 'error';
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface WebSocketOptions {
  url: string;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
}

export type WebSocketStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';
```

### Step 2: Create WebSocket Service Class

Tạo file `packages/webapp/src/services/websocket.service.ts`:

```typescript
import type { WebSocketMessage, WebSocketOptions, WebSocketStatus } from '@/types/websocket';

type MessageHandler = (message: WebSocketMessage) => void;
type StatusHandler = (status: WebSocketStatus) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<Omit<WebSocketOptions, 'url'>>;
  private reconnectCount = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private _status: WebSocketStatus = 'disconnected';

  constructor(options: WebSocketOptions) {
    this.url = options.url;
    this.options = {
      reconnect: options.reconnect ?? true,
      reconnectAttempts: options.reconnectAttempts ?? 5,
      reconnectInterval: options.reconnectInterval ?? 3000,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      onConnect: options.onConnect ?? (() => {}),
      onDisconnect: options.onDisconnect ?? (() => {}),
      onMessage: options.onMessage ?? (() => {}),
      onError: options.onError ?? (() => {}),
    };
  }

  get status(): WebSocketStatus {
    return this._status;
  }

  get isConnected(): boolean {
    return this._status === 'connected';
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimeout();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setStatus('disconnected');
    this.options.onDisconnect();
  }

  /**
   * Send a message through WebSocket
   */
  send<T>(type: string, payload?: T): void {
    const message: WebSocketMessage<T> = {
      type: type as WebSocketMessage['type'],
      payload,
      timestamp: new Date().toISOString(),
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };

    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  /**
   * Send a chat message
   */
  sendMessage(content: string, sessionId?: string): void {
    this.send('message', { content, sessionId });
  }

  /**
   * Subscribe to messages
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  // Private methods

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.setStatus('connected');
      this.reconnectCount = 0;
      this.startHeartbeat();
      this.flushMessageQueue();
      this.options.onConnect();
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.stopHeartbeat();

      if (event.code !== 1000) {
        this.setStatus('disconnected');
        this.scheduleReconnect();
      }

      this.options.onDisconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.setStatus('error');
      this.options.onError(error);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;

        // Handle pong
        if (message.type === 'pong') {
          return;
        }

        // Notify handlers
        this.messageHandlers.forEach((handler) => handler(message));
        this.options.onMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  private setStatus(status: WebSocketStatus): void {
    this._status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send('ping');
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.options.reconnect) return;
    if (this.reconnectCount >= this.options.reconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectCount++;

    const delay = this.options.reconnectInterval * Math.pow(2, this.reconnectCount - 1);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectCount})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.ws) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }
}

// Singleton instance
let wsInstance: WebSocketService | null = null;

export function getWebSocketService(options?: WebSocketOptions): WebSocketService {
  if (!wsInstance && options) {
    wsInstance = new WebSocketService(options);
  }

  if (!wsInstance) {
    throw new Error('WebSocketService not initialized. Call with options first.');
  }

  return wsInstance;
}

export function resetWebSocketService(): void {
  if (wsInstance) {
    wsInstance.disconnect();
    wsInstance = null;
  }
}
```

### Step 3: Create useWebSocket Hook

Tạo file `packages/webapp/src/hooks/use-websocket.ts`:

```typescript
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  WebSocketService,
  getWebSocketService,
  resetWebSocketService,
} from '@/services/websocket.service';
import type { WebSocketMessage, WebSocketStatus, WebSocketOptions } from '@/types/websocket';

interface UseWebSocketOptions {
  url: string;
  autoConnect?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  status: WebSocketStatus;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (content: string, sessionId?: string) => void;
  send: <T>(type: string, payload?: T) => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const wsRef = useRef<WebSocketService | null>(null);
  const optionsRef = useRef(options);

  // Update options ref
  optionsRef.current = options;

  // Initialize WebSocket service
  useEffect(() => {
    const wsOptions: WebSocketOptions = {
      url: options.url,
      onConnect: () => {
        setStatus('connected');
        optionsRef.current.onConnect?.();
      },
      onDisconnect: () => {
        setStatus('disconnected');
        optionsRef.current.onDisconnect?.();
      },
      onMessage: (message) => {
        optionsRef.current.onMessage?.(message);
      },
      onError: (error) => {
        setStatus('error');
        optionsRef.current.onError?.(error);
      },
    };

    wsRef.current = getWebSocketService(wsOptions);

    // Subscribe to status changes
    const unsubscribe = wsRef.current.onStatusChange(setStatus);

    // Auto-connect
    if (options.autoConnect !== false) {
      wsRef.current.connect();
    }

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [options.url, options.autoConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't disconnect on unmount if using singleton
      // resetWebSocketService();
    };
  }, []);

  const connect = useCallback(() => {
    wsRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
  }, []);

  const sendMessage = useCallback((content: string, sessionId?: string) => {
    wsRef.current?.sendMessage(content, sessionId);
  }, []);

  const send = useCallback(<T>(type: string, payload?: T) => {
    wsRef.current?.send(type, payload);
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
    sendMessage,
    send,
  };
}
```

### Step 4: Create WebSocket Context (Optional)

Tạo file `packages/webapp/src/contexts/websocket.context.tsx`:

```tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { WebSocketMessage, WebSocketStatus } from '@/types/websocket';
import { useWebSocket } from '@/hooks/use-websocket';

interface WebSocketContextValue {
  status: WebSocketStatus;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (content: string, sessionId?: string) => void;
  lastMessage: WebSocketMessage | null;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  url?: string;
}

export function WebSocketProvider({ children, url }: WebSocketProviderProps) {
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const wsUrl = url ?? process.env['NEXT_PUBLIC_WS_URL'] ?? 'ws://localhost:8080/ws';

  const { status, isConnected, connect, disconnect, sendMessage } = useWebSocket({
    url: wsUrl,
    onMessage: (message) => {
      setLastMessage(message);
    },
  });

  return (
    <WebSocketContext.Provider
      value={{
        status,
        isConnected,
        connect,
        disconnect,
        sendMessage,
        lastMessage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }

  return context;
}
```

### Step 5: Update Bridge Service WebSocket Handler

Cập nhật `packages/bridge-service/src/handlers/websocket.handler.ts`:

```typescript
import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { logger } from '../utils/logger';
import { getGatewayService } from '../services/gateway.service';

interface WebSocketMessage {
  type: string;
  payload?: unknown;
  timestamp?: string;
  id?: string;
}

interface ClientInfo {
  id: string;
  sessionId?: string;
  userId?: string;
  connectedAt: Date;
}

export function setupWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Map<WebSocket, ClientInfo>();

  wss.on('connection', (ws, req) => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const clientInfo: ClientInfo = {
      id: clientId,
      connectedAt: new Date(),
    };

    clients.set(ws, clientInfo);
    logger.info({ clientId }, 'WebSocket client connected');

    // Send connect acknowledgment
    sendMessage(ws, {
      type: 'connect',
      payload: { clientId },
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        await handleMessage(ws, clientInfo, message);
      } catch (error) {
        logger.error({ error }, 'Failed to handle WebSocket message');
        sendMessage(ws, {
          type: 'error',
          payload: { message: 'Invalid message format' },
        });
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      logger.info({ clientId }, 'WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      logger.error({ error, clientId }, 'WebSocket error');
    });

    // Heartbeat
    ws.on('pong', () => {
      // Client is alive
    });
  });

  // Ping all clients periodically
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  return wss;
}

async function handleMessage(
  ws: WebSocket,
  clientInfo: ClientInfo,
  message: WebSocketMessage
): Promise<void> {
  const { type, payload, id } = message;

  switch (type) {
    case 'ping':
      sendMessage(ws, { type: 'pong', id });
      break;

    case 'message':
      await handleChatMessage(ws, clientInfo, payload as { content: string; sessionId?: string });
      break;

    case 'typing':
      // Could broadcast to other clients if needed
      break;

    default:
      logger.warn({ type }, 'Unknown message type');
  }
}

async function handleChatMessage(
  ws: WebSocket,
  clientInfo: ClientInfo,
  payload: { content: string; sessionId?: string }
): Promise<void> {
  const { content, sessionId } = payload;

  // Store session ID
  if (sessionId) {
    clientInfo.sessionId = sessionId;
  }

  // Send typing indicator
  sendMessage(ws, { type: 'typing', payload: { isTyping: true } });

  try {
    const gateway = getGatewayService();

    // Send to Moltbot Gateway
    const response = await gateway.sendMessage({
      content,
      sessionId: sessionId ?? clientInfo.sessionId,
      userId: clientInfo.userId ?? clientInfo.id,
      channel: 'webchat',
    });

    // Send response back
    sendMessage(ws, {
      type: 'message',
      payload: {
        role: 'assistant',
        content: response.text,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to process chat message');
    sendMessage(ws, {
      type: 'error',
      payload: { message: 'Failed to process message' },
    });
  } finally {
    sendMessage(ws, { type: 'typing', payload: { isTyping: false } });
  }
}

function sendMessage(ws: WebSocket, message: WebSocketMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        ...message,
        timestamp: message.timestamp ?? new Date().toISOString(),
      })
    );
  }
}
```

### Step 6: Create Connection Status Component

Tạo file `packages/webapp/src/components/ui/connection-status.tsx`:

```tsx
'use client';

import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { WebSocketStatus } from '@/types/websocket';

interface ConnectionStatusProps {
  status: WebSocketStatus;
  showLabel?: boolean;
}

const statusConfig: Record<
  WebSocketStatus,
  {
    icon: typeof Wifi;
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
  }
> = {
  connected: {
    icon: Wifi,
    label: 'Connected',
    variant: 'default',
    className: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
  connecting: {
    icon: Loader2,
    label: 'Connecting...',
    variant: 'secondary',
    className: 'animate-pulse',
  },
  reconnecting: {
    icon: Loader2,
    label: 'Reconnecting...',
    variant: 'secondary',
    className: 'animate-pulse',
  },
  disconnected: {
    icon: WifiOff,
    label: 'Disconnected',
    variant: 'outline',
    className: 'text-muted-foreground',
  },
  error: {
    icon: WifiOff,
    label: 'Error',
    variant: 'destructive',
    className: '',
  },
};

export function ConnectionStatus({ status, showLabel = true }: ConnectionStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimating = status === 'connecting' || status === 'reconnecting';

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className={`h-3 w-3 ${showLabel ? 'mr-1' : ''} ${isAnimating ? 'animate-spin' : ''}`} />
      {showLabel && config.label}
    </Badge>
  );
}
```

---

## File Structure After Completion

```
packages/webapp/src/
├── components/
│   └── ui/
│       └── connection-status.tsx
├── contexts/
│   └── websocket.context.tsx
├── hooks/
│   └── use-websocket.ts
├── services/
│   └── websocket.service.ts
└── types/
    └── websocket.ts

packages/bridge-service/src/
└── handlers/
    └── websocket.handler.ts
```

---

## Verification Checklist

- [ ] WebSocket service created
- [ ] useWebSocket hook working
- [ ] Auto-connect on mount
- [ ] Auto-reconnect on disconnect
- [ ] Message queue when offline
- [ ] Heartbeat (ping/pong) working
- [ ] Status indicators accurate
- [ ] Bridge service handler updated
- [ ] TypeScript types complete
- [ ] No memory leaks

---

## Related Tasks

- **T020**: Create Chat Interface (uses this)
- **T015**: Gateway Wrapper Service (backend)
- **T008**: Setup Bridge Service (HTTP server)
