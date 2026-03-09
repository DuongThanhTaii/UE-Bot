/**
 * Speech-to-Text Service using Groq Whisper API
 * Converts audio buffers from ESP32 to text
 */

import { config } from '../config';
import { logger } from '../utils/logger';

export interface TranscribeOptions {
  language?: string;
  prompt?: string;
}

export interface TranscribeResult {
  text: string;
  language: string;
  duration: number;
}

export class STTService {
  private apiKey: string | undefined;
  private apiUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';

  constructor() {
    this.apiKey = config.GROQ_API_KEY;
  }

  /**
   * Transcribe PCM16 audio buffer to text via Groq Whisper
   */
  async transcribe(
    audioBuffer: Buffer,
    options: TranscribeOptions = {}
  ): Promise<TranscribeResult> {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY is required for STT');
    }

    const startTime = Date.now();

    // Convert PCM16 raw audio to WAV format for API
    const wavBuffer = this.pcmToWav(audioBuffer, 16000, 1, 16);

    // Create form data with Blob
    const formData = new FormData();
    formData.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'audio.wav');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'json');

    if (options.language) {
      formData.append('language', options.language);
    }
    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'STT API error');
      throw new Error(`STT failed: ${response.status} ${errorText}`);
    }

    const result = (await response.json()) as { text: string; language?: string };
    const duration = Date.now() - startTime;

    logger.info(
      { text: result.text.slice(0, 100), duration, language: result.language },
      'Transcription complete'
    );

    return {
      text: result.text,
      language: result.language ?? options.language ?? 'vi',
      duration,
    };
  }

  /**
   * Convert raw PCM16 data to WAV format
   */
  private pcmToWav(
    pcmData: Buffer,
    sampleRate: number,
    channels: number,
    bitsPerSample: number
  ): Buffer {
    const byteRate = (sampleRate * channels * bitsPerSample) / 8;
    const blockAlign = (channels * bitsPerSample) / 8;
    const dataSize = pcmData.length;
    const headerSize = 44;

    const wav = Buffer.alloc(headerSize + dataSize);

    // RIFF header
    wav.write('RIFF', 0);
    wav.writeUInt32LE(36 + dataSize, 4);
    wav.write('WAVE', 8);

    // fmt chunk
    wav.write('fmt ', 12);
    wav.writeUInt32LE(16, 16); // chunk size
    wav.writeUInt16LE(1, 20); // PCM format
    wav.writeUInt16LE(channels, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(byteRate, 28);
    wav.writeUInt16LE(blockAlign, 32);
    wav.writeUInt16LE(bitsPerSample, 34);

    // data chunk
    wav.write('data', 36);
    wav.writeUInt32LE(dataSize, 40);
    pcmData.copy(wav, headerSize);

    return wav;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

// Singleton
let _sttService: STTService | null = null;

export function getSTTService(): STTService {
  if (!_sttService) {
    _sttService = new STTService();
  }
  return _sttService;
}
