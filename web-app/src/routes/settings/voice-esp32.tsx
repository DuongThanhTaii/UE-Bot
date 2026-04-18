import { createFileRoute } from '@tanstack/react-router'
import { route } from '@/constants/routes'
import HeaderPage from '@/containers/HeaderPage'
import SettingsMenu from '@/containers/SettingsMenu'
import { Card, CardItem } from '@/containers/Card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant'
import { useServiceHub } from '@/hooks/useServiceHub'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useState } from 'react'
import { useProductivityIntegration } from '@/hooks/useProductivityIntegration'
import { Eye, EyeOff } from 'lucide-react'
import { usePcSpeech } from '@/hooks/usePcSpeech'
import { toast } from 'sonner'
import { openUrl } from '@tauri-apps/plugin-opener'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute(route.settings.voice_esp32 as any)({
  component: VoiceEsp32Settings,
})

function VoiceEsp32Settings() {
  const serviceHub = useServiceHub()
  const [showJiraToken, setShowJiraToken] = useState(false)
  const [showGoogleToken, setShowGoogleToken] = useState(false)
  const [showGoogleClientSecret, setShowGoogleClientSecret] = useState(false)
  const [showJiraClientSecret, setShowJiraClientSecret] = useState(false)
  const [googleOAuthStatus, setGoogleOAuthStatus] = useState<Record<string, unknown> | null>(null)
  const [jiraOAuthStatus, setJiraOAuthStatus] = useState<Record<string, unknown> | null>(null)
  const {
    enabled,
    pcSpeechEnabled,
    pcAutoSpeakReplies,
    pcSpeechSupported,
    pcListening,
    pcSpeaking,
    esp32Host,
    esp32BridgePort,
    wakeWordEnabled,
    pushToTalkEnabled,
    autoSendTranscripts,
    jiraCalendarServerEnabled,
    voiceMode,
    sttProvider,
    ttsProvider,
    localOrCloudPolicy,
    deviceStatus,
    listening,
    speaking,
    processingCommand,
    lastTranscript,
    lastAssistantReply,
    lastError,
    setEnabled,
    setPcSpeechEnabled,
    setPcAutoSpeakReplies,
    setEsp32Host,
    setEsp32BridgePort,
    setWakeWordEnabled,
    setPushToTalkEnabled,
    setAutoSendTranscripts,
    setJiraCalendarServerEnabled,
    setVoiceMode,
    setSttProvider,
    setTtsProvider,
    setLocalOrCloudPolicy,
  } = useVoiceAssistant()
  const requestListening = usePcSpeech((state) => state.requestListening)
  const {
    enabled: productivityEnabled,
    jiraBaseUrl,
    jiraEmail,
    jiraApiToken,
    jiraOAuthClientId,
    jiraOAuthClientSecret,
    googleAccessToken,
    googleOAuthClientId,
    googleOAuthClientSecret,
    googleCalendarId,
    googleCalendarBaseUrl,
    setEnabled: setProductivityEnabled,
    setJiraBaseUrl,
    setJiraEmail,
    setJiraApiToken,
    setJiraOAuthClientId,
    setJiraOAuthClientSecret,
    setGoogleAccessToken,
    setGoogleOAuthClientId,
    setGoogleOAuthClientSecret,
    setGoogleCalendarId,
    setGoogleCalendarBaseUrl,
  } = useProductivityIntegration()

  const bridgeBaseUrl = useMemo(
    () => `http://${esp32Host}:${esp32BridgePort}`,
    [esp32BridgePort, esp32Host]
  )
  const productivityOAuthBaseUrl = 'http://127.0.0.1:38973'

  useEffect(() => {
    let mounted = true
    const loadStatus = async () => {
      try {
        const [googleResponse, jiraResponse] = await Promise.all([
          fetch(`${productivityOAuthBaseUrl}/auth/google/status`),
          fetch(`${productivityOAuthBaseUrl}/auth/jira/status`),
        ])
        if (!mounted) return
        setGoogleOAuthStatus(
          googleResponse.ok ? await googleResponse.json() : null
        )
        setJiraOAuthStatus(jiraResponse.ok ? await jiraResponse.json() : null)
      } catch {
        if (!mounted) return
        setGoogleOAuthStatus(null)
        setJiraOAuthStatus(null)
      }
    }

    void loadStatus()
    const interval = setInterval(() => {
      void loadStatus()
    }, 5000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const connectGoogleOAuth = async () => {
    if (!googleOAuthClientId || !googleOAuthClientSecret) {
      toast.error('Missing Google OAuth client credentials')
      return
    }
    const url = new URL(`${productivityOAuthBaseUrl}/auth/google/start`)
    url.searchParams.set('client_id', googleOAuthClientId)
    url.searchParams.set('client_secret', googleOAuthClientSecret)
    await openUrl(url.toString())
  }

  const connectJiraOAuth = async () => {
    if (!jiraOAuthClientId || !jiraOAuthClientSecret) {
      toast.error('Missing Jira OAuth client credentials')
      return
    }
    const url = new URL(`${productivityOAuthBaseUrl}/auth/jira/start`)
    url.searchParams.set('client_id', jiraOAuthClientId)
    url.searchParams.set('client_secret', jiraOAuthClientSecret)
    if (jiraBaseUrl) {
      url.searchParams.set('base_url', jiraBaseUrl)
    }
    await openUrl(url.toString())
  }

  const disconnectOAuth = async (provider: 'google' | 'jira') => {
    await fetch(`${productivityOAuthBaseUrl}/auth/${provider}/disconnect`)
    if (provider === 'google') setGoogleOAuthStatus(null)
    if (provider === 'jira') setJiraOAuthStatus(null)
  }

  return (
    <div className="flex flex-col h-svh w-full">
      <HeaderPage>
        <div
          className={cn(
            'flex items-center justify-between w-full mr-2 pr-3',
            !IS_MACOS && 'pr-30'
          )}
        >
          <span className="font-medium text-base font-studio">Settings</span>
        </div>
      </HeaderPage>
      <div className="flex h-[calc(100%-60px)]">
        <SettingsMenu />
        <div className="p-4 pt-0 w-full overflow-y-auto">
          <div className="flex flex-col gap-4">
            <Card
              header={
                <div className="mb-4 border-b pb-2">
                  <h1 className="text-base font-medium text-foreground font-studio">
                    Voice &amp; ESP32
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure the local ESP32 bridge, voice trigger behavior, and
                    the companion MCP server for Jira and Google Calendar.
                  </p>
                </div>
              }
            >
              <CardItem
                title="Enable voice workflow"
                description="Poll the local bridge and let transcript events open UE Bot threads automatically."
                actions={
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                }
              />
              <CardItem
                title="PC microphone input"
                description="Use Web Speech API on this machine before ESP32 is ready."
                actions={
                  <Switch
                    checked={pcSpeechEnabled}
                    onCheckedChange={setPcSpeechEnabled}
                  />
                }
              />
              <CardItem
                title="Auto-speak replies on PC"
                description="Read assistant responses through the current computer speakers."
                actions={
                  <Switch
                    checked={pcAutoSpeakReplies}
                    onCheckedChange={setPcAutoSpeakReplies}
                  />
                }
              />
              <CardItem
                title="ESP32 bridge host"
                description="Local bridge endpoint used by the desktop app."
                actions={
                  <div className="flex items-center gap-2">
                    <Input
                      value={esp32Host}
                      onChange={(event) => setEsp32Host(event.target.value)}
                      className="w-44"
                    />
                    <Input
                      type="number"
                      value={esp32BridgePort}
                      onChange={(event) =>
                        setEsp32BridgePort(Number(event.target.value))
                      }
                      className="w-28"
                    />
                  </div>
                }
              />
              <CardItem
                title="Voice mode"
                description="Hybrid keeps both wake word and push-to-talk active."
                actions={
                  <Input
                    value={voiceMode}
                    onChange={(event) =>
                      setVoiceMode(event.target.value as typeof voiceMode)
                    }
                    className="w-32"
                  />
                }
              />
              <CardItem
                title="Wake word"
                description="Keep wake-word events enabled for hands-free activation."
                actions={
                  <Switch
                    checked={wakeWordEnabled}
                    onCheckedChange={setWakeWordEnabled}
                  />
                }
              />
              <CardItem
                title="Push-to-talk"
                description="Recommended fallback when voice recognition is noisy."
                actions={
                  <Switch
                    checked={pushToTalkEnabled}
                    onCheckedChange={setPushToTalkEnabled}
                  />
                }
              />
              <CardItem
                title="Auto-send transcripts"
                description="When enabled, `transcript_ready` events open a new chat thread and submit the prompt automatically."
                actions={
                  <Switch
                    checked={autoSendTranscripts}
                    onCheckedChange={setAutoSendTranscripts}
                  />
                }
              />
              <CardItem
                title="Productivity MCP server"
                description="Auto-register a local MCP server exposing Jira and Google Calendar tools."
                actions={
                  <Switch
                    checked={jiraCalendarServerEnabled}
                    onCheckedChange={setJiraCalendarServerEnabled}
                  />
                }
              />
            </Card>

            <Card title="Speech Pipeline">
              <CardItem
                title="PC speech runtime"
                description={
                  <div className="space-y-1">
                    <div>Supported: {String(pcSpeechSupported)}</div>
                    <div>Listening: {String(pcListening)}</div>
                    <div>Speaking: {String(pcSpeaking)}</div>
                  </div>
                }
                actions={
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!pcSpeechSupported || !pcSpeechEnabled}
                    onClick={() => requestListening(!pcListening)}
                  >
                    {pcListening ? 'Stop Mic' : 'Start Mic'}
                  </Button>
                }
              />
              <CardItem
                title="STT provider"
                description="Current pipeline placeholder. Replace with a local or cloud STT backend later."
                actions={
                  <Input
                    value={sttProvider}
                    onChange={(event) => setSttProvider(event.target.value)}
                    className="w-40"
                  />
                }
              />
              <CardItem
                title="TTS provider"
                description="Bridge playback currently accepts text payloads; attach your actual TTS backend behind the bridge."
                actions={
                  <Input
                    value={ttsProvider}
                    onChange={(event) => setTtsProvider(event.target.value)}
                    className="w-40"
                  />
                }
              />
              <CardItem
                title="Local/cloud policy"
                description="Use this to document your preferred routing once local speech components are plugged in."
                actions={
                  <Input
                    value={localOrCloudPolicy}
                    onChange={(event) =>
                      setLocalOrCloudPolicy(
                        event.target.value as typeof localOrCloudPolicy
                      )
                    }
                    className="w-40"
                  />
                }
              />
            </Card>

            <Card title="Jira & Google Calendar">
              <CardItem
                title="Enable productivity tools"
                description="Expose Jira and Google Calendar tools to UE Bot through the local MCP server."
                actions={
                  <Switch
                    checked={productivityEnabled}
                    onCheckedChange={setProductivityEnabled}
                  />
                }
              />
              <CardItem
                title="Google OAuth app"
                className="block"
                description={
                  <div className="space-y-2">
                    <p>
                      Use a Google OAuth desktop/web app to log in without pasting an access token manually.
                    </p>
                    <Input
                      value={googleOAuthClientId}
                      onChange={(event) =>
                        setGoogleOAuthClientId(event.target.value)
                      }
                      placeholder="Google OAuth client ID"
                    />
                    <div className="relative">
                      <Input
                        type={showGoogleClientSecret ? 'text' : 'password'}
                        value={googleOAuthClientSecret}
                        onChange={(event) =>
                          setGoogleOAuthClientSecret(event.target.value)
                        }
                        placeholder="Google OAuth client secret"
                        className="pr-12"
                      />
                      <button
                        onClick={() =>
                          setShowGoogleClientSecret((value) => !value)
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-foreground/5 text-foreground/70"
                      >
                        {showGoogleClientSecret ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => void connectGoogleOAuth()}>
                        Connect Google
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void disconnectOAuth('google')}>
                        Disconnect
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {googleOAuthStatus?.connected
                          ? `Connected${googleOAuthStatus?.email ? `: ${String(googleOAuthStatus.email)}` : ''}`
                          : 'Not connected'}
                      </span>
                    </div>
                  </div>
                }
              />
              <CardItem
                title="Jira base URL"
                className="block"
                description={
                  <div className="space-y-2">
                    <p>
                      Example: `https://your-company.atlassian.net`. These
                      values are injected into the `productivity-mcp` server and
                      are then usable from normal chat.
                    </p>
                    <Input
                      value={jiraBaseUrl}
                      onChange={(event) =>
                        setJiraBaseUrl(event.target.value)
                      }
                      placeholder="https://your-company.atlassian.net"
                    />
                  </div>
                }
              />
              <CardItem
                title="Jira OAuth app"
                className="block"
                description={
                  <div className="space-y-2">
                    <p>
                      Use an Atlassian OAuth 2.0 app to log in and call Jira without storing a personal API token.
                    </p>
                    <Input
                      value={jiraOAuthClientId}
                      onChange={(event) =>
                        setJiraOAuthClientId(event.target.value)
                      }
                      placeholder="Atlassian OAuth client ID"
                    />
                    <div className="relative">
                      <Input
                        type={showJiraClientSecret ? 'text' : 'password'}
                        value={jiraOAuthClientSecret}
                        onChange={(event) =>
                          setJiraOAuthClientSecret(event.target.value)
                        }
                        placeholder="Atlassian OAuth client secret"
                        className="pr-12"
                      />
                      <button
                        onClick={() =>
                          setShowJiraClientSecret((value) => !value)
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-foreground/5 text-foreground/70"
                      >
                        {showJiraClientSecret ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => void connectJiraOAuth()}>
                        Connect Jira
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void disconnectOAuth('jira')}>
                        Disconnect
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {jiraOAuthStatus?.connected
                          ? `Connected${jiraOAuthStatus?.baseUrl ? `: ${String(jiraOAuthStatus.baseUrl)}` : ''}`
                          : 'Not connected'}
                      </span>
                    </div>
                  </div>
                }
              />
              <CardItem
                title="Jira credentials"
                className="block"
                description={
                  <div className="space-y-2">
                    <p>Use your Jira email and API token.</p>
                    <Input
                      value={jiraEmail}
                      onChange={(event) => setJiraEmail(event.target.value)}
                      placeholder="jira-email@example.com"
                    />
                    <div className="relative">
                      <Input
                        type={showJiraToken ? 'text' : 'password'}
                        value={jiraApiToken}
                        onChange={(event) =>
                          setJiraApiToken(event.target.value)
                        }
                        placeholder="Jira API token"
                        className="pr-12"
                      />
                      <button
                        onClick={() => setShowJiraToken((value) => !value)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-foreground/5 text-foreground/70"
                      >
                        {showJiraToken ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                }
              />
              <CardItem
                title="Google Calendar token"
                className="block"
                description={
                  <div className="space-y-2">
                    <p>
                      Paste an OAuth access token with Calendar scope. The MCP
                      server will use `primary` unless you override the calendar
                      ID below.
                    </p>
                    <div className="relative">
                      <Input
                        type={showGoogleToken ? 'text' : 'password'}
                        value={googleAccessToken}
                        onChange={(event) =>
                          setGoogleAccessToken(event.target.value)
                        }
                        placeholder="Google access token"
                        className="pr-12"
                      />
                      <button
                        onClick={() => setShowGoogleToken((value) => !value)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-foreground/5 text-foreground/70"
                      >
                        {showGoogleToken ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    <Input
                      value={googleCalendarId}
                      onChange={(event) =>
                        setGoogleCalendarId(event.target.value)
                      }
                      placeholder="primary"
                    />
                    <Input
                      value={googleCalendarBaseUrl}
                      onChange={(event) =>
                        setGoogleCalendarBaseUrl(event.target.value)
                      }
                      placeholder="https://www.googleapis.com/"
                    />
                  </div>
                }
              />
            </Card>

            <Card title="Bridge Status">
              <CardItem
                title="Current status"
                description={
                  <div className="space-y-1">
                    <div>Bridge: {bridgeBaseUrl}</div>
                    <div>Device: {deviceStatus}</div>
                    <div>Listening: {String(listening)}</div>
                    <div>Speaking: {String(speaking)}</div>
                    <div>Processing command: {String(processingCommand)}</div>
                    {lastError && (
                      <div className="text-red-500">Error: {lastError}</div>
                    )}
                  </div>
                }
                actions={
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void serviceHub.voice().startListening(bridgeBaseUrl)
                      }
                    >
                      Start
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void serviceHub.voice().stopListening(bridgeBaseUrl)
                      }
                    >
                      Stop
                    </Button>
                  </div>
                }
              />
              <CardItem
                title="Last transcript"
                description={lastTranscript || 'No transcript received yet.'}
              />
              <CardItem
                title="Last assistant reply"
                description={lastAssistantReply || 'No spoken reply has been sent yet.'}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
