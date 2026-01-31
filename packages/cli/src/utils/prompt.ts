import chalk from 'chalk';
import inquirer from 'inquirer';

/**
 * Prompt user for tool approval
 */
export async function promptToolApproval(toolCall: {
  name: string;
  args: Record<string, unknown>;
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

/**
 * Prompt for user input
 */
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

/**
 * Prompt for confirmation
 */
export async function promptConfirm(message: string, defaultValue = true): Promise<boolean> {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message,
      default: defaultValue,
    },
  ]);
  return confirm;
}

/**
 * Prompt for selection from list
 */
export async function promptSelect<T extends string>(
  message: string,
  choices: T[],
  defaultChoice?: T
): Promise<T> {
  const { selection } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message,
      choices,
      default: defaultChoice,
    },
  ]);
  return selection;
}

/**
 * Prompt for password (masked input)
 */
export async function promptPassword(message: string): Promise<string> {
  const { password } = await inquirer.prompt([
    {
      type: 'password',
      name: 'password',
      message,
      mask: '*',
    },
  ]);
  return password;
}
