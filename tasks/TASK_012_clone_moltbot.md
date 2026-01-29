# TASK-012: Clone Moltbot as Submodule

## Task Information

- **ID**: T012
- **Phase**: 1 - Foundation
- **Priority**: High
- **Estimated Hours**: 1h
- **Dependencies**: T001

---

## Objective

Thêm Moltbot repository như một git submodule để sử dụng như AI core engine.

---

## Acceptance Criteria

- [ ] Moltbot added as git submodule
- [ ] .gitmodules configured
- [ ] Moltbot can be initialized
- [ ] Basic integration verified

---

## Instructions

### Step 1: Add Moltbot as Submodule

```bash
# Navigate to project root
cd /path/to/UE-Bot

# Create external directory
mkdir -p external

# Add Moltbot as submodule
git submodule add https://github.com/moltbot/moltbot.git external/moltbot

# Initialize and update submodule
git submodule update --init --recursive
```

### Step 2: Configure .gitmodules

**File: `.gitmodules`** (auto-created, verify content)

```ini
[submodule "external/moltbot"]
    path = external/moltbot
    url = https://github.com/moltbot/moltbot.git
    branch = main
```

### Step 3: Create Moltbot Configuration

**File: `external/moltbot/.env.example`** (nếu không có)

```bash
# Moltbot Configuration
# Copy to .env and fill in your values

# ===================
# Core Settings
# ===================
NODE_ENV=development
PORT=3001

# ===================
# AI Provider
# ===================
# Choose: openai, anthropic, google, etc.
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_key

# ===================
# Channel Configuration
# ===================
# Enable/disable channels
ENABLE_WEB=true
ENABLE_WHATSAPP=false
ENABLE_TELEGRAM=false
ENABLE_DISCORD=false
ENABLE_SLACK=false

# ===================
# Database (if needed)
# ===================
# DATABASE_URL=postgresql://user:pass@localhost:5432/moltbot

# ===================
# Security
# ===================
JWT_SECRET=your_super_secret_key
API_KEY=your_api_key_for_bridge

# ===================
# Logging
# ===================
LOG_LEVEL=info
```

### Step 4: Create Bridge Integration Config

**File: `external/moltbot-config.ts`** (placed in packages/bridge-service/src)

```typescript
/**
 * Moltbot Integration Configuration
 *
 * This file configures how bridge-service communicates with Moltbot
 */

export interface MoltbotConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export const moltbotConfig: MoltbotConfig = {
  baseUrl: process.env.MOLTBOT_URL || "http://localhost:3001",
  apiKey: process.env.MOLTBOT_API_KEY,
  timeout: 30000, // 30 seconds for AI responses
  retryAttempts: 3,
  retryDelay: 1000,
};

export const getMoltbotEndpoints = (config: MoltbotConfig) => ({
  chat: `${config.baseUrl}/api/chat`,
  health: `${config.baseUrl}/health`,
  conversation: `${config.baseUrl}/api/conversation`,
});
```

### Step 5: Create Moltbot Client

**File: `packages/bridge-service/src/clients/moltbot-client.ts`**

