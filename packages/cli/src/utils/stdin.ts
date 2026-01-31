import { createInterface } from 'readline';

/**
 * Read input from stdin (for piping)
 */
export async function readStdin(): Promise<string | null> {
  // Check if stdin has data (piped input)
  if (process.stdin.isTTY) {
    return null;
  }

  return new Promise((resolve) => {
    let data = '';

    const rl = createInterface({
      input: process.stdin,
      terminal: false,
    });

    rl.on('line', (line) => {
      data += line + '\n';
    });

    rl.on('close', () => {
      resolve(data.trim() || null);
    });

    // Timeout for empty stdin
    setTimeout(() => {
      if (!data) {
        rl.close();
        resolve(null);
      }
    }, 100);
  });
}

/**
 * Check if stdin is piped
 */
export function isStdinPiped(): boolean {
  return !process.stdin.isTTY;
}

/**
 * Check if stdout is piped
 */
export function isStdoutPiped(): boolean {
  return !process.stdout.isTTY;
}
