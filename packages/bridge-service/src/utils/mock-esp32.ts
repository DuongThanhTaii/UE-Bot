/**
 * Mock ESP32 Client
 *
 * Giả lập ESP32 device để test Bridge Service mà không cần hardware thật
 * Có thể:
 * - Kết nối WebSocket
 * - Gửi handshake
 * - Stream audio (từ file hoặc generated)
 * - Nhận và xử lý commands
 */

import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import WebSocket from 'ws';

import type {
  AudioEndMessage,
  AudioFormat,
  AudioStartMessage,
  BinaryMessageType,
  ClientMessage,
  DeviceCapabilities,
  HandshakeMessage,
  PongMessage,
  ServerMessage,
  StatusMessage,
} from '../types/esp32-protocol';
import { BINARY_HEADER_SIZE, BINARY_MAGIC } from '../types/esp32-protocol';
import { logger } from './logger';

// ============ Mock ESP32 Client ============

export interface MockESP32Config {
  serverUrl: string;
  deviceId?: string;
  macAddress?: string;
  firmwareVersion?: string;
  capabilities?: Partial<DeviceCapabilities>;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

export class MockESP32Client {
  private ws: WebSocket | null = null;
  private config: Required<MockESP32Config>;
  private sessionId: string | null = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private messageHandlers = new Map<string, (message: ServerMessage) => void>();

  constructor(config: MockESP32Config) {
    this.config = {
      serverUrl: config.serverUrl,
      deviceId: config.deviceId || uuidv4(),
      macAddress: config.macAddress || this.generateMacAddress(),
      firmwareVersion: config.firmwareVersion || '1.0.0',
      capabilities: {
        hasWakeWord: true,
        hasSpeaker: true,
        hasMicrophone: true,
        hasLED: true,
        maxSampleRate: 16000,
        supportedFormats: ['pcm16'],
        ...config.capabilities,
      },
      autoReconnect: config.autoReconnect ?? true,
      reconnectDelay: config.reconnectDelay ?? 5000,
    };
  }

