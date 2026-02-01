/**
 * @fileoverview Provider Factory for creating LLM providers
 * @module @ue-bot/agent-core/llm/factory
 */

import type { LLMProvider } from '../types';
import { ClaudeProvider, type ClaudeConfig } from './claude';
import { GroqProvider, type GroqConfig } from './groq';
import { OpenAIProvider, type OpenAIConfig } from './openai';

/**
 * Supported LLM provider types
 */
export type ProviderType = 'groq' | 'openai' | 'claude';

/**
 * Provider configuration by type
 */
export type ProviderConfig =
  | { type: 'groq'; config: GroqConfig }
  | { type: 'openai'; config: OpenAIConfig }
  | { type: 'claude'; config: ClaudeConfig };

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
 * Create an LLM provider from configuration
 */
export function createProvider(providerConfig: ProviderConfig): LLMProvider {
  switch (providerConfig.type) {
    case 'groq':
      return new GroqProvider(providerConfig.config);
    case 'openai':
      return new OpenAIProvider(providerConfig.config);
    case 'claude':
      return new ClaudeProvider(providerConfig.config);
    default:
      throw new Error(`Unknown provider type: ${(providerConfig as ProviderConfig).type}`);
  }
}

/**
 * Create provider from simple options
 */
export function createProviderFromOptions(options: {
  type: ProviderType;
  apiKey: string;
  model?: string;
}): LLMProvider {
  const { type, apiKey, model } = options;

  switch (type) {
    case 'groq':
      return new GroqProvider({ apiKey, model });
    case 'openai':
      return new OpenAIProvider({ apiKey, model });
    case 'claude':
      return new ClaudeProvider({ apiKey, model });
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * Validate API key format (basic validation)
 */
export function validateApiKey(type: ProviderType, apiKey: string): boolean {
  if (!apiKey || apiKey.trim().length === 0) return false;

  switch (type) {
    case 'groq':
      return apiKey.startsWith('gsk_');
    case 'openai':
      return apiKey.startsWith('sk-');
    case 'claude':
      return apiKey.startsWith('sk-ant-');
    default:
      return true;
  }
}

/**
 * Get API key placeholder for UI
 */
export function getApiKeyPlaceholder(type: ProviderType): string {
  switch (type) {
    case 'groq':
      return 'gsk_xxxxxxxxxxxxx';
    case 'openai':
      return 'sk-xxxxxxxxxxxxx';
    case 'claude':
      return 'sk-ant-xxxxxxxxxxxxx';
    default:
      return 'Enter API key';
  }
}