```typescript
import { moltbotConfig, getMoltbotEndpoints } from "../moltbot-config";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  message: string;
  conversationId?: string;
  context?: Record<string, unknown>;
}

interface ChatResponse {
  message: string;
  conversationId: string;
  metadata?: Record<string, unknown>;
}

export class MoltbotClient {
  private config = moltbotConfig;
  private endpoints = getMoltbotEndpoints(this.config);

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(this.endpoints.chat, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey && {
          Authorization: `Bearer ${this.config.apiKey}`,
        }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(
        `Moltbot error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.endpoints.health, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getConversation(conversationId: string): Promise<ChatMessage[]> {
    const response = await fetch(
      `${this.endpoints.conversation}/${conversationId}`,
      {
        method: "GET",
        headers: {
          ...(this.config.apiKey && {
            Authorization: `Bearer ${this.config.apiKey}`,
          }),
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get conversation: ${response.statusText}`);
    }

    return response.json();
  }
}

// Singleton instance
export const moltbotClient = new MoltbotClient();
```

### Step 6: Update .gitignore for Submodule

**Append to `.gitignore`:**

```gitignore
# Moltbot local config
external/moltbot/.env
external/moltbot/.env.local
external/moltbot/node_modules/
external/moltbot/dist/
```

### Step 7: Create Submodule Update Script

**File: `scripts/update-moltbot.sh`**

```bash
#!/bin/bash

# Update Moltbot submodule to latest version

set -e

echo "📦 Updating Moltbot submodule..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Update submodule
git submodule update --remote external/moltbot

# Check for changes
if [ -n "$(git status --porcelain external/moltbot)" ]; then
    echo "✅ Moltbot updated!"
    echo ""
    echo "New commit:"
    cd external/moltbot && git log -1 --oneline
    cd ../..
    echo ""
    echo "Run 'git add external/moltbot && git commit' to save the update"
else
    echo "ℹ️ Moltbot is already up to date"
fi
```

**File: `scripts/update-moltbot.ps1`** (Windows PowerShell)

```powershell
# Update Moltbot submodule to latest version

Write-Host "📦 Updating Moltbot submodule..." -ForegroundColor Cyan

# Navigate to project root
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

# Update submodule
git submodule update --remote external/moltbot

# Check for changes
$status = git status --porcelain external/moltbot
if ($status) {
    Write-Host "✅ Moltbot updated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "New commit:"
    Set-Location external/moltbot
    git log -1 --oneline
    Set-Location $projectRoot
    Write-Host ""
    Write-Host "Run 'git add external/moltbot && git commit' to save the update"
} else {
    Write-Host "ℹ️ Moltbot is already up to date" -ForegroundColor Yellow
}
```

### Step 8: Create README for External

**File: `external/README.md`**

````markdown
# External Dependencies

This directory contains external repositories as git submodules.

## Moltbot

[Moltbot](https://github.com/moltbot/moltbot) is the core AI engine used by UE-Bot.

### Initialization

```bash
# First time setup
git submodule update --init --recursive

# Update to latest
./scripts/update-moltbot.sh  # Linux/macOS
./scripts/update-moltbot.ps1 # Windows
```
````

### Configuration

1. Copy `.env.example` to `.env` in `external/moltbot/`
2. Fill in required API keys
3. Start Moltbot: `cd external/moltbot && npm install && npm start`

### Integration

UE-Bot integrates with Moltbot via HTTP API:

- Bridge Service → Moltbot API
- See `packages/bridge-service/src/clients/moltbot-client.ts`

### Customization

⚠️ **Do not modify files in external/moltbot directly**

If you need to customize Moltbot:

1. Fork the repository
2. Update `.gitmodules` to point to your fork
3. Make changes in your fork
4. Submit PRs upstream if applicable

````

---

## Verification Checklist
- [ ] `git submodule status` shows moltbot
- [ ] `external/moltbot/` directory exists with code
- [ ] `.gitmodules` file created
- [ ] Can run `cd external/moltbot && npm install`
- [ ] Moltbot starts: `npm start` (if configured)
- [ ] Update scripts work

---

## Git Commit
```bash
git add .gitmodules external/moltbot external/README.md scripts/
git commit -m "feat(core): add Moltbot as git submodule [T012]"
git push
````

---

## Submodule Commands Reference

```bash
# Clone repo with submodules
git clone --recurse-submodules https://github.com/DuongThanhTaii/UE-Bot.git

# Initialize submodules (after normal clone)
git submodule update --init --recursive

# Update submodule to latest remote
git submodule update --remote external/moltbot

# Check submodule status
git submodule status

# Pull with submodule updates
git pull --recurse-submodules
```

---

## Notes

- Submodule được pin tại specific commit
- Update script để lấy version mới nhất
- Không edit trực tiếp files trong submodule
- Fork nếu cần customization lớn
