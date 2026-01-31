/**
 * CLI Configuration Interface
 */
export interface CLIConfig {
  // API Keys
  groqApiKey?: string;
  openaiApiKey?: string;
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
 * Default configuration values
 */
export const DEFAULT_CONFIG: CLIConfig = {
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
 * Available Groq models
 */
export const AVAILABLE_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
] as const;

export type GroqModel = (typeof AVAILABLE_MODELS)[number];
