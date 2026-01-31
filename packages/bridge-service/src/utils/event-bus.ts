/**
 * Bridge Event Bus
 *
 * Central event emitter cho inter-service communication
 * Cho phép các service subscribe/publish events mà không cần coupling trực tiếp
 */

import { EventEmitter } from 'events';

import type { ESP32Event } from '../types/esp32-protocol';

import { logger } from './logger';

// ============ Event Definitions ============

export interface BridgeEvents {
  // Device events
  'device:connected': { deviceId: string; timestamp: number };
  'device:disconnected': { deviceId: string; reason: string; timestamp: number };
  'device:error': { deviceId: string; error: Error; timestamp: number };
  'device:status': { deviceId: string; status: string; timestamp: number };

  // Audio events
  'audio:start': { deviceId: string; streamId: string; format: string; sampleRate: number };
  'audio:chunk': { deviceId: string; streamId: string; chunk: Buffer; sequenceNumber: number };
  'audio:end': {
    deviceId: string;
    streamId: string;
    totalChunks: number;
    totalBytes: number;
    reason: string;
  };
  'audio:complete': { deviceId: string; streamId: string; audioBuffer: Buffer };

  // STT events
  'stt:start': { deviceId: string; streamId: string };
  'stt:partial': { deviceId: string; streamId: string; text: string };
  'stt:result': { deviceId: string; streamId: string; text: string; confidence: number };
  'stt:error': { deviceId: string; streamId: string; error: Error };

  // TTS events
  'tts:start': { deviceId: string; text: string };
  'tts:chunk': { deviceId: string; chunk: Buffer; sequenceNumber: number };
  'tts:end': { deviceId: string };
  'tts:error': { deviceId: string; error: Error };

  // AI events
  'ai:request': { deviceId: string; text: string; sessionId: string };
  'ai:response': { deviceId: string; text: string; sessionId: string };
  'ai:error': { deviceId: string; error: Error };
}

export type BridgeEventType = keyof BridgeEvents;

// ============ Typed Event Emitter ============

class TypedEventEmitter<T extends { [K in keyof T]: unknown }> {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): this {
    this.emitter.on(event as string, listener);
    return this;
  }

  once<K extends keyof T>(event: K, listener: (data: T[K]) => void): this {
    this.emitter.once(event as string, listener);
    return this;
  }

  off<K extends keyof T>(event: K, listener: (data: T[K]) => void): this {
    this.emitter.off(event as string, listener);
    return this;
  }

  emit<K extends keyof T>(event: K, data: T[K]): boolean {
    logger.debug({ event, data }, 'Event emitted');
    return this.emitter.emit(event as string, data);
  }

  removeAllListeners<K extends keyof T>(event?: K): this {
    this.emitter.removeAllListeners(event as string);
    return this;
  }

  listenerCount<K extends keyof T>(event: K): number {
    return this.emitter.listenerCount(event as string);
  }
}

// ============ Bridge Event Bus ============

class BridgeEventBus extends TypedEventEmitter<BridgeEvents> {
  private static instance: BridgeEventBus | null = null;

  private constructor() {
    super();
    logger.info('BridgeEventBus initialized');
  }

  public static getInstance(): BridgeEventBus {
    if (!BridgeEventBus.instance) {
      BridgeEventBus.instance = new BridgeEventBus();
    }
    return BridgeEventBus.instance;
  }

  /**
   * Emit ESP32 event (convert to typed event)
   */
  public emitESP32Event(event: ESP32Event): void {
    const eventType = event.type as BridgeEventType;
    const eventData = {
      deviceId: event.deviceId,
      timestamp: event.timestamp,
      ...(event.data as Record<string, unknown>),
    };
    this.emit(eventType, eventData as BridgeEvents[typeof eventType]);
  }

  /**
   * Log all events (for debugging)
   */
  public enableDebugLogging(): void {
    const events: BridgeEventType[] = [
      'device:connected',
      'device:disconnected',
      'device:error',
      'device:status',
      'audio:start',
      'audio:chunk',
      'audio:end',
      'audio:complete',
      'stt:start',
      'stt:partial',
      'stt:result',
      'stt:error',
      'tts:start',
      'tts:chunk',
      'tts:end',
      'tts:error',
      'ai:request',
      'ai:response',
      'ai:error',
    ];

    events.forEach((event) => {
      this.on(event, (data) => {
        logger.debug({ event, data }, 'Event received');
      });
    });
  }
}

// Export singleton instance
export const eventBus = BridgeEventBus.getInstance();

// Export class for testing
export { BridgeEventBus };
