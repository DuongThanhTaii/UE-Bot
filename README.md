# 🤖 UE-Bot

**AI Assistant Platform** - Clone của Clawdbot/Moltbot với custom webapp, CLI, Telegram bot và ESP32 voice control.

[![CI](https://github.com/DuongThanhTaii/UE-Bot/actions/workflows/ci.yml/badge.svg)](https://github.com/DuongThanhTaii/UE-Bot/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🌟 Features

- **Multi-Provider Support**: Groq (Free), OpenAI, Claude
- **Web Dashboard**: Modern web interface với Next.js 14
- **CLI Tool**: Command-line interface cho terminal lovers
- **Telegram Bot**: Chat với bot qua Telegram
- **ESP32 Voice Control**: Hardware voice input/output (planned)
- **Tool System**: Đọc/ghi file, chạy code, mở URL, tìm kiếm web

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/DuongThanhTaii/UE-Bot.git
cd UE-Bot
pnpm install
pnpm build
```

### 2. Get API Key (Free)

Bạn cần một API key từ một trong các providers sau:

| Provider    | Free Tier   | Link                                        |
| ----------- | ----------- | ------------------------------------------- |
| **Groq** ⭐ | ✅ Miễn phí | https://console.groq.com/keys               |
| OpenAI      | ❌ Trả phí  | https://platform.openai.com/api-keys        |
| Claude      | ❌ Trả phí  | https://console.anthropic.com/settings/keys |

> 💡 **Khuyến nghị**: Bắt đầu với Groq vì miễn phí. OpenAI/Claude có tool calling tốt hơn.

---

## 💻 Web Interface

### Start

```bash
pnpm --filter @ue-bot/webapp dev
```

### Configure

1. Mở browser: http://localhost:3000
2. Click icon ⚙️ **Settings** trên header
3. Chọn Provider (Groq/OpenAI/Claude)
4. Nhập API Key
5. Chọn Model
6. **Save** và bắt đầu chat!

---

## 🖥️ CLI

### Interactive Setup

```bash
pnpm --filter @ue-bot/cli dev config setup
```

Wizard sẽ hỏi:

1. Chọn Provider (Groq/OpenAI/Claude)
2. Nhập API Key
3. Chọn Model
4. Enable tools?

### Start Chat

```bash
pnpm --filter @ue-bot/cli dev chat
```

### Các lệnh khác

```bash
# Xem config hiện tại
pnpm --filter @ue-bot/cli dev config show

# Set API key trực tiếp
pnpm --filter @ue-bot/cli dev config set groqApiKey YOUR_API_KEY

# Reset config
pnpm --filter @ue-bot/cli dev config reset
```

---

## 📱 Telegram Bot

### 1. Tạo Bot

1. Message [@BotFather](https://t.me/botfather) trên Telegram
2. Send `/newbot`
3. Copy **Bot Token**

### 2. Configure

```bash
cd packages/telegram-bot
cp .env.example .env
```

Edit `.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
GROQ_API_KEY=your_groq_api_key
```

### 3. Start

```bash
pnpm --filter @ue-bot/telegram-bot dev
```

---

## 🏗️ Architecture

```
                     ┌─────────────────┐
                     │   LLM Provider  │
                     │ Groq/OpenAI/    │
                     │    Claude       │
                     └────────┬────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Web Interface  │  │       CLI       │  │  Telegram Bot   │
│   (Next.js)     │  │   (Commander)   │  │    (grammY)     │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                     ┌────────▼────────┐
                     │   Agent Core    │
                     │  (Tool System)  │
                     └─────────────────┘
```

## 📦 Project Structure

```
packages/
├── agent-core/       # Core AI agent với tools
├── webapp/           # Next.js 14 web interface
├── cli/              # Command-line interface
├── telegram-bot/     # Telegram bot integration
└── shared/           # Shared types & utilities
```

## 🛠️ Available Tools

| Tool         | Mô tả                        |
| ------------ | ---------------------------- |
| `read`       | Đọc file                     |
| `write`      | Ghi file                     |
| `node`       | Chạy Node.js code            |
| `shell`      | Chạy shell commands          |
| `open`       | Mở URL/ứng dụng              |
| `web_search` | Tìm kiếm web (cần Brave API) |
| `memory_*`   | Lưu/tìm thông tin            |

---

## 🔒 Security

UE-Bot có hệ thống bảo mật tích hợp để bảo vệ người dùng:

### Blocked Commands (Tự động chặn)

- ❌ `format C:`, `rm -rf /` - Xóa ổ đĩa
- ❌ `curl | bash` - Download và chạy code
- ❌ Reverse shells, crypto miners
- ❌ Registry/system file destruction

### Sensitive Files (Không cho phép đọc/ghi)

- 🔐 `.env`, `.pem`, `.key` - API keys, certificates
- 🔐 `.ssh/`, `id_rsa` - SSH keys
- 🔐 `wallet.dat`, `.bitcoin/` - Crypto wallets
- 🔐 Browser passwords, cookies

### Suspicious Commands (Cần xác nhận)

- ⚠️ `sudo`, `curl`, `wget`
- ⚠️ `npm install -g`, `pip install`
- ⚠️ Process killing commands

> 💡 Bạn có thể customize rules trong `packages/agent-core/src/security/`

---

## ⚠️ Known Issues

### Groq Function Calling

Groq free tier có function calling không ổn định. Một số tools có thể fail ngẫu nhiên.

**Giải pháp**: Sử dụng OpenAI hoặc Claude.

---

## 🔧 Development

```bash
# Build all
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE).

---

**Made with ❤️ by HCMUE Students**
