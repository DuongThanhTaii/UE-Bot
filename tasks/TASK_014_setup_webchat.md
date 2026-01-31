# TASK-014: Setup WebChat Channel

## Task Information

- **ID**: T014
- **Phase**: 2 - Core Integration
- **Priority**: High
- **Estimated Hours**: 3h
- **Dependencies**: T013 (Configure Moltbot Gateway)

---

## Objective

Cấu hình WebChat channel trong Moltbot để UE-Bot webapp có thể giao tiếp với AI assistant.

---

## Acceptance Criteria

- [ ] WebChat channel được enable trong Gateway config
- [ ] CORS được cấu hình cho webapp domain
- [ ] WebChat endpoint hoạt động
- [ ] Có thể gửi/nhận messages qua WebChat
- [ ] Session management hoạt động

---

## Background

WebChat là channel built-in của Moltbot cho phép giao tiếp qua web browser. Đây sẽ là channel chính cho UE-Bot webapp.

### WebChat Flow

```
┌─────────────┐     HTTP/WS      ┌─────────────┐     Internal     ┌─────────────┐
│  UE-Bot     │ ◄──────────────► │   WebChat   │ ◄──────────────► │   Gateway   │
│   Webapp    │                  │   Channel   │                  │   (Agent)   │
└─────────────┘                  └─────────────┘                  └─────────────┘
     :3000                            :18789                          :18789
```

---

## Instructions

### Step 1: Configure WebChat in Gateway

Cập nhật file `external/moltbot/.env`:

```env
# WebChat Configuration
WEBCHAT_ENABLED=true
WEBCHAT_CORS_ORIGINS=http://localhost:3000,http://localhost:3001
WEBCHAT_SESSION_TIMEOUT=3600000
WEBCHAT_MAX_MESSAGE_LENGTH=4000
```

### Step 2: Create WebChat Configuration File

Tạo file `external/moltbot/config/webchat.json`:

```json
{
  "channel": "webchat",
  "enabled": true,
  "settings": {
    "cors": {
      "origins": ["http://localhost:3000", "http://localhost:3001"],
      "credentials": true
    },
    "session": {
      "timeout": 3600000,
      "maxSessions": 100
    },
    "messages": {
      "maxLength": 4000,
      "rateLimit": {
        "windowMs": 60000,
        "maxRequests": 30
      }
    },
    "features": {
      "typing": true,
      "read_receipts": true,
      "file_upload": false,
      "voice_message": false
    }
  }
}
```

### Step 3: Create WebChat Client Types

Tạo file `packages/shared/src/types/webchat.ts`:

```typescript
/**
 * WebChat Client Types
 */

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

export type WebChatEvent =
  | { type: 'connected'; sessionId: string }
  | { type: 'message'; data: WebChatMessage }
  | { type: 'typing'; isTyping: boolean }
  | { type: 'error'; error: WebChatError }
  | { type: 'disconnected'; reason?: string };
```

### Step 4: Test WebChat Endpoint

Tạo file `scripts/test-webchat.ts`:

```typescript
const GATEWAY_URL = 'http://localhost:18789';

async function testWebChat() {
  console.log('🧪 Testing WebChat Channel...\n');

  // Test 1: Create session
  console.log('1. Creating session...');
  const sessionRes = await fetch(`${GATEWAY_URL}/webchat/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!sessionRes.ok) {
    throw new Error(`Failed to create session: ${sessionRes.status}`);
  }

  const session = await sessionRes.json();
  console.log(`   ✅ Session created: ${session.id}\n`);

  // Test 2: Send message
  console.log('2. Sending message...');
  const messageRes = await fetch(`${GATEWAY_URL}/webchat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session.id,
      message: 'Hello! Can you hear me?',
    }),
  });

  if (!messageRes.ok) {
    throw new Error(`Failed to send message: ${messageRes.status}`);
  }

  const response = await messageRes.json();
  console.log(`   ✅ Response received:`);
  console.log(`   Assistant: ${response.message.content.substring(0, 100)}...\n`);

  // Test 3: Get session info
  console.log('3. Getting session info...');
  const infoRes = await fetch(`${GATEWAY_URL}/webchat/session/${session.id}`);

  if (!infoRes.ok) {
    throw new Error(`Failed to get session: ${infoRes.status}`);
  }

  const sessionInfo = await infoRes.json();
  console.log(`   ✅ Session info:`);
  console.log(`   - Messages: ${sessionInfo.messageCount}`);
  console.log(`   - Created: ${sessionInfo.createdAt}\n`);

  console.log('✅ All WebChat tests passed!');
}

testWebChat().catch(console.error);
```

Run test:

```bash
npx tsx scripts/test-webchat.ts
```

### Step 5: Document WebChat API

Tạo file `docs/api/webchat-api.md`:

```markdown
# WebChat API Reference

## Base URL

\`\`\`
http://localhost:18789/webchat
\`\`\`

## Endpoints

### Create Session

\`\`\`http
POST /webchat/session
Content-Type: application/json

{
"userId": "optional-user-id",
"metadata": {}
}
\`\`\`

Response:
\`\`\`json
{
"id": "session-uuid",
"createdAt": "2026-01-30T10:00:00Z"
}
\`\`\`

### Send Message

\`\`\`http
POST /webchat/message
Content-Type: application/json

{
"sessionId": "session-uuid",
"message": "Hello!"
}
\`\`\`

Response:
\`\`\`json
{
"sessionId": "session-uuid",
"message": {
"id": "msg-uuid",
"content": "Hello! How can I help you?",
"role": "assistant",
"timestamp": "2026-01-30T10:00:01Z"
}
}
\`\`\`

### Get Session

\`\`\`http
GET /webchat/session/{sessionId}
\`\`\`

### End Session

\`\`\`http
DELETE /webchat/session/{sessionId}
\`\`\`

## WebSocket

Connect to: \`ws://localhost:18789/webchat/ws?sessionId={sessionId}\`

Events:

- \`message\`: New message received
- \`typing\`: Assistant is typing
- \`error\`: Error occurred
```

---

## WebChat Configuration Reference

| Setting                 | Default | Description            |
| ----------------------- | ------- | ---------------------- |
| `enabled`               | true    | Enable WebChat channel |
| `cors.origins`          | []      | Allowed CORS origins   |
| `session.timeout`       | 3600000 | Session timeout (ms)   |
| `messages.maxLength`    | 4000    | Max message length     |
| `rateLimit.maxRequests` | 30      | Rate limit per minute  |

---

## Verification Checklist

- [ ] WebChat enabled in Gateway config
- [ ] CORS origins configured correctly
- [ ] Session creation works
- [ ] Message send/receive works
- [ ] API documentation created
- [ ] Types added to shared package

---

## Related Tasks

- **T013**: Configure Moltbot Gateway (prerequisite)
- **T020**: Create chat interface (uses WebChat)
- **T021**: Implement WebSocket client (uses WebChat WS)
