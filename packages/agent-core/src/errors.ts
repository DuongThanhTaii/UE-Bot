/**
 * @fileoverview Error handling utilities for agent-core
 * @module @ue-bot/agent-core/errors
 */

import { AgentError, ErrorCode } from './types';
import { sleep } from './utils';

/**
 * Agent error class for throwing
 */
export class AgentErrorClass extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly retryable: boolean;
  public readonly timestamp: number;

  constructor(code: ErrorCode, message: string, details?: unknown, retryable = false) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
    this.timestamp = Date.now();
  }

  toJSON(): AgentError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
      timestamp: this.timestamp,
    };
  }

  static fromError(error: unknown): AgentErrorClass {
    if (error instanceof AgentErrorClass) {
      return error;
    }

    const classified = classifyError(error);
    const message = error instanceof Error ? error.message : String(error);

    return new AgentErrorClass(classified.code, message, error, classified.retryable);
  }
}

/**
 * Retry options
 */
export interface RetryOptions {
  /** Maximum number of retries */
  maxRetries?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Backoff multiplier */
  backoffMultiplier?: number;
  /** Callback on retry */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
  /** Custom retry condition */
  retryOn?: (error: Error) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'retryOn'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Execute a function with retry logic
 * @param fn - Function to execute
 * @param options - Retry options
 * @returns Function result
 */
export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt >= opts.maxRetries) {
        break;
      }

      // Check custom retry condition
      if (opts.retryOn && !opts.retryOn(lastError)) {
        break;
      }

      // Check if error is retryable
      const classified = classifyError(lastError);
      if (!classified.retryable && !opts.retryOn) {
        break;
      }

      // Call retry callback
      if (opts.onRetry) {
        opts.onRetry(lastError, attempt + 1, delay);
      }

      // Wait before retry
      await sleep(delay);

      // Increase delay with backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Error classification result
 */
interface ErrorClassification {
  code: ErrorCode;
  retryable: boolean;
}

/**
 * Classify an error to determine its type and retryability
 * @param error - Error to classify
 * @returns Classification result
 */
export function classifyError(error: unknown): ErrorClassification {
  if (error instanceof AgentErrorClass) {
    return {
      code: error.code,
      retryable: error.retryable,
    };
  }

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const errorObj = error as Record<string, unknown>;

  // Rate limit errors
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('429') ||
    errorObj?.['status'] === 429
  ) {
    return { code: ErrorCode.LLM_RATE_LIMIT, retryable: true };
  }

  // Timeout errors
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('etimedout')
  ) {
    return { code: ErrorCode.LLM_TIMEOUT, retryable: true };
  }

  // Network errors
  if (
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('socket hang up')
  ) {
    return { code: ErrorCode.NETWORK_ERROR, retryable: true };
  }

  // API errors (often retryable 5xx)
  if (
    errorObj?.['status'] === 500 ||
    errorObj?.['status'] === 502 ||
    errorObj?.['status'] === 503 ||
    errorObj?.['status'] === 504
  ) {
    return { code: ErrorCode.LLM_API_ERROR, retryable: true };
  }

  // Permission errors (not retryable)
  if (
    message.includes('permission') ||
    message.includes('eacces') ||
    message.includes('eperm') ||
    message.includes('unauthorized') ||
    errorObj?.['status'] === 401 ||
    errorObj?.['status'] === 403
  ) {
    return { code: ErrorCode.TOOL_PERMISSION_DENIED, retryable: false };
  }

  // Validation errors (not retryable)
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return { code: ErrorCode.TOOL_VALIDATION_ERROR, retryable: false };
  }

  // Tool not found (not retryable)
  if (message.includes('not found') && message.includes('tool')) {
    return { code: ErrorCode.TOOL_NOT_FOUND, retryable: false };
  }

  // Default to unknown
  return { code: ErrorCode.UNKNOWN_ERROR, retryable: false };
}

/**
 * Create user-friendly error message
 * @param error - Agent error
 * @returns User-friendly message
 */
export function getUserFriendlyMessage(error: AgentError): string {
  switch (error.code) {
    case ErrorCode.LLM_RATE_LIMIT:
      return 'The AI service is temporarily busy. Please wait a moment and try again.';
    case ErrorCode.LLM_TIMEOUT:
      return 'The request took too long. Please try again with a simpler request.';
    case ErrorCode.LLM_API_ERROR:
      return 'There was an issue with the AI service. Please try again.';
    case ErrorCode.LLM_INVALID_RESPONSE:
      return 'Received an unexpected response. Please try rephrasing your request.';
    case ErrorCode.TOOL_NOT_FOUND:
      return 'The requested tool is not available.';
    case ErrorCode.TOOL_PERMISSION_DENIED:
      return 'Permission denied for this operation.';
    case ErrorCode.TOOL_VALIDATION_ERROR:
      return 'Invalid parameters provided for the tool.';
    case ErrorCode.TOOL_TIMEOUT:
      return 'The operation took too long and was stopped.';
    case ErrorCode.TOOL_EXECUTION_ERROR:
      return `Tool execution failed: ${error.message}`;
    case ErrorCode.MAX_ITERATIONS_EXCEEDED:
      return 'The operation required too many steps. Please try a simpler request.';
    case ErrorCode.ABORTED:
      return 'The operation was cancelled.';
    case ErrorCode.SESSION_NOT_FOUND:
      return 'Session not found. Please start a new conversation.';
    case ErrorCode.NETWORK_ERROR:
      return 'Network error. Please check your connection and try again.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}
