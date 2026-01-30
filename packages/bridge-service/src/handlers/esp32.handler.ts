import type { Device, DeviceCommand, DeviceStatus } from '@ue-bot/shared';
import { v4 as uuidv4 } from 'uuid';
import type { WebSocket } from 'ws';

import { logger } from '../utils/logger';

interface ConnectedDevice {
  ws: WebSocket;
  device: Device;
  lastPing: number;
}

interface DeviceMessage {
  type: string;
  data: unknown;
}

export class ESP32Handler {
  private devices = new Map<string, ConnectedDevice>();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPingInterval();
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      this.devices.forEach((connected, id) => {
        if (now - connected.lastPing > 60000) {
          logger.warn({ deviceId: id }, 'Device timeout, disconnecting');
          connected.ws.close();
          this.devices.delete(id);
        } else if (connected.ws.readyState === connected.ws.OPEN) {
          connected.ws.ping();
        }
      });
    }, 30000);
  }

  public handleConnection(ws: WebSocket, deviceId: string): void {
    const device: Device = {
      id: deviceId || uuidv4(),
      name: `ESP32-${deviceId.slice(-4)}`,
      macAddress: '',
      ipAddress: '',
      status: 'online' as DeviceStatus,
      lastSeen: new Date(),
      firmwareVersion: '0.0.0',
      config: {
        wakeWord: 'hey bot',
        language: 'en',
        volume: 70,
        sensitivity: 50,
        ledEnabled: true,
        autoReconnect: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.devices.set(device.id, {
      ws,
      device,
      lastPing: Date.now(),
    });

    // Send welcome message
    this.sendMessage(device.id, {
      type: 'connected',
      deviceId: device.id,
      timestamp: Date.now(),
    });

    // Handle messages
    ws.on('message', (data) => {
      this.handleMessage(device.id, data);
    });

    ws.on('pong', () => {
      const connected = this.devices.get(device.id);
      if (connected) {
        connected.lastPing = Date.now();
        connected.device.lastSeen = new Date();
      }
    });
  }

  public handleDisconnection(deviceId: string): void {
    const connected = this.devices.get(deviceId);
    if (connected) {
      connected.device.status = 'offline';
      this.devices.delete(deviceId);
    }
  }

  private handleMessage(deviceId: string, data: unknown): void {
    try {
      const message = JSON.parse(data as string) as DeviceMessage;
      logger.debug({ deviceId, message }, 'Received message from ESP32');

      switch (message.type) {
        case 'audio':
          this.handleAudioData(deviceId, message.data);
          break;
        case 'status':
          this.handleStatusUpdate(deviceId, message.data as Partial<Device>);
          break;
        case 'config':
          this.handleConfigUpdate(deviceId, message.data);
          break;
        default:
          logger.warn({ deviceId, type: message.type }, 'Unknown message type');
      }
    } catch (error) {
      logger.error({ deviceId, error }, 'Failed to parse message');
    }
  }

  private handleAudioData(deviceId: string, audioData: unknown): void {
    logger.debug({ deviceId, size: (audioData as Buffer).length }, 'Received audio data');
    // TODO: Process audio with STT service
  }

  private handleStatusUpdate(deviceId: string, status: Partial<Device>): void {
    const connected = this.devices.get(deviceId);
    if (connected) {
      Object.assign(connected.device, status);
      connected.device.updatedAt = new Date();
    }
  }

  private handleConfigUpdate(deviceId: string, config: unknown): void {
    const connected = this.devices.get(deviceId);
    if (connected) {
      Object.assign(connected.device.config, config);
      connected.device.updatedAt = new Date();
    }
  }

  public sendMessage(deviceId: string, message: unknown): boolean {
    const connected = this.devices.get(deviceId);
    if (!connected || connected.ws.readyState !== connected.ws.OPEN) {
      return false;
    }

    connected.ws.send(JSON.stringify(message));
    return true;
  }

  public sendCommand(command: DeviceCommand): boolean {
    return this.sendMessage(command.deviceId, {
      type: 'command',
      command: command.command,
      payload: command.payload,
      timestamp: Date.now(),
    });
  }

  public getConnectedDevices(): Device[] {
    return Array.from(this.devices.values()).map((c) => c.device);
  }

  public getDevice(id: string): Device | undefined {
    return this.devices.get(id)?.device;
  }

  public destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.devices.forEach((connected) => {
      connected.ws.close();
    });
    this.devices.clear();
  }
}
