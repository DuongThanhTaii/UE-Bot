# 🤖 UE-Bot - Agent Rules & Guidelines

## Overview

Tài liệu này định nghĩa các rules và guidelines cho AI agents khi làm việc trên project UE-Bot.

---

## 🎯 PROJECT CONTEXT

### Mục tiêu

Clone và mở rộng Moltbot với:

1. Giữ nguyên toàn bộ tính năng Moltbot
2. Thêm custom web dashboard
3. Tích hợp điều khiển giọng nói qua ESP32

### Nguyên tắc cốt lõi

- **Modularity**: Mỗi component độc lập, dễ test
- **Type Safety**: TypeScript strict mode everywhere
- **Documentation**: Code tự document + comments khi cần
- **Testing**: Unit tests cho business logic

---

## 📋 TASK EXECUTION RULES

### Rule 1: Đọc Task File Trước

```
BEFORE starting ANY task:
1. Read TASK_<number>.md completely
2. Understand acceptance criteria
3. Check dependencies
4. Ask if unclear
```

### Rule 2: Small Commits

```
Each commit should:
- Do ONE thing
- Be < 300 lines changed (ideally)
- Have descriptive message
- Reference task number

Format: <type>(<scope>): <description> [TASK-XX]
Example: feat(webapp): add login page [TASK-05]
```

### Rule 3: Code Quality

```
Before committing:
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Tests pass (if applicable)
- [ ] Code is formatted (Prettier)
```

### Rule 4: File Organization

```
When creating new files:
1. Check if similar file exists
2. Follow existing patterns
3. Place in correct directory
4. Export from index.ts if public API
```

---

## 🏗️ ARCHITECTURE RULES

### Package Structure

```
packages/<package-name>/
├── src/
│   ├── index.ts           # Public exports
│   ├── types.ts           # Type definitions
│   ├── constants.ts       # Constants
│   ├── utils/             # Utility functions
│   ├── services/          # Business logic
│   ├── handlers/          # Request/Event handlers
│   └── __tests__/         # Tests
├── package.json
├── tsconfig.json
└── README.md
```

### Import Rules

```typescript
// ✅ Correct order
import { external } from "external-package"; // 1. External
import { internal } from "@ue-bot/shared"; // 2. Internal packages
import { local } from "../services"; // 3. Relative
import { types } from "./types"; // 4. Same directory

// ❌ Wrong
import { local } from "../services";
import { external } from "external-package";
```

### Type Definitions

```typescript
// ✅ Use interfaces for objects
interface UserConfig {
  name: string;
  settings: Settings;
}

// ✅ Use types for unions/primitives
type DeviceStatus = "online" | "offline" | "error";
type UserId = string;

// ❌ Avoid
type UserConfig = {
  name: string;
};
```

---

## 📁 SPECIFIC PACKAGE RULES

### packages/webapp (Next.js)

#### File Structure

```
webapp/
├── src/
│   ├── app/               # App Router pages
│   │   ├── (auth)/        # Auth group
│   │   ├── (dashboard)/   # Dashboard group
│   │   ├── api/           # API routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/            # Shadcn components
│   │   ├── features/      # Feature components
│   │   └── layouts/       # Layout components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities
│   ├── services/          # API services
│   ├── stores/            # Zustand stores
│   └── types/             # TypeScript types
├── public/
└── tailwind.config.ts
```

#### Component Rules

```typescript
// ✅ Correct component structure
'use client'; // Only if needed

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { VoiceControlProps } from './types';

export function VoiceControl({ deviceId, onCommand }: VoiceControlProps) {
  const [isListening, setIsListening] = useState(false);

  // Event handlers
  const handleStart = () => {
    setIsListening(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={handleStart}>
        {isListening ? 'Listening...' : 'Start'}
      </Button>
    </div>
  );
}
```

### packages/bridge-service (Node.js)

#### Structure

```
bridge-service/
├── src/
│   ├── index.ts           # Entry point
│   ├── server.ts          # HTTP/WS server
│   ├── config.ts          # Configuration
│   ├── handlers/
│   │   ├── esp32.handler.ts
│   │   ├── gateway.handler.ts
│   │   └── audio.handler.ts
│   ├── services/
│   │   ├── stt.service.ts       # Speech-to-Text
│   │   ├── tts.service.ts       # Text-to-Speech
│   │   └── device.service.ts    # Device management
│   ├── utils/
│   └── types/
└── Dockerfile
```

#### Service Pattern

```typescript
// ✅ Service class pattern
export class STTService {
  private client: WhisperClient;

  constructor(config: STTConfig) {
    this.client = new WhisperClient(config);
  }

  async transcribe(audio: Buffer): Promise<TranscribeResult> {
    // Implementation
  }
}

// ✅ Export singleton or factory
export const sttService = new STTService(config);
// or
export function createSTTService(config: STTConfig) {
  return new STTService(config);
}
```

### packages/esp32-firmware (PlatformIO)

#### Structure

