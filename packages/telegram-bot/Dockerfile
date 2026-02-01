# ===================
# Build Stage
# ===================
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/agent-core/package.json ./packages/agent-core/
COPY packages/telegram-bot/package.json ./packages/telegram-bot/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/agent-core ./packages/agent-core
COPY packages/telegram-bot ./packages/telegram-bot
COPY tsconfig.base.json ./

# Build packages
RUN pnpm --filter @ue-bot/shared build && \
    pnpm --filter @ue-bot/agent-core build && \
    pnpm --filter @ue-bot/telegram-bot build

# ===================
# Production Stage
# ===================
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/agent-core/package.json ./packages/agent-core/
COPY packages/telegram-bot/package.json ./packages/telegram-bot/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/agent-core/dist ./packages/agent-core/dist
COPY --from=builder /app/packages/telegram-bot/dist ./packages/telegram-bot/dist

# Create data directory
RUN mkdir -p /app/data

# Set environment
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# Run the bot
CMD ["node", "packages/telegram-bot/dist/index.js"]
