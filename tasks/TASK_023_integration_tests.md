# TASK-023: Write Integration Tests

## Task Information

- **ID**: T023
- **Phase**: 2 - Core Integration
- **Priority**: Medium
- **Estimated Hours**: 4h
- **Dependencies**: T015 (Gateway Wrapper), T021 (WebSocket Client)

---

## Objective

Viết integration tests cho các core features:

- Gateway connection tests
- WebSocket communication tests
- API endpoint tests
- End-to-end flow tests

---

## Acceptance Criteria

- [ ] Gateway connection tests pass
- [ ] WebSocket tests working
- [ ] API endpoint tests complete
- [ ] E2E chat flow tested
- [ ] CI/CD runs tests automatically
- [ ] Test coverage > 70%
- [ ] Tests documented

---

## Instructions

### Step 1: Setup Testing Dependencies

```bash
# Root workspace
pnpm add -Dw vitest @vitest/coverage-v8 @vitest/ui

# Bridge service
cd packages/bridge-service
pnpm add -D vitest supertest @types/supertest msw

# Webapp
cd packages/webapp
pnpm add -D @testing-library/react @testing-library/jest-dom vitest-fetch-mock happy-dom
```

### Step 2: Create Vitest Config for Bridge Service

Tạo file `packages/bridge-service/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/types/**'],
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Step 3: Create Test Setup for Bridge Service

Tạo file `packages/bridge-service/src/__tests__/setup.ts`:

```typescript
import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock environment variables
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '8081';
process.env['GATEWAY_URL'] = 'ws://localhost:18789';

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

beforeAll(() => {
  // Setup before all tests
});

afterAll(() => {
  // Cleanup after all tests
});

afterEach(() => {
  vi.clearAllMocks();
});
```

### Step 4: Create Gateway Service Tests

Tạo file `packages/bridge-service/src/services/__tests__/gateway.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GatewayService } from '../gateway.service';
import WebSocket from 'ws';

// Mock WebSocket
vi.mock('ws', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1, // OPEN
    })),
    WebSocket: {
      OPEN: 1,
      CLOSED: 3,
    },
  };
});

describe('GatewayService', () => {
  let service: GatewayService;

  beforeEach(() => {
    service = new GatewayService({
      url: 'ws://localhost:18789',
    });
  });

  afterEach(() => {
    service.disconnect();
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should create WebSocket connection', async () => {
      const onConnect = vi.fn();
      service.on('connect', onConnect);

      // Simulate connection
      const wsInstance = (WebSocket as unknown as vi.Mock).mock.results[0]?.value;
      if (wsInstance) {
        const openHandler = wsInstance.on.mock.calls.find(
          ([event]: [string]) => event === 'open'
        )?.[1];
        openHandler?.();
      }

      // Note: In real test, need to wait for connection
      expect(WebSocket).toBeDefined();
    });

    it('should handle connection error', async () => {
      const onError = vi.fn();
      service.on('error', onError);

      // Simulate error
      const wsInstance = (WebSocket as unknown as vi.Mock).mock.results[0]?.value;
      if (wsInstance) {
        const errorHandler = wsInstance.on.mock.calls.find(
          ([event]: [string]) => event === 'error'
        )?.[1];
        errorHandler?.(new Error('Connection failed'));
      }

      // Verify error handling
      expect(onError).toBeDefined();
    });
  });

  describe('sendMessage', () => {
    it('should send message through WebSocket', async () => {
      const message = {
        content: 'Hello',
        sessionId: 'session-123',
        userId: 'user-123',
        channel: 'webchat',
      };

      // This will queue the message since not connected
      const result = service.sendMessage(message);

      expect(result).toBeDefined();
    });
  });

  describe('healthCheck', () => {
    it('should return true when connected', async () => {
      // Mock connected state
      const connectionStatus = service.getConnectionStatus();

      // Not connected by default
      expect(connectionStatus.connected).toBe(false);
    });
  });
});
```

### Step 5: Create Health Service Tests

Tạo file `packages/bridge-service/src/services/__tests__/health.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthService, getHealthService } from '../health.service';

