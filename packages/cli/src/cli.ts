import { Command } from 'commander';
import { chatCommand, configCommand, runCommand } from './commands/index.js';
import { readStdin } from './utils/index.js';

const VERSION = '0.1.0';

export const cli = new Command();

cli
  .name('ue-bot')
  .description('UE-Bot AI Agent CLI - Interact with AI from your terminal')
  .version(VERSION);

// Register commands
cli.addCommand(chatCommand);
cli.addCommand(runCommand);
cli.addCommand(configCommand);

// Default behavior: if prompt is provided, run it; otherwise start chat
cli.argument('[prompt...]', 'Quick prompt to execute').action(async (promptArgs: string[]) => {
  if (promptArgs && promptArgs.length > 0) {
    // Join all arguments as prompt and run
    const prompt = promptArgs.join(' ');
    await runCommand.parseAsync(['node', 'run', prompt, ...process.argv.slice(2)]);
  } else {
    // Check for stdin
    const stdinData = await readStdin();
    if (stdinData) {
      // If stdin has data, use it as prompt
      await runCommand.parseAsync(['node', 'run', stdinData]);
    } else {
      // No prompt, start interactive mode
      await chatCommand.parseAsync(['node', 'chat']);
    }
  }
});

export { chatCommand, configCommand, runCommand };
