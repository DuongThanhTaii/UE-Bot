/**
 * @fileoverview Utility functions for agent-core
 * @module @ue-bot/agent-core/utils
 */

import { randomBytes } from 'crypto';

import type { ToolCall, ToolResult } from './types';

/**
 * Generate a unique ID
 * @param prefix - Optional prefix for the ID
 * @returns A unique identifier string
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Format tool result for display
 * @param result - The tool result to format
 * @returns Formatted string representation
 */
export function formatToolResult(result: ToolResult): string {
  if (!result.success) {
    return `Error: ${result.error || 'Unknown error'}`;
  }

  if (result.result === undefined || result.result === null) {
    return 'Success (no output)';
  }

  if (typeof result.result === 'string') {
    return result.result;
  }

  try {
    return JSON.stringify(result.result, null, 2);
  } catch {
    return String(result.result);
  }
}

/**
 * Parse tool call arguments from string
 * @param toolCall - The tool call with potentially stringified arguments
 * @returns Tool call with parsed arguments
 */
export function parseToolCall(toolCall: ToolCall): ToolCall {
  if (typeof toolCall.arguments === 'string') {
    try {
      return {
        ...toolCall,
        arguments: JSON.parse(toolCall.arguments),
      };
    } catch {
      return toolCall;
    }
  }
  return toolCall;
}

/**
 * Truncate string to max length with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a string matches a glob pattern
 * @param pattern - Glob pattern (supports * and **)
 * @param str - String to match
 * @returns True if matches
 */
export function matchGlob(pattern: string, str: string): boolean {
  // Convert glob to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
    .replace(/\*\*/g, '{{GLOBSTAR}}') // Temp placeholder for **
    .replace(/\*/g, '[^/]*') // * matches anything except /
    .replace(/{{GLOBSTAR}}/g, '.*'); // ** matches everything

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(str);
}

/**
 * Deep clone an object
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Merge objects deeply
 * @param target - Target object
 * @param sources - Source objects to merge
 * @returns Merged object
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  const result = deepClone(target);

  for (const source of sources) {
    if (!source) continue;

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (
          typeof sourceValue === 'object' &&
          sourceValue !== null &&
          !Array.isArray(sourceValue) &&
          typeof targetValue === 'object' &&
          targetValue !== null &&
          !Array.isArray(targetValue)
        ) {
          (result as Record<string, unknown>)[key] = deepMerge(
            targetValue as Record<string, unknown>,
            sourceValue as Record<string, unknown>
          );
        } else {
          (result as Record<string, unknown>)[key] = deepClone(sourceValue);
        }
      }
    }
  }

  return result;
}

/**
 * Debounce a function
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Create a timeout promise
 * @param ms - Timeout in milliseconds
 * @param message - Error message
 * @returns Promise that rejects after timeout
 */
export function timeout<T>(ms: number, message = 'Operation timed out'): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => { reject(new Error(message)); }, ms);
  });
}

/**
 * Race a promise against a timeout
 * @param promise - Promise to race
 * @param ms - Timeout in milliseconds
 * @param message - Timeout error message
 * @returns Promise result or throws on timeout
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return Promise.race([promise, timeout<T>(ms, message)]);
}
