/**
 * @fileoverview Error recovery utilities for agent
 * @module @ue-bot/agent-core/recovery
 */

import { AgentErrorClass, classifyError, getUserFriendlyMessage } from './errors';
import { AgentError, ErrorCode, ToolResult } from './types';
import { sleep } from './utils';

/**
 * Recovery strategy
 */
export type RecoveryStrategy =
  | 'retry' // Retry the operation
  | 'fallback' // Use fallback value/function
  | 'skip' // Skip and continue
  | 'fail' // Fail immediately
  | 'manual'; // Require manual intervention

/**
 * Recovery action result
 */
export interface RecoveryResult<T> {
  /** Whether recovery was successful */
  success: boolean;
  /** Recovered value if successful */
  value?: T;
  /** Original error */
  originalError: AgentError;
  /** Strategy used */
  strategy: RecoveryStrategy;
  /** Additional message */
  message?: string;
}

/**
 * Recovery handler options
 */
export interface RecoveryOptions<T> {
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Fallback value or function */
  fallback?: T | (() => T) | (() => Promise<T>);
  /** Whether to allow skip */
  allowSkip?: boolean;
  /** Custom strategy selector */
  selectStrategy?: (error: AgentError) => RecoveryStrategy;
  /** Callback when recovery is attempted */
  onRecoveryAttempt?: (error: AgentError, strategy: RecoveryStrategy, attempt: number) => void;
}

/**
 * Default strategy selector based on error code
 */
function defaultStrategySelector(error: AgentError): RecoveryStrategy {
  switch (error.code) {
    // Retryable errors
    case ErrorCode.LLM_RATE_LIMIT:
    case ErrorCode.LLM_TIMEOUT:
    case ErrorCode.LLM_API_ERROR:
    case ErrorCode.TOOL_TIMEOUT:
    case ErrorCode.NETWORK_ERROR:
      return 'retry';

    // Skip-able errors
    case ErrorCode.TOOL_NOT_FOUND:
    case ErrorCode.TOOL_VALIDATION_ERROR:
      return 'skip';

    // Non-recoverable errors
    case ErrorCode.TOOL_PERMISSION_DENIED:
    case ErrorCode.ABORTED:
    case ErrorCode.SESSION_NOT_FOUND:
      return 'fail';

    // Execution errors may have fallback
    case ErrorCode.TOOL_EXECUTION_ERROR:
      return 'fallback';

    default:
      return error.retryable ? 'retry' : 'fail';
  }
}

/**
 * Execute with automatic error recovery
 */
export async function withRecovery<T>(
  fn: () => Promise<T>,
  options: RecoveryOptions<T> = {}
): Promise<RecoveryResult<T>> {
  const { maxRetries = 3, fallback, allowSkip = true, selectStrategy, onRecoveryAttempt } = options;

  let lastError: AgentError | undefined;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const value = await fn();
      return {
        success: true,
        value,
        originalError: lastError!,
        strategy: attempt === 0 ? 'retry' : 'retry',
      };
    } catch (error) {
      const agentError =
        error instanceof AgentErrorClass
          ? error.toJSON()
          : {
              code: classifyError(error).code,
              message: error instanceof Error ? error.message : String(error),
              retryable: classifyError(error).retryable,
              timestamp: Date.now(),
            };

      lastError = agentError;

      // Determine strategy
      const strategy = selectStrategy
        ? selectStrategy(agentError)
        : defaultStrategySelector(agentError);

      // Call recovery attempt callback
      if (onRecoveryAttempt) {
        onRecoveryAttempt(agentError, strategy, attempt);
      }

      switch (strategy) {
        case 'retry':
          if (attempt < maxRetries) {
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
            await sleep(delay);
            attempt++;
            continue;
          }
          break;

        case 'fallback':
          if (fallback !== undefined) {
            const fallbackValue =
              typeof fallback === 'function' ? await (fallback as Function)() : fallback;
            return {
              success: true,
              value: fallbackValue,
              originalError: agentError,
              strategy: 'fallback',
              message: 'Used fallback value after error',
            };
          }
          break;

        case 'skip':
          if (allowSkip) {
            return {
              success: false,
              originalError: agentError,
              strategy: 'skip',
              message: 'Operation skipped due to error',
            };
          }
          break;

        case 'manual':
          return {
            success: false,
            originalError: agentError,
            strategy: 'manual',
            message: 'Manual intervention required',
          };

        case 'fail':
        default:
          throw error;
      }

      attempt++;
    }
  }

  // All retries exhausted
  return {
    success: false,
    originalError: lastError!,
    strategy: 'retry',
    message: `Failed after ${maxRetries} retries`,
  };
}

/**
 * Create error recovery tool result
 */
export function createErrorToolResult(error: unknown): ToolResult {
  const agentError =
    error instanceof AgentErrorClass
      ? error.toJSON()
      : {
          code: classifyError(error).code,
          message: error instanceof Error ? error.message : String(error),
          retryable: classifyError(error).retryable,
          timestamp: Date.now(),
        };

  return {
    toolCallId: '',
    success: false,
    error: getUserFriendlyMessage(agentError),
  };
}

/**
 * Circuit breaker state
 */
interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

/**
 * Circuit breaker for protecting against cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;

  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.state = {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.state.lastFailure;
      if (timeSinceLastFailure < this.resetTimeout) {
        throw new AgentErrorClass(
          ErrorCode.LLM_API_ERROR,
          'Circuit breaker is open - service temporarily unavailable',
          { state: this.state },
          false
        );
      }
      // Move to half-open state
      this.state.state = 'half-open';
    }

    try {
      const result = await fn();

      // Success - reset circuit
      if (this.state.state === 'half-open') {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Record a failure
   */
  private recordFailure(): void {
    this.state.failures++;
    this.state.lastFailure = Date.now();

    if (this.state.failures >= this.failureThreshold) {
      this.state.state = 'open';
    }
  }

  /**
   * Reset the circuit
   */
  reset(): void {
    this.state = {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return { ...this.state };
  }
}

/**
 * Graceful degradation wrapper
 */
export function withGracefulDegradation<T>(
  primary: () => Promise<T>,
  degraded: () => T | Promise<T>,
  options?: { timeout?: number }
): () => Promise<T> {
  const timeout = options?.timeout || 10000;

  return async () => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => { reject(new Error('Primary function timed out')); }, timeout);
    });

    try {
      return await Promise.race([primary(), timeoutPromise]);
    } catch {
      // Fall back to degraded mode
      return await degraded();
    }
  };
}
