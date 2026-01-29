# TASK-002: Setup pnpm Workspace

## Task Information

- **ID**: T002
- **Phase**: 1 - Foundation
- **Priority**: High
- **Estimated Hours**: 1h
- **Dependencies**: T001

---

## Objective

Cấu hình pnpm workspace để quản lý monorepo với multiple packages.

---

## Acceptance Criteria

- [ ] pnpm-workspace.yaml được tạo
- [ ] Root package.json với scripts chung
- [ ] Có thể chạy `pnpm install` không lỗi
- [ ] Workspace packages được nhận diện

---

## Instructions

### Step 1: Create pnpm-workspace.yaml

Tạo file ở root:

```yaml
packages:
  - "packages/*"
  - "skills/*"
```

### Step 2: Create Root package.json

```json
{
  "name": "ue-bot",
  "version": "0.1.0",
  "private": true,
  "description": "Universal ESP32 Bot - Moltbot clone with voice control",
  "author": "DuongThanhTai",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/DuongThanhTaii/UE-Bot.git"
  },
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "dev:webapp": "pnpm --filter @ue-bot/webapp dev",
    "dev:bridge": "pnpm --filter @ue-bot/bridge-service dev",
    "build": "pnpm -r build",
    "build:webapp": "pnpm --filter @ue-bot/webapp build",
    "build:bridge": "pnpm --filter @ue-bot/bridge-service build",
    "test": "pnpm -r test",
    "test:unit": "pnpm -r test:unit",
    "test:e2e": "pnpm -r test:e2e",
    "lint": "pnpm -r lint",
    "lint:fix": "pnpm -r lint:fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "typecheck": "pnpm -r typecheck",
    "clean": "pnpm -r clean && rimraf node_modules",
    "prepare": "husky || true"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.2.0",
    "rimraf": "^5.0.0",
    "typescript": "^5.5.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx,json,md}": ["prettier --write"]
  }
}
```

### Step 3: Create .npmrc

```ini
# pnpm configuration
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=false

# Package hoisting patterns
public-hoist-pattern[]=*types*
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*

# Registry (default npm)
registry=https://registry.npmjs.org/
```

### Step 4: Create .nvmrc

```
22
```

### Step 5: Verify Installation

```bash
# Verify pnpm version
pnpm --version

# Install dependencies
pnpm install

# List workspaces
pnpm ls -r --depth -1
```

---

## Verification Checklist

- [ ] pnpm-workspace.yaml exists and valid
- [ ] package.json has all required scripts
- [ ] `pnpm install` runs without errors
- [ ] `pnpm ls -r` shows workspace packages (sẽ empty cho đến khi tạo packages)

---

## Git Commit

```bash
git add .
git commit -m "chore(workspace): setup pnpm workspace [T002]"
git push
```

---

## Notes

- pnpm version 9.x required
- Node.js 22+ required
- Workspace packages chưa được tạo ở bước này
