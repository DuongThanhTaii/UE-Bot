# Getting Started Guide

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker & Docker Compose (optional)
- Git

### Hardware (for voice features)

- ESP32-S3 DevKit
- INMP441 I2S Microphone
- MAX98357A I2S DAC + Speaker

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/DuongThanhTaii/UE-Bot.git
cd UE-Bot
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys:

```
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

### 4. Start Development

```bash
# Start all services
pnpm dev

# Or start individually
pnpm --filter @ue-bot/webapp dev        # http://localhost:3000
pnpm --filter @ue-bot/bridge-service dev # http://localhost:8080
```

### 5. Access Application

- Webapp: http://localhost:3000
- Bridge API: http://localhost:8080
- API Health: http://localhost:8080/health

## Project Structure

```
.
├── packages/
│   ├── webapp/           # Next.js frontend
│   ├── bridge-service/   # Express backend
│   ├── shared/           # Shared types & utils
│   └── esp32-firmware/   # ESP32 Arduino code
├── external/
│   └── moltbot/          # Moltbot submodule
├── docs/                 # Documentation
└── tasks/                # Task definitions
```

## Using Docker

### Development with Docker Compose

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop
docker-compose -f docker-compose.dev.yml down
```

### Production Build

```bash
# Build all images
docker-compose build

# Start production
docker-compose up -d
```

## Common Tasks

### Building for Production

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @ue-bot/webapp build
pnpm --filter @ue-bot/bridge-service build
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage
```

### Linting & Formatting

```bash
# Lint all files
pnpm lint

# Format all files
pnpm format

# Type check
pnpm typecheck
```

## Next Steps

1. [Development Guide](./development.md) - Detailed development workflow
2. [ESP32 Setup](./esp32-setup.md) - Hardware setup for voice features
3. [Deployment Guide](./deployment.md) - Production deployment instructions
4. [API Documentation](../api/) - API reference
