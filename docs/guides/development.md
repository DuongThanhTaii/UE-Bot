# Development Guide

## Development Environment Setup

### Required Tools

1. **Node.js 22+**: Use nvm or fnm for version management
2. **pnpm 9+**: Fast, disk-efficient package manager
3. **VS Code**: Recommended IDE with extensions
4. **Git**: Version control

### Recommended VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- GitLens
- PlatformIO IDE (for ESP32)

## Development Workflow

### 1. Start Development Servers

```bash
# Start all services in watch mode
pnpm dev

# Or start individually
pnpm --filter @ue-bot/webapp dev
pnpm --filter @ue-bot/bridge-service dev
```

### 2. Code Changes

- Make changes in `packages/` directory
- Hot reload will automatically refresh
- Check terminal for errors

### 3. Before Committing

```bash
# Run all checks
pnpm lint
pnpm typecheck
pnpm test

# Format code
pnpm format
```

## Package Development

### Shared Package (@ue-bot/shared)

Location: `packages/shared/`

Build after changes:

```bash
pnpm --filter @ue-bot/shared build
```

### Webapp (@ue-bot/webapp)

Location: `packages/webapp/`

```bash
# Development
pnpm --filter @ue-bot/webapp dev

# Build
pnpm --filter @ue-bot/webapp build

# Start production
pnpm --filter @ue-bot/webapp start
```

### Bridge Service (@ue-bot/bridge-service)

Location: `packages/bridge-service/`

```bash
# Development
pnpm --filter @ue-bot/bridge-service dev

# Build
pnpm --filter @ue-bot/bridge-service build
```

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### E2E Tests (Coming Soon)

```bash
pnpm test:e2e
```

## Code Style

### TypeScript Guidelines

- Use `interface` for object shapes
- Use `type` for unions and primitives
- Prefer `const` over `let`
- Always define return types for functions

### Component Guidelines

- Use functional components with hooks
- Keep components small and focused
- Use composition over inheritance
- Co-locate related files

### Commit Message Format

```
<type>(<scope>): <description> [TASK-XX]

Types: feat, fix, docs, style, refactor, test, chore
Scope: webapp, bridge, shared, esp32, ci, docker
```

Example:

```
feat(webapp): add voice control component [TASK-15]
```

## Debugging

### VS Code Launch Configurations

```json
{
  "configurations": [
    {
      "name": "Debug Bridge Service",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/packages/bridge-service",
      "program": "${workspaceFolder}/packages/bridge-service/src/index.ts",
      "runtimeArgs": ["-r", "ts-node/register"]
    }
  ]
}
```

### Logging

Use the shared logger:

```typescript
import { logger } from '@ue-bot/shared';

logger.info('Message');
logger.error('Error', { details: error });
```

## Troubleshooting

### Common Issues

**Module not found errors:**

```bash
# Rebuild dependencies
pnpm install --force
pnpm --filter @ue-bot/shared build
```

**Type errors after changes:**

```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server"
```

**Port already in use:**

```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>
```
