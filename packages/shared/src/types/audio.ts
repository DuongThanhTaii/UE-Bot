import { z } from "zod";

// ============ Enums ============
export const AudioEncoding = {
  PCM: "pcm",
  OPUS: "opus",
  MP3: "mp3",
  WAV: "wav",
} as const;

export type AudioEncoding = (typeof AudioEncoding)[keyof typeof AudioEncoding];

// ============ Interfaces ============
export interface AudioConfig {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  encoding: AudioEncoding;
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  duration: number;
  sequence: number;
  config: AudioConfig;
}

export interface TranscribeRequest {
  audio: Buffer;
  config: AudioConfig;
  language?: string;
  prompt?: string;
}

export interface TranscribeResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  words?: TranscribeWord[];
}

export interface TranscribeWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface SynthesizeRequest {
  text: string;
  voiceId?: string;
  language?: string;
  speed?: number;
}

export interface SynthesizeResult {
  audio: Buffer;
  duration: number;
  format: AudioEncoding;
  sampleRate: number;
}

// ============ Zod Schemas ============
export const AudioConfigSchema = z.object({
  sampleRate: z.number().int().positive(),
  bitDepth: z.number().int().positive(),
  channels: z.number().int().min(1).max(2),
  encoding: z.enum(["pcm", "opus", "mp3", "wav"]),
});

export const TranscribeRequestSchema = z.object({
  audio: z.instanceof(Buffer),
  config: AudioConfigSchema,
  language: z.string().optional(),
  prompt: z.string().optional(),
});
