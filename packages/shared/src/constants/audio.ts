export const AUDIO_CONSTANTS = {
  // Default audio configuration
  DEFAULT_SAMPLE_RATE: 16000,
  DEFAULT_BIT_DEPTH: 16,
  DEFAULT_CHANNELS: 1,
  DEFAULT_ENCODING: 'pcm' as const,

  // Limits
  MAX_AUDIO_DURATION_MS: 30000, // 30 seconds
  MIN_AUDIO_DURATION_MS: 100, // 100ms
  MAX_AUDIO_SIZE_BYTES: 10 * 1024 * 1024, // 10MB

  // Streaming
  CHUNK_SIZE_MS: 100,
  BUFFER_SIZE_MS: 500,

  // Whisper settings
  WHISPER_MODEL: 'whisper-1',
  WHISPER_MAX_TOKENS: 4096,
} as const;
