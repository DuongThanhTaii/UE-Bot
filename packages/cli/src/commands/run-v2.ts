/**
 * @fileoverview Execute a single prompt with full Agent Core integration
 */

import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { createAgent, executeWithStream } from '../agent-core.js';
import type { RunOptions } from '../types.js';
import { ExitCodes } from '../types.js';
import {
  formatOutput,
  getConfig,
  isStdoutPiped,
  readStdin,
} from '../utils/index.js';

export const runCommand = new Command('run')
  .description('Execute a single prompt with AI Agent (with full tool support)')
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
  $ ue-bot run "Open YouTube"
  $ ue-bot run "Search web for latest AI news" --auto-approve
  $ ue-bot run "Read package.json and summarize"
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
    console.log(chalk.cyan(`🚀 Executing: "${displayPrompt}"`));
  }

  // Create agent with tools
  const { agent } = createAgent({
    apiKey: config.groqApiKey,
    model: options.model,
    maxTokens: parseInt(options.maxTokens, 10),
    temperature: config.temperature,
    braveApiKey: config.braveApiKey,
  });

  const spinner = options.quiet ? null : ora({ text: 'Processing...', spinner: 'dots' });
  spinner?.start();

  let isStreaming = false;
  let result = '';

  try {
    const timeoutMs = parseInt(options.timeout, 10);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout'));
      }, timeoutMs);
    });

    const executePromise = executeWithStream(agent, finalPrompt, {
      onText: (text) => {
        if (!isStreaming) {
          spinner?.stop();
          isStreaming = true;
        }
        if (options.stream !== false) {
          process.stdout.write(text);
        }
        result += text;
      },

      onToolCall: async (toolCall) => {
        if (spinner?.isSpinning) spinner.stop();

        if (!options.quiet) {
          console.log(chalk.yellow(`\n🔧 Tool: ${toolCall.name}`));
        }

        // Auto-approve for non-interactive run mode
        if (options.autoApprove) {
          if (!options.quiet) {
            console.log(chalk.green('   ✓ Auto-approved'));
          }
          return true;
        }

        // For run command, default to auto-approve if piped
        if (isStdoutPiped()) {
          return true;
        }

        // Otherwise, auto-approve with logging
        if (!options.quiet) {
          console.log(chalk.green('   ✓ Approved (use --no-tools to disable)'));
        }
        return true;
      },

      onToolResult: (toolResult) => {
        if (!options.quiet) {
          const icon = toolResult.success ? '✅' : '❌';
          console.log(chalk[toolResult.success ? 'green' : 'red'](`   ${icon} ${toolResult.name}`));
        }
      },

      onError: (error) => {
        spinner?.fail('Error');
        if (!options.quiet) {
          console.error(chalk.red(`Error: ${error.message}`));
        }
      },
    });

    await Promise.race([executePromise, timeoutPromise]);

    // Handle non-streaming output
    if (options.stream === false && result) {
      spinner?.stop();
    }

    // Final output formatting
    if (isStreaming) {
      console.log(); // New line after streaming
    }

    if (options.output === 'json') {
      const jsonOutput = { response: result.trim() };
      console.log(JSON.stringify(jsonOutput, null, 2));
    } else if (options.output === 'markdown' && !isStreaming) {
      console.log(formatOutput(result));
    }

    process.exit(ExitCodes.SUCCESS);
  } catch (err) {
    spinner?.fail('Error');
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    if (!options.quiet) {
      console.error(chalk.red(`Error: ${errorMessage}`));
    }

    if (errorMessage === 'Timeout') {
      process.exit(ExitCodes.TIMEOUT);
    }

    process.exit(ExitCodes.ERROR);
  }
}
