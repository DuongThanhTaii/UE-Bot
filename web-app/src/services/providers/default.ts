/**
 * Default Providers Service - Generic implementation with minimal returns
 */

import { predefinedProviders } from '@/constants/providers'
import { providerModels } from '@/constants/models'
import { getModelCapabilities } from '@/lib/models'
import type { ProvidersService } from './types'

export class DefaultProvidersService implements ProvidersService {
  async getProviders(): Promise<ModelProvider[]> {
    const builtinProviders = predefinedProviders.map((provider) => {
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
