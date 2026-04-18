import type { VoiceBridgeEvent, VoiceBridgeStatus } from '@/hooks/useVoiceAssistant'

export interface VoiceService {
  getDeviceStatus(baseUrl: string): Promise<VoiceBridgeStatus>
  startListening(baseUrl: string, payload?: Record<string, unknown>): Promise<VoiceBridgeStatus>
  stopListening(baseUrl: string, payload?: Record<string, unknown>): Promise<VoiceBridgeStatus>
  submitAudioChunk(baseUrl: string, payload: Record<string, unknown>): Promise<VoiceBridgeStatus>
  submitTranscript(baseUrl: string, payload: Record<string, unknown>): Promise<VoiceBridgeStatus>
  playTTSAudio(baseUrl: string, payload: Record<string, unknown>): Promise<Record<string, unknown>>
  setOutputState(baseUrl: string, payload: Record<string, unknown>): Promise<Record<string, unknown>>
  getRecentVoiceEvents(baseUrl: string, limit?: number, after?: string): Promise<VoiceBridgeEvent[]>
}
