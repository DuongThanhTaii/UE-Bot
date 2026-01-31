import {
  getMoltbotEndpoints,
  moltbotConfig,
  type MoltbotConfig,
  type MoltbotEndpoints,
} from '../moltbot-config';

/**
 * MoltbotClient provides a simple HTTP interface to OpenClaw Gateway
 * Note: For real-time chat, use WebChatClient instead (WebSocket-based)
 */
export class MoltbotClient {
  private config: MoltbotConfig;
  private endpoints: MoltbotEndpoints;

  constructor(config?: Partial<MoltbotConfig>) {
    this.config = { ...moltbotConfig, ...config };
    this.endpoints = getMoltbotEndpoints(this.config);
  }

  /**
   * Check if Gateway is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.endpoints.health, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get agent status from Gateway
   */
  async getAgentStatus(): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(this.endpoints.agentStatus, {
        method: 'GET',
        headers: {
          ...(this.config.apiToken && {
            Authorization: `Bearer ${this.config.apiToken}`,
          }),
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return null;
      return response.json() as Promise<Record<string, unknown>>;
    } catch {
      return null;
    }
  }

  /**
   * Get WebSocket URL for chat
   */
  getWebSocketUrl(): string {
    return this.endpoints.websocket;
  }

  /**
   * Get Control UI URL
   */
  getControlUIUrl(): string {
    return this.endpoints.controlUI;
  }
}

// Singleton instance
export const moltbotClient = new MoltbotClient();
