/**
 * Shared frontend type definitions for UE-Bot webapp
 */

// ============================================
// Auth Types
// ============================================

export interface User {
  id?: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  error: string;
}

// ============================================
// Device Types
// ============================================

export type DeviceStatus = 'online' | 'offline' | 'error';

export interface Device {
  id: string;
  userId: string;
  name: string;
  macAddress?: string;
  status: DeviceStatus;
  firmwareVersion?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Settings Types
// ============================================

export type Settings = Record<string, string>;

// ============================================
// Chat / Agent Types
// ============================================

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AgentSession {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

// ============================================
// Health Types
// ============================================

export interface HealthStatus {
  status: string;
  timestamp: string;
  service: string;
}