  // ============ Connection ============

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.config.serverUrl}?id=${this.config.deviceId}`;
      logger.info({ url, deviceId: this.config.deviceId }, 'Mock ESP32 connecting...');

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        logger.info({ deviceId: this.config.deviceId }, 'Mock ESP32 WebSocket connected');
        this.sendHandshake();
      });

      this.ws.on('message', (data, isBinary) => {
        this.handleMessage(data, isBinary);
      });

      this.ws.on('close', (code, reason) => {
        logger.info(
          { deviceId: this.config.deviceId, code, reason: reason.toString() },
          'Mock ESP32 disconnected'
        );
        this.isConnected = false;
        this.sessionId = null;
        this.stopPingTimer();

        if (this.config.autoReconnect) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (error) => {
        logger.error({ deviceId: this.config.deviceId, error }, 'Mock ESP32 WebSocket error');
        reject(error);
      });

      this.ws.on('ping', () => {
        this.ws?.pong();
      });

      // Wait for handshake ack
      this.onMessage('handshake_ack', (message) => {
        if ('success' in message && message.success) {
          this.sessionId = (message as { sessionId: string }).sessionId;
          this.isConnected = true;
          this.startPingTimer();
          logger.info(
            { deviceId: this.config.deviceId, sessionId: this.sessionId },
            'Mock ESP32 handshake complete'
          );
          resolve();
        } else {
          reject(new Error('Handshake failed'));
        }
      });

      // Timeout for connection
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  public disconnect(): void {
    this.config.autoReconnect = false;
    this.stopPingTimer();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
    logger.info({ deviceId: this.config.deviceId }, 'Mock ESP32 disconnected');
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        logger.error({ deviceId: this.config.deviceId, error }, 'Reconnect failed');
      }
    }, this.config.reconnectDelay);
  }

  // ============ Handshake ============

  private sendHandshake(): void {
    const handshake: HandshakeMessage = {
      type: 'handshake',
      timestamp: Date.now(),
      deviceId: this.config.deviceId,
      macAddress: this.config.macAddress,
      firmwareVersion: this.config.firmwareVersion,
      capabilities: this.config.capabilities as DeviceCapabilities,
    };

    this.sendJson(handshake);
  }

  // ============ Message Handling ============

  private handleMessage(data: WebSocket.RawData, isBinary: boolean): void {
    try {
      if (isBinary) {
        this.handleBinaryMessage(data as Buffer);
      } else {
        const message = JSON.parse(data.toString()) as ServerMessage;
        this.handleJsonMessage(message);
      }
    } catch (error) {
      logger.error({ deviceId: this.config.deviceId, error }, 'Failed to parse message');
    }
  }

  private handleJsonMessage(message: ServerMessage): void {
    logger.debug({ deviceId: this.config.deviceId, type: message.type }, 'Received message');

    // Call registered handler
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }

    // Built-in handlers
    switch (message.type) {
      case 'ping':
        this.sendPong();
        break;
      case 'config':
        logger.info({ deviceId: this.config.deviceId, config: message }, 'Received config update');
        break;
      case 'command':
        this.handleCommand(message);
        break;
      case 'text_response':
        logger.info(
          { deviceId: this.config.deviceId, text: (message as { text: string }).text },
          'Received text response'
        );
        break;
      case 'audio_play':
        logger.info({ deviceId: this.config.deviceId }, 'Audio playback starting...');
        break;
      case 'audio_play_chunk':
        // Audio data will come via binary
        break;
    }
  }

  private handleBinaryMessage(data: Buffer): void {
    if (data.length < BINARY_HEADER_SIZE) return;

    const magic = data.readUInt16BE(0);
    if (magic !== BINARY_MAGIC) return;

    const type = data.readUInt16BE(2);
    const length = data.readUInt32BE(4);
    const payload = data.subarray(BINARY_HEADER_SIZE, BINARY_HEADER_SIZE + length);

    if (type === 0x02) {
      // AUDIO_PLAY_DATA
      logger.debug(
        { deviceId: this.config.deviceId, size: payload.length },
        'Received audio playback data'
      );
      // In real device, this would be sent to DAC
    }
  }

  private handleCommand(message: ServerMessage): void {
    const cmd = message as { command: string; payload?: Record<string, unknown> };
    logger.info({ deviceId: this.config.deviceId, command: cmd.command }, 'Received command');

    switch (cmd.command) {
      case 'start_listening':
        logger.info({ deviceId: this.config.deviceId }, 'Starting listening simulation...');
        break;
      case 'stop_listening':
        logger.info({ deviceId: this.config.deviceId }, 'Stopping listening simulation...');
        break;
      case 'led_control':
        logger.info({ deviceId: this.config.deviceId, payload: cmd.payload }, 'LED control');
        break;
    }
  }

  // ============ Message Registration ============

  public onMessage(type: string, handler: (message: ServerMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  public offMessage(type: string): void {
    this.messageHandlers.delete(type);
  }

  // ============ Sending Messages ============

  private sendJson(message: ClientMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error({ deviceId: this.config.deviceId, error }, 'Failed to send message');
      return false;
    }
  }

  private sendBinary(type: BinaryMessageType, data: Buffer): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const header = Buffer.alloc(BINARY_HEADER_SIZE);
      header.writeUInt16BE(BINARY_MAGIC, 0);
      header.writeUInt16BE(type, 2);
      header.writeUInt32BE(data.length, 4);

      const message = Buffer.concat([header, data]);
      this.ws.send(message);
      return true;
    } catch (error) {
      logger.error({ deviceId: this.config.deviceId, error }, 'Failed to send binary');
      return false;
    }
  }

  // ============ Ping/Pong ============

  private startPingTimer(): void {
    this.pingTimer = setInterval(() => {
      this.sendStatus();
    }, 30000);
  }

  private stopPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private sendPong(): void {
    const pong: PongMessage = {
      type: 'pong',
      timestamp: Date.now(),
    };
    this.sendJson(pong);
  }

  // ============ Status ============

  public sendStatus(
    status: 'idle' | 'listening' | 'processing' | 'speaking' | 'error' = 'idle'
  ): void {
    const statusMsg: StatusMessage = {
      type: 'status',
      timestamp: Date.now(),
      status,
      batteryLevel: 100,
      wifiStrength: -50,
      freeMemory: 100000,
      uptime: Math.floor((Date.now() - (this.sessionId ? Date.now() : 0)) / 1000),
    };
    this.sendJson(statusMsg);
  }

  // ============ Audio Streaming ============

  /**
   * Stream audio file to server (simulates ESP32 recording)
   */
  public async streamAudioFile(
    filePath: string,
    format: AudioFormat = 'pcm16',
    sampleRate = 16000,
    reason: 'wake_word' | 'button' | 'api' = 'button'
  ): Promise<void> {
    const audioData = readFileSync(filePath);
    await this.streamAudioBuffer(audioData, format, sampleRate, reason);
  }

  /**
   * Stream audio buffer to server
   */
  public async streamAudioBuffer(
    audioData: Buffer,
    format: AudioFormat = 'pcm16',
    sampleRate = 16000,
    reason: 'wake_word' | 'button' | 'api' = 'button'
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    const streamId = uuidv4();

    // Send start message
    const startMsg: AudioStartMessage = {
      type: 'audio_start',
      timestamp: Date.now(),
      streamId,
      format,
      sampleRate,
      channels: 1,
      reason,
    };
    this.sendJson(startMsg);

    // Send status update
    this.sendStatus('listening');

    // Chunk and send audio
    const chunkSize = 1024; // 1KB chunks (typical for ESP32)
    const totalChunks = Math.ceil(audioData.length / chunkSize);

    logger.info(
      {
        deviceId: this.config.deviceId,
        streamId,
        totalChunks,
        totalBytes: audioData.length,
      },
      'Starting audio stream...'
    );

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, audioData.length);
      const chunk = audioData.subarray(start, end);

      // Send binary audio data
      this.sendBinary(0x01, chunk); // AUDIO_DATA

      // Small delay to simulate real-time streaming (16kHz = 64KB/s)
      // 1KB chunk = ~16ms at 16kHz mono 16-bit
      await new Promise((resolve) => setTimeout(resolve, 16));
    }

    // Send end message
    const endMsg: AudioEndMessage = {
      type: 'audio_end',
      timestamp: Date.now(),
      streamId,
      totalChunks,
      totalBytes: audioData.length,
      reason: 'silence',
    };
    this.sendJson(endMsg);

    this.sendStatus('processing');

    logger.info({ deviceId: this.config.deviceId, streamId }, 'Audio stream complete');
  }

  /**
   * Generate and stream test audio (sine wave)
   */
  public async streamTestAudio(durationMs = 2000): Promise<void> {
    const sampleRate = 16000;
    const frequency = 440; // A4 note
    const samples = Math.floor((sampleRate * durationMs) / 1000);
    const buffer = Buffer.alloc(samples * 2); // 16-bit = 2 bytes per sample

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const value = Math.sin(2 * Math.PI * frequency * t) * 0.5 * 32767;
      buffer.writeInt16LE(Math.floor(value), i * 2);
    }

    await this.streamAudioBuffer(buffer, 'pcm16', sampleRate, 'button');
  }

  // ============ Utilities ============

  private generateMacAddress(): string {
    const hex = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
      if (i > 0) mac += ':';
      mac += hex[Math.floor(Math.random() * 16)];
      mac += hex[Math.floor(Math.random() * 16)];
    }
    return mac;
  }

  public get connected(): boolean {
    return this.isConnected;
  }

  public get deviceId(): string {
    return this.config.deviceId;
  }
}

// ============ CLI Usage ============

async function main(): Promise<void> {
  const serverUrl = process.argv[2] || 'ws://localhost:3001/ws/esp32';

  const client = new MockESP32Client({
    serverUrl,
    firmwareVersion: '1.0.0-mock',
  });

  // Handle text responses
  client.onMessage('text_response', (msg) => {
    const text = (msg as { text: string }).text;
    console.log('\n🤖 Bot response:', text);
  });

  try {
    await client.connect();
    console.log('✅ Connected! Device ID:', client.deviceId);
    console.log('\nCommands:');
    console.log('  t - Send test audio (2s sine wave)');
    console.log('  s - Send status');
    console.log('  q - Quit\n');

    // Simple CLI
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.on('data', async (key) => {
      const char = key.toString();

      if (char === 'q' || char === '\u0003') {
        // q or Ctrl+C
        client.disconnect();
        process.exit(0);
      } else if (char === 't') {
        console.log('📤 Sending test audio...');
        await client.streamTestAudio(2000);
        console.log('✅ Audio sent!');
      } else if (char === 's') {
        client.sendStatus('idle');
        console.log('📤 Status sent');
      }
    });
  } catch (error) {
    console.error('Failed to connect:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
