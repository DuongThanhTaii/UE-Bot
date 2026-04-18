/**
 * Default Providers Service - Generic implementation with minimal returns
 */

import { predefinedProviders } from '@/constants/providers'
import { providerModels } from '@/constants/models'
import { getModelCapabilities } from '@/lib/models'
import type { ProvidersService } from './types'

declare const IS_WEB_APP: boolean

const LOCAL_ONLY_PROVIDERS = new Set(['llamacpp', 'mlx', 'jan', 'foundation-models'])

export class DefaultProvidersService implements ProvidersService {
  async getProviders(): Promise<ModelProvider[]> {
    const sourceProviders = IS_WEB_APP
      ? predefinedProviders.filter((provider) => !LOCAL_ONLY_PROVIDERS.has(provider.provider))
      : predefinedProviders

    const builtinProviders = sourceProviders.map((provider) => {
      let models = provider.models as Model[]
      if (Object.keys(providerModels).includes(provider.provider)) {
        const builtInModels = providerModels[
          provider.provider as unknown as keyof typeof providerModels
        ].models as unknown as string[]

        if (Array.isArray(builtInModels)) {
          models = builtInModels.map((model) => {
            const modelManifest = models.find((e) => e.id === model)
            return {
              ...(modelManifest ?? { id: model, name: model }),
              capabilities: getModelCapabilities(provider.provider, model),
            } as Model
          })
        }
      }

      return {
        ...provider,
        models,
      }
    })

    return builtinProviders as ModelProvider[]
  }

  async fetchModelsFromProvider(provider: ModelProvider): Promise<string[]> {
    console.log('fetchModelsFromProvider called with provider:', provider)
    return []
  }

  async updateSettings(providerName: string, settings: ProviderSetting[]): Promise<void> {
    console.log('updateSettings called:', { providerName, settings })
    // No-op - not implemented in default service
  }

  fetch(): typeof fetch {
    return fetch
  }
}
