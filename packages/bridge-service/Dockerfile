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
