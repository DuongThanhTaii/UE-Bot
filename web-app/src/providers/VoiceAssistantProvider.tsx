import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useServiceHub } from '@/hooks/useServiceHub'
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant'
import { useMCPServers, type MCPServerConfig } from '@/hooks/useMCPServers'
import { useRouter } from '@tanstack/react-router'
import { route } from '@/constants/routes'
import { SESSION_STORAGE_PREFIX } from '@/constants/chat'
import { useModelProvider } from '@/hooks/useModelProvider'
import { defaultModel } from '@/lib/models'
import { useThreads } from '@/hooks/useThreads'
import { useAssistant } from '@/hooks/useAssistant'
import { useMessages } from '@/hooks/useMessages'
import { toast } from 'sonner'
import { useProductivityIntegration } from '@/hooks/useProductivityIntegration'
import { usePcSpeech } from '@/hooks/usePcSpeech'
import { join, resourceDir } from '@tauri-apps/api/path'
import { isDev } from '@/lib/utils'

const MCP_SERVER_NAME = 'productivity-mcp'

type SpeechRecognitionCtor = new () => {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: {
    resultIndex: number
    results: ArrayLike<{
      isFinal: boolean
      0: { transcript: string }
    }>
  }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

const getBridgeBaseUrl = (host: string, port: number) =>
  `http://${host}:${port}`

async function resolveCompanionScriptPath(relativePath: string) {
  if (isDev()) {
    return `./${relativePath}`
  }

  const resourcesPath = await resourceDir()
  return join(resourcesPath, ...relativePath.split('/'))
}

const getAssistantReplyText = (threadId: string) => {
  const messages = useMessages.getState().getMessages(threadId)
  const latestAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')

  if (!latestAssistant) return undefined

  return latestAssistant.content
    .map((part) => part.text?.value ?? '')
    .join('\n')
    .trim()
}

export function VoiceAssistantProvider() {
  const serviceHub = useServiceHub()
  const router = useRouter()
  const {
    enabled,
    pcSpeechEnabled,
    pcAutoSpeakReplies,
    pcSpeechSupported,
    pcListening,
    esp32Host,
    esp32BridgePort,
    bridgePollIntervalMs,
    jiraCalendarServerEnabled,
    autoSendTranscripts,
    deviceStatus,
    lastEventId,
    activeVoiceThreadId,
    processingCommand,
    updateBridgeStatus,
    setRecentEvents,
    setLastEventId,
    setLastTranscript,
    setLastAssistantReply,
    setActiveVoiceThreadId,
    setProcessingCommand,
    setLastError,
    setPcSpeechSupported,
    setPcListening,
    setPcSpeaking,
  } = useVoiceAssistant()
  const { mcpServers, addServer, syncServers } = useMCPServers()
  const productivity = useProductivityIntegration()
  const listeningRequested = usePcSpeech((state) => state.listeningRequested)
  const requestListening = usePcSpeech((state) => state.requestListening)
  const latestReplyRef = useRef<string | undefined>(undefined)
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(
    null
  )
  const activeThreadMessages = useMessages((state) =>
    activeVoiceThreadId ? state.messages[activeVoiceThreadId] ?? [] : []
  )

  const bridgeBaseUrl = useMemo(
    () => getBridgeBaseUrl(esp32Host, esp32BridgePort),
    [esp32BridgePort, esp32Host]
  )

  const submitTranscript = useCallback(
    async (transcript: string, source: 'pc' | 'bridge') => {
      const cleaned = transcript.trim()
      if (!cleaned) return

      setProcessingCommand(true)
      setLastTranscript(cleaned)

      const providerState = useModelProvider.getState()
      const assistantState = useAssistant.getState()
      const provider = providerState.selectedProvider || 'llamacpp'
      const modelId =
        providerState.selectedModel?.id ?? defaultModel(provider)
      const assistant =
        assistantState.assistants.find(
          (item) => item.id === assistantState.defaultAssistantId
        ) ?? assistantState.assistants[0]

      const thread = await useThreads
        .getState()
        .createThread(
          {
            id: modelId,
            provider,
          },
          cleaned,
          assistant
        )

      sessionStorage.setItem(
        `${SESSION_STORAGE_PREFIX.INITIAL_MESSAGE}${thread.id}`,
        JSON.stringify({ text: cleaned, files: [] })
      )

      setActiveVoiceThreadId(thread.id)
      latestReplyRef.current = undefined
      toast.info(
        source === 'pc' ? 'Microphone command received' : 'Voice command received',
        {
          description: cleaned,
        }
      )

      await router.navigate({
        to: route.threadsDetail,
        params: { threadId: thread.id },
      })
    },
    [
      router,
      setActiveVoiceThreadId,
      setLastTranscript,
      setProcessingCommand,
    ]
  )

  useEffect(() => {
    let cancelled = false

    const syncDefaultProductivityServer = async () => {
      const shouldActivate =
        jiraCalendarServerEnabled && productivity.enabled
      const scriptPath = await resolveCompanionScriptPath(
        'companion/productivity-mcp/index.mjs'
      )

      if (cancelled) return

      const nextConfig: MCPServerConfig = {
        type: 'stdio',
        command: 'node',
        args: [scriptPath],
        env: {
          JIRA_BASE_URL: productivity.jiraBaseUrl,
          JIRA_EMAIL: productivity.jiraEmail,
          JIRA_API_TOKEN: productivity.jiraApiToken,
          GOOGLE_ACCESS_TOKEN: productivity.googleAccessToken,
          GOOGLE_CALENDAR_ID: productivity.googleCalendarId,
          GOOGLE_CALENDAR_BASE_URL: productivity.googleCalendarBaseUrl,
        },
        active: shouldActivate,
      }

      const existingConfig = mcpServers[MCP_SERVER_NAME]
      const serializedExisting = existingConfig
        ? JSON.stringify(existingConfig)
        : undefined
      const serializedNext = JSON.stringify(nextConfig)

      if (serializedExisting === serializedNext) return

      addServer(MCP_SERVER_NAME, nextConfig)
      await syncServers()

      if (
        shouldActivate &&
        (!productivity.jiraBaseUrl ||
          !productivity.jiraEmail ||
          !productivity.jiraApiToken ||
          !productivity.googleAccessToken)
      ) {
        toast.warning('Productivity MCP is configured with missing secrets', {
          description:
            'Open Voice & ESP32 settings and complete Jira/Google credentials before using chat tools.',
        })
      }
    }

    void syncDefaultProductivityServer().catch((error) => {
      console.error('Failed to sync default productivity MCP server:', error)
    })

    return () => {
      cancelled = true
    }
  }, [
    addServer,
    jiraCalendarServerEnabled,
    mcpServers,
    productivity.enabled,
    productivity.googleAccessToken,
    productivity.googleCalendarBaseUrl,
    productivity.googleCalendarId,
    productivity.jiraApiToken,
    productivity.jiraBaseUrl,
    productivity.jiraEmail,
    syncServers,
  ])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    const poll = async () => {
      try {
        const status = await serviceHub.voice().getDeviceStatus(bridgeBaseUrl)
        if (cancelled) return
        updateBridgeStatus(status)
        setLastError(undefined)

        const events = await serviceHub
          .voice()
          .getRecentVoiceEvents(bridgeBaseUrl, 25, lastEventId)
        if (cancelled || events.length === 0) return

        const orderedEvents = [...events].reverse()
        setRecentEvents(orderedEvents)

        for (const event of orderedEvents) {
          if (
            event.type === 'transcript_ready' &&
            autoSendTranscripts &&
            !processingCommand
          ) {
            try {
              const transcript = String(event.payload.text ?? '').trim()
              await submitTranscript(transcript, 'bridge')
            } catch (error) {
              setProcessingCommand(false)
              const message =
                error instanceof Error ? error.message : String(error)
              setLastError(message)
              toast.error('Voice command failed', {
                description: message,
              })
            }
          }

          setLastEventId(event.id)
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : String(error)
          setLastError(message)
        }
      }
    }

    void poll()
    const intervalId = window.setInterval(
      () => void poll(),
      bridgePollIntervalMs
    )

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [
    autoSendTranscripts,
    bridgeBaseUrl,
    bridgePollIntervalMs,
    enabled,
    lastEventId,
    processingCommand,
    serviceHub,
    setLastError,
    setLastEventId,
    setProcessingCommand,
    setRecentEvents,
    submitTranscript,
    updateBridgeStatus,
  ])

  useEffect(() => {
    const recognitionCtor =
      (window as Window & {
        SpeechRecognition?: SpeechRecognitionCtor
        webkitSpeechRecognition?: SpeechRecognitionCtor
      }).SpeechRecognition ??
      (window as Window & {
        SpeechRecognition?: SpeechRecognitionCtor
        webkitSpeechRecognition?: SpeechRecognitionCtor
      }).webkitSpeechRecognition

    setPcSpeechSupported(Boolean(recognitionCtor))
  }, [setPcSpeechSupported])

  useEffect(() => {
    if (!pcSpeechEnabled || !pcSpeechSupported) {
      recognitionRef.current?.stop()
      setPcListening(false)
      return
    }

    const recognitionCtor =
      (window as Window & {
        SpeechRecognition?: SpeechRecognitionCtor
        webkitSpeechRecognition?: SpeechRecognitionCtor
      }).SpeechRecognition ??
      (window as Window & {
        SpeechRecognition?: SpeechRecognitionCtor
        webkitSpeechRecognition?: SpeechRecognitionCtor
      }).webkitSpeechRecognition

    if (!recognitionCtor) return

    if (!recognitionRef.current) {
      const recognition = new recognitionCtor()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'vi-VN'
      recognition.onresult = (event) => {
        const transcripts: string[] = []
        for (
          let index = event.resultIndex;
          index < event.results.length;
          index++
        ) {
          const result = event.results[index]
          if (result?.isFinal) {
            transcripts.push(result[0]?.transcript ?? '')
          }
        }
        const finalTranscript = transcripts.join(' ').trim()
        requestListening(false)
        if (finalTranscript) {
          void submitTranscript(finalTranscript, 'pc').catch((error) => {
            const message =
              error instanceof Error ? error.message : String(error)
            setProcessingCommand(false)
            setLastError(message)
          })
        } else {
          setProcessingCommand(false)
        }
      }
      recognition.onerror = (event) => {
        setPcListening(false)
        requestListening(false)
        setLastError(`Speech recognition error: ${event.error}`)
      }
      recognition.onend = () => {
        setPcListening(false)
        requestListening(false)
      }
      recognitionRef.current = recognition
    }

    if (listeningRequested && !pcListening) {
      try {
        recognitionRef.current.start()
        setPcListening(true)
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error))
      }
    } else if (!listeningRequested && pcListening) {
      recognitionRef.current.stop()
      setPcListening(false)
    }
  }, [
    listeningRequested,
    pcListening,
    pcSpeechEnabled,
    pcSpeechSupported,
    requestListening,
    setLastError,
    setPcListening,
    setProcessingCommand,
    submitTranscript,
  ])

  useEffect(() => {
    if (!activeVoiceThreadId || activeThreadMessages.length === 0) return

    const replyText = getAssistantReplyText(activeVoiceThreadId)
    if (!replyText || latestReplyRef.current === replyText) return

    latestReplyRef.current = replyText
    setLastAssistantReply(replyText)
    setProcessingCommand(false)

    if (pcAutoSpeakReplies && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(replyText)
        utterance.lang = 'vi-VN'
        utterance.onstart = () => setPcSpeaking(true)
        utterance.onend = () => setPcSpeaking(false)
        utterance.onerror = () => setPcSpeaking(false)
        window.speechSynthesis.speak(utterance)
      } catch (error) {
        console.error('Failed to speak assistant reply on PC:', error)
      }
    }

    const shouldUseBridge =
      enabled && deviceStatus === 'online' && bridgeBaseUrl.length > 0

    const bridgePromise = shouldUseBridge
      ? serviceHub
          .voice()
          .playTTSAudio(bridgeBaseUrl, {
            text: replyText,
            correlationId: activeVoiceThreadId,
          })
          .catch((error) => {
            console.error(
              'Failed to send assistant reply to ESP32 bridge:',
              error
            )
          })
      : Promise.resolve()

    void bridgePromise.finally(() => {
      setActiveVoiceThreadId(undefined)
    })
  }, [
    activeThreadMessages,
    activeVoiceThreadId,
    bridgeBaseUrl,
    deviceStatus,
    enabled,
    pcAutoSpeakReplies,
    serviceHub,
    setActiveVoiceThreadId,
    setLastAssistantReply,
    setPcSpeaking,
    setProcessingCommand,
  ])

  return null
}
