/**
 * ESP32 Handler - WebSocket Connection Manager
 *
 * Quản lý kết nối WebSocket với các thiết bị ESP32
 * Hỗ trợ:
 * - Handshake và authentication
 * - Audio streaming (upload từ ESP32)
 * - Audio playback (download từ server)
 * - Device commands và config
 * - Health monitoring với ping/pong
 */

import type { Device, DeviceCommand, DeviceStatus } from '@ue-bot/shared';
import type { Server as HTTPServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';

import type {
  AudioChunkMessage,
  AudioEndMessage,
  AudioFormat,
  AudioPlayChunkMessage,
  AudioPlayMessage,
  AudioStartMessage,
  AudioStreamState,
  BinaryMessageType,
  ClientMessage,
  CommandMessage,
  DeviceCapabilities,
  DeviceConfigMessage,
  ErrorMessage,
  HandshakeAckMessage,
  HandshakeMessage,
  ServerMessage,
  StatusMessage,
  TextResponseMessage,
} from '../types/esp32-protocol';
import { BINARY_HEADER_SIZE, BINARY_MAGIC } from '../types/esp32-protocol';
import { eventBus } from '../utils/event-bus';
import { logger } from '../utils/logger';

// ============ Interfaces ============

interface ESP32HandlerOptions {
  path?: string;
  server?: HTTPServer;
  pingInterval?: number;
  pingTimeout?: number;
}

interface ConnectedDevice {
  ws: WebSocket;
  device: Device;
  sessionId: string;
  lastPing: number;
  capabilities?: DeviceCapabilities;
  activeStream?: AudioStreamState;
}

// ============ ESP32 Handler Class ============

export class ESP32Handler {
  private devices = new Map<string, ConnectedDevice>();
  private streams = new Map<string, AudioStreamState>();
  private audioBuffers = new Map<string, Buffer[]>();
  private pingIntervalTimer: NodeJS.Timeout | null = null;
  private wss: WebSocketServer | null = null;
  private options: ESP32HandlerOptions;

  constructor(options: ESP32HandlerOptions = {}) {
    this.options = {
      path: options.path || '/ws/esp32',
      pingInterval: options.pingInterval || 30000,
      pingTimeout: options.pingTimeout || 60000,
      ...options,
    };

    // Create WebSocket server if HTTP server provided
    if (options.server) {
      this.wss = new WebSocketServer({
        server: options.server,
        path: this.options.path,
      });

      this.wss.on('connection', (ws, req) => {
        const deviceId = req.url?.split('?id=')[1] ?? uuidv4();
        logger.info({ deviceId }, 'ESP32 device connected');
        this.handleConnection(ws, deviceId);
      });
    }

    this.startPingInterval();
  }

  // ============ Connection Management ============

  private startPingInterval(): void {
    this.pingIntervalTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.options.pingTimeout || 60000;
      this.devices.forEach((connected, id) => {
        // Timeout after pingTimeout without pong
        if (now - connected.lastPing > timeout) {
          logger.warn({ deviceId: id }, 'Device timeout, disconnecting');
          this.closeConnection(id, 'timeout');
        } else if (connected.ws.readyState === connected.ws.OPEN) {
          this.sendPing(id);
        }
      });
    }, this.options.pingInterval || 30000);
  }

  public handleConnection(ws: WebSocket, deviceId: string): void {
    const sessionId = uuidv4();
    const device: Device = {
      id: deviceId || uuidv4(),
      name: `ESP32-${deviceId.slice(-4)}`,
      macAddress: '',
      ipAddress: '',
      status: 'connecting' as DeviceStatus,
      lastSeen: new Date(),
      firmwareVersion: '0.0.0',
      config: {
        wakeWord: 'hey bot',
        language: 'vi',
        volume: 70,
        sensitivity: 50,
        ledEnabled: true,
        autoReconnect: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const connected: ConnectedDevice = {
      ws,
      device,
      sessionId,
      lastPing: Date.now(),
    };

    this.devices.set(device.id, connected);
    logger.info({ deviceId: device.id, sessionId }, 'ESP32 connection initiated');

    // Setup message handlers
    ws.on('message', (data, isBinary) => {
      this.handleRawMessage(device.id, data, isBinary);
    });

    ws.on('pong', () => {
      this.handlePong(device.id);
    });

    ws.on('error', (error) => {
      this.handleError(device.id, error);
    });

    // Wait for handshake (don't send welcome until handshake received)
    // Set timeout for handshake
    setTimeout(() => {
      const conn = this.devices.get(device.id);
      if (conn && conn.device.status === 'connecting') {
        logger.warn({ deviceId: device.id }, 'Handshake timeout');
        this.closeConnection(device.id, 'handshake_timeout');
      }
    }, 10000);
  }

  public handleDisconnection(deviceId: string): void {
    this.closeConnection(deviceId, 'client_disconnect');
  }

  private closeConnection(deviceId: string, reason: string): void {
    const connected = this.devices.get(deviceId);
    if (connected) {
      // Cancel active stream if any
      if (connected.activeStream) {
        this.cancelAudioStream(deviceId, connected.activeStream.streamId);
      }

      connected.device.status = 'offline';

      // Close WebSocket if still open
      if (connected.ws.readyState === connected.ws.OPEN) {
        connected.ws.close();
      }

      this.devices.delete(deviceId);

      // Emit event
      eventBus.emit('device:disconnected', {
        deviceId,
        reason,
        timestamp: Date.now(),
      });

      logger.info({ deviceId, reason }, 'ESP32 disconnected');
    }
  }

  // ============ Message Handling ============

  private handleRawMessage(deviceId: string, data: RawData, isBinary: boolean): void {
    try {
      if (isBinary) {
        this.handleBinaryMessage(deviceId, data as Buffer);
      } else {
        const message = JSON.parse(data.toString()) as ClientMessage;
        this.handleJsonMessage(deviceId, message);
      }
    } catch (error) {
      logger.error({ deviceId, error }, 'Failed to parse message');
      this.sendError(deviceId, 'PARSE_ERROR', 'Failed to parse message');
    }
  }

  private handleJsonMessage(deviceId: string, message: ClientMessage): void {
    const connected = this.devices.get(deviceId);
    if (!connected) {
      logger.warn({ deviceId }, 'Message from unknown device');
      return;
    }

    logger.debug({ deviceId, type: message.type }, 'Received JSON message');

    switch (message.type) {
      case 'handshake':
        this.handleHandshake(deviceId, message as HandshakeMessage);
        break;
      case 'audio_start':
        this.handleAudioStart(deviceId, message as AudioStartMessage);
        break;
      case 'audio_chunk':
        // Audio data comes via binary, this is just metadata
        this.handleAudioChunkMeta(deviceId, message as AudioChunkMessage);
        break;
      case 'audio_end':
        this.handleAudioEnd(deviceId, message as AudioEndMessage);
        break;
      case 'status':
        this.handleStatusUpdate(deviceId, message as StatusMessage);
        break;
      case 'pong':
        this.handlePong(deviceId);
        break;
      case 'error':
        this.handleDeviceError(deviceId, message as ErrorMessage);
        break;
      default: {
        // Handle unknown message types
        const unknownMessage = message as { type: string };
        logger.warn({ deviceId, type: unknownMessage.type }, 'Unknown message type');
      }
    }
  }

  private handleBinaryMessage(deviceId: string, data: Buffer): void {
    // Parse binary header
    if (data.length < BINARY_HEADER_SIZE) {
      logger.warn({ deviceId, size: data.length }, 'Binary message too short');
      return;
    }

    const magic = data.readUInt16BE(0);
    if (magic !== BINARY_MAGIC) {
      logger.warn({ deviceId, magic }, 'Invalid binary magic number');
      return;
    }

    const type = data.readUInt16BE(2) as BinaryMessageType;
    const length = data.readUInt32BE(4);

    if (data.length < BINARY_HEADER_SIZE + length) {
      logger.warn(
        { deviceId, expected: length, actual: data.length - BINARY_HEADER_SIZE },
        'Binary message incomplete'
      );
      return;
    }

    const payload = data.subarray(BINARY_HEADER_SIZE, BINARY_HEADER_SIZE + length);

    switch (type) {
      case 0x01: // AUDIO_DATA
        this.handleAudioData(deviceId, payload);
        break;
      default:
        logger.warn({ deviceId, type }, 'Unknown binary message type');
    }
  }

  // ============ Handshake ============

  private handleHandshake(deviceId: string, message: HandshakeMessage): void {
    const connected = this.devices.get(deviceId);
    if (!connected) return;

    // Update device info
    connected.device.macAddress = message.macAddress;
    connected.device.firmwareVersion = message.firmwareVersion;
    connected.device.status = 'online';
    connected.device.lastSeen = new Date();
    connected.capabilities = message.capabilities;

    // Send handshake ack
    const ack: HandshakeAckMessage = {
      type: 'handshake_ack',
      timestamp: Date.now(),
      success: true,
      sessionId: connected.sessionId,
      serverTime: Date.now(),
      config: {
        type: 'config',
        timestamp: Date.now(),
        ...connected.device.config,
        vadThreshold: 0.5,
        silenceTimeout: 2000,
      },
    };

    this.sendMessage(deviceId, ack);

    // Emit event
    eventBus.emit('device:connected', {
      deviceId,
      timestamp: Date.now(),
    });

    logger.info(
      {
        deviceId,
        macAddress: message.macAddress,
        firmwareVersion: message.firmwareVersion,
        capabilities: message.capabilities,
      },
      'ESP32 handshake complete'
    );
  }

  // ============ Audio Streaming ============

  private handleAudioStart(deviceId: string, message: AudioStartMessage): void {
    const connected = this.devices.get(deviceId);
    if (!connected) return;

    // Cancel any existing stream
    if (connected.activeStream) {
      this.cancelAudioStream(deviceId, connected.activeStream.streamId);
    }

    // Create new stream state
    const streamState: AudioStreamState = {
      streamId: message.streamId,
      deviceId,
      format: message.format,
      sampleRate: message.sampleRate,
      channels: message.channels,
      startTime: Date.now(),
      chunks: 0,
      bytes: 0,
      status: 'active',
    };

    connected.activeStream = streamState;
    this.streams.set(message.streamId, streamState);
    this.audioBuffers.set(message.streamId, []);

    // Emit event
    eventBus.emit('audio:start', {
      deviceId,
      streamId: message.streamId,
      format: message.format,
      sampleRate: message.sampleRate,
    });

    logger.info(
      {
        deviceId,
        streamId: message.streamId,
        format: message.format,
        sampleRate: message.sampleRate,
        reason: message.reason,
      },
      'Audio stream started'
    );
  }

  private handleAudioChunkMeta(_deviceId: string, message: AudioChunkMessage): void {
    // This is just metadata, actual data comes via binary
    const stream = this.streams.get(message.streamId);
    if (stream) {
      stream.chunks = message.sequenceNumber + 1;
    }
  }

  private handleAudioData(deviceId: string, audioData: Buffer): void {
    const connected = this.devices.get(deviceId);
    if (!connected?.activeStream) {
      logger.warn({ deviceId }, 'Received audio data without active stream');
      return;
    }

    const stream = connected.activeStream;
    const buffers = this.audioBuffers.get(stream.streamId);

    if (buffers) {
      buffers.push(audioData);
      stream.bytes += audioData.length;
      stream.chunks++;

      // Emit chunk event
      eventBus.emit('audio:chunk', {
        deviceId,
        streamId: stream.streamId,
        chunk: audioData,
        sequenceNumber: stream.chunks,
      });

      logger.debug(
        {
          deviceId,
          streamId: stream.streamId,
          chunkSize: audioData.length,
          totalChunks: stream.chunks,
          totalBytes: stream.bytes,
        },
        'Audio chunk received'
      );
    }
  }

  private handleAudioEnd(deviceId: string, message: AudioEndMessage): void {
    const connected = this.devices.get(deviceId);
    if (!connected?.activeStream) return;

    const stream = connected.activeStream;
    const buffers = this.audioBuffers.get(stream.streamId);

    stream.endTime = Date.now();
    stream.status = 'completed';
    connected.activeStream = undefined;

    // Combine all audio chunks
    const completeAudio = buffers ? Buffer.concat(buffers) : Buffer.alloc(0);

    // Clean up
    this.audioBuffers.delete(stream.streamId);

    // Emit events
    eventBus.emit('audio:end', {
      deviceId,
      streamId: stream.streamId,
      totalChunks: stream.chunks,
      totalBytes: stream.bytes,
      reason: message.reason,
    });

    eventBus.emit('audio:complete', {
      deviceId,
      streamId: stream.streamId,
      audioBuffer: completeAudio,
    });

    logger.info(
      {
        deviceId,
        streamId: stream.streamId,
        totalChunks: stream.chunks,
        totalBytes: stream.bytes,
        duration: stream.endTime - stream.startTime,
        reason: message.reason,
      },
      'Audio stream completed'
    );
  }

  private cancelAudioStream(deviceId: string, streamId: string): void {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.status = 'cancelled';
      stream.endTime = Date.now();
    }
    this.audioBuffers.delete(streamId);
    logger.info({ deviceId, streamId }, 'Audio stream cancelled');
  }

  // ============ Status & Ping ============

  private handleStatusUpdate(deviceId: string, message: StatusMessage): void {
    const connected = this.devices.get(deviceId);
    if (!connected) return;

    connected.device.lastSeen = new Date();
    connected.device.updatedAt = new Date();

    eventBus.emit('device:status', {
      deviceId,
      status: message.status,
      timestamp: Date.now(),
    });
  }

  private handlePong(deviceId: string): void {
    const connected = this.devices.get(deviceId);
    if (connected) {
      connected.lastPing = Date.now();
      connected.device.lastSeen = new Date();
    }
  }

  private sendPing(deviceId: string): void {
    this.sendMessage(deviceId, {
      type: 'ping',
      timestamp: Date.now(),
    });
  }

  // ============ Error Handling ============

  private handleDeviceError(deviceId: string, message: ErrorMessage): void {
    logger.error(
      {
        deviceId,
        code: message.code,
        message: message.message,
        details: message.details,
      },
      'Device reported error'
    );

    eventBus.emit('device:error', {
      deviceId,
      error: new Error(`${message.code}: ${message.message}`),
      timestamp: Date.now(),
    });
  }

  private handleError(deviceId: string, error: Error): void {
    logger.error({ deviceId, error }, 'WebSocket error');
    eventBus.emit('device:error', {
      deviceId,
      error,
      timestamp: Date.now(),
    });
  }

  // ============ Outbound Messages ============

  public sendMessage(deviceId: string, message: ServerMessage): boolean {
    const connected = this.devices.get(deviceId);
    if (!connected || connected.ws.readyState !== connected.ws.OPEN) {
      return false;
    }

    try {
      connected.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error({ deviceId, error }, 'Failed to send message');
      return false;
    }
  }

  public sendBinary(deviceId: string, type: BinaryMessageType, data: Buffer): boolean {
    const connected = this.devices.get(deviceId);
    if (!connected || connected.ws.readyState !== connected.ws.OPEN) {
      return false;
    }

    try {
      // Create binary message with header
      const header = Buffer.alloc(BINARY_HEADER_SIZE);
      header.writeUInt16BE(BINARY_MAGIC, 0);
      header.writeUInt16BE(type, 2);
      header.writeUInt32BE(data.length, 4);

      const message = Buffer.concat([header, data]);
      connected.ws.send(message);
      return true;
    } catch (error) {
      logger.error({ deviceId, error }, 'Failed to send binary message');
      return false;
    }
  }

  public sendError(deviceId: string, code: string, message: string): void {
    this.sendMessage(deviceId, {
      type: 'error',
      timestamp: Date.now(),
      code,
      message,
    } as ErrorMessage);
  }

  public sendCommand(command: DeviceCommand): boolean {
    const message: CommandMessage = {
      type: 'command',
      timestamp: Date.now(),
      command: command.command as CommandMessage['command'],
      payload: command.payload,
    };
    return this.sendMessage(command.deviceId, message);
  }

  public sendConfig(deviceId: string, config: Partial<DeviceConfigMessage>): boolean {
    return this.sendMessage(deviceId, {
      type: 'config',
      timestamp: Date.now(),
      ...config,
    } as DeviceConfigMessage);
  }

  public sendTextResponse(deviceId: string, text: string, isPartial = false): boolean {
    return this.sendMessage(deviceId, {
      type: 'text_response',
      timestamp: Date.now(),
      text,
      isPartial,
    } as TextResponseMessage);
  }

  /**
   * Send audio playback to device (TTS response)
   */
  public async sendAudioPlayback(
    deviceId: string,
    audioData: Buffer,
    format: AudioFormat = 'pcm16',
    sampleRate = 16000
  ): Promise<boolean> {
    const connected = this.devices.get(deviceId);
    if (!connected || connected.ws.readyState !== connected.ws.OPEN) {
      return false;
    }

    const streamId = uuidv4();
    const chunkSize = 4096; // 4KB chunks
    const totalChunks = Math.ceil(audioData.length / chunkSize);

    // Send start message
    const startMsg: AudioPlayMessage = {
      type: 'audio_play',
      timestamp: Date.now(),
      streamId,
      format,
      sampleRate,
      channels: 1,
      totalChunks,
      totalBytes: audioData.length,
    };

    if (!this.sendMessage(deviceId, startMsg)) {
      return false;
    }

    // Send chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, audioData.length);
      const chunk = audioData.subarray(start, end);

      // Send chunk metadata
      const chunkMsg: AudioPlayChunkMessage = {
        type: 'audio_play_chunk',
        timestamp: Date.now(),
        streamId,
        sequenceNumber: i,
        isFinal: i === totalChunks - 1,
      };
      this.sendMessage(deviceId, chunkMsg);

      // Send binary data
      this.sendBinary(deviceId, 0x02, chunk); // AUDIO_PLAY_DATA

      // Small delay to prevent overwhelming the device
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    logger.info(
      {
        deviceId,
        streamId,
        totalChunks,
        totalBytes: audioData.length,
      },
      'Audio playback sent'
    );

    return true;
  }

  // ============ Device Queries ============

  public getConnectedDevices(): Device[] {
    return Array.from(this.devices.values()).map((c) => c.device);
  }

  public getDevice(id: string): Device | undefined {
    return this.devices.get(id)?.device;
  }

  public getDeviceCapabilities(id: string): DeviceCapabilities | undefined {
    return this.devices.get(id)?.capabilities;
  }

  public getActiveStream(deviceId: string): AudioStreamState | undefined {
    return this.devices.get(deviceId)?.activeStream;
  }

  public isDeviceConnected(deviceId: string): boolean {
    const connected = this.devices.get(deviceId);
    return connected?.ws.readyState === connected?.ws.OPEN;
  }

  // ============ Cleanup ============

  public destroy(): void {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
    }

    this.devices.forEach((_connected, deviceId) => {
      this.closeConnection(deviceId, 'server_shutdown');
    });

    this.devices.clear();
    this.streams.clear();
    this.audioBuffers.clear();

    if (this.wss) {
      this.wss.close();
    }

    logger.info('ESP32Handler destroyed');
  }

  // Alias for destroy
  public shutdown(): void {
    this.destroy();
  }
}
