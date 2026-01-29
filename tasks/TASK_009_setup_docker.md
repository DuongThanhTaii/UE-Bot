# TASK-009: Setup Docker Configuration

## Task Information

- **ID**: T009
- **Phase**: 1 - Foundation
- **Priority**: Medium
- **Estimated Hours**: 1h
- **Dependencies**: T006, T007

---

## Objective

Tạo Docker configuration cho webapp và bridge-service để dễ dàng deploy và develop.

---

## Acceptance Criteria

- [ ] Dockerfile for webapp
- [ ] Dockerfile for bridge-service
- [ ] docker-compose.yml for full stack
- [ ] docker-compose.dev.yml for development
- [ ] .dockerignore files

---

## Instructions

### Step 1: Create Root .dockerignore

**File: `.dockerignore`**

```
# Dependencies
node_modules
.pnpm-store

# Build outputs
dist
.next
out
.turbo

# Development
.git
.gitignore
*.md
!README.md

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode
.idea
*.swp
*.swo

# Logs
logs
*.log
npm-debug.log*

# Test
coverage
.nyc_output

# OS
.DS_Store
Thumbs.db

# ESP32 (not needed in container)
packages/esp32-firmware
```

### Step 2: Create Webapp Dockerfile

**File: `packages/webapp/Dockerfile`**

```dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/webapp/package.json ./packages/webapp/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/webapp/node_modules ./packages/webapp/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source
COPY . .

# Build shared package first
RUN pnpm --filter @ue-bot/shared build

# Build webapp
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @ue-bot/webapp build

# ============================================
# Stage 3: Runner
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/packages/webapp/public ./packages/webapp/public
COPY --from=builder --chown=nextjs:nodejs /app/packages/webapp/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/webapp/.next/static ./packages/webapp/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "packages/webapp/server.js"]
```

### Step 3: Create Bridge Service Dockerfile

**File: `packages/bridge-service/Dockerfile`**

```dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/bridge-service/package.json ./packages/bridge-service/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/bridge-service/node_modules ./packages/bridge-service/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

COPY . .

# Build shared
RUN pnpm --filter @ue-bot/shared build

# Build bridge-service
RUN pnpm --filter @ue-bot/bridge-service build

# ============================================
# Stage 3: Runner
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 bridge

# Copy built files
COPY --from=builder /app/packages/bridge-service/dist ./dist
COPY --from=builder /app/packages/bridge-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules

USER bridge

EXPOSE 8080

CMD ["node", "dist/index.js"]
```

### Step 4: Create docker-compose.yml (Production)

**File: `docker-compose.yml`**

```yaml
version: "3.8"

services:
  # ===================
  # Webapp (Next.js)
  # ===================
  webapp:
    build:
      context: .
      dockerfile: packages/webapp/Dockerfile
    container_name: ue-bot-webapp
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://bridge:8080
      - NEXT_PUBLIC_WS_URL=ws://bridge:8080
    depends_on:
      - bridge
    networks:
      - ue-bot-network
    healthcheck:
      test:
        ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # ===================
  # Bridge Service
  # ===================
  bridge:
    build:
      context: .
      dockerfile: packages/bridge-service/Dockerfile
    container_name: ue-bot-bridge
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - MOLTBOT_URL=${MOLTBOT_URL:-http://moltbot:3001}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
    networks:
      - ue-bot-network
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # ===================
  # Moltbot (Clawdbot clone)
  # ===================
  moltbot:
    build:
      context: ./external/moltbot
      dockerfile: Dockerfile
    container_name: ue-bot-moltbot
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    env_file:
      - .env
    networks:
      - ue-bot-network
    volumes:
      - moltbot-data:/app/data

  # ===================
  # Redis (Optional - for caching)
  # ===================
  redis:
    image: redis:7-alpine
    container_name: ue-bot-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - ue-bot-network
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

networks:
  ue-bot-network:
    driver: bridge

volumes:
  moltbot-data:
  redis-data:
```

### Step 5: Create docker-compose.dev.yml (Development)

**File: `docker-compose.dev.yml`**

```yaml
version: "3.8"

services:
  # ===================
  # Webapp (Development)
  # ===================
  webapp:
    build:
      context: .
      dockerfile: packages/webapp/Dockerfile.dev
    container_name: ue-bot-webapp-dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:8080
      - NEXT_PUBLIC_WS_URL=ws://localhost:8080
    volumes:
      - ./packages/webapp:/app/packages/webapp
      - ./packages/shared:/app/packages/shared
      - /app/packages/webapp/node_modules
      - /app/packages/webapp/.next
    depends_on:
      - bridge
    networks:
      - ue-bot-dev-network
    command: pnpm --filter @ue-bot/webapp dev

  # ===================
  # Bridge Service (Development)
  # ===================
  bridge:
    build:
      context: .
      dockerfile: packages/bridge-service/Dockerfile.dev
    container_name: ue-bot-bridge-dev
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=development
      - PORT=8080
      - MOLTBOT_URL=http://moltbot:3001
    env_file:
      - .env.local
    volumes:
      - ./packages/bridge-service:/app/packages/bridge-service
      - ./packages/shared:/app/packages/shared
      - /app/packages/bridge-service/node_modules
    networks:
      - ue-bot-dev-network
    command: pnpm --filter @ue-bot/bridge-service dev

  # ===================
  # Redis (Development)
  # ===================
  redis:
    image: redis:7-alpine
    container_name: ue-bot-redis-dev
    ports:
      - "6379:6379"
    networks:
      - ue-bot-dev-network

networks:
  ue-bot-dev-network:
    driver: bridge
```

### Step 6: Create Development Dockerfiles

**File: `packages/webapp/Dockerfile.dev`**

```dockerfile
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/webapp/package.json ./packages/webapp/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies
RUN pnpm install

# Copy source (will be overridden by volume mount)
COPY . .

EXPOSE 3000

CMD ["pnpm", "--filter", "@ue-bot/webapp", "dev"]
```

**File: `packages/bridge-service/Dockerfile.dev`**

```dockerfile
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/bridge-service/package.json ./packages/bridge-service/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies
RUN pnpm install

# Copy source (will be overridden by volume mount)
COPY . .

EXPOSE 8080

CMD ["pnpm", "--filter", "@ue-bot/bridge-service", "dev"]
```

### Step 7: Create .env.example

**File: `.env.example`**

```bash
# ===================
# Environment
# ===================
NODE_ENV=development

# ===================
# Webapp
# ===================
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# ===================
# Bridge Service
# ===================
BRIDGE_PORT=8080
MOLTBOT_URL=http://localhost:3001

# ===================
# Moltbot/Clawdbot
# ===================
MOLTBOT_PORT=3001

# ===================
# AI Services
# ===================
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# ===================
# Redis (Optional)
# ===================
REDIS_URL=redis://localhost:6379

# ===================
# ESP32 Configuration
# ===================
ESP32_BRIDGE_HOST=192.168.1.100
ESP32_BRIDGE_PORT=8080
```

---

## Verification Checklist

- [ ] All Dockerfiles created
- [ ] docker-compose.yml validates: `docker-compose config`
- [ ] docker-compose.dev.yml validates: `docker-compose -f docker-compose.dev.yml config`
- [ ] .dockerignore present
- [ ] .env.example created

---

## Git Commit

```bash
git add .
git commit -m "feat(docker): add Docker configuration for all services [T009]"
git push
```

---

## Useful Commands

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml logs -f webapp
docker-compose -f docker-compose.dev.yml down

# Production build
docker-compose build
docker-compose up -d
docker-compose logs -f

# Clean up
docker-compose down -v
docker system prune -af
```
