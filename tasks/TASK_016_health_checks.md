# TASK-016: Implement Health Checks

## Task Information

- **ID**: T016
- **Phase**: 2 - Core Integration
- **Priority**: Medium
- **Estimated Hours**: 2h
- **Dependencies**: T015 (Gateway Wrapper Service)

---

## Objective

Implement health check endpoints và monitoring cho toàn bộ hệ thống (Bridge Service, Gateway, Database connections).

---

## Acceptance Criteria

- [ ] Health endpoint `/health` trả về status của tất cả services
- [ ] Readiness endpoint `/ready` cho Kubernetes
- [ ] Liveness endpoint `/live` cho container orchestration
- [ ] Metrics endpoint `/metrics` (optional, for Prometheus)
- [ ] Health check runs periodically
- [ ] Alerts when services unhealthy

---

## Instructions

### Step 1: Create Health Service

Tạo file `packages/bridge-service/src/services/health.service.ts`:

```typescript
import { getGatewayService } from './gateway.service';
import { logger } from '../utils/logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    gateway: ServiceHealth;
    database?: ServiceHealth;
    redis?: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  lastCheck: string;
  error?: string;
}

export class HealthService {
  private startTime: number;
  private lastHealthCheck: HealthStatus | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(intervalMs: number = 30000): void {
    this.checkInterval = setInterval(async () => {
      await this.checkHealth();
    }, intervalMs);

    // Initial check
    void this.checkHealth();
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get full health status
   */
  async checkHealth(): Promise<HealthStatus> {
    const services: HealthStatus['services'] = {
      gateway: await this.checkGateway(),
    };

    // Calculate overall status
    const statuses = Object.values(services).map((s) => s.status);
    let overallStatus: HealthStatus['status'] = 'healthy';

    if (statuses.includes('down')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    const health: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env['npm_package_version'] ?? '0.0.0',
      services,
    };

    this.lastHealthCheck = health;

    if (overallStatus !== 'healthy') {
      logger.warn({ health }, 'System health check failed');
    }

    return health;
  }

  /**
   * Get cached health status (for quick checks)
   */
  getCachedHealth(): HealthStatus | null {
    return this.lastHealthCheck;
  }

  /**
   * Readiness check (for Kubernetes)
   */
  async isReady(): Promise<boolean> {
    const health = await this.checkHealth();
    return health.status !== 'unhealthy';
  }

  /**
   * Liveness check (for container orchestration)
   */
  isAlive(): boolean {
    // Basic check - process is running
    return true;
  }

  // Private methods

  private async checkGateway(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const gateway = getGatewayService();
      const status = gateway.getConnectionStatus();

      if (!status.connected) {
        return {
          status: 'down',
          lastCheck: new Date().toISOString(),
          error: 'Not connected to Gateway',
        };
      }

      const healthy = await gateway.healthCheck();
      const latency = Date.now() - startTime;

      return {
        status: healthy ? 'up' : 'degraded',
        latency,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton
let healthServiceInstance: HealthService | null = null;

export function getHealthService(): HealthService {
  if (!healthServiceInstance) {
    healthServiceInstance = new HealthService();
  }
  return healthServiceInstance;
}
```

### Step 2: Create Health Routes

Tạo file `packages/bridge-service/src/handlers/health.handler.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { getHealthService } from '../services/health.service';

const router = Router();
const healthService = getHealthService();

/**
 * Full health check
 * GET /health
 */
router.get('/health', async (_req: Request, res: Response) => {
  const health = await healthService.checkHealth();

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(health);
});

/**
 * Quick health check (cached)
 * GET /health/quick
 */
router.get('/health/quick', (_req: Request, res: Response) => {
  const health = healthService.getCachedHealth();

  if (!health) {
    res.status(503).json({ status: 'unknown', message: 'No health data available' });
    return;
  }

  const statusCode = health.status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(health);
});

/**
 * Readiness check (Kubernetes)
 * GET /ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const ready = await healthService.isReady();

  if (ready) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

/**
 * Liveness check (Container orchestration)
 * GET /live
 */
router.get('/live', (_req: Request, res: Response) => {
  const alive = healthService.isAlive();

  if (alive) {
    res.status(200).json({ alive: true });
  } else {
    res.status(503).json({ alive: false });
  }
});

export { router as healthRouter };
```

