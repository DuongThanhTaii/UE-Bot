/**
 * @fileoverview Voice Pipeline tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoicePipeline } from '../services/voice-pipeline';
import { eventBus } from '../utils/event-bus';

// Mock dependencies
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockSTT = {
  transcribe: vi.fn(),
  isAvailable: vi.fn(),
};

const mockAgent = {
  chat: vi.fn(),
  isAvailable: vi.fn(),
};

const mockTTS = {
  synthesize: vi.fn(),
  isAvailable: vi.fn(),
};

vi.mock('../services/stt.service', () => ({
  getSTTService: () => mockSTT,
}));

vi.mock('../services/agent.service', () => ({
  getAgentService: () => mockAgent,
}));

vi.mock('../services/tts.service', () => ({
  getTTSService: () => mockTTS,
}));

describe('VoicePipeline', () => {
  let pipeline: VoicePipeline;
  let mockEsp32: {
    sendTextResponse: ReturnType<typeof vi.fn>;
    sendAudioPlayback: ReturnType<typeof vi.fn>;
    sendError: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Remove all event listeners registered by previous tests
    eventBus.removeAllListeners('audio:complete');

    mockSTT.isAvailable.mockReturnValue(true);
    mockAgent.isAvailable.mockReturnValue(true);
    mockTTS.isAvailable.mockReturnValue(true);

    mockEsp32 = {
      sendTextResponse: vi.fn(),
      sendAudioPlayback: vi.fn().mockResolvedValue(undefined),
      sendError: vi.fn(),
    };

    pipeline = new VoicePipeline({
      esp32Handler: mockEsp32 as any,
      language: 'vi',
    });
  });

  describe('start', () => {
    it('should register event listener on audio:complete', () => {
      const onSpy = vi.spyOn(eventBus, 'on');

      pipeline.start();

      expect(onSpy).toHaveBeenCalledWith('audio:complete', expect.any(Function));
    });
  });

  describe('processAudio (via event)', () => {
    it('should skip audio shorter than 0.5s', async () => {
      pipeline.start();

      const shortAudio = Buffer.alloc(8000);
      eventBus.emit('audio:complete', {
        deviceId: 'dev1',
        streamId: 'stream1',
        audioBuffer: shortAudio,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSTT.transcribe).not.toHaveBeenCalled();
    });

    it('should run full pipeline: STT → Agent → TTS', async () => {
      mockSTT.transcribe.mockResolvedValue({
        text: 'Xin chào',
        language: 'vi',
        duration: 100,
      });

      mockAgent.chat.mockResolvedValue({
        content: 'Chào bạn!',
        sessionId: 'sess1',
      });

      mockTTS.synthesize.mockResolvedValue({
        audioBuffer: Buffer.alloc(4800),
        format: 'pcm16',
        sampleRate: 24000,
        duration: 50,
      });

      pipeline.start();

      const audioBuffer = Buffer.alloc(32000);
      eventBus.emit('audio:complete', {
        deviceId: 'dev1',
        streamId: 'stream1',
        audioBuffer,
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(mockSTT.transcribe).toHaveBeenCalledWith(audioBuffer, { language: 'vi' });
      expect(mockEsp32.sendTextResponse).toHaveBeenCalledWith('dev1', '🎤 Xin chào', true);
      expect(mockAgent.chat).toHaveBeenCalledWith({
        message: 'Xin chào',
        deviceId: 'dev1',
      });
      expect(mockEsp32.sendTextResponse).toHaveBeenCalledWith('dev1', 'Chào bạn!');
      expect(mockTTS.synthesize).toHaveBeenCalledWith('Chào bạn!', { language: 'vi' });
      expect(mockEsp32.sendAudioPlayback).toHaveBeenCalledWith(
        'dev1',
        expect.any(Buffer),
        'pcm16',
        24000
      );
    });

    it('should skip empty transcriptions', async () => {
      mockSTT.transcribe.mockResolvedValue({
        text: '   ',
        language: 'vi',
        duration: 50,
      });

      pipeline.start();

      const audioBuffer = Buffer.alloc(32000);
      eventBus.emit('audio:complete', {
        deviceId: 'dev1',
        streamId: 'stream1',
        audioBuffer,
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockAgent.chat).not.toHaveBeenCalled();
    });

    it('should send error on pipeline failure', async () => {
      mockSTT.transcribe.mockRejectedValue(new Error('Network timeout'));

      pipeline.start();

      const audioBuffer = Buffer.alloc(32000);
      eventBus.emit('audio:complete', {
        deviceId: 'dev1',
        streamId: 'stream1',
        audioBuffer,
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockEsp32.sendTextResponse).toHaveBeenCalledWith(
        'dev1',
        'Sorry, an error occurred.'
      );
      expect(mockEsp32.sendError).toHaveBeenCalledWith(
        'dev1',
        'PIPELINE_ERROR',
        'Network timeout'
      );
    });

    it('should handle STT service unavailable', async () => {
      mockSTT.isAvailable.mockReturnValue(false);

      pipeline.start();

      const audioBuffer = Buffer.alloc(32000);
      eventBus.emit('audio:complete', {
        deviceId: 'dev1',
        streamId: 'stream1',
        audioBuffer,
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockEsp32.sendTextResponse).toHaveBeenCalledWith('dev1', 'STT service unavailable');
    });

    it('should work text-only when TTS unavailable', async () => {
      mockSTT.transcribe.mockResolvedValue({
        text: 'Hello',
        language: 'en',
        duration: 50,
      });

      mockAgent.chat.mockResolvedValue({
        content: 'Hi there!',
        sessionId: 'sess1',
      });

      mockTTS.isAvailable.mockReturnValue(false);

      pipeline.start();

      const audioBuffer = Buffer.alloc(32000);
      eventBus.emit('audio:complete', {
        deviceId: 'dev1',
        streamId: 'stream1',
        audioBuffer,
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(mockEsp32.sendTextResponse).toHaveBeenCalledWith('dev1', 'Hi there!');
      expect(mockEsp32.sendAudioPlayback).not.toHaveBeenCalled();
    });
  });
});
