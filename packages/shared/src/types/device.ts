import { z } from 'zod';

import type { Timestamped } from './common';

// ============ Enums ============
export const DeviceStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  ERROR: 'error',
  CONNECTING: 'connecting',
} as const;

export type DeviceStatus = (typeof DeviceStatus)[keyof typeof DeviceStatus];

// ============ Interfaces ============
export interface DeviceConfig {
  wakeWord: string;
  language: string;
  volume: number;
  sensitivity: number;
  ledEnabled: boolean;
  autoReconnect: boolean;
}

export interface Device extends Timestamped {
  id: string;
  name: string;
  macAddress: string;
  ipAddress: string;
  status: DeviceStatus;
  lastSeen: Date;
  firmwareVersion: string;
  config: DeviceConfig;
}

export interface DeviceCommand {
  deviceId: string;
  command: 'start' | 'stop' | 'status' | 'config' | 'restart' | 'ota';
  payload?: Record<string, unknown>;
}

export interface DeviceEvent {
  type: 'connected' | 'disconnected' | 'error' | 'audio' | 'command';
  deviceId: string;
  timestamp: number;
  data?: unknown;
}

// ============ Zod Schemas ============
export const DeviceConfigSchema = z.object({
  wakeWord: z.string().min(1).max(50),
  language: z.string().length(2),
  volume: z.number().min(0).max(100),
  sensitivity: z.number().min(0).max(100),
  ledEnabled: z.boolean(),
  autoReconnect: z.boolean(),
});

export const DeviceCommandSchema = z.object({
  deviceId: z.string().uuid(),
  command: z.enum(['start', 'stop', 'status', 'config', 'restart', 'ota']),
  payload: z.record(z.unknown()).optional(),
});

export const DeviceEventSchema = z.object({
  type: z.enum(['connected', 'disconnected', 'error', 'audio', 'command']),
  deviceId: z.string(),
  timestamp: z.number(),
  data: z.unknown().optional(),
});
