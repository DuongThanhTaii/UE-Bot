/**
 * Text-to-Speech Service
 * Converts text responses to audio for ESP32 playback
 * Supports ElevenLabs API and a simple built-in fallback
 */

import { config } from '../config';
import { logger } from '../utils/logger';

export interface TTSOptions {
  voice?: string;
  speed?: number;
  language?: string;
}

export interface TTSResult {
  audioBuffer: Buffer;
  format: 'pcm16' | 'mp3';
  sampleRate: number;
  duration: number;
}

export class TTSService {
  private elevenlabsKey: string | undefined;
  private elevenlabsVoiceId: string;
  private groqKey: string | undefined;

  constructor() {
    this.elevenlabsKey = config.ELEVENLABS_API_KEY;
    this.elevenlabsVoiceId = config.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    this.groqKey = config.GROQ_API_KEY;
  }

  /**
   * Synthesize text to audio
   * Uses ElevenLabs if available, falls back to Groq TTS
   */
  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    if (this.elevenlabsKey) {
      return this.synthesizeElevenLabs(text, options);
    }

    if (this.groqKey) {
      return this.synthesizeGroq(text, options);
    }

    throw new Error('No TTS provider configured. Set ELEVENLABS_API_KEY or GROQ_API_KEY.');
  }

  /**
   * ElevenLabs TTS
   */
  private async synthesizeElevenLabs(text: string, options: TTSOptions): Promise<TTSResult> {
    const startTime = Date.now();
    const voiceId = options.voice || this.elevenlabsVoiceId;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.elevenlabsKey!,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speed: options.speed || 1.0,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'ElevenLabs TTS error');
      throw new Error(`TTS failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const duration = Date.now() - startTime;

    logger.info(
      { textLength: text.length, audioSize: audioBuffer.length, duration },
      'ElevenLabs TTS complete'
    );

    return {
      audioBuffer,
      format: 'mp3',
      sampleRate: 44100,
      duration,
    };
  }

  /**
   * Groq TTS (using OpenAI-compatible endpoint)
   */
  private async synthesizeGroq(text: string, _options: TTSOptions): Promise<TTSResult> {
    const startTime = Date.now();

    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'playai-tts',
        input: text,
        voice: 'Arista-PlayAI',
        response_format: 'wav',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Groq TTS error');
      throw new Error(`Groq TTS failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const duration = Date.now() - startTime;

    logger.info(
      { textLength: text.length, audioSize: audioBuffer.length, duration },
      'Groq TTS complete'
    );

    return {
      audioBuffer,
      format: 'pcm16',
      sampleRate: 24000,
      duration,
    };
  }

  isAvailable(): boolean {
    return !!this.elevenlabsKey || !!this.groqKey;
  }
}

// Singleton
let _ttsService: TTSService | null = null;

export function getTTSService(): TTSService {
  if (!_ttsService) {
    _ttsService = new TTSService();
  }
  return _ttsService;
}
