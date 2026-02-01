import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import type { CLIConfig, ProviderType } from '../types.js';
import { AVAILABLE_MODELS_BY_PROVIDER, DEFAULT_MODELS, PROVIDER_NAMES } from '../types.js';
import {
  getConfig,
  getConfigPath,
  getSafeConfig,
  isSensitiveKey,
  resetConfig,
  setConfig,
  validateConfig,
} from '../utils/index.js';

export const configCommand = new Command('config').description('Manage CLI configuration');

// Show all config
configCommand
  .command('show')
  .description('Show current configuration')
  .option('--json', 'Output as JSON')
  .action((options: { json?: boolean }) => {
    const config = getConfig();

    if (options.json) {
      console.log(JSON.stringify(getSafeConfig(), null, 2));
    } else {
      console.log(chalk.cyan('\n📋 UE-Bot Configuration\n'));
      console.log(chalk.gray(`Config file: ${getConfigPath()}\n`));

      console.log(chalk.bold('Provider:'));
      console.log(
        `  provider:      ${PROVIDER_NAMES[config.defaultProvider as ProviderType] || config.defaultProvider}`
      );

      console.log(chalk.bold('\nAPI Keys:'));
      console.log(
        `  groqApiKey:    ${config.groqApiKey ? chalk.green('✓ Set') : chalk.red('✗ Not set')}`
      );
      console.log(
        `  openaiApiKey:  ${config.openaiApiKey ? chalk.green('✓ Set') : chalk.gray('Not set')}`
      );
      console.log(
        `  claudeApiKey:  ${config.claudeApiKey ? chalk.green('✓ Set') : chalk.gray('Not set')}`
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
      console.log();
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
    } else if (isSensitiveKey(key)) {
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
    let parsedValue: unknown = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(Number(value))) parsedValue = Number(value);

    setConfig(key, parsedValue as CLIConfig[keyof CLIConfig]);
    console.log(chalk.green(`✓ Set ${key}`));
  });

// Interactive setup
configCommand
  .command('setup')
  .description('Interactive configuration setup')
  .action(async () => {
    console.log(chalk.cyan('\n🚀 UE-Bot Configuration Setup\n'));

    // First, select provider
    const { provider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select LLM Provider:',
        choices: [
          { name: '🆓 Groq (Free - Fast inference)', value: 'groq' },
          { name: '🤖 OpenAI (Best tool support)', value: 'openai' },
          { name: '🧠 Claude (Best reasoning)', value: 'claude' },
        ],
        default: 'groq',
      },
    ]);

    // API Key based on provider
    const apiKeyPrompts: Record<ProviderType, { message: string; key: keyof CLIConfig }> = {
      groq: {
        message: 'Groq API Key (get from https://console.groq.com/keys):',
        key: 'groqApiKey',
      },
      openai: {
        message: 'OpenAI API Key (get from https://platform.openai.com/api-keys):',
        key: 'openaiApiKey',
      },
      claude: {
        message: 'Claude API Key (get from https://console.anthropic.com/settings/keys):',
        key: 'claudeApiKey',
      },
    };

    const apiKeyConfig = apiKeyPrompts[provider as ProviderType];

    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: apiKeyConfig.message,
        mask: '*',
      },
      {
        type: 'list',
        name: 'defaultModel',
        message: 'Default model:',
        choices: AVAILABLE_MODELS_BY_PROVIDER[provider as ProviderType],
        default: DEFAULT_MODELS[provider as ProviderType],
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

    // Save config
    setConfig('defaultProvider', provider);
    setConfig(apiKeyConfig.key, answers.apiKey);
    setConfig('defaultModel', answers.defaultModel);
    setConfig('enableTools', answers.enableTools);
    setConfig('autoApprove', answers.autoApprove);

    console.log(chalk.green('\n✓ Configuration saved!'));
    console.log(chalk.gray(`Config file: ${getConfigPath()}`));
    console.log(chalk.cyan(`\nYou can now start chatting with: ${chalk.bold('ue-bot chat')}`));
  });

// Reset config
configCommand
  .command('reset')
  .description('Reset configuration to defaults')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options: { force?: boolean }) => {
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
      for (const err of errors) {
        console.log(chalk.red(`  - ${err}`));
      }
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
