# TASK-044: Add Configuration Options

## 📋 Thông tin

- **Phase**: 4 - CLI Interface
- **Priority**: Medium
- **Estimated**: 3 hours
- **Dependencies**: TASK-040

## 🎯 Mục tiêu

Hệ thống configuration cho CLI, lưu settings và API keys.

## 📝 Yêu cầu

### 1. Config Schema

```typescript
// src/types.ts
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
```

### 2. Config Manager

```typescript
// src/utils/config.ts
import Conf from 'conf';
import * as path from 'path';
import * as os from 'os';
import { CLIConfig, DEFAULT_CONFIG } from '../types';

const config = new Conf<CLIConfig>({
  projectName: 'ue-bot',
  defaults: DEFAULT_CONFIG,
  schema: {
    groqApiKey: { type: 'string' },
    openaiApiKey: { type: 'string' },
    braveApiKey: { type: 'string' },
    defaultModel: { type: 'string' },
    maxTokens: { type: 'number', minimum: 1, maximum: 32768 },
    temperature: { type: 'number', minimum: 0, maximum: 2 },
    autoApprove: { type: 'boolean' },
    enableTools: { type: 'boolean' },
    streamOutput: { type: 'boolean' },
    theme: { type: 'string', enum: ['default', 'minimal', 'colorful'] },
    showTokenUsage: { type: 'boolean' },
    sessionDir: { type: 'string' },
    autoSaveSession: { type: 'boolean' },
    timeout: { type: 'number', minimum: 1000 },
    retries: { type: 'number', minimum: 0, maximum: 10 },
    debug: { type: 'boolean' },
  },
});

export function getConfig(): CLIConfig {
  // Also check environment variables
  return {
    ...config.store,
    groqApiKey: process.env.GROQ_API_KEY || config.get('groqApiKey'),
    openaiApiKey: process.env.OPENAI_API_KEY || config.get('openaiApiKey'),
    braveApiKey: process.env.BRAVE_API_KEY || config.get('braveApiKey'),
  };
}

export function setConfig<K extends keyof CLIConfig>(key: K, value: CLIConfig[K]): void {
  config.set(key, value);
}

export function resetConfig(): void {
  config.clear();
}

export function getConfigPath(): string {
  return config.path;
}

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
```

### 3. Config Command

