import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { localStorageKey } from '@/constants/localStorage'

export type VoiceMode = 'push_to_talk' | 'wake_word' | 'hybrid'
export type SpeechPolicy = 'local_first' | 'cloud_first' | 'manual'
export type DeviceStatus = 'unknown' | 'online' | 'offline'
export type BridgeTransport = 'http'

export type VoiceBridgeEvent = {
  id: string
  type: string
  timestamp: string
  payload: Record<string, unknown>
}

export type VoiceBridgeStatus = {
  device: {
    id: string | null
    name: string
    host: string | null
    transport: string
    status: string
    lastSeenAt: string | null
    capabilities: string[]
    metadata: Record<string, unknown>
  }
  listening: boolean
  outputState: {
    led: string
    buzzer: boolean
    speaking: boolean
    volume: number
  }
  audioInput: {
    active: boolean
    format: string
    sampleRate: number
    chunksReceived: number
    lastChunkAt: string | null
    correlationId: string | null
  }
  playback: {
    active: boolean
    correlationId: string | null
    lastText: string
    lastAudioBytes: number
    lastFinishedAt: string | null
  }
  eventCount: number
}

type VoiceAssistantState = {
  enabled: boolean
  pcSpeechEnabled: boolean
  pcAutoSpeakReplies: boolean
  esp32Host: string
  esp32BridgePort: number
  esp32Transport: BridgeTransport
  voiceMode: VoiceMode
  wakeWordEnabled: boolean
  pushToTalkEnabled: boolean
  sttProvider: string
  ttsProvider: string
  localOrCloudPolicy: SpeechPolicy
  jiraCalendarServerEnabled: boolean
  autoSendTranscripts: boolean
  bridgePollIntervalMs: number
  deviceStatus: DeviceStatus
  pcSpeechSupported: boolean
  pcListening: boolean
  pcSpeaking: boolean
  listening: boolean
  speaking: boolean
  processingCommand: boolean
  lastTranscript?: string
  lastAssistantReply?: string
  lastEventId?: string
  activeVoiceThreadId?: string
  recentEvents: VoiceBridgeEvent[]
  lastBridgeStatus?: VoiceBridgeStatus
  lastError?: string
  setEnabled: (value: boolean) => void
  setPcSpeechEnabled: (value: boolean) => void
  setPcAutoSpeakReplies: (value: boolean) => void
  setEsp32Host: (value: string) => void
  setEsp32BridgePort: (value: number) => void
  setEsp32Transport: (value: BridgeTransport) => void
  setVoiceMode: (value: VoiceMode) => void
  setWakeWordEnabled: (value: boolean) => void
  setPushToTalkEnabled: (value: boolean) => void
  setSttProvider: (value: string) => void
  setTtsProvider: (value: string) => void
  setLocalOrCloudPolicy: (value: SpeechPolicy) => void
  setJiraCalendarServerEnabled: (value: boolean) => void
  setAutoSendTranscripts: (value: boolean) => void
  setBridgePollIntervalMs: (value: number) => void
  updateBridgeStatus: (status: VoiceBridgeStatus) => void
  setRecentEvents: (events: VoiceBridgeEvent[]) => void
  setProcessingCommand: (value: boolean) => void
  setLastTranscript: (value: string | undefined) => void
  setLastAssistantReply: (value: string | undefined) => void
  setLastEventId: (value: string | undefined) => void
  setActiveVoiceThreadId: (value: string | undefined) => void
  setLastError: (value: string | undefined) => void
  setPcSpeechSupported: (value: boolean) => void
  setPcListening: (value: boolean) => void
  setPcSpeaking: (value: boolean) => void
}

export const useVoiceAssistant = create<VoiceAssistantState>()(
  persist(
    (set) => ({
      enabled: true,
      pcSpeechEnabled: true,
      pcAutoSpeakReplies: true,
      esp32Host: '127.0.0.1',
      esp32BridgePort: 4317,
      esp32Transport: 'http',
      voiceMode: 'hybrid',
      wakeWordEnabled: true,
      pushToTalkEnabled: true,
      sttProvider: 'bridge',
      ttsProvider: 'bridge',
      localOrCloudPolicy: 'local_first',
      jiraCalendarServerEnabled: true,
      autoSendTranscripts: true,
      bridgePollIntervalMs: 3000,
      deviceStatus: 'unknown',
      pcSpeechSupported: false,
      pcListening: false,
      pcSpeaking: false,
      listening: false,
      speaking: false,
      processingCommand: false,
      recentEvents: [],
      setEnabled: (value) => set({ enabled: value }),
      setPcSpeechEnabled: (value) => set({ pcSpeechEnabled: value }),
      setPcAutoSpeakReplies: (value) => set({ pcAutoSpeakReplies: value }),
      setEsp32Host: (value) => set({ esp32Host: value }),
      setEsp32BridgePort: (value) => set({ esp32BridgePort: value }),
      setEsp32Transport: (value) => set({ esp32Transport: value }),
      setVoiceMode: (value) => set({ voiceMode: value }),
      setWakeWordEnabled: (value) => set({ wakeWordEnabled: value }),
      setPushToTalkEnabled: (value) => set({ pushToTalkEnabled: value }),
      setSttProvider: (value) => set({ sttProvider: value }),
      setTtsProvider: (value) => set({ ttsProvider: value }),
      setLocalOrCloudPolicy: (value) => set({ localOrCloudPolicy: value }),
      setJiraCalendarServerEnabled: (value) =>
        set({ jiraCalendarServerEnabled: value }),
      setAutoSendTranscripts: (value) => set({ autoSendTranscripts: value }),
      setBridgePollIntervalMs: (value) => set({ bridgePollIntervalMs: value }),
      updateBridgeStatus: (status) =>
        set({
          lastBridgeStatus: status,
          deviceStatus:
            status.device.status === 'online' ? 'online' : 'offline',
          listening: status.listening,
          speaking: status.outputState.speaking || status.playback.active,
        }),
      setRecentEvents: (events) => set({ recentEvents: events }),
      setProcessingCommand: (value) => set({ processingCommand: value }),
      setLastTranscript: (value) => set({ lastTranscript: value }),
      setLastAssistantReply: (value) => set({ lastAssistantReply: value }),
      setLastEventId: (value) => set({ lastEventId: value }),
      setActiveVoiceThreadId: (value) => set({ activeVoiceThreadId: value }),
      setLastError: (value) => set({ lastError: value }),
      setPcSpeechSupported: (value) => set({ pcSpeechSupported: value }),
      setPcListening: (value) => set({ pcListening: value }),
      setPcSpeaking: (value) => set({ pcSpeaking: value }),
    }),
    {
      name: localStorageKey.settingVoiceAssistant,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        pcSpeechEnabled: state.pcSpeechEnabled,
        pcAutoSpeakReplies: state.pcAutoSpeakReplies,
        esp32Host: state.esp32Host,
        esp32BridgePort: state.esp32BridgePort,
        esp32Transport: state.esp32Transport,
        voiceMode: state.voiceMode,
        wakeWordEnabled: state.wakeWordEnabled,
        pushToTalkEnabled: state.pushToTalkEnabled,
        sttProvider: state.sttProvider,
        ttsProvider: state.ttsProvider,
        localOrCloudPolicy: state.localOrCloudPolicy,
        jiraCalendarServerEnabled: state.jiraCalendarServerEnabled,
        autoSendTranscripts: state.autoSendTranscripts,
        bridgePollIntervalMs: state.bridgePollIntervalMs,
      }),
    }
  )
)
