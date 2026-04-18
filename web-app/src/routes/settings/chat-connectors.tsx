import { createFileRoute } from '@tanstack/react-router'
import HeaderPage from '@/containers/HeaderPage'
import SettingsMenu from '@/containers/SettingsMenu'
import { Card, CardItem } from '@/containers/Card'
import { route } from '@/constants/routes'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useChatGatewaySettings } from '@/hooks/useChatGatewaySettings'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute(route.settings.chat_connectors as any)({
  component: ChatConnectorsSettings,
})

function ChatConnectorsSettings() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)
  const [showTelegramToken, setShowTelegramToken] = useState(false)
  const [showDiscordToken, setShowDiscordToken] = useState(false)
  const {
    gatewayHost,
    gatewayPort,
    apiBaseUrl,
    apiKey,
    model,
    systemPrompt,
    maxHistoryMessages,
    telegramEnabled,
    telegramBotToken,
    telegramAllowedChatIds,
    discordEnabled,
    discordBotToken,
    discordApplicationId,
    discordAllowedChannelIds,
    discordPrefix,
    setGatewayHost,
    setGatewayPort,
    setApiBaseUrl,
    setApiKey,
    setModel,
    setSystemPrompt,
    setMaxHistoryMessages,
    setTelegramEnabled,
    setTelegramBotToken,
    setTelegramAllowedChatIds,
    setDiscordEnabled,
    setDiscordBotToken,
    setDiscordApplicationId,
    setDiscordAllowedChannelIds,
    setDiscordPrefix,
    replaceFromGatewayConfig,
  } = useChatGatewaySettings()

  const gatewayBaseUrl = useMemo(
    () => `http://${gatewayHost}:${gatewayPort}`,
    [gatewayHost, gatewayPort]
  )

  const saveConfig = async () => {
    try {
      const response = await fetch(`${gatewayBaseUrl}/config`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          uebot: {
            apiBaseUrl,
            apiKey,
            model,
            systemPrompt,
            maxHistoryMessages,
          },
          telegram: {
            enabled: telegramEnabled,
            botToken: telegramBotToken,
            allowedChatIds: telegramAllowedChatIds,
          },
          discord: {
            enabled: discordEnabled,
            botToken: discordBotToken,
            applicationId: discordApplicationId,
            allowedChannelIds: discordAllowedChannelIds,
            prefix: discordPrefix,
          },
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to save gateway config')
      }

      setHealth(payload.health ?? null)
      toast.success('Đã lưu cấu hình chat gateway')
    } catch (error) {
      toast.error('Không thể lưu cấu hình chat gateway', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const loadConfig = async () => {
    try {
      const [configResponse, healthResponse] = await Promise.all([
        fetch(`${gatewayBaseUrl}/config`),
        fetch(`${gatewayBaseUrl}/health`),
      ])
      const configPayload = await configResponse.json()
      const healthPayload = await healthResponse.json()

      if (!configResponse.ok) {
        throw new Error(configPayload?.error ?? 'Failed to load gateway config')
      }

      replaceFromGatewayConfig({
        apiBaseUrl: configPayload.uebot?.apiBaseUrl ?? apiBaseUrl,
        apiKey: configPayload.uebot?.apiKey ?? '',
        model: configPayload.uebot?.model ?? '',
        systemPrompt: configPayload.uebot?.systemPrompt ?? systemPrompt,
        maxHistoryMessages:
          configPayload.uebot?.maxHistoryMessages ?? maxHistoryMessages,
        telegramEnabled: Boolean(configPayload.telegram?.enabled),
        telegramBotToken: configPayload.telegram?.botToken ?? '',
        telegramAllowedChatIds: configPayload.telegram?.allowedChatIds ?? '',
        discordEnabled: Boolean(configPayload.discord?.enabled),
        discordBotToken: configPayload.discord?.botToken ?? '',
        discordApplicationId: configPayload.discord?.applicationId ?? '',
        discordAllowedChannelIds:
          configPayload.discord?.allowedChannelIds ?? '',
        discordPrefix: configPayload.discord?.prefix ?? '!uebot',
      })
      setHealth(healthPayload ?? null)
      toast.success('Đã nạp cấu hình từ chat gateway')
    } catch (error) {
      toast.error('Không thể kết nối chat gateway', {
        description:
          error instanceof Error
            ? error.message
            : 'Hãy chạy `yarn dev:chat-gateway` trước.',
      })
    }
  }

  return (
    <div className="flex h-svh w-full flex-col">
      <HeaderPage>
        <div className="flex w-full items-center gap-2">
          <span className="font-studio text-base font-medium">
            Chat Connectors
          </span>
        </div>
      </HeaderPage>
      <div className="flex h-[calc(100%-60px)]">
        <SettingsMenu />
        <div className="w-full overflow-y-auto p-4 pt-0">
          <div className="flex flex-col gap-4">
            <Card
              header={
                <div className="mb-4 border-b pb-2">
                  <h1 className="font-studio text-base font-medium text-foreground">
                    Telegram & Discord Gateway
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Kết nối người dùng từ Telegram hoặc Discord vào UE Bot qua
                    Local API Server. Anh cần bật Local API Server và chọn sẵn
                    model mặc định trước khi dùng gateway này.
                  </p>
                </div>
              }
            >
              <CardItem
                title="Gateway endpoint"
                description="Ứng dụng sẽ gọi HTTP admin server của chat gateway để nạp hoặc lưu cấu hình."
                actions={
                  <div className="flex items-center gap-2">
                    <Input
                      value={gatewayHost}
                      onChange={(event) => setGatewayHost(event.target.value)}
                      className="w-40"
                    />
                    <Input
                      type="number"
                      value={gatewayPort}
                      onChange={(event) =>
                        setGatewayPort(Number(event.target.value))
                      }
                      className="w-28"
                    />
                  </div>
                }
              />
              <CardItem
                title="UE Bot Local API"
                className="block"
                description={
                  <div className="space-y-2">
                    <p>
                      Mặc định là `http://127.0.0.1:1337/v1`. Điền model local
                      đang chạy hoặc model mà Local API Server sẽ tự nạp.
                    </p>
                    <Input
                      value={apiBaseUrl}
                      onChange={(event) => setApiBaseUrl(event.target.value)}
                      placeholder="http://127.0.0.1:1337/v1"
                    />
                    <Input
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                      placeholder="ue-bot-core-4b"
                    />
                    <Input
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder="API key nếu Local API Server có bật bảo vệ"
                    />
                    <Input
                      type="number"
                      value={maxHistoryMessages}
                      onChange={(event) =>
                        setMaxHistoryMessages(Number(event.target.value))
                      }
                      placeholder="12"
                    />
                    <Textarea
                      value={systemPrompt}
                      onChange={(event) =>
                        setSystemPrompt(event.target.value)
                      }
                      className="min-h-28"
                    />
                  </div>
                }
              />
              <CardItem
                title="Telegram bot"
                description="Bật nếu muốn người dùng chat trực tiếp với UE Bot qua Telegram."
                actions={
                  <Switch
                    checked={telegramEnabled}
                    onCheckedChange={setTelegramEnabled}
                  />
                }
              />
              <CardItem
                title="Telegram config"
                className="block"
                description={
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type={showTelegramToken ? 'text' : 'password'}
                        value={telegramBotToken}
                        onChange={(event) =>
                          setTelegramBotToken(event.target.value)
                        }
                        placeholder="Telegram bot token"
                        className="pr-12"
                      />
                      <button
                        onClick={() =>
                          setShowTelegramToken((value) => !value)
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-foreground/70 hover:bg-foreground/5"
                      >
                        {showTelegramToken ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    <Input
                      value={telegramAllowedChatIds}
                      onChange={(event) =>
                        setTelegramAllowedChatIds(event.target.value)
                      }
                      placeholder="Danh sách chat_id cho phép, cách nhau bằng dấu phẩy"
                    />
                  </div>
                }
              />
              <CardItem
                title="Discord bot"
                description="Bật nếu muốn người dùng chat với UE Bot qua Discord DM hoặc các kênh được cho phép."
                actions={
                  <Switch
                    checked={discordEnabled}
                    onCheckedChange={setDiscordEnabled}
                  />
                }
              />
              <CardItem
                title="Discord config"
                className="block"
                description={
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type={showDiscordToken ? 'text' : 'password'}
                        value={discordBotToken}
                        onChange={(event) =>
                          setDiscordBotToken(event.target.value)
                        }
                        placeholder="Discord bot token"
                        className="pr-12"
                      />
                      <button
                        onClick={() =>
                          setShowDiscordToken((value) => !value)
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-foreground/70 hover:bg-foreground/5"
                      >
                        {showDiscordToken ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    <Input
                      value={discordApplicationId}
                      onChange={(event) =>
                        setDiscordApplicationId(event.target.value)
                      }
                      placeholder="Discord application ID"
                    />
                    <Input
                      value={discordAllowedChannelIds}
                      onChange={(event) =>
                        setDiscordAllowedChannelIds(event.target.value)
                      }
                      placeholder="Danh sách channel ID cho phép, cách nhau bằng dấu phẩy"
                    />
                    <Input
                      value={discordPrefix}
                      onChange={(event) =>
                        setDiscordPrefix(event.target.value)
                      }
                      placeholder="!uebot"
                    />
                  </div>
                }
              />
              <CardItem
                title="Save / Reload"
                description="Chạy `yarn dev:chat-gateway` hoặc `node companion/chat-gateway/index.mjs`, sau đó dùng hai nút này để đẩy cấu hình vào gateway."
                actions={
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={saveConfig}>
                      Save to Gateway
                    </Button>
                    <Button size="sm" variant="outline" onClick={loadConfig}>
                      Reload Status
                    </Button>
                  </div>
                }
              />
            </Card>

            <Card title="Gateway Status">
              <CardItem
                title="Current health"
                description={
                  <div className="space-y-1 text-sm">
                    <div>Endpoint: {gatewayBaseUrl}</div>
                    <div>
                      Status: {health?.ok ? 'online' : 'offline hoặc chưa kết nối'}
                    </div>
                    <div>
                      Telegram:{' '}
                      {String(
                        (health?.connectors as Record<string, unknown> | undefined)
                          ?.telegram ?? false
                      )}
                    </div>
                    <div>
                      Discord:{' '}
                      {String(
                        (health?.connectors as Record<string, unknown> | undefined)
                          ?.discord ?? false
                      )}
                    </div>
                    <div>
                      Model:{' '}
                      {String(
                        (health?.config as Record<string, unknown> | undefined)
                          ?.model ?? ''
                      )}
                    </div>
                    <div>
                      Last error:{' '}
                      {String((health?.lastError as string | undefined) ?? 'none')}
                    </div>
                  </div>
                }
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
