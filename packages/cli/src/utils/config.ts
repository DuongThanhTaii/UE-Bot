import Conf from 'conf';
import type { CLIConfig } from '../types.js';
import { DEFAULT_CONFIG } from '../types.js';

/**
 * Configuration manager using Conf
 */
const config = new Conf<CLIConfig>({
  projectName: 'ue-bot',
  defaults: DEFAULT_CONFIG,
});

/**
 * Get full configuration (with env var overrides)
 */
export function getConfig(): CLIConfig {
  return {
    ...config.store,
    groqApiKey: process.env.GROQ_API_KEY || config.get('groqApiKey'),
    openaiApiKey: process.env.OPENAI_API_KEY || config.get('openaiApiKey'),
    braveApiKey: process.env.BRAVE_API_KEY || config.get('braveApiKey'),
  };
}

/**
 * Get a single config value
 */
export function getConfigValue<K extends keyof CLIConfig>(key: K): CLIConfig[K] {
  if (key === 'groqApiKey') {
    return (process.env.GROQ_API_KEY || config.get(key)) as CLIConfig[K];
  }
  if (key === 'openaiApiKey') {
    return (process.env.OPENAI_API_KEY || config.get(key)) as CLIConfig[K];
  }
  if (key === 'braveApiKey') {
    return (process.env.BRAVE_API_KEY || config.get(key)) as CLIConfig[K];
  }
  return config.get(key);
}

/**
 * Set a config value
 */
export function setConfig<K extends keyof CLIConfig>(key: K, value: CLIConfig[K]): void {
  config.set(key, value);
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  config.clear();
}

/**
 * Get config file path
 */
export function getConfigPath(): string {
  return config.path;
}

/**
 * Validate configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const cfg = getConfig();

  if (!cfg.groqApiKey) {
    errors.push('GROQ_API_KEY not set. Run: ue-bot config set groqApiKey <key>');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a key is sensitive (should be masked)
 */
export function isSensitiveKey(key: string): boolean {
  const sensitivePatterns = ['key', 'secret', 'token', 'password'];
  return sensitivePatterns.some((pattern) => key.toLowerCase().includes(pattern));
}

/**
 * Get all config as object (with masked sensitive values)
 */
export function getSafeConfig(): Record<string, unknown> {
  const cfg = getConfig();
  const safeConfig: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(cfg)) {
    if (isSensitiveKey(key) && value) {
      safeConfig[key] = '***';
    } else {
      safeConfig[key] = value;
    }
  }

  return safeConfig;
}
