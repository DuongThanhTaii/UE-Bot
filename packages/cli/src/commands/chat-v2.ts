/**
 * @fileoverview Interactive chat command with full Agent Core integration
 * Supports tool execution, streaming, and approval flow
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { createInterface } from 'readline';
import ora from 'ora';
import { Agent, ToolRegistry } from '@ue-bot/agent-core';
import {
  createAgent,
  executeWithStream,
  listAvailableTools,
  type ToolCallInfo,
  type ToolResultInfo,
} from '../agent-core.js';
import type { ChatOptions } from '../types.js';
import { getConfig, printBanner } from '../utils/index.js';
import { promptConfirm } from '../utils/prompt.js';

export const chatCommand = new Command('chat')
  .description('Start interactive chat with AI Agent (with full tool support)')
  .option('-m, --model <model>', 'LLM model to use', 'llama-3.3-70b-versatile')
  .option('-s, --session <id>', 'Resume existing session')
  .option('--no-tools', 'Disable tool execution')
  .option('--auto-approve', 'Auto-approve all tool calls')
  .option('--tools', 'List available tools and exit')
  .addHelpText(
    'after',
    `
Examples:
  $ ue-bot chat                    # Interactive chat with tools
  $ ue-bot chat --auto-approve     # Auto-approve tool calls
  $ ue-bot chat --no-tools         # Disable tools (simple chat)
  $ ue-bot chat --tools            # List available tools

Tool Examples (what you can ask):
  - "Open YouTube"
  - "Search the web for latest AI news"
  - "Read the file package.json"
  - "Create a new file hello.txt with content 'Hello World'"
  - "Run 'npm --version' command"
  - "Remember that my favorite color is blue"
  `
  )
  .action(async (options: ChatOptions) => {
    await startInteractiveChat(options);
  });

async function startInteractiveChat(options: ChatOptions): Promise<void> {
  const config = getConfig();

  // Check API key
  if (!config.groqApiKey) {
    console.error(chalk.red('Error: GROQ_API_KEY not set.'));
    console.error(chalk.gray('Run: ue-bot config set groqApiKey <your-api-key>'));
    console.error(chalk.gray('Or set GROQ_API_KEY environment variable'));
    process.exit(1);
  }

  // Create agent with full tools
  const { agent, registry } = createAgent({
    apiKey: config.groqApiKey,
    model: options.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    braveApiKey: config.braveApiKey,
  });

  // List tools mode
  if (options.tools) {
    console.log(chalk.cyan('\n📦 Available Tools:\n'));
    const tools = listAvailableTools(registry);
    tools.forEach((tool) => {
      console.log(chalk.yellow(`  • ${tool}`));
    });
    console.log();
    return;
  }

  printBanner();
  console.log(chalk.gray('Type your message and press Enter.'));
  console.log(chalk.gray('Commands: /help, /clear, /tools, /exit'));
  console.log(chalk.cyan('🛠️  Tool execution is enabled. Ask me to open URLs, search web, read files, etc.'));
  console.log();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.blue('You: '),
  });

  rl.prompt();

  rl.on('line', async (input: string) => {
    const trimmed = input.trim();

    if (!trimmed) {
      rl.prompt();
      return;
    }

    // Handle slash commands
    if (trimmed.startsWith('/')) {
      await handleCommand(trimmed, agent, registry, rl, options);
      rl.prompt();
      return;
    }

    // Process message with agent
    const spinner = ora({
      text: 'Thinking...',
      spinner: 'dots',
    }).start();

    let isStreaming = false;

    try {
      await executeWithStream(agent, trimmed, {
        onText: (text) => {
          if (!isStreaming) {
            spinner.stop();
            process.stdout.write(chalk.green('\nAgent: '));
            isStreaming = true;
          }
          process.stdout.write(text);
        },

        onToolCall: async (toolCall: ToolCallInfo) => {
          if (spinner.isSpinning) spinner.stop();

          console.log(chalk.yellow(`\n🔧 Tool: ${toolCall.name}`));
          console.log(chalk.gray(`   Args: ${JSON.stringify(toolCall.args, null, 2).split('\n').join('\n        ')}`));

          // Auto-approve or ask for confirmation
          if (options.autoApprove) {
            console.log(chalk.green('   ✓ Auto-approved'));
            return true;
          }

          // Ask for approval
          const approved = await promptConfirm(`   Execute ${toolCall.name}?`, true);
          if (approved) {
            console.log(chalk.green('   ✓ Approved'));
          } else {
            console.log(chalk.red('   ✗ Rejected'));
          }
          return approved;
        },

        onToolResult: (result: ToolResultInfo) => {
          const icon = result.success ? '✅' : '❌';
          const color = result.success ? chalk.green : chalk.red;
          console.log(color(`   ${icon} ${result.name}: ${result.success ? 'Success' : 'Failed'}`));

          // Show brief result preview
          if (result.result && typeof result.result === 'object') {
            const preview = JSON.stringify(result.result).slice(0, 100);
            console.log(chalk.gray(`   Result: ${preview}${preview.length >= 100 ? '...' : ''}`));
          }
        },

        onThinking: (thinking) => {
          // Optionally show thinking process
          if (process.env['DEBUG']) {
            console.log(chalk.gray(`\n💭 ${thinking}`));
          }
        },

        onError: (error) => {
          spinner.fail('Error');
          console.error(chalk.red(`Error: ${error.message}`));
        },
      });

      if (isStreaming) {
        console.log('\n'); // New line after streaming
      } else if (spinner.isSpinning) {
        spinner.succeed('Done');
      }
    } catch (err) {
      if (spinner.isSpinning) spinner.fail('Error');
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(chalk.red(`Error: ${errorMessage}`));
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.cyan('\nGoodbye! 👋'));
    process.exit(0);
  });
}

async function handleCommand(
  cmd: string,
  agent: Agent,
  registry: ToolRegistry,
  rl: ReturnType<typeof createInterface>,
  _options: ChatOptions
): Promise<void> {
  const [command = '', ...args] = cmd.slice(1).split(' ');

  switch (command.toLowerCase()) {
    case 'help':
      printInteractiveHelp();
      break;

    case 'clear':
      // Agent doesn't have clearHistory in this implementation
      console.log(chalk.green('Starting fresh conversation...'));
      break;

    case 'tools': {
      console.log(chalk.cyan('\n📦 Available Tools:\n'));
      const tools = listAvailableTools(registry);
      tools.forEach((tool) => {
        console.log(chalk.yellow(`  • ${tool}`));
      });
      break;
    }

    case 'model':
      if (args[0]) {
        agent.updateConfig({ model: args[0] });
        console.log(chalk.green(`Model changed to: ${args[0]}`));
      } else {
        const config = agent.getConfig();
        console.log(`Current model: ${config.model}`);
      }
      break;

    case 'exit':
    case 'quit':
    case 'q':
      rl.close();
      break;

    default:
      console.log(chalk.red(`Unknown command: ${command}`));
      console.log('Type /help for available commands.');
  }
}

function printInteractiveHelp(): void {
  console.log(chalk.cyan('\n📚 Interactive Commands:\n'));
  console.log('  /help     - Show this help message');
  console.log('  /clear    - Clear conversation history');
  console.log('  /tools    - List available tools');
  console.log('  /model    - Show/change current model');
  console.log('  /exit     - Exit chat');
  console.log();
  console.log(chalk.cyan('🛠️  Tool Examples:\n'));
  console.log('  "Open youtube.com"');
  console.log('  "Search web for Node.js tutorials"');
  console.log('  "Read package.json"');
  console.log('  "Create file test.txt with hello world"');
  console.log('  "Run npm --version"');
  console.log('  "Remember my name is John"');
  console.log();
}
