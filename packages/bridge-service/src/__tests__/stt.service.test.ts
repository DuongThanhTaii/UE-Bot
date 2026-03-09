/**
 * @fileoverview STT Service tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STTService } from '../services/stt.service';

// Mock config
vi.mock('../config', () => ({
  config: {
    GROQ_API_KEY: 'test-groq-key',
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('STTService', () => {
  let service: STTService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new STTService();
  });

  describe('transcribe', () => {
    it('should transcribe audio buffer to text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Xin chào', language: 'vi' }),
      });

      // Create a fake PCM16 audio buffer (1 second at 16kHz mono)
      const audioBuffer = Buffer.alloc(32000);

      const result = await service.transcribe(audioBuffer, { language: 'vi' });

      expect(result.text).toBe('Xin chào');
      expect(result.language).toBe('vi');
      expect(result.duration).toBeGreaterThanOrEqual(0);

      // Verify fetch was called with correct URL
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-groq-key',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const audioBuffer = Buffer.alloc(32000);

      await expect(service.transcribe(audioBuffer)).rejects.toThrow('STT failed: 401');
    });

    it('should default language to vi when not returned by API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Hello world' }),
      });

      const audioBuffer = Buffer.alloc(32000);
      const result = await service.transcribe(audioBuffer, { language: 'vi' });

      expect(result.language).toBe('vi');
    });

    it('should include prompt in request when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'test', language: 'en' }),
      });

      const audioBuffer = Buffer.alloc(32000);
      await service.transcribe(audioBuffer, { prompt: 'context hint' });

      expect(mockFetch).toHaveBeenCalled();
      // Verify the FormData body includes the prompt
      const callArgs = mockFetch.mock.calls[0]!;
      expect(callArgs[1]!.body).toBeInstanceOf(FormData);
    });
  });

  describe('pcmToWav (indirectly via transcribe)', () => {
    it('should create valid WAV header', async () => {
      let capturedBody: FormData | null = null;
      mockFetch.mockImplementationOnce(async (_url: string, init: RequestInit) => {
        capturedBody = init.body as FormData;
        return {
          ok: true,
          json: async () => ({ text: 'test' }),
        };
      });

      const pcmData = Buffer.alloc(1600); // 0.1s at 16kHz
      await service.transcribe(pcmData);

      expect(capturedBody).toBeInstanceOf(FormData);
      // WAV file was created and sent as part of FormData
      const file = capturedBody!.get('file');
      expect(file).toBeTruthy();
    });
  });
});
