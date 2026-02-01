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
COPY packages/cli/package.json ./packages/cli/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/agent-core ./packages/agent-core
COPY packages/cli ./packages/cli
COPY tsconfig.base.json ./

# Build packages
RUN pnpm --filter @ue-bot/shared build && \
    pnpm --filter @ue-bot/agent-core build && \
    pnpm --filter @ue-bot/cli build

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
COPY packages/cli/package.json ./packages/cli/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/agent-core/dist ./packages/agent-core/dist
COPY --from=builder /app/packages/cli/dist ./packages/cli/dist

# Create data and config directories
RUN mkdir -p /app/data /root/.ue-bot

# Set environment
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# Set entrypoint to CLI
ENTRYPOINT ["node", "packages/cli/dist/index.js"]
CMD ["--help"]
