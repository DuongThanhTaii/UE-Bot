# TASK-001: Create Project Structure

## Task Information

- **ID**: T001
- **Phase**: 1 - Foundation
- **Priority**: High
- **Estimated Hours**: 2h
- **Dependencies**: None

---

## Objective

Tạo cấu trúc thư mục hoàn chỉnh cho project UE-Bot.

---

## Acceptance Criteria

- [ ] Tất cả directories được tạo theo cấu trúc
- [ ] Có README.md ở root
- [ ] Có .gitignore phù hợp
- [ ] Có .env.example với các biến cần thiết

---

## Instructions

### Step 1: Create Directory Structure

Tạo các thư mục sau:

```
UE-Bot/
├── docs/
│   ├── architecture/
│   ├── api/
│   └── guides/
├── packages/
│   ├── webapp/
│   ├── bridge-service/
│   ├── esp32-firmware/
│   └── shared/
├── skills/
│   └── esp32-voice/
├── docker/
├── scripts/
├── templates/
└── .github/
    └── workflows/
```

### Step 2: Create Root Files

#### .gitignore

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Test
coverage/
.nyc_output/

# ESP32
.pio/
.vscode/c_cpp_properties.json

# Temp
tmp/
temp/
*.tmp
```

#### .env.example

```env
# ======================
# UE-Bot Configuration
# ======================

# Server
NODE_ENV=development
PORT=3000
BRIDGE_PORT=8080

# Moltbot Gateway
GATEWAY_HOST=127.0.0.1
GATEWAY_PORT=18789
GATEWAY_TOKEN=

# OpenAI (Whisper STT)
OPENAI_API_KEY=

# ElevenLabs (TTS)
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# Database (optional)
DATABASE_URL=

# ESP32
ESP32_WIFI_SSID=
ESP32_WIFI_PASSWORD=
ESP32_BRIDGE_URL=ws://your-server:8080

# Logging
LOG_LEVEL=info
```

#### README.md

```markdown
# 🤖 UE-Bot

Universal ESP32 Bot - A Moltbot clone with ESP32 voice control and custom web dashboard.

## Features

- 🦞 Full Moltbot functionality
- 🌐 Custom web dashboard
- 🎤 ESP32 voice control
- 🔊 Text-to-Speech responses
- 📱 Multi-channel support

## Quick Start

\`\`\`bash

# Install dependencies

pnpm install

# Start development

pnpm dev

# Build for production

pnpm build
\`\`\`

## Documentation

- [Architecture](./docs/architecture/)
- [API Reference](./docs/api/)
- [Setup Guide](./docs/guides/)

## Project Structure

\`\`\`
packages/
├── webapp/ # Next.js web dashboard
├── bridge-service/ # ESP32 ↔ Gateway bridge
├── esp32-firmware/ # ESP32 Arduino firmware
└── shared/ # Shared types & utilities
\`\`\`

## License

MIT License - see [LICENSE](./LICENSE) for details.
```

### Step 3: Verify Structure

Chạy command để verify:

```bash
tree -L 3 --dirsfirst
```

---

## Verification Checklist

- [ ] All directories exist
- [ ] .gitignore created with correct patterns
- [ ] .env.example has all required variables
- [ ] README.md is informative

---

## Git Commit

```bash
git add .
git commit -m "chore(init): create project structure [T001]"
git push -u origin main
```

---

## Notes

- Không tạo các file code chi tiết trong task này
- Chỉ tạo cấu trúc và documentation files
- Files cụ thể sẽ được tạo trong các task tiếp theo
