/**
 * Voice Pipeline - End-to-end voice processing
 * ESP32 Audio → STT → Agent Chat → TTS → ESP32 Playback
 */

import type { ESP32Handler } from '../handlers/esp32.handler';
import { eventBus } from '../utils/event-bus';
import { logger } from '../utils/logger';
import { getAgentService } from './agent.service';
import { getSTTService } from './stt.service';
import { getTTSService } from './tts.service';

interface VoicePipelineOptions {
  esp32Handler: ESP32Handler;
  language?: string;
}

export class VoicePipeline {
  private esp32Handler: ESP32Handler;
  private language: string;
  private processing = new Set<string>();

  constructor(options: VoicePipelineOptions) {
    this.esp32Handler = options.esp32Handler;
    this.language = options.language || 'vi';
  }

  /**
   * Start listening to audio completion events
   */
  start(): void {
    eventBus.on(
      'audio:complete',
      (event: { deviceId: string; streamId: string; audioBuffer: Buffer }) => {
        void this.processAudio(event.deviceId, event.streamId, event.audioBuffer);
      }
    );

    logger.info('Voice pipeline started');
  }

  /**
   * Full voice pipeline: audio → text → AI → speech → device
   */
  private async processAudio(
    deviceId: string,
    streamId: string,
    audioBuffer: Buffer
  ): Promise<void> {
    if (this.processing.has(deviceId)) {
      logger.warn({ deviceId }, 'Device already processing, skipping');
      return;
    }

    this.processing.add(deviceId);

    try {
      // Minimum audio size check (0.5s at 16kHz 16-bit mono = 16000 bytes)
      if (audioBuffer.length < 16000) {
        logger.debug({ deviceId, size: audioBuffer.length }, 'Audio too short, skipping');
        return;
      }

      // Step 1: STT
      const stt = getSTTService();
      if (!stt.isAvailable()) {
        logger.warn('STT service not available');
        this.esp32Handler.sendTextResponse(deviceId, 'STT service unavailable');
        return;
      }

      logger.info({ deviceId, streamId, audioSize: audioBuffer.length }, 'Processing voice input');

      const transcription = await stt.transcribe(audioBuffer, {
        language: this.language,
      });

      if (!transcription.text.trim()) {
        logger.debug({ deviceId }, 'Empty transcription, skipping');
        return;
      }

      // Send transcription as text to device
      this.esp32Handler.sendTextResponse(deviceId, `🎤 ${transcription.text}`, true);

      eventBus.emit('stt:result', {
        deviceId,
        streamId,
        text: transcription.text,
        confidence: 1.0,
      });

      // Step 2: Agent Chat
      const agent = getAgentService();
      if (!agent.isAvailable()) {
        this.esp32Handler.sendTextResponse(deviceId, 'AI service unavailable');
        return;
      }

      const chatResponse = await agent.chat({
        message: transcription.text,
        deviceId,
      });

      // Send text response to device
      this.esp32Handler.sendTextResponse(deviceId, chatResponse.content);

      // Step 3: TTS
      const tts = getTTSService();
      if (!tts.isAvailable()) {
        logger.info({ deviceId }, 'TTS not available, text-only response sent');
        return;
      }

      const ttsResult = await tts.synthesize(chatResponse.content, {
        language: this.language,
      });

      // Step 4: Send audio to device
      eventBus.emit('tts:start', { deviceId, text: chatResponse.content });

      await this.esp32Handler.sendAudioPlayback(
        deviceId,
        ttsResult.audioBuffer,
        ttsResult.format === 'pcm16' ? 'pcm16' : 'mp3',
        ttsResult.sampleRate
      );

      eventBus.emit('tts:end', { deviceId });

      logger.info(
        {
          deviceId,
          transcription: transcription.text.slice(0, 50),
          response: chatResponse.content.slice(0, 50),
          audioSize: ttsResult.audioBuffer.length,
        },
        'Voice pipeline complete'
      );
    } catch (error) {
      logger.error({ deviceId, error }, 'Voice pipeline error');
      this.esp32Handler.sendTextResponse(deviceId, 'Sorry, an error occurred.');
      this.esp32Handler.sendError(deviceId, 'PIPELINE_ERROR', (error as Error).message);
    } finally {
      this.processing.delete(deviceId);
    }
  }
}