### Step 3: Integrate with Server

Cập nhật `packages/bridge-service/src/server.ts`:

```typescript
import { healthRouter } from './handlers/health.handler';
import { getHealthService } from './services/health.service';

// In setupRoutes():
this.app.use('/', healthRouter);

// In start():
const healthService = getHealthService();
healthService.startPeriodicChecks(30000); // 30 seconds

// In stop():
const healthService = getHealthService();
healthService.stopPeriodicChecks();
```

### Step 4: Add Health Types to Shared

Cập nhật `packages/shared/src/types/common.ts`:

```typescript
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: Record<string, ServiceHealth>;
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  lastCheck: string;
  error?: string;
}

export interface ReadinessResponse {
  ready: boolean;
  reason?: string;
}

export interface LivenessResponse {
  alive: boolean;
}
```

### Step 5: Create Health Check Script

Tạo file `scripts/health-check.ts`:

```typescript
#!/usr/bin/env tsx

const BRIDGE_URL = process.env['BRIDGE_URL'] ?? 'http://localhost:8080';

async function checkHealth() {
  console.log('🏥 Checking system health...\n');

  try {
    // Full health check
    const healthRes = await fetch(`${BRIDGE_URL}/health`);
    const health = await healthRes.json();

    console.log(`Status: ${getStatusEmoji(health.status)} ${health.status.toUpperCase()}`);
    console.log(`Uptime: ${formatUptime(health.uptime)}`);
    console.log(`Version: ${health.version}`);
    console.log('\nServices:');

    for (const [name, service] of Object.entries(health.services)) {
      const s = service as { status: string; latency?: number; error?: string };
      console.log(`  ${name}: ${getStatusEmoji(s.status)} ${s.status}`);
      if (s.latency) {
        console.log(`    Latency: ${s.latency}ms`);
      }
      if (s.error) {
        console.log(`    Error: ${s.error}`);
      }
    }

    // Readiness check
    const readyRes = await fetch(`${BRIDGE_URL}/ready`);
    const ready = await readyRes.json();
    console.log(`\nReadiness: ${ready.ready ? '✅' : '❌'}`);

    // Liveness check
    const liveRes = await fetch(`${BRIDGE_URL}/live`);
    const live = await liveRes.json();
    console.log(`Liveness: ${live.alive ? '✅' : '❌'}`);

    process.exit(health.status === 'unhealthy' ? 1 : 0);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy':
    case 'up':
      return '🟢';
    case 'degraded':
      return '🟡';
    case 'unhealthy':
    case 'down':
      return '🔴';
    default:
      return '⚪';
  }
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

checkHealth();
```

---

## API Reference

### Endpoints

| Endpoint        | Method | Response             | Description          |
| --------------- | ------ | -------------------- | -------------------- |
| `/health`       | GET    | `HealthStatus`       | Full health check    |
| `/health/quick` | GET    | `HealthStatus`       | Cached health        |
| `/ready`        | GET    | `{ ready: boolean }` | Kubernetes readiness |
| `/live`         | GET    | `{ alive: boolean }` | Liveness check       |

### Response Codes

| Code | Meaning             |
| ---- | ------------------- |
| 200  | Healthy or degraded |
| 503  | Unhealthy           |

---

## Verification Checklist

- [ ] HealthService created with all methods
- [ ] Health router endpoints working
- [ ] Periodic health checks running
- [ ] Gateway health check implemented
- [ ] Types added to shared package
- [ ] Health check script created
- [ ] Integrated with server

---

## Related Tasks

- **T015**: Gateway Wrapper Service (prerequisite)
- **T046**: Add logging & monitoring (extends this)
