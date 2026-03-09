/**
 * @fileoverview Event Bus tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventBus } from '../utils/event-bus';

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('EventBus', () => {
  it('should emit and receive typed events', () => {
    const handler = vi.fn();

    eventBus.on('device:connected', handler);
    eventBus.emit('device:connected', {
      deviceId: 'dev1',
      timestamp: Date.now(),
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: 'dev1' })
    );
  });

  it('should support once listeners', () => {
    const handler = vi.fn();

    eventBus.once('device:disconnected', handler);
    eventBus.emit('device:disconnected', {
      deviceId: 'dev1',
      reason: 'close',
      timestamp: Date.now(),
    });
    eventBus.emit('device:disconnected', {
      deviceId: 'dev1',
      reason: 'close',
      timestamp: Date.now(),
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should allow unsubscribing with off', () => {
    const handler = vi.fn();

    eventBus.on('audio:start', handler);
    eventBus.off('audio:start', handler);
    eventBus.emit('audio:start', {
      deviceId: 'dev1',
      streamId: 'stream1',
      format: 'pcm16',
      sampleRate: 16000,
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle multiple listeners on same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    eventBus.on('stt:result', handler1);
    eventBus.on('stt:result', handler2);
    eventBus.emit('stt:result', {
      deviceId: 'dev1',
      streamId: 'stream1',
      text: 'hello',
      confidence: 0.95,
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should support TTS events', () => {
    const startHandler = vi.fn();
    const endHandler = vi.fn();

    eventBus.on('tts:start', startHandler);
    eventBus.on('tts:end', endHandler);

    eventBus.emit('tts:start', { deviceId: 'dev1', text: 'Hello' });
    eventBus.emit('tts:end', { deviceId: 'dev1' });

    expect(startHandler).toHaveBeenCalledWith({ deviceId: 'dev1', text: 'Hello' });
    expect(endHandler).toHaveBeenCalledWith({ deviceId: 'dev1' });
  });
});
