export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = sizes[i] ?? 'Bytes';

  return `${String(parseFloat((bytes / Math.pow(k, i)).toFixed(dm)))} ${size}`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${String(hours)}h ${String(minutes % 60)}m ${String(seconds % 60)}s`;
  }
  if (minutes > 0) {
    return `${String(minutes)}m ${String(seconds % 60)}s`;
  }
  return `${String(seconds)}s`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delay?: number; backoff?: number } = {}
): Promise<T> {
  const { attempts = 3, delay: baseDelay = 1000, backoff = 2 } = options;

  const attempt = async (attemptsLeft: number, currentDelay: number): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (attemptsLeft <= 1) {
        throw error;
      }

      await delay(currentDelay);
      return attempt(attemptsLeft - 1, currentDelay * backoff);
    }
  };

  return attempt(attempts, baseDelay);
}
