import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { localStorageKey } from '@/constants/localStorage'

type ChatGatewaySettingsState = {
  gatewayHost: string
  gatewayPort: number
  apiBaseUrl: string
  apiKey: string
  model: string
  systemPrompt: string
  maxHistoryMessages: number
  telegramEnabled: boolean
  telegramBotToken: string
  telegramAllowedChatIds: string
  discordEnabled: boolean
  discordBotToken: string
  discordApplicationId: string
  discordAllowedChannelIds: string
  discordPrefix: string
  setGatewayHost: (value: string) => void
  setGatewayPort: (value: number) => void
  setApiBaseUrl: (value: string) => void
  setApiKey: (value: string) => void
  setModel: (value: string) => void
  setSystemPrompt: (value: string) => void
  setMaxHistoryMessages: (value: number) => void
  setTelegramEnabled: (value: boolean) => void
  setTelegramBotToken: (value: string) => void
  setTelegramAllowedChatIds: (value: string) => void
  setDiscordEnabled: (value: boolean) => void
  setDiscordBotToken: (value: string) => void
  setDiscordApplicationId: (value: string) => void
  setDiscordAllowedChannelIds: (value: string) => void
  setDiscordPrefix: (value: string) => void
  replaceFromGatewayConfig: (
    value: Partial<Omit<ChatGatewaySettingsState, keyof ChatGatewaySettingsActions>>
  ) => void
}

type ChatGatewaySettingsActions =
  | 'setGatewayHost'
  | 'setGatewayPort'
  | 'setApiBaseUrl'
  | 'setApiKey'
  | 'setModel'
  | 'setSystemPrompt'
  | 'setMaxHistoryMessages'
  | 'setTelegramEnabled'
  | 'setTelegramBotToken'
  | 'setTelegramAllowedChatIds'
  | 'setDiscordEnabled'
  | 'setDiscordBotToken'
  | 'setDiscordApplicationId'
  | 'setDiscordAllowedChannelIds'
  | 'setDiscordPrefix'
  | 'replaceFromGatewayConfig'

export const useChatGatewaySettings = create<ChatGatewaySettingsState>()(
  persist(
    (set) => ({
      gatewayHost: '127.0.0.1',
      gatewayPort: 38975,
      apiBaseUrl: 'http://127.0.0.1:1337/v1',
      apiKey: '',
      model: '',
      systemPrompt:
        'You are UE Bot. Reply helpfully and concisely. If the user request is unclear, ask a short follow-up question.',
      maxHistoryMessages: 12,
      telegramEnabled: false,
      telegramBotToken: '',
      telegramAllowedChatIds: '',
      discordEnabled: false,
      discordBotToken: '',
      discordApplicationId: '',
      discordAllowedChannelIds: '',
      discordPrefix: '!uebot',
      setGatewayHost: (value) => set({ gatewayHost: value }),
      setGatewayPort: (value) => set({ gatewayPort: value }),
      setApiBaseUrl: (value) => set({ apiBaseUrl: value }),
      setApiKey: (value) => set({ apiKey: value }),
      setModel: (value) => set({ model: value }),
      setSystemPrompt: (value) => set({ systemPrompt: value }),
      setMaxHistoryMessages: (value) => set({ maxHistoryMessages: value }),
      setTelegramEnabled: (value) => set({ telegramEnabled: value }),
      setTelegramBotToken: (value) => set({ telegramBotToken: value }),
      setTelegramAllowedChatIds: (value) =>
        set({ telegramAllowedChatIds: value }),
      setDiscordEnabled: (value) => set({ discordEnabled: value }),
      setDiscordBotToken: (value) => set({ discordBotToken: value }),
      setDiscordApplicationId: (value) =>
        set({ discordApplicationId: value }),
      setDiscordAllowedChannelIds: (value) =>
        set({ discordAllowedChannelIds: value }),
      setDiscordPrefix: (value) => set({ discordPrefix: value }),
      replaceFromGatewayConfig: (value) => set(value),
    }),
    {
      name: localStorageKey.settingChatGateway,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
