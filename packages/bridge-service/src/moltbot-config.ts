/**
 * Moltbot Integration Configuration
 *
 * This file configures how bridge-service communicates with Moltbot
 */

export interface MoltbotConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export const moltbotConfig: MoltbotConfig = {
  baseUrl: process.env.MOLTBOT_URL || "http://localhost:3001",
  apiKey: process.env.MOLTBOT_API_KEY,
  timeout: 30000, // 30 seconds for AI responses
  retryAttempts: 3,
  retryDelay: 1000,
};

export const getMoltbotEndpoints = (config: MoltbotConfig) => ({
  chat: `${config.baseUrl}/api/chat`,
  health: `${config.baseUrl}/health`,
  conversation: `${config.baseUrl}/api/conversation`,
});
