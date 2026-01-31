# TASK-041: Implement Interactive Mode

## 📋 Thông tin

- **Phase**: 4 - CLI Interface
- **Priority**: High
- **Estimated**: 6 hours
- **Dependencies**: TASK-040

## 🎯 Mục tiêu

Tạo interactive chat mode cho CLI, cho phép user chat liên tục với Agent.

## 📝 Yêu cầu

### 1. Chat Command

```typescript
// src/commands/chat.ts
import { Command } from 'commander';
import { createInterface } from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import { Agent } from '@ue-bot/agent-core';
import { formatOutput } from '../utils/output';
import { getConfig } from '../utils/config';

export const chatCommand = new Command('chat')
  .description('Start interactive chat with AI Agent')
  .option('-m, --model <model>', 'LLM model to use', 'llama-3.3-70b-versatile')
  .option('-s, --session <id>', 'Resume existing session')
  .option('--no-tools', 'Disable tool execution')
  .option('--auto-approve', 'Auto-approve all tool calls')
  .action(async (options) => {
    await startInteractiveChat(options);
  });

interface ChatOptions {
  model: string;
  session?: string;
  tools: boolean;
  autoApprove: boolean;
}

async function startInteractiveChat(options: ChatOptions) {
  const config = getConfig();

  console.log(chalk.cyan('╔════════════════════════════════════════╗'));
  console.log(
    chalk.cyan('║') + chalk.bold('     UE-Bot AI Agent - Interactive     ') + chalk.cyan('║')
  );
  console.log(chalk.cyan('╚════════════════════════════════════════╝'));
  console.log();
  console.log(chalk.gray('Type your message and press Enter.'));
  console.log(chalk.gray('Commands: /help, /clear, /session, /exit'));
  console.log();

  // Initialize Agent
  const agent = new Agent({
    apiKey: config.groqApiKey,
    model: options.model,
    enableTools: options.tools,
    autoApprove: options.autoApprove,
  });

  // Resume or create session
  if (options.session) {
    await agent.loadSession(options.session);
    console.log(chalk.green(`Resumed session: ${options.session}`));
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.blue('You: '),
  });

  rl.prompt();

  rl.on('line', async (input) => {
    const trimmed = input.trim();

    if (!trimmed) {
      rl.prompt();
      return;
    }

    // Handle commands
    if (trimmed.startsWith('/')) {
      await handleCommand(trimmed, agent, rl);
      rl.prompt();
      return;
    }

    // Process message
    const spinner = ora('Thinking...').start();

    try {
      const response = await agent.chat(trimmed, {
        onToolCall: (toolCall) => {
          spinner.stop();
          console.log(chalk.yellow(`\n🔧 Tool: ${toolCall.name}`));
          console.log(chalk.gray(JSON.stringify(toolCall.args, null, 2)));
          spinner.start('Executing tool...');
        },
        onToolResult: (result) => {
          spinner.stop();
          console.log(chalk.green(`✓ Result: ${result.success ? 'Success' : 'Failed'}`));
          if (result.output) {
            console.log(chalk.gray(formatOutput(result.output)));
          }
          spinner.start('Continuing...');
        },
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
    } catch (error) {
      spinner.fail('Error');
      console.error(chalk.red(`Error: ${error.message}`));
    }

    console.log();
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.cyan('\nGoodbye! 👋'));
    process.exit(0);
  });
}

async function handleCommand(cmd: string, agent: Agent, rl: any) {
  const [command, ...args] = cmd.slice(1).split(' ');

  switch (command.toLowerCase()) {
    case 'help':
      console.log(chalk.cyan('\nAvailable commands:'));
      console.log('  /help     - Show this help');
      console.log('  /clear    - Clear conversation history');
      console.log('  /session  - Show current session info');
      console.log('  /save     - Save current session');
      console.log('  /history  - Show conversation history');
      console.log('  /model    - Show/change model');
      console.log('  /exit     - Exit chat');
      break;

    case 'clear':
      agent.clearHistory();
      console.log(chalk.green('Conversation cleared.'));
      break;

    case 'session':
      const session = agent.getSession();
      console.log(chalk.cyan('\nSession Info:'));
      console.log(`  ID: ${session.id}`);
      console.log(`  Messages: ${session.messages.length}`);
      console.log(`  Created: ${session.createdAt}`);
      break;

    case 'save':
      const sessionId = await agent.saveSession();
      console.log(chalk.green(`Session saved: ${sessionId}`));
      break;

    case 'history':
      const history = agent.getHistory();
      console.log(chalk.cyan('\nConversation History:'));
      history.forEach((msg, i) => {
        const role = msg.role === 'user' ? chalk.blue('You') : chalk.green('Agent');
        console.log(`${i + 1}. ${role}: ${msg.content.slice(0, 50)}...`);
      });
      break;

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
```

### 2. Markdown Rendering

````typescript
// src/utils/output.ts
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import chalk from 'chalk';

marked.use(
  markedTerminal({
    code: chalk.yellow,
    codespan: chalk.yellow,
    strong: chalk.bold,
    em: chalk.italic,
    heading: chalk.bold.cyan,
    link: chalk.blue.underline,
  })
);

export function formatOutput(content: string): string {
  // Check if content contains markdown
  if (content.includes('```') || content.includes('**') || content.includes('#')) {
    return marked.parse(content) as string;
  }
  return content;
}

export function formatToolResult(result: any): string {
  if (typeof result === 'string') {
    return result.length > 500 ? result.slice(0, 500) + chalk.gray('... (truncated)') : result;
  }
  return JSON.stringify(result, null, 2);
}
````

### 3. Tool Approval Prompt

```typescript
// src/utils/prompt.ts
import inquirer from 'inquirer';
import chalk from 'chalk';

export async function promptToolApproval(toolCall: {
  name: string;
  args: Record<string, any>;
  reason?: string;
}): Promise<boolean> {
  console.log(chalk.yellow('\n⚠️  Tool Execution Request'));
  console.log(chalk.cyan(`Tool: ${toolCall.name}`));
  console.log(chalk.gray('Arguments:'));
  console.log(JSON.stringify(toolCall.args, null, 2));

  if (toolCall.reason) {
    console.log(chalk.gray(`Reason: ${toolCall.reason}`));
  }

  const { approved } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'approved',
      message: 'Allow this tool execution?',
      default: true,
    },
  ]);

  return approved;
}

export async function promptInput(message: string): Promise<string> {
  const { input } = await inquirer.prompt([
    {
      type: 'input',
      name: 'input',
      message,
    },
  ]);
  return input;
}
```

## ✅ Acceptance Criteria

- [ ] `ue-bot chat` starts interactive mode
- [ ] User có thể gõ messages và nhận responses
- [ ] Streaming tokens hiển thị real-time
- [ ] Tool calls hiển thị với approval prompt
- [ ] Slash commands hoạt động (/help, /clear, etc.)
- [ ] Markdown được render trong terminal
- [ ] Session có thể save/resume

## 🧪 Test Cases

```bash
# Start interactive chat
ue-bot chat

# With specific model
ue-bot chat -m llama-3.1-8b-instant

# Resume session
ue-bot chat -s abc123

# Auto-approve tools
ue-bot chat --auto-approve

# Disable tools
ue-bot chat --no-tools
```

## 📚 Resources

- [Readline API](https://nodejs.org/api/readline.html)
- [Marked Terminal](https://github.com/mikaelbr/marked-terminal)
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js)
