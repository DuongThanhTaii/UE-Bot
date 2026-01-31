import chalk from 'chalk';
import { Command } from 'commander';
import { Agent } from '../agent.js';
import type { RunOptions } from '../types.js';
import { ExitCodes } from '../types.js';
import {
  createSpinner,
  formatOutput,
  getConfig,
  isStdoutPiped,
  readStdin,
} from '../utils/index.js';

export const runCommand = new Command('run')
  .description('Execute a single prompt')
  .argument('[prompt]', 'The prompt to execute (or use stdin)')
  .option('-m, --model <model>', 'LLM model to use', 'llama-3.3-70b-versatile')
  .option('-s, --session <id>', 'Use existing session context')
  .option('--no-tools', 'Disable tool execution')
  .option('--auto-approve', 'Auto-approve all tool calls')
  .option('-o, --output <format>', 'Output format: text, json, markdown', 'text')
  .option('-q, --quiet', 'Only output the response')
  .option('--no-stream', 'Disable streaming output')
  .option('--max-tokens <n>', 'Maximum tokens in response', '4096')
  .option('--timeout <ms>', 'Timeout in milliseconds', '60000')
  .option('--stdin', 'Read prompt from stdin')
  .option('--context', 'Use stdin as context, not prompt')
  .addHelpText(
    'after',
    `
Examples:
  $ ue-bot run "What is 2+2?"
  $ ue-bot run "Explain this code" --context < code.js
  $ echo "Hello" | ue-bot run
  $ ue-bot run "Generate UUID" -q -o json
  `
  )
  .action(async (prompt: string | undefined, options: RunOptions) => {
    await executePrompt(prompt, options);
  });

async function executePrompt(prompt: string | undefined, options: RunOptions): Promise<void> {
  const config = getConfig();

  // Check API key
  if (!config.groqApiKey) {
    if (!options.quiet) {
      console.error(chalk.red('Error: GROQ_API_KEY not set.'));
      console.error(chalk.gray('Run: ue-bot config set groqApiKey <your-api-key>'));
    }
    process.exit(ExitCodes.ERROR);
  }

  // Read from stdin if available
  const stdinData = await readStdin();

  let finalPrompt = prompt;
  let context = '';

  if (stdinData) {
    if (options.context) {
      // Stdin is context, argument is prompt
      context = stdinData;
      if (!prompt) {
        if (!options.quiet) {
          console.error(chalk.red('Error: --context requires a prompt argument'));
        }
        process.exit(ExitCodes.INVALID_INPUT);
      }
    } else if (options.stdin || !prompt) {
      // Stdin is the prompt
      finalPrompt = stdinData;
    }
  }

  if (!finalPrompt) {
    if (!options.quiet) {
      console.error(chalk.red('Error: No prompt provided'));
      console.error(chalk.gray('Usage: ue-bot run "your prompt" or echo "prompt" | ue-bot run'));
    }
    process.exit(ExitCodes.INVALID_INPUT);
  }

  // Add context to prompt if present
  if (context) {
    finalPrompt = `Given the following context:\n\n${context}\n\n${finalPrompt}`;
  }

  // Auto-detect quiet mode for piped output
  if (isStdoutPiped() && !options.quiet) {
    options.quiet = true;
    options.stream = false;
  }

  if (!options.quiet) {
    const displayPrompt = finalPrompt.length > 50 ? finalPrompt.slice(0, 50) + '...' : finalPrompt;
    console.log(chalk.cyan(`Executing: "${displayPrompt}"`));
  }

  const agent = new Agent({
    apiKey: config.groqApiKey,
    model: options.model,
    maxTokens: parseInt(options.maxTokens, 10),
    temperature: config.temperature,
  });

  // Load session if specified
  if (options.session) {
    try {
      await agent.loadSession(options.session);
    } catch {
      // Ignore session load errors
    }
  }

  const spinner = options.quiet ? null : createSpinner('Processing...');
  spinner?.start();

  try {
    let result = '';

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => { reject(new Error('Timeout')); }, parseInt(options.timeout, 10));
    });

    const chatPromise = agent.chat(finalPrompt, {
      stream: options.stream,
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
    });

    const response = await Promise.race([chatPromise, timeoutPromise]);

    if (!options.stream) {
      result = response.content;
    }

    spinner?.stop();

    // Output based on format
    switch (options.output) {
      case 'json': {
        const output = {
          prompt: finalPrompt,
          response: result,
          model: options.model,
          usage: response.usage,
        };
        console.log(JSON.stringify(output, null, 2));
        break;
      }

      case 'markdown':
        if (!options.stream) {
          console.log(formatOutput(result, { format: 'markdown' }));
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

    process.exit(ExitCodes.SUCCESS);
  } catch (err) {
    spinner?.fail('Failed');

    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    if (options.output === 'json') {
      console.log(JSON.stringify({ error: errorMessage }, null, 2));
    } else if (!options.quiet) {
      console.error(chalk.red(`Error: ${errorMessage}`));
    }

    if (errorMessage === 'Timeout') {
      process.exit(ExitCodes.TIMEOUT);
    }

    process.exit(ExitCodes.API_ERROR);
  }
}