```
esp32-firmware/
├── src/
│   ├── main.cpp           # Entry point
│   ├── config.h           # Configuration
│   ├── wifi/
│   │   ├── wifi_manager.cpp
│   │   └── wifi_manager.h
│   ├── audio/
│   │   ├── i2s_audio.cpp
│   │   ├── i2s_audio.h
│   │   ├── wake_word.cpp
│   │   └── wake_word.h
│   ├── network/
│   │   ├── websocket_client.cpp
│   │   └── websocket_client.h
│   └── utils/
├── lib/                   # External libraries
├── test/
├── platformio.ini
└── README.md
```

#### Code Style

```cpp
// ✅ Header guards
#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

// ✅ Use namespaces
namespace UEBot {
namespace WiFi {

class WiFiManager {
public:
    bool connect(const char* ssid, const char* password);
    bool isConnected();

private:
    bool _connected = false;
};

} // namespace WiFi
} // namespace UEBot

#endif // WIFI_MANAGER_H
```

---

## 🧪 TESTING RULES

### Unit Tests

```typescript
// File: __tests__/stt.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { STTService } from '../services/stt.service';

describe('STTService', () => {
  describe('transcribe', () => {
    it('should return text from audio buffer', async () => {
      // Arrange
      const service = new STTService(mockConfig);
      const audioBuffer = Buffer.from([...]);

      // Act
      const result = await service.transcribe(audioBuffer);

      // Assert
      expect(result.text).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });
});
```

### Test Naming

```
describe('<ClassName or function name>')
  describe('<method name>')
    it('should <expected behavior> when <condition>')
```

---

## 🔒 SECURITY RULES

### Secrets

```
NEVER commit:
- API keys
- Passwords
- Private keys
- .env files (use .env.example)

ALWAYS:
- Use environment variables
- Document required vars in .env.example
- Validate env vars at startup
```

### Input Validation

```typescript
// ✅ Always validate external input
import { z } from "zod";

const DeviceCommandSchema = z.object({
  deviceId: z.string().uuid(),
  command: z.enum(["start", "stop", "status"]),
  payload: z.record(z.unknown()).optional(),
});

export function handleCommand(data: unknown) {
  const validated = DeviceCommandSchema.parse(data);
  // Process validated data
}
```

---

## 📝 DOCUMENTATION RULES

### Code Comments

```typescript
// ✅ Good: Explains WHY
// Using exponential backoff to handle rate limiting from Whisper API
const delay = Math.pow(2, retryCount) * 1000;

// ❌ Bad: Explains WHAT (obvious from code)
// Multiply 2 by retry count and multiply by 1000
const delay = Math.pow(2, retryCount) * 1000;
```

### JSDoc for Public APIs

```typescript
/**
 * Transcribes audio buffer to text using Whisper API.
 *
 * @param audio - Raw audio buffer (16-bit PCM, 16kHz)
 * @param options - Transcription options
 * @returns Transcription result with text and confidence
 * @throws {TranscriptionError} If API call fails
 *
 * @example
 * const result = await stt.transcribe(audioBuffer, { language: 'vi' });
 * console.log(result.text);
 */
export async function transcribe(
  audio: Buffer,
  options?: TranscribeOptions,
): Promise<TranscribeResult> {
  // Implementation
}
```

---

## ⚡ PERFORMANCE RULES

### Async Operations

```typescript
// ✅ Parallel when independent
const [user, devices] = await Promise.all([
  getUser(userId),
  getDevices(userId),
]);

// ✅ Sequential when dependent
const user = await getUser(userId);
const settings = await getSettings(user.settingsId);
```

### Memory Management (ESP32)

```cpp
// ✅ Use static buffers for frequent allocations
static uint8_t audioBuffer[BUFFER_SIZE];

// ✅ Free dynamic memory promptly
char* json = cJSON_Print(root);
sendData(json);
free(json);  // Free immediately after use

// ✅ Use PROGMEM for constant strings
const char WIFI_SSID[] PROGMEM = "MyNetwork";
```

---

## 🚀 DEPLOYMENT RULES

### Docker Images

```dockerfile
# ✅ Multi-stage builds
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### Environment Configs

```
Development: .env.development
Staging: .env.staging
Production: .env.production

Never use production secrets in development!
```

---

## 📌 QUICK REFERENCE

### Common Commands

| Action       | Command          |
| ------------ | ---------------- |
| Install deps | `pnpm install`   |
| Dev mode     | `pnpm dev`       |
| Build        | `pnpm build`     |
| Test         | `pnpm test`      |
| Lint         | `pnpm lint`      |
| Format       | `pnpm format`    |
| Type check   | `pnpm typecheck` |

### File Templates

Templates are in `/templates/` directory:

- `component.tsx.template`
- `service.ts.template`
- `handler.ts.template`
- `test.ts.template`

### Getting Help

1. Check existing similar code
2. Read Moltbot docs: https://docs.molt.bot/
3. Search issues on GitHub
4. Ask in Discord

---

## ✅ CHECKLIST BEFORE PR

```
[ ] Code compiles without errors
[ ] Tests pass
[ ] No ESLint warnings
[ ] Commit messages follow convention
[ ] Documentation updated (if API changed)
[ ] Task file updated with progress
[ ] No secrets in code
[ ] PR description explains changes
```
