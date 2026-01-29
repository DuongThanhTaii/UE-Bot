# 🤖 UE-Bot Project - Agent Instructions

## Project Overview

UE-Bot là một dự án clone và mở rộng Moltbot/Clawdbot với các tính năng:

- Clone toàn bộ tính năng của Moltbot
- Custom website điều khiển
- Voice control qua ESP32

## Repository Structure

```
UE-Bot/
├── CLAUDE.md                   # Agent instructions (this file)
├── AGENTS.md                   # Detailed agent rules
├── PROJECT_PLAN.md             # Project timeline & tasks
├── docs/                       # Documentation
│   ├── architecture/           # System architecture docs
│   ├── api/                    # API documentation
│   └── guides/                 # Setup & usage guides
├── moltbot-core/               # Cloned Moltbot source (submodule)
├── packages/
│   ├── webapp/                 # Custom Next.js website
│   ├── bridge-service/         # ESP32 ↔ Gateway bridge
│   ├── esp32-firmware/         # ESP32 Arduino/PlatformIO code
│   └── shared/                 # Shared types & utilities
├── skills/                     # Custom Moltbot skills
│   └── esp32-voice/            # ESP32 voice control skill
├── docker/                     # Docker configurations
├── scripts/                    # Build & deployment scripts
└── .github/                    # GitHub Actions workflows
```

## Tech Stack

- **Runtime**: Node.js ≥22, pnpm
- **Language**: TypeScript (strict mode)
- **Frontend**: Next.js 14, TailwindCSS, Shadcn/UI
- **Backend**: Moltbot Gateway, Express.js
- **Hardware**: ESP32-S3, PlatformIO
- **Database**: SQLite (local), optional PostgreSQL
- **Realtime**: WebSocket, Socket.IO

## Coding Standards

### TypeScript

- Use strict mode
- Prefer interfaces over types for object shapes
- Use explicit return types for functions
- No `any` type unless absolutely necessary

### Naming Conventions

- Files: kebab-case (e.g., `voice-handler.ts`)
- Classes: PascalCase (e.g., `VoiceHandler`)
- Functions/Variables: camelCase (e.g., `processVoice`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `MAX_AUDIO_LENGTH`)
- React Components: PascalCase (e.g., `VoicePanel.tsx`)

### Git Conventions

- Branch naming: `feature/`, `fix/`, `docs/`, `refactor/`
- Commit format: `type(scope): description`
  - Types: feat, fix, docs, style, refactor, test, chore
  - Example: `feat(esp32): add wake word detection`

## Important Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                    # Start all services
pnpm dev:webapp             # Start webapp only
pnpm dev:bridge             # Start bridge service only

# Build
pnpm build                  # Build all packages
pnpm build:webapp           # Build webapp
pnpm build:bridge           # Build bridge service

# Test
pnpm test                   # Run all tests
pnpm test:unit              # Unit tests only
pnpm test:e2e               # E2E tests

# ESP32
pnpm esp32:build            # Build firmware
pnpm esp32:upload           # Upload to device
pnpm esp32:monitor          # Serial monitor

# Docker
docker compose up -d        # Start all services
docker compose logs -f      # View logs
```

## Environment Variables

Required environment variables are documented in `.env.example`

## When Working on This Project

1. Always read the relevant TASK\_\*.md file before starting
2. Follow the coding standards strictly
3. Write tests for new features
4. Update documentation when changing APIs
5. Create small, focused commits
6. Reference issue/task numbers in commits

## Links

- Moltbot Docs: https://docs.molt.bot/
- ClawdHub: https://clawdhub.com/
- Project GitHub: https://github.com/DuongThanhTaii/UE-Bot