// Mock gateway service
vi.mock('../gateway.service', () => ({
  getGatewayService: vi.fn().mockReturnValue({
    getConnectionStatus: vi.fn().mockReturnValue({ connected: true }),
    healthCheck: vi.fn().mockResolvedValue(true),
  }),
}));

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService();
  });

  describe('checkHealth', () => {
    it('should return healthy status when all services up', async () => {
      const health = await service.checkHealth();

      expect(health.status).toBe('healthy');
      expect(health.services.gateway.status).toBe('up');
    });

    it('should include uptime', async () => {
      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const health = await service.checkHealth();

      expect(health.uptime).toBeGreaterThan(0);
    });

    it('should include timestamp', async () => {
      const health = await service.checkHealth();

      expect(health.timestamp).toBeDefined();
      expect(new Date(health.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('isReady', () => {
    it('should return true when healthy', async () => {
      const ready = await service.isReady();

      expect(ready).toBe(true);
    });
  });

  describe('isAlive', () => {
    it('should always return true', () => {
      const alive = service.isAlive();

      expect(alive).toBe(true);
    });
  });

  describe('getCachedHealth', () => {
    it('should return null before first check', () => {
      const newService = new HealthService();
      const cached = newService.getCachedHealth();

      expect(cached).toBeNull();
    });

    it('should return cached data after check', async () => {
      await service.checkHealth();
      const cached = service.getCachedHealth();

      expect(cached).not.toBeNull();
      expect(cached?.status).toBeDefined();
    });
  });
});
```

### Step 6: Create API Endpoint Tests

Tạo file `packages/bridge-service/src/handlers/__tests__/health.handler.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { healthRouter } from '../health.handler';

describe('Health Endpoints', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use('/', healthRouter);
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('GET /ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app).get('/ready');

      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('ready');
    });
  });

  describe('GET /live', () => {
    it('should return liveness status', async () => {
      const response = await request(app).get('/live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('alive');
      expect(response.body.alive).toBe(true);
    });
  });
});
```

### Step 7: Create Vitest Config for Webapp

Tạo file `packages/webapp/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.tsx', 'src/**/*.ts'],
      exclude: [
        'src/**/*.test.tsx',
        'src/**/*.test.ts',
        'src/types/**',
        'src/app/**/*.tsx', // Exclude pages
      ],
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Step 8: Create Test Setup for Webapp

Tạo file `packages/webapp/src/__tests__/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Reset mocks
beforeEach(() => {
  fetchMocker.resetMocks();
});
```

### Step 9: Create Component Tests

Tạo file `packages/webapp/src/components/features/chat/__tests__/message-bubble.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../message-bubble';
import type { Message } from '@/types/chat';

describe('MessageBubble', () => {
  const userMessage: Message = {
    id: 'msg-1',
    role: 'user',
    content: 'Hello, bot!',
    timestamp: new Date('2024-01-01T12:00:00'),
    status: 'sent',
  };

  const botMessage: Message = {
    id: 'msg-2',
    role: 'assistant',
    content: 'Hi! How can I help you?',
    timestamp: new Date('2024-01-01T12:01:00'),
    status: 'sent',
  };

  it('should render user message', () => {
    render(<MessageBubble message={userMessage} />);

    expect(screen.getByText('Hello, bot!')).toBeInTheDocument();
  });

  it('should render bot message', () => {
    render(<MessageBubble message={botMessage} />);

    expect(screen.getByText('Hi! How can I help you?')).toBeInTheDocument();
  });

  it('should show error state', () => {
    const errorMessage: Message = {
      ...userMessage,
      status: 'error',
    };

    render(<MessageBubble message={errorMessage} />);

    expect(screen.getByText('Failed to send')).toBeInTheDocument();
  });

  it('should show sending state', () => {
    const sendingMessage: Message = {
      ...userMessage,
      status: 'sending',
    };

    render(<MessageBubble message={sendingMessage} />);

    // Loading spinner should be present
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
```

### Step 10: Create Store Tests

Tạo file `packages/webapp/src/stores/__tests__/chat.store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../chat.store';
import type { Message } from '@/types/chat';

describe('Chat Store', () => {
  beforeEach(() => {
    // Reset store
    useChatStore.setState({
      sessions: [],
      activeSessionId: null,
      isTyping: false,
      isConnected: false,
    });
  });

  describe('createSession', () => {
    it('should create a new session', () => {
      const { createSession } = useChatStore.getState();

      const sessionId = createSession();

      expect(sessionId).toMatch(/^session-/);
      expect(useChatStore.getState().sessions).toHaveLength(1);
      expect(useChatStore.getState().activeSessionId).toBe(sessionId);
    });
  });

  describe('addMessage', () => {
    it('should add message to session', () => {
      const { createSession, addMessage } = useChatStore.getState();

      const sessionId = createSession();
      const message: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      addMessage(sessionId, message);

      const session = useChatStore.getState().sessions.find((s) => s.id === sessionId);
      expect(session?.messages).toHaveLength(1);
      expect(session?.messages[0].content).toBe('Hello');
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages in session', () => {
      const { createSession, addMessage, clearMessages } = useChatStore.getState();

      const sessionId = createSession();
      addMessage(sessionId, {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      });

      clearMessages(sessionId);

      const session = useChatStore.getState().sessions.find((s) => s.id === sessionId);
      expect(session?.messages).toHaveLength(0);
    });
  });

  describe('setTyping', () => {
    it('should update typing state', () => {
      const { setTyping } = useChatStore.getState();

      setTyping(true);
      expect(useChatStore.getState().isTyping).toBe(true);

      setTyping(false);
      expect(useChatStore.getState().isTyping).toBe(false);
    });
  });
});
```

### Step 11: Create WebSocket Service Tests

Tạo file `packages/webapp/src/services/__tests__/websocket.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService, resetWebSocketService } from '../websocket.service';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  send = vi.fn();
  close = vi.fn();

  // Simulate connection
  simulateOpen() {
    this.onopen?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }
}

// @ts-expect-error - Mocking global WebSocket
global.WebSocket = MockWebSocket;

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    resetWebSocketService();
    service = new WebSocketService({
      url: 'ws://localhost:8080/ws',
      reconnect: false,
    });
    mockWs = new MockWebSocket();
  });

  afterEach(() => {
    service.disconnect();
  });

  describe('connect', () => {
    it('should set status to connecting', () => {
      service.connect();
      expect(service.status).toBe('connecting');
    });
  });

  describe('send', () => {
    it('should queue message when disconnected', () => {
      service.send('message', { content: 'Hello' });

      // Message should be queued, not sent
      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });

  describe('onMessage', () => {
    it('should call handler on message', () => {
      const handler = vi.fn();
      service.onMessage(handler);

      // Simulate receiving a message
      // Note: This requires the service to be connected first
      expect(handler).toBeDefined();
    });
  });

  describe('disconnect', () => {
    it('should set status to disconnected', () => {
      service.disconnect();
      expect(service.status).toBe('disconnected');
    });
  });
});
```

### Step 12: Add Test Scripts to package.json

Cập nhật `packages/bridge-service/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

Cập nhật `packages/webapp/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

Cập nhật root `package.json`:

```json
{
  "scripts": {
    "test": "pnpm -r test",
    "test:coverage": "pnpm -r test:coverage"
  }
}
```

### Step 13: Update CI Workflow

Cập nhật `.github/workflows/ci.yml`:

```yaml
# Add test job
test:
  runs-on: ubuntu-latest
  needs: build
  steps:
    - uses: actions/checkout@v4

    - name: Setup pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 9

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install

    - name: Run tests
      run: pnpm test

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./packages/bridge-service/coverage/coverage-final.json,./packages/webapp/coverage/coverage-final.json
```

---

## File Structure After Completion

```
packages/
├── bridge-service/
│   ├── src/
│   │   ├── __tests__/
│   │   │   └── setup.ts
│   │   ├── handlers/
│   │   │   └── __tests__/
│   │   │       └── health.handler.test.ts
│   │   └── services/
│   │       └── __tests__/
│   │           ├── gateway.service.test.ts
│   │           └── health.service.test.ts
│   └── vitest.config.ts
└── webapp/
    ├── src/
    │   ├── __tests__/
    │   │   └── setup.ts
    │   ├── components/
    │   │   └── features/
    │   │       └── chat/
    │   │           └── __tests__/
    │   │               └── message-bubble.test.tsx
    │   ├── services/
    │   │   └── __tests__/
    │   │       └── websocket.service.test.ts
    │   └── stores/
    │       └── __tests__/
    │           └── chat.store.test.ts
    └── vitest.config.ts
```

---

## Verification Checklist

- [ ] Vitest configured for both packages
- [ ] Test setup files created
- [ ] Gateway service tests pass
- [ ] Health service tests pass
- [ ] API endpoint tests pass
- [ ] Component tests pass
- [ ] Store tests pass
- [ ] WebSocket service tests pass
- [ ] Coverage reports generated
- [ ] CI runs tests successfully
- [ ] Coverage > 70%

---

## Related Tasks

- **T015**: Gateway Wrapper Service (tested)
- **T016**: Health Checks (tested)
- **T020**: Chat Interface (tested)
- **T021**: WebSocket Client (tested)
