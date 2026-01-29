# UE-Bot

🤖 **AI Assistant Platform** - Clone của Clawdbot/Moltbot với custom webapp và ESP32 voice control.

[![CI](https://github.com/DuongThanhTaii/UE-Bot/actions/workflows/ci.yml/badge.svg)](https://github.com/DuongThanhTaii/UE-Bot/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🌟 Features

- **Moltbot Core**: Full-featured AI assistant engine
- **Custom Webapp**: Modern web interface với Next.js 14
- **ESP32 Voice Control**: Hardware voice input/output
- **Multi-channel Support**: Web, API, và hardware devices

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Webapp    │────▶│   Bridge    │────▶│   Moltbot   │
│  (Next.js)  │     │  (Express)  │     │  (AI Core)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │    ESP32    │
                    │ (Voice I/O) │
                    └─────────────┘
```

## 📦 Project Structure

```
.
├── packages/
│   ├── webapp/           # Next.js 14 frontend
│   ├── bridge-service/   # Express + WebSocket backend
│   ├── shared/           # Shared types & utilities
│   └── esp32-firmware/   # PlatformIO ESP32 code
├── external/
│   └── moltbot/          # Moltbot git submodule
├── docs/                 # Documentation
└── tasks/                # Task definitions for agents
```

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker & Docker Compose (optional)

### Installation

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/DuongThanhTaii/UE-Bot.git
cd UE-Bot

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development
pnpm dev
```

### Using Docker

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose up -d
```

## 🔧 Development

```bash
# Run all packages in dev mode
pnpm dev

# Run specific package
pnpm --filter @ue-bot/webapp dev
pnpm --filter @ue-bot/bridge-service dev

# Build all
pnpm build

# Run tests
pnpm test

# Lint & format
pnpm lint
pnpm format
```

## 🎛️ ESP32 Hardware

### Required Components

| Component       | Description          |
| --------------- | -------------------- |
| ESP32-S3 DevKit | Main microcontroller |
| INMP441         | I2S Microphone       |
| MAX98357A       | I2S DAC + Amplifier  |
| Speaker         | 3W 8Ω speaker        |

### Build Firmware

```bash
cd packages/esp32-firmware
pio run -e esp32-s3
pio run -t upload
```

## 📚 Documentation

- [Architecture](docs/architecture/README.md)
- [API Reference](docs/api/)
- [Getting Started](docs/guides/getting-started.md)
- [ESP32 Setup](docs/guides/esp32-setup.md)
- [Deployment](docs/guides/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Moltbot](https://github.com/moltbot/moltbot) - AI assistant core
- [Next.js](https://nextjs.org/) - React framework
- [Shadcn/UI](https://ui.shadcn.com/) - UI components
- [PlatformIO](https://platformio.org/) - ESP32 development

---

Made with ❤️ by [DuongThanhTai](https://github.com/DuongThanhTaii)
