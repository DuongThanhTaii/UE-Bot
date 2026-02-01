import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Supported LLM provider types
 */
export type ProviderType = 'groq' | 'openai' | 'claude';

/**
 * Provider configuration
 */
export interface ProviderSettings {
  type: ProviderType;
  apiKey: string;
  model: string;
}

/**
 * Default models for each provider
 */
export const DEFAULT_MODELS: Record<ProviderType, string> = {
  groq: 'llama-3.3-70b-versatile',
  openai: 'gpt-4o-mini',
  claude: 'claude-sonnet-4-20250514',
};

/**
 * Available models for each provider
 */
export const AVAILABLE_MODELS: Record<ProviderType, string[]> = {
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
  ],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  claude: [
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
};

/**
 * Provider display names
 */
export const PROVIDER_NAMES: Record<ProviderType, string> = {
  groq: 'Groq (Free)',
  openai: 'OpenAI',
  claude: 'Anthropic Claude',
};

/**
 * API key placeholders
 */
export const API_KEY_PLACEHOLDERS: Record<ProviderType, string> = {
  groq: 'gsk_xxxxxxxxxxxxx',
  openai: 'sk-xxxxxxxxxxxxx',
  claude: 'sk-ant-xxxxxxxxxxxxx',
};

interface SettingsState {
  provider: ProviderSettings | null;
  isConfigured: boolean;

  // Actions
  setProvider: (provider: ProviderSettings) => void;
  clearProvider: () => void;
  updateApiKey: (apiKey: string) => void;
  updateModel: (model: string) => void;
  updateProviderType: (type: ProviderType) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      provider: null,
      isConfigured: false,

      setProvider: (provider: ProviderSettings) => {
        set({ provider, isConfigured: !!provider.apiKey });
      },

      clearProvider: () => {
        set({ provider: null, isConfigured: false });
      },

      updateApiKey: (apiKey: string) => {
        const current = get().provider;
        if (current) {
          set({
            provider: { ...current, apiKey },
            isConfigured: !!apiKey,
          });
        } else {
          // Default to groq if no provider set
          set({
            provider: {
              type: 'groq',
              apiKey,
              model: DEFAULT_MODELS.groq,
            },
            isConfigured: !!apiKey,
          });
        }
      },

      updateModel: (model: string) => {
        const current = get().provider;
        if (current) {
          set({ provider: { ...current, model } });
        }
      },

      updateProviderType: (type: ProviderType) => {
        const current = get().provider;
        set({
          provider: {
            type,
            apiKey: current?.apiKey ?? '',
            model: DEFAULT_MODELS[type],
          },
          isConfigured: !!current?.apiKey,
        });
      },
    }),
    {
      name: 'ue-bot-settings',
    }
  )
);
