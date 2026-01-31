# TASK-013: Configure Moltbot Gateway

## Task Information

- **ID**: T013
- **Phase**: 2 - Core Integration
- **Priority**: High
- **Estimated Hours**: 4h
- **Dependencies**: T012 (Clone Moltbot)

---

## Objective

Cấu hình Moltbot Gateway để chạy như backend AI assistant cho UE-Bot.

---

## Acceptance Criteria

- [x] Moltbot Gateway cấu hình xong
- [x] Có file `.env` với các biến môi trường cần thiết
- [x] Có file `~/.openclaw/openclaw.json` với Groq config
- [ ] Health endpoint trả về status OK (cần test thủ công)
- [ ] WebSocket connection hoạt động (cần test thủ công)
- [ ] Có thể gửi message test thành công (cần test thủ công)

---

## Background

Moltbot (OpenClaw) là một AI assistant platform hỗ trợ nhiều channels (WhatsApp, Telegram, Discord, WebChat...). Chúng ta sẽ sử dụng nó như backend xử lý AI và tích hợp qua WebChat channel.

### Moltbot Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Moltbot Gateway                      │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │ Sessions│  │ Agents  │  │ Channels│  │ Skills │ │
│  └─────────┘  └─────────┘  └─────────┘  └────────┘ │
├─────────────────────────────────────────────────────┤
│            WebSocket Control Plane                   │
│              ws://localhost:18789                    │
└─────────────────────────────────────────────────────┘
```

---

## Instructions

### Step 1: Navigate to Moltbot Directory

```bash
cd external/moltbot
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Create Environment Configuration

Tạo file `.env` trong `external/moltbot/`:

```env
# ===========================================
# MOLTBOT GATEWAY CONFIGURATION
# ===========================================

# Gateway Settings
GATEWAY_PORT=18789
GATEWAY_HOST=0.0.0.0

# Model Configuration (chọn 1 trong các options)
# Option 1: Anthropic Claude
ANTHROPIC_API_KEY=your_anthropic_api_key
DEFAULT_MODEL=claude-sonnet-4-20250514

# Option 2: OpenAI
# OPENAI_API_KEY=your_openai_api_key
# DEFAULT_MODEL=gpt-4o

# WebChat Channel
WEBCHAT_ENABLED=true
WEBCHAT_CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Security
JWT_SECRET=your_jwt_secret_here_min_32_chars
SESSION_SECRET=your_session_secret_here

# Logging
LOG_LEVEL=info
DEBUG=false

# Optional: TTS/STT
# ELEVENLABS_API_KEY=your_elevenlabs_key
# WHISPER_API_KEY=your_whisper_key
```

### Step 4: Build Moltbot

```bash
pnpm build
```

### Step 5: Start Gateway

```bash
# Development mode
pnpm gateway:watch

# Or production mode
pnpm gateway --port 18789 --verbose
```

### Step 6: Verify Gateway Health

```bash
# Check health endpoint
curl http://localhost:18789/health

# Expected response:
# {"status":"ok","version":"...","uptime":...}
```

### Step 7: Test WebSocket Connection

Tạo file test: `scripts/test-gateway.ts`

```typescript
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:18789');

ws.on('open', () => {
  console.log('✅ Connected to Moltbot Gateway');

  // Send ping
  ws.send(JSON.stringify({ type: 'ping' }));
});

ws.on('message', (data) => {
  console.log('📨 Received:', data.toString());
});

ws.on('error', (error) => {
  console.error('❌ Error:', error);
});

ws.on('close', () => {
  console.log('🔌 Disconnected');
});

// Close after 5 seconds
setTimeout(() => ws.close(), 5000);
```

Run test:

```bash
npx tsx scripts/test-gateway.ts
```

---

## Configuration Reference

### Gateway Ports

| Port  | Service         | Protocol |
| ----- | --------------- | -------- |
| 18789 | Gateway WS/HTTP | WS/HTTP  |
| 3000  | WebChat UI      | HTTP     |
| 3001  | UE-Bot Webapp   | HTTP     |

### Environment Variables

| Variable            | Required | Description            |
| ------------------- | -------- | ---------------------- |
| `GATEWAY_PORT`      | Yes      | Port for Gateway       |
| `ANTHROPIC_API_KEY` | Yes\*    | Claude API key         |
| `OPENAI_API_KEY`    | Yes\*    | OpenAI API key         |
| `WEBCHAT_ENABLED`   | Yes      | Enable WebChat channel |
| `JWT_SECRET`        | Yes      | JWT signing secret     |

\*At least one AI provider key is required

---

## Troubleshooting

### Gateway không start

1. Kiểm tra port 18789 có đang được sử dụng:

   ```bash
   lsof -i :18789
   # Hoặc Windows:
   netstat -ano | findstr :18789
   ```

2. Kiểm tra logs:
   ```bash
   pnpm gateway --verbose 2>&1 | head -100
   ```

### API Key Error

1. Verify API key format
2. Check API key permissions
3. Ensure sufficient quota/credits

### WebSocket Connection Failed

1. Check CORS settings
2. Verify firewall rules
3. Check network connectivity

---

## Verification Checklist

- [ ] `pnpm install` completed without errors
- [ ] `.env` file created with valid keys
- [ ] `pnpm build` successful
- [ ] Gateway starts on port 18789
- [ ] Health check returns OK
- [ ] WebSocket connection works
- [ ] Test message sends successfully

---

## Notes

- Gateway chạy ở mode single-user (personal assistant)
- WebChat là channel chính cho UE-Bot webapp
- Có thể enable thêm Telegram/Discord channels sau
- Logs được lưu tại `~/.openclaw/logs/`

---

## Related Tasks

- **T012**: Clone Moltbot as submodule (prerequisite)
- **T014**: Setup WebChat channel (next)
- **T015**: Create Gateway wrapper service (next)