```typescript
// src/commands/config.ts
import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  getConfig,
  setConfig,
  resetConfig,
  getConfigPath,
  validateConfig,
  DEFAULT_CONFIG,
} from '../utils/config';
import type { CLIConfig } from '../types';

export const configCommand = new Command('config').description('Manage CLI configuration');

// Show all config
configCommand
  .command('show')
  .description('Show current configuration')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const config = getConfig();

    if (options.json) {
      // Hide sensitive keys in JSON output
      const safeConfig = {
        ...config,
        groqApiKey: config.groqApiKey ? '***' : undefined,
        openaiApiKey: config.openaiApiKey ? '***' : undefined,
        braveApiKey: config.braveApiKey ? '***' : undefined,
      };
      console.log(JSON.stringify(safeConfig, null, 2));
    } else {
      console.log(chalk.cyan('\n📋 UE-Bot Configuration\n'));
      console.log(chalk.gray(`Config file: ${getConfigPath()}\n`));

      console.log(chalk.bold('API Keys:'));
      console.log(
        `  groqApiKey:    ${config.groqApiKey ? chalk.green('✓ Set') : chalk.red('✗ Not set')}`
      );
      console.log(
        `  openaiApiKey:  ${config.openaiApiKey ? chalk.green('✓ Set') : chalk.gray('Not set')}`
      );
      console.log(
        `  braveApiKey:   ${config.braveApiKey ? chalk.green('✓ Set') : chalk.gray('Not set')}`
      );

      console.log(chalk.bold('\nDefaults:'));
      console.log(`  model:         ${config.defaultModel}`);
      console.log(`  maxTokens:     ${config.maxTokens}`);
      console.log(`  temperature:   ${config.temperature}`);

      console.log(chalk.bold('\nBehavior:'));
      console.log(`  autoApprove:   ${config.autoApprove}`);
      console.log(`  enableTools:   ${config.enableTools}`);
      console.log(`  streamOutput:  ${config.streamOutput}`);

      console.log(chalk.bold('\nDisplay:'));
      console.log(`  theme:         ${config.theme}`);
      console.log(`  showTokenUsage: ${config.showTokenUsage}`);
    }
  });

// Get single value
configCommand
  .command('get <key>')
  .description('Get a configuration value')
  .action((key: keyof CLIConfig) => {
    const config = getConfig();
    const value = config[key];

    if (value === undefined) {
      console.log(chalk.gray('(not set)'));
    } else if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')) {
      console.log('***');
    } else {
      console.log(value);
    }
  });

// Set single value
configCommand
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action((key: keyof CLIConfig, value: string) => {
    // Parse value
    let parsedValue: any = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(Number(value))) parsedValue = Number(value);

    setConfig(key, parsedValue);
    console.log(chalk.green(`✓ Set ${key}`));
  });

// Interactive setup
configCommand
  .command('setup')
  .description('Interactive configuration setup')
  .action(async () => {
    console.log(chalk.cyan('\n🚀 UE-Bot Configuration Setup\n'));

    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'groqApiKey',
        message: 'Groq API Key:',
        mask: '*',
      },
      {
        type: 'list',
        name: 'defaultModel',
        message: 'Default model:',
        choices: [
          'llama-3.3-70b-versatile',
          'llama-3.1-70b-versatile',
          'llama-3.1-8b-instant',
          'mixtral-8x7b-32768',
          'gemma2-9b-it',
        ],
        default: 'llama-3.3-70b-versatile',
      },
      {
        type: 'confirm',
        name: 'enableTools',
        message: 'Enable tool execution?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'autoApprove',
        message: 'Auto-approve tool calls? (not recommended)',
        default: false,
      },
    ]);

    Object.entries(answers).forEach(([key, value]) => {
      if (value) {
        setConfig(key as keyof CLIConfig, value);
      }
    });

    console.log(chalk.green('\n✓ Configuration saved!'));
    console.log(chalk.gray(`Config file: ${getConfigPath()}`));
  });

// Reset config
configCommand
  .command('reset')
  .description('Reset configuration to defaults')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options) => {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to reset all configuration?',
          default: false,
        },
      ]);

      if (!confirm) {
        console.log('Cancelled.');
        return;
      }
    }

    resetConfig();
    console.log(chalk.green('✓ Configuration reset to defaults'));
  });

// Validate config
configCommand
  .command('validate')
  .description('Validate current configuration')
  .action(() => {
    const { valid, errors } = validateConfig();

    if (valid) {
      console.log(chalk.green('✓ Configuration is valid'));
    } else {
      console.log(chalk.red('✗ Configuration errors:'));
      errors.forEach((err) => console.log(chalk.red(`  - ${err}`)));
      process.exit(1);
    }
  });

// Show config path
configCommand
  .command('path')
  .description('Show configuration file path')
  .action(() => {
    console.log(getConfigPath());
  });
```

### 4. Environment Variables

```
# .env.example for CLI
GROQ_API_KEY=gsk_xxxx
OPENAI_API_KEY=sk-xxxx
BRAVE_API_KEY=BSAxxxx

# Optional
UE_BOT_MODEL=llama-3.3-70b-versatile
UE_BOT_AUTO_APPROVE=false
UE_BOT_DEBUG=false
```

## ✅ Acceptance Criteria

- [ ] `ue-bot config show` hiển thị config
- [ ] `ue-bot config set <key> <value>` hoạt động
- [ ] `ue-bot config get <key>` hoạt động
- [ ] `ue-bot config setup` wizard hoạt động
- [ ] API keys được mask khi hiển thị
- [ ] Environment variables override config file
- [ ] Config file ở đúng vị trí (~/.config/ue-bot)

## 🧪 Test Cases

```bash
# Setup wizard
ue-bot config setup

# Show config
ue-bot config show

# Get single value
ue-bot config get defaultModel

# Set value
ue-bot config set maxTokens 2048

# Validate
ue-bot config validate

# Get path
ue-bot config path

# JSON output
ue-bot config show --json

# Reset
ue-bot config reset -f
```

## 📚 Resources

- [Conf Package](https://github.com/sindresorhus/conf)
- [XDG Base Directory](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)
