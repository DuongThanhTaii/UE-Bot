/**
 * Health Check Service
 * Monitors health of all system components
 */

import { getMoltbotEndpoints, moltbotConfig } from '../moltbot-config';
import { getGatewayService } from './gateway.service';

// ============================================
// Types
// ============================================

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  lastCheck: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    gateway: ServiceHealth;
    bridgeService: ServiceHealth;
  };
}

export interface ReadinessStatus {
  ready: boolean;
  checks: {
    gateway: boolean;
    dependencies: boolean;
  };
}

export interface LivenessStatus {
  alive: boolean;
  pid: number;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

// ============================================
// Health Service
// ============================================

export class HealthService {
  private startTime: number;
  private lastHealthCheck: HealthStatus | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private version: string;

  constructor() {
    this.startTime = Date.now();
    this.version = process.env['npm_package_version'] || '0.1.0';
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(intervalMs: number = 30000): void {
    console.log(`[HealthService] Starting periodic checks every ${intervalMs}ms`);

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
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Check Gateway
    const gatewayHealth = await this.checkGateway();

    // Check Bridge Service itself
    const bridgeHealth = this.checkBridgeService();

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (gatewayHealth.status === 'down') {
      status = 'unhealthy';
    } else if (gatewayHealth.status === 'degraded') {
      status = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp,
      uptime,
      version: this.version,
      services: {
        gateway: gatewayHealth,
        bridgeService: bridgeHealth,
      },
    };

    this.lastHealthCheck = healthStatus;

    // Emit events based on status
    if (status === 'unhealthy') {
      console.error('[HealthService] System unhealthy:', healthStatus);
    } else if (status === 'degraded') {
      console.warn('[HealthService] System degraded:', healthStatus);
    }

    return healthStatus;
  }

  /**
   * Get readiness status (for Kubernetes)
   */
  async checkReadiness(): Promise<ReadinessStatus> {
    const gatewayService = getGatewayService();
    const gatewayConnected = gatewayService.isConnected();

    // Check if Gateway HTTP endpoint is accessible
    let gatewayReady = false;
    try {
      const endpoints = getMoltbotEndpoints(moltbotConfig);
      const response = await fetch(endpoints.health, {
        signal: AbortSignal.timeout(5000),
      });
      gatewayReady = response.ok;
    } catch {
      gatewayReady = false;
    }

    return {
      ready: gatewayConnected || gatewayReady,
      checks: {
        gateway: gatewayConnected || gatewayReady,
        dependencies: true, // Add more checks as needed
      },
    };
  }

  /**
   * Get liveness status (for container orchestration)
   */
  checkLiveness(): LivenessStatus {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;

    return {
      alive: true,
      pid: process.pid,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      memory: {
        used: usedMem,
        total: totalMem,
        percentage: Math.round((usedMem / totalMem) * 100),
      },
    };
  }

  /**
   * Get last cached health check
   */
  getLastHealthCheck(): HealthStatus | null {
    return this.lastHealthCheck;
  }

  /**
   * Get uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  // ============================================
  // Private Methods
  // ============================================

  private async checkGateway(): Promise<ServiceHealth> {
    const gatewayService = getGatewayService();
    const startTime = Date.now();

    try {
      // Check WebSocket connection
      const wsConnected = gatewayService.isConnected();

      // Check HTTP health endpoint
      const endpoints = getMoltbotEndpoints(moltbotConfig);
      const response = await fetch(endpoints.health, {
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = (await response.json()) as { status?: string; version?: string };
        return {
          status: wsConnected ? 'up' : 'degraded',
          latency,
          lastCheck: new Date().toISOString(),
          details: {
            wsConnected,
            httpStatus: response.status,
            gatewayVersion: data.version,
          },
        };
      }

      return {
        status: 'degraded',
        latency,
        lastCheck: new Date().toISOString(),
        error: `HTTP ${response.status}`,
        details: { wsConnected },
      };
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private checkBridgeService(): ServiceHealth {
    return {
      status: 'up',
      lastCheck: new Date().toISOString(),
      details: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
      },
    };
  }
}

// ============================================
// Singleton Instance
// ============================================

let healthServiceInstance: HealthService | null = null;

export function getHealthService(): HealthService {
  if (!healthServiceInstance) {
    healthServiceInstance = new HealthService();
  }
  return healthServiceInstance;
}
