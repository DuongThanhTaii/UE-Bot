import type { VoiceService } from './types'
import type { VoiceBridgeEvent, VoiceBridgeStatus } from '@/hooks/useVoiceAssistant'

const readJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Bridge request failed with ${response.status}`)
  }
  return response.json() as Promise<T>
}

export class DefaultVoiceService implements VoiceService {
  async getDeviceStatus(baseUrl: string): Promise<VoiceBridgeStatus> {
    return readJson<VoiceBridgeStatus>(await fetch(`${baseUrl}/status`))
  }

  async startListening(
    baseUrl: string,
    payload: Record<string, unknown> = {}
  ): Promise<VoiceBridgeStatus> {
    return readJson<VoiceBridgeStatus>(
      await fetch(`${baseUrl}/listening/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )
  }

  async stopListening(
    baseUrl: string,
    payload: Record<string, unknown> = {}
  ): Promise<VoiceBridgeStatus> {
    return readJson<VoiceBridgeStatus>(
      await fetch(`${baseUrl}/listening/stop`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )
  }

  async submitAudioChunk(
    baseUrl: string,
    payload: Record<string, unknown>
  ): Promise<VoiceBridgeStatus> {
    return readJson<VoiceBridgeStatus>(
      await fetch(`${baseUrl}/audio/input`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )
  }

  async submitTranscript(
    baseUrl: string,
    payload: Record<string, unknown>
  ): Promise<VoiceBridgeStatus> {
    return readJson<VoiceBridgeStatus>(
      await fetch(`${baseUrl}/audio/transcript`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )
  }

  async playTTSAudio(
    baseUrl: string,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return readJson<Record<string, unknown>>(
      await fetch(`${baseUrl}/playback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )
  }

  async setOutputState(
    baseUrl: string,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return readJson<Record<string, unknown>>(
      await fetch(`${baseUrl}/output/state`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )
  }

  async getRecentVoiceEvents(
    baseUrl: string,
    limit = 25,
    after?: string
  ): Promise<VoiceBridgeEvent[]> {
    const url = new URL(`${baseUrl}/events`)
    url.searchParams.set('limit', String(limit))
    if (after) url.searchParams.set('after', after)
    const data = await readJson<{ events: VoiceBridgeEvent[] }>(
      await fetch(url)
    )
    return data.events
  }
}
