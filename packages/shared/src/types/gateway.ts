import { z } from 'zod';

// ============ Interfaces ============
export interface GatewayConfig {
  host: string;
  port: number;
  token?: string;
  secure: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
}

export interface GatewayMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
  sessionId?: string;
}

export interface SessionInfo {
  id: string;
  channel: string;
  model: string;
  tokensUsed: number;
  createdAt: Date;
  lastActivity: Date;
}

export interface GatewayStatus {
  connected: boolean;
  uptime: number;
  sessionsCount: number;
  version: string;
}

// WebSocket message types
export type WSMessageType =
  | 'ping'
  | 'pong'
  | 'auth'
  | 'auth.success'
  | 'auth.error'
  | 'message'
  | 'message.ack'
  | 'session.create'
  | 'session.end'
  | 'error';

// ============ Zod Schemas ============
export const GatewayConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  token: z.string().optional(),
  secure: z.boolean(),
  reconnectAttempts: z.number().int().min(0).default(5),
  reconnectDelay: z.number().int().min(100).default(1000),
});

export const GatewayMessageSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.unknown(),
  timestamp: z.number(),
  sessionId: z.string().optional(),
});
