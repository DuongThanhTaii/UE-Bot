/**
 * CLI Configuration Interface
 */
export interface CLIConfig {
  // Provider settings
  defaultProvider: ProviderType;

  // API Keys
  groqApiKey?: string;
  openaiApiKey?: string;
  claudeApiKey?: string;
  braveApiKey?: string;

  // Default settings
  defaultModel: string;
  maxTokens: number;
  temperature: number;

  // Behavior
  autoApprove: boolean;
  enableTools: boolean;
  streamOutput: boolean;

  // Display
  theme: 'default' | 'minimal' | 'colorful';
  showTokenUsage: boolean;

  // Sessions
  sessionDir: string;
  autoSaveSession: boolean;

  // Advanced
  timeout: number;
  retries: number;
  debug: boolean;
}

/**
 * Provider types
 */
export type ProviderType = 'groq' | 'openai' | 'claude';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: CLIConfig = {
  defaultProvider: 'groq',
  defaultModel: 'llama-3.3-70b-versatile',
  maxTokens: 4096,
  temperature: 0.7,
  autoApprove: false,
  enableTools: true,
  streamOutput: true,
  theme: 'default',
  showTokenUsage: false,
  sessionDir: '~/.ue-bot/sessions',
  autoSaveSession: true,
  timeout: 60000,
  retries: 3,
  debug: false,
};

/**
 * Exit codes for CLI
 */
export const ExitCodes = {
  SUCCESS: 0,
  ERROR: 1,
  TIMEOUT: 2,
  TOOL_DENIED: 3,
  INVALID_INPUT: 4,
  API_ERROR: 5,
} as const;

export type ExitCode = (typeof ExitCodes)[keyof typeof ExitCodes];

/**
 * Chat options
 */
export interface ChatOptions {
  model: string;
  session?: string;
  tools: boolean;
  autoApprove: boolean;
}

/**
 * Run options
 */
export interface RunOptions {
  model: string;
  session?: string;
  tools: boolean;
  autoApprove: boolean;
  output: 'text' | 'json' | 'markdown';
  quiet: boolean;
  stream: boolean;
  maxTokens: string;
  timeout: string;
  context?: boolean;
  stdin?: boolean;
}

/**
 * Available models per provider
 */
export const AVAILABLE_MODELS_BY_PROVIDER: Record<ProviderType, string[]> = {
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
 * Default models per provider
 */
export const DEFAULT_MODELS: Record<ProviderType, string> = {
  groq: 'llama-3.3-70b-versatile',
  openai: 'gpt-4o-mini',
  claude: 'claude-sonnet-4-20250514',
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
 * Available Groq models (legacy, for backward compatibility)
 */
export const AVAILABLE_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
] as const;

export type GroqModel = (typeof AVAILABLE_MODELS)[number];
