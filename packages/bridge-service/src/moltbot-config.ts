/**
 * Moltbot/OpenClaw Gateway Configuration
 *
 * This file configures how bridge-service communicates with OpenClaw Gateway
 */

export interface MoltbotConfig {
  /** Gateway HTTP base URL */
  baseUrl: string;
  /** Gateway WebSocket URL */
  wsUrl: string;
  /** API token for authentication (if auth.mode=token) */
  apiToken?: string;
  /** Request timeout in ms */
  timeout: number;
  /** Number of retry attempts */
  retryAttempts: number;
  /** Delay between retries in ms */
  retryDelay: number;
}

export const moltbotConfig: MoltbotConfig = {
  baseUrl: process.env['MOLTBOT_URL'] ?? 'http://localhost:18789',
  wsUrl: process.env['MOLTBOT_WS_URL'] ?? 'ws://localhost:18789',
  apiToken: process.env['MOLTBOT_API_TOKEN'],
  timeout: 60000, // 60 seconds for AI responses
  retryAttempts: 3,
  retryDelay: 1000,
};

export interface MoltbotEndpoints {
  /** Health check endpoint */
  health: string;
  /** WebSocket endpoint for chat */
  websocket: string;
  /** Control UI endpoint */
  controlUI: string;
  /** Agent status endpoint */
  agentStatus: string;
}

export const getMoltbotEndpoints = (config: MoltbotConfig): MoltbotEndpoints => ({
  health: `${config.baseUrl}/health`,
  websocket: config.wsUrl,
  controlUI: `${config.baseUrl}/`,
  agentStatus: `${config.baseUrl}/api/agent/status`,
});
