import chalk from 'chalk';
import ora, { type Ora } from 'ora';

/**
 * Create a spinner
 */
export function createSpinner(text: string): Ora {
  return ora({
    text,
    spinner: 'dots',
    color: 'cyan',
  });
}

/**
 * Print success message
 */
export function success(message: string): void {
  console.log(chalk.green('✓') + ' ' + message);
}

/**
 * Print error message
 */
export function error(message: string): void {
  console.error(chalk.red('✗') + ' ' + message);
}

/**
 * Print warning message
 */
export function warning(message: string): void {
  console.warn(chalk.yellow('⚠') + ' ' + message);
}

/**
 * Print info message
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ') + ' ' + message);
}

/**
 * Print debug message (only if DEBUG is set)
 */
export function debug(message: string): void {
  if (process.env.DEBUG || process.env.UE_BOT_DEBUG) {
    console.log(chalk.gray('[DEBUG]') + ' ' + message);
  }
}

/**
 * Print a box with content
 */
export function printBox(content: string, title?: string): void {
  const lines = content.split('\n');
  const maxWidth = Math.max(...lines.map((l) => l.length), title?.length || 0);
  const width = maxWidth + 4;

  console.log(chalk.cyan('╭' + '─'.repeat(width - 2) + '╮'));

  if (title) {
    const padding = Math.floor((width - 2 - title.length) / 2);
    console.log(
      chalk.cyan('│') +
        ' '.repeat(padding) +
        chalk.bold(title) +
        ' '.repeat(width - 2 - padding - title.length) +
        chalk.cyan('│')
    );
    console.log(chalk.cyan('├' + '─'.repeat(width - 2) + '┤'));
  }

  for (const line of lines) {
    const padding = width - 4 - line.length;
    console.log(
      chalk.cyan('│') + '  ' + line + ' '.repeat(Math.max(0, padding)) + ' ' + chalk.cyan('│')
    );
  }

  console.log(chalk.cyan('╰' + '─'.repeat(width - 2) + '╯'));
}

/**
 * Format token usage for display
 */
export function formatTokenUsage(usage: {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}): string {
  return chalk.gray(
    [
      `Tokens: ${usage.totalTokens}`,
      `(prompt: ${usage.promptTokens}`,
      `completion: ${usage.completionTokens})`,
    ].join(' ')
  );
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Print welcome banner
 */
export function printBanner(): void {
  console.log(chalk.cyan('╔════════════════════════════════════════╗'));
  console.log(
    chalk.cyan('║') + chalk.bold('     UE-Bot AI Agent - Interactive     ') + chalk.cyan('║')
  );
  console.log(chalk.cyan('╚════════════════════════════════════════╝'));
  console.log();
}

/**
 * Print help for interactive commands
 */
export function printInteractiveHelp(): void {
  console.log(chalk.cyan('\nAvailable commands:'));
  console.log('  /help     - Show this help');
  console.log('  /clear    - Clear conversation history');
  console.log('  /session  - Show current session info');
  console.log('  /save     - Save current session');
  console.log('  /history  - Show conversation history');
  console.log('  /model    - Show/change model');
  console.log('  /exit     - Exit chat');
  console.log();
}
