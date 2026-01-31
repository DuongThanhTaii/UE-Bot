# TASK-042: Implement Single Command Mode

## 📋 Thông tin

- **Phase**: 4 - CLI Interface
- **Priority**: High
- **Estimated**: 4 hours
- **Dependencies**: TASK-040, TASK-041

## 🎯 Mục tiêu

Cho phép thực thi single prompt từ command line, phù hợp cho automation và scripting.

## 📝 Yêu cầu

### 1. Run Command

```typescript
// src/commands/run.ts
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Agent } from '@ue-bot/agent-core';
import { formatOutput } from '../utils/output';
import { getConfig } from '../utils/config';

export const runCommand = new Command('run')
  .description('Execute a single prompt')
  .argument('<prompt>', 'The prompt to execute')
  .option('-m, --model <model>', 'LLM model to use', 'llama-3.3-70b-versatile')
  .option('-s, --session <id>', 'Use existing session context')
  .option('--no-tools', 'Disable tool execution')
  .option('--auto-approve', 'Auto-approve all tool calls')
  .option('-o, --output <format>', 'Output format: text, json, markdown', 'text')
  .option('-q, --quiet', 'Only output the response')
  .option('--no-stream', 'Disable streaming output')
  .option('--max-tokens <n>', 'Maximum tokens in response', '4096')
  .option('--timeout <ms>', 'Timeout in milliseconds', '60000')
  .action(async (prompt, options) => {
    await executePrompt(prompt, options);
  });

interface RunOptions {
  model: string;
  session?: string;
  tools: boolean;
  autoApprove: boolean;
  output: 'text' | 'json' | 'markdown';
  quiet: boolean;
  stream: boolean;
  maxTokens: string;
  timeout: string;
}

async function executePrompt(prompt: string, options: RunOptions) {
  const config = getConfig();

  if (!options.quiet) {
    console.log(
      chalk.cyan(`Executing: "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}"`)
    );
  }

  const agent = new Agent({
    apiKey: config.groqApiKey,
    model: options.model,
    enableTools: options.tools,
    autoApprove: options.autoApprove,
    maxTokens: parseInt(options.maxTokens),
  });

  // Load session if specified
  if (options.session) {
    await agent.loadSession(options.session);
  }

  const spinner = options.quiet ? null : ora('Processing...').start();

  try {
    let result: string = '';
    const toolCalls: any[] = [];

    const response = (await Promise.race([
      agent.chat(prompt, {
        stream: options.stream,
        onToolCall: (toolCall) => {
          toolCalls.push(toolCall);
          if (!options.quiet && spinner) {
            spinner.text = `Executing tool: ${toolCall.name}`;
          }
        },
        onToken: options.stream
          ? (token) => {
              if (spinner?.isSpinning) {
                spinner.stop();
              }
              if (!options.quiet || options.output === 'text') {
                process.stdout.write(token);
              }
              result += token;
            }
          : undefined,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), parseInt(options.timeout))
      ),
    ])) as any;

    if (!options.stream) {
      result = response.content;
    }

    spinner?.stop();

    // Output based on format
    switch (options.output) {
      case 'json':
        const output = {
          prompt,
          response: result,
          model: options.model,
          toolCalls: toolCalls.map((tc) => ({
            name: tc.name,
            args: tc.args,
            result: tc.result,
          })),
          usage: response.usage,
        };
        console.log(JSON.stringify(output, null, 2));
        break;

      case 'markdown':
        if (!options.stream) {
          console.log(formatOutput(result));
        }
        break;

      case 'text':
      default:
        if (!options.stream) {
          console.log(result);
        } else {
          console.log(); // New line after streaming
        }
    }

    process.exit(0);
  } catch (error: any) {
    spinner?.fail('Failed');

    if (options.output === 'json') {
      console.log(JSON.stringify({ error: error.message }, null, 2));
    } else {
      console.error(chalk.red(`Error: ${error.message}`));
    }

    process.exit(1);
  }
}
```

### 2. Inline Prompt (Default Command)

```typescript
// src/cli.ts - update default action
cli.argument('[prompt...]', 'Quick prompt to execute').action(async (prompt: string[]) => {
  if (prompt && prompt.length > 0) {
    // Join all arguments as prompt
    const fullPrompt = prompt.join(' ');
    await runCommand.parseAsync(['run', fullPrompt, ...process.argv.slice(2)]);
  } else {
    // No prompt, start interactive mode
    await chatCommand.parseAsync(['chat']);
  }
});
```

### 3. Exit Codes

```typescript
// src/types.ts
export const ExitCodes = {
  SUCCESS: 0,
  ERROR: 1,
  TIMEOUT: 2,
  TOOL_DENIED: 3,
  INVALID_INPUT: 4,
  API_ERROR: 5,
} as const;

export type ExitCode = (typeof ExitCodes)[keyof typeof ExitCodes];
```

## ✅ Acceptance Criteria

- [ ] `ue-bot run "prompt"` executes single prompt
- [ ] `ue-bot "prompt"` works as shorthand
- [ ] JSON output format works
- [ ] Streaming có thể enable/disable
- [ ] Timeout hoạt động
- [ ] Exit codes chính xác
- [ ] Quiet mode chỉ output response

## 🧪 Test Cases

```bash
# Basic run
ue-bot run "What is 2+2?"

# Shorthand
ue-bot "What is 2+2?"

# JSON output
ue-bot run "List 3 colors" -o json

# Quiet mode (for scripting)
result=$(ue-bot run "What is the capital of France?" -q)
echo $result

# With timeout
ue-bot run "Complex task" --timeout 30000

# No streaming
ue-bot run "Hello" --no-stream

# With tools
ue-bot run "Create a file hello.txt with 'Hello World'" --auto-approve
```

## 📚 Resources

- [Commander.js Arguments](https://github.com/tj/commander.js#command-arguments)
- [Process Exit Codes](https://nodejs.org/api/process.html#process_exit_codes)
