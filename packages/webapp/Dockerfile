# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:25-alpine AS deps

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
FROM node:25-alpine AS builder

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
FROM node:25-alpine AS runner

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
