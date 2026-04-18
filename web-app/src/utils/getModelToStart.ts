import { localStorageKey } from '@/constants/localStorage'
import type { ModelInfo } from '@janhq/core'
import { isPlatformTauri } from '@/lib/platform/utils'

export const getLastUsedModel = (): {
  provider: string
  model: string
} | null => {
  try {
    const stored = localStorage.getItem(localStorageKey.lastUsedModel)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.debug('Failed to get last used model from localStorage:', error)
    return null
  }
}

// Helper function to determine which model to start
export const getModelToStart = (params: {
  selectedModel?: ModelInfo | null
  selectedProvider?: string | null
  getProviderByName: (name: string) => ModelProvider | undefined
}): { model: string; provider: ModelProvider } | null => {
  const { selectedModel, selectedProvider, getProviderByName } = params

  const getPreferredProvider = () =>
    isPlatformTauri() ? getProviderByName('llamacpp') : getProviderByName('groq')

  const getAnyProviderWithModel = () => {
    const preferred = getPreferredProvider()
    if (preferred?.models?.length) return preferred

    const fallbackProviderNames = [
      'groq',
      'openai',
      'openrouter',
      'anthropic',
      'gemini',
      'mistral',
      'llamacpp',
      'jan',
    ]

    for (const providerName of fallbackProviderNames) {
      const provider = getProviderByName(providerName)
      if (provider?.models?.length) return provider
    }

    return null
  }

  // Use last used model if available
  const lastUsedModel = getLastUsedModel()
  if (lastUsedModel) {
    const provider = getProviderByName(lastUsedModel.provider)
    if (provider && provider.models.some((m) => m.id === lastUsedModel.model)) {
      return { model: lastUsedModel.model, provider }
    } else {
      const fallbackProvider = getAnyProviderWithModel()
      if (fallbackProvider) {
        return {
          model: fallbackProvider.models[0].id,
          provider: fallbackProvider,
        }
      }
    }
  }

  // Use selected model if available
  if (selectedModel && selectedProvider) {
    const provider = getProviderByName(selectedProvider)
    if (provider) {
      return { model: selectedModel.id, provider }
    }
  }

  const fallbackProvider = getAnyProviderWithModel()
  if (fallbackProvider) {
    return {
      model: fallbackProvider.models[0].id,
      provider: fallbackProvider,
    }
  }

  return null
}
