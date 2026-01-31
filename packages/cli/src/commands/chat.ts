import chalk from 'chalk';
import { Command } from 'commander';
import { createInterface } from 'readline';
import { Agent } from '../agent.js';
import type { ChatOptions } from '../types.js';
import {
  createSpinner,
  formatOutput,
  getConfig,
  printBanner,
  printInteractiveHelp,
} from '../utils/index.js';

export const chatCommand = new Command('chat')
  .description('Start interactive chat with AI Agent')
  .option('-m, --model <model>', 'LLM model to use', 'llama-3.3-70b-versatile')
  .option('-s, --session <id>', 'Resume existing session')
  .option('--no-tools', 'Disable tool execution')
  .option('--auto-approve', 'Auto-approve all tool calls')
  .addHelpText(
    'after',
    `
Examples:
  $ ue-bot chat
  $ ue-bot chat -m llama-3.1-8b-instant
  $ ue-bot chat -s abc123 --auto-approve
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

  printBanner();
  console.log(chalk.gray('Type your message and press Enter.'));
  console.log(chalk.gray('Commands: /help, /clear, /session, /exit'));
  console.log();

  // Initialize Agent
  const agent = new Agent({
    apiKey: config.groqApiKey,
    model: options.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  });

  // Resume session if specified
  if (options.session) {
    try {
      await agent.loadSession(options.session);
      console.log(chalk.green(`Resumed session: ${options.session}`));
    } catch {
      console.log(
        chalk.yellow(`Could not load session: ${options.session}. Starting new session.`)
      );
    }
  }

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
      await handleCommand(trimmed, agent, rl, options);
      rl.prompt();
      return;
    }

    // Process message with agent
    const spinner = createSpinner('Thinking...');
    spinner.start();

    try {
      const response = await agent.chat(trimmed, {
        stream: true,
        onToken: (token) => {
          if (spinner.isSpinning) {
            spinner.stop();
            process.stdout.write(chalk.green('\nAgent: '));
          }
          process.stdout.write(token);
        },
      });

      if (spinner.isSpinning) {
        spinner.stop();
        console.log(chalk.green('\nAgent: ') + formatOutput(response.content));
      } else {
        console.log(); // New line after streaming
      }
    } catch (err) {
      spinner.fail('Error');
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(chalk.red(`Error: ${errorMessage}`));
    }

    console.log();
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
  rl: ReturnType<typeof createInterface>,
  _options: ChatOptions
): Promise<void> {
  const [command, ...args] = cmd.slice(1).split(' ');

  switch (command.toLowerCase()) {
    case 'help':
      printInteractiveHelp();
      break;

    case 'clear':
      agent.clearHistory();
      console.log(chalk.green('Conversation cleared.'));
      break;

    case 'session': {
      const session = agent.getSession();
      console.log(chalk.cyan('\nSession Info:'));
      console.log(`  ID: ${session.id}`);
      console.log(`  Messages: ${session.messages.length}`);
      console.log(`  Created: ${session.createdAt}`);
      break;
    }

    case 'save': {
      const sessionId = await agent.saveSession();
      console.log(chalk.green(`Session saved: ${sessionId}`));
      break;
    }

    case 'history': {
      const history = agent.getHistory();
      console.log(chalk.cyan('\nConversation History:'));
      history.forEach((msg, i) => {
        const role = msg.role === 'user' ? chalk.blue('You') : chalk.green('Agent');
        const content = msg.content.length > 50 ? msg.content.slice(0, 50) + '...' : msg.content;
        console.log(`${i + 1}. ${role}: ${content}`);
      });
      break;
    }

    case 'model':
      if (args[0]) {
        agent.setModel(args[0]);
        console.log(chalk.green(`Model changed to: ${args[0]}`));
      } else {
        console.log(`Current model: ${agent.getModel()}`);
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
