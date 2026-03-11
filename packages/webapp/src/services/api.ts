/**
 * API service layer - centralized HTTP client for all backend calls
 */

import type { AgentSession, AuthResponse, Device, HealthStatus, Settings } from '@/types';

class ApiClient {
  private baseUrl = '';

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options?.headers) {
      const incoming = options.headers as Record<string, string>;
      Object.assign(headers, incoming);
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const body: { error?: string } = await res.json().catch(() => ({}));
      throw new ApiError(body.error ?? `Request failed: ${res.status}`, res.status);
    }

    return res.json() as Promise<T>;
  }

  // ========== Auth ==========

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  async logout(): Promise<void> {
    await this.request('/api/auth/logout', { method: 'POST' });
  }

  async getMe(token: string): Promise<{ user: { id: string; email: string; name: string } }> {
    return this.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // ========== Devices ==========

  async getDevices(): Promise<{ devices: Device[] }> {
    return this.request('/api/devices');
  }

  async createDevice(name: string, macAddress?: string): Promise<{ device: Device }> {
    return this.request('/api/devices', {
      method: 'POST',
      body: JSON.stringify({ name, macAddress }),
    });
  }

  // ========== Settings ==========

  async getSettings(): Promise<{ settings: Settings }> {
    return this.request('/api/settings');
  }

  async saveSettings(settings: Settings): Promise<{ settings: Settings }> {
    return this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
  }

  // ========== Health ==========

  async getHealth(): Promise<HealthStatus> {
    return this.request('/api/health');
  }

  // ========== Agent Sessions ==========

  async getSessions(): Promise<{ sessions: AgentSession[] }> {
    return this.request('/api/agent/sessions');
  }

  async createSession(title?: string): Promise<{ session: AgentSession }> {
    return this.request('/api/agent/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async deleteSession(id: string): Promise<void> {
    await this.request(`/api/agent/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient();
