/**
 * @fileoverview TTS Service tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TTSService } from '../services/tts.service';

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('TTSService', () => {
  describe('with ElevenLabs', () => {
    let service: TTSService;

    beforeEach(() => {
      vi.clearAllMocks();
      vi.doMock('../config', () => ({
        config: {
          ELEVENLABS_API_KEY: 'test-eleven-key',
          ELEVENLABS_VOICE_ID: 'test-voice-id',
          GROQ_API_KEY: undefined,
        },
      }));
      // Re-instantiate to pick up mocked config
      service = new TTSService();
      // Override private fields for test
      (service as any).elevenlabsKey = 'test-eleven-key';
      (service as any).groqKey = undefined;
    });

    it('should synthesize text via ElevenLabs', async () => {
      const fakeAudio = new Uint8Array([0x49, 0x44, 0x33]).buffer; // Fake MP3 header
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fakeAudio,
      });

      const result = await service.synthesize('Hello world');

      expect(result.format).toBe('mp3');
      expect(result.sampleRate).toBe(44100);
      expect(result.audioBuffer).toBeInstanceOf(Buffer);
      expect(result.duration).toBeGreaterThanOrEqual(0);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.elevenlabs.io'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'xi-api-key': 'test-eleven-key',
          }),
        })
      );
    });

    it('should handle ElevenLabs API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limited',
      });

      await expect(service.synthesize('Hello')).rejects.toThrow('TTS failed: 429');
    });
  });

  describe('with Groq TTS', () => {
    let service: TTSService;

    beforeEach(() => {
      vi.clearAllMocks();
      service = new TTSService();
      (service as any).elevenlabsKey = undefined;
      (service as any).groqKey = 'test-groq-key';
    });

    it('should synthesize text via Groq', async () => {
      const fakeAudio = new Uint8Array([0x52, 0x49, 0x46, 0x46]).buffer; // RIFF header
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fakeAudio,
      });

      const result = await service.synthesize('Xin chào');

      expect(result.format).toBe('pcm16');
      expect(result.sampleRate).toBe(24000);
      expect(result.audioBuffer).toBeInstanceOf(Buffer);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/audio/speech',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-groq-key',
          }),
        })
      );
    });

    it('should handle Groq TTS API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal error',
      });

      await expect(service.synthesize('Hello')).rejects.toThrow('Groq TTS failed: 500');
    });
  });

  describe('with no provider', () => {
    it('should throw when no TTS provider configured', async () => {
      const service = new TTSService();
      (service as any).elevenlabsKey = undefined;
      (service as any).groqKey = undefined;

      await expect(service.synthesize('Hello')).rejects.toThrow(
        'No TTS provider configured'
      );
    });
  });

  describe('isAvailable', () => {
    it('should return true with ElevenLabs key', () => {
      const service = new TTSService();
      (service as any).elevenlabsKey = 'key';
      (service as any).groqKey = undefined;

      expect(service.isAvailable()).toBe(true);
    });

    it('should return true with Groq key', () => {
      const service = new TTSService();
      (service as any).elevenlabsKey = undefined;
      (service as any).groqKey = 'key';

      expect(service.isAvailable()).toBe(true);
    });

    it('should return false with no keys', () => {
      const service = new TTSService();
      (service as any).elevenlabsKey = undefined;
      (service as any).groqKey = undefined;

      expect(service.isAvailable()).toBe(false);
    });
  });
});
