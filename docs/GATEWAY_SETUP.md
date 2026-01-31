# UE-Bot Gateway Configuration Guide

## Overview

UE-Bot sử dụng Moltbot/OpenClaw làm backend AI gateway. Hướng dẫn này giúp bạn cấu hình và chạy Gateway.

## Quick Start

### 1. Environment Setup

Tạo file `~/.openclaw/openclaw.json`:

```json
{
  "env": {
    "vars": {
      "GROQ_API_KEY": "your-groq-api-key-here"
    }
  },
  "models": {
    "providers": {
      "groq": {
        "baseUrl": "https://api.groq.com/openai/v1",
        "apiKey": "${GROQ_API_KEY}",
        "api": "openai-completions",
        "models": [
          {
            "id": "llama-3.3-70b-versatile",
            "name": "Llama 3.3 70B Versatile",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 128000,
            "maxTokens": 32768
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "groq/llama-3.3-70b-versatile"
      }
    }
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "auth": {
      "mode": "none"
    }
  }
}
```

### 2. Start Gateway

**Windows:**

```cmd
cd external\moltbot
node dist\entry.js gateway
```

**Linux/Mac:**

```bash
cd external/moltbot
node dist/entry.js gateway
```

Or use the startup scripts:

```bash
# Windows
scripts\start-gateway.bat

# Linux/Mac
./scripts/start-gateway.sh
```

### 3. Verify Gateway

```bash
curl http://localhost:18789/health
```

Expected response:

```json
{ "status": "ok" }
```

## Configuration Options

### API Providers

#### Groq (Recommended - Free)

```json
{
  "env": {
    "vars": {
      "GROQ_API_KEY": "gsk_..."
    }
  }
}
```

#### Google Gemini

```json
{
  "env": {
    "vars": {
      "GEMINI_API_KEY": "AIza..."
    }
  }
}
```

### Gateway Modes

| Mode     | Description            |
| -------- | ---------------------- |
| `local`  | Local development mode |
| `remote` | For cloud deployment   |

### Authentication

| Mode    | Description                          |
| ------- | ------------------------------------ |
| `none`  | No authentication (development only) |
| `token` | Token-based auth (production)        |

## Troubleshooting

### Gateway not starting

1. Check if port 18789 is available:

   ```bash
   netstat -an | grep 18789
   ```

2. Ensure config file is valid JSON:

   ```bash
   cat ~/.openclaw/openclaw.json | jq .
   ```

3. Check for TypeScript build:
   ```bash
   cd external/moltbot
   pnpm build
   ```

### API Key issues

1. Verify your GROQ API key is valid at https://console.groq.com
2. Check the key is correctly set in `~/.openclaw/openclaw.json`

## WebChat Integration

The Gateway exposes WebSocket endpoints for WebChat:

- **WebSocket URL**: `ws://localhost:18789/`
- **Control UI**: `http://localhost:18789/`

## Related Documentation

- [Moltbot/OpenClaw Docs](https://docs.molt.bot/)
- [Task T014: Setup WebChat Channel](../tasks/TASK_014_setup_webchat.md)
- [Task T015: Gateway Wrapper Service](../tasks/TASK_015_gateway_wrapper.md)
