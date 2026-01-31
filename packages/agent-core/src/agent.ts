/**
 * @fileoverview Agent class with execution loop
 * @module @ue-bot/agent-core/agent
 */

import { AgentErrorClass } from './errors';
import { ToolRegistry } from './tools/registry';
import type {
  AgentConfig,
  AgentEvent,
  AgentExecuteOptions,
  AgentExecuteResult,
  LLMProvider,
  Message,
  ToolCall,
  ToolContext,
  ToolResult,
} from './types';
import { ErrorCode, createAgentError } from './types';
import { formatToolResult, generateId } from './utils';

/**
 * Default system prompt for the agent
 */
const DEFAULT_SYSTEM_PROMPT = `You are UE-Bot, a helpful AI assistant with access to various tools.

You can use tools to:
- Read, write, and search files
- Execute commands and scripts
- Search the web and fetch content
- Store and recall information from memory

Guidelines:
- Think step by step before using tools
- Use the most appropriate tool for each task
- Provide clear explanations of what you're doing
- If a task requires multiple steps, break it down
- Always verify results before reporting to the user

Be helpful, accurate, and concise.`;

/**
 * Agent configuration with defaults
 */
function createConfig(config: Partial<AgentConfig>): AgentConfig {
  return {
    model: config.model || 'llama-3.3-70b-versatile',
    systemPrompt: config.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 4096,
    maxIterations: config.maxIterations ?? 10,
    maxToolCallsPerIteration: config.maxToolCallsPerIteration ?? 5,
    tools: {
      allow: config.tools?.allow || ['*'],
      deny: config.tools?.deny || [],
    },
    workingDirectory: config.workingDirectory || process.cwd(),
  };
}

/**
 * AI Agent with tool execution capabilities
 */
export class Agent {
  private provider: LLMProvider;
  private registry: ToolRegistry;
  private config: AgentConfig;

  constructor(provider: LLMProvider, registry: ToolRegistry, config?: Partial<AgentConfig>) {
    this.provider = provider;
    this.registry = registry;
    this.config = createConfig(config || {});

    // Apply tool config to registry
    this.registry.updateConfig({
      allow: this.config.tools.allow,
      deny: this.config.tools.deny,
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AgentConfig>): void {
    this.config = createConfig({ ...this.config, ...config });
    this.registry.updateConfig({
      allow: this.config.tools.allow,
      deny: this.config.tools.deny,
    });
  }

  /**
   * Execute a chat request (non-streaming)
   */
  async chat(
    userMessage: string,
    options?: Partial<AgentExecuteOptions>
  ): Promise<AgentExecuteResult> {
    const sessionId = options?.sessionId || generateId('sess');
    const abortSignal = options?.abortSignal;
    const onEvent = options?.onEvent;

    // Build initial messages
    const messages: Message[] = [
      { role: 'system', content: this.config.systemPrompt },
      { role: 'user', content: userMessage },
    ];

    // Emit start event
    this.emitEvent(onEvent, { type: 'start', sessionId, timestamp: Date.now() });

    try {
      const result = await this.executeLoop(messages, sessionId, abortSignal, onEvent);

      // Emit complete event
      this.emitEvent(onEvent, {
        type: 'complete',
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      const agentError =
        error instanceof AgentErrorClass
          ? error.toJSON()
          : createAgentError(ErrorCode.UNKNOWN_ERROR, (error as Error).message, error, false);

      this.emitEvent(onEvent, {
        type: 'error',
        error: agentError,
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Execute a chat request with streaming
   */
  async *chatStream(
    userMessage: string,
    options?: Partial<AgentExecuteOptions>
  ): AsyncGenerator<AgentEvent> {
    const sessionId = options?.sessionId || generateId('sess');
    const abortSignal = options?.abortSignal;

    // Build initial messages
    const messages: Message[] = [
      { role: 'system', content: this.config.systemPrompt },
      { role: 'user', content: userMessage },
    ];

    yield { type: 'start', sessionId, timestamp: Date.now() };

    try {
      const toolCalls: Array<{
        tool: string;
        arguments: Record<string, unknown>;
        result: ToolResult;
      }> = [];

      let iteration = 0;
      let finalContent = '';

      while (iteration < this.config.maxIterations) {
        iteration++;
        yield { type: 'iteration', iteration, timestamp: Date.now() };
        yield { type: 'thinking', timestamp: Date.now() };

        // Check abort
        if (abortSignal?.aborted) {
          throw new AgentErrorClass(ErrorCode.ABORTED, 'Aborted');
        }

        // Get tool definitions
        const tools = this.registry.getDefinitions();

        // Stream LLM response
        let currentContent = '';
        let currentToolCalls: ToolCall[] = [];

        const stream = this.provider.chatStream({
          messages,
          tools: tools.length > 0 ? tools : undefined,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        });

        for await (const chunk of stream) {
          if (abortSignal?.aborted) {
            throw new AgentErrorClass(ErrorCode.ABORTED, 'Aborted');
          }

          switch (chunk.type) {
            case 'text_delta':
              currentContent += chunk.content;
              yield { type: 'text_delta', content: chunk.content, timestamp: Date.now() };
              break;

            case 'tool_call_complete':
              currentToolCalls.push(chunk.toolCall);
              break;

            case 'done':
              // Response complete
              break;
          }
        }

        // If no tool calls, we're done
        if (currentToolCalls.length === 0) {
          finalContent = currentContent;
          break;
        }

        // Add assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: currentContent,
          toolCalls: currentToolCalls,
        } as Message);

        // Execute tool calls (limit per iteration)
        const callsToExecute = currentToolCalls.slice(0, this.config.maxToolCallsPerIteration);

        const context: ToolContext = {
          sessionId,
          workingDirectory: this.config.workingDirectory,
          abortSignal,
        };

        for (const toolCall of callsToExecute) {
          yield {
            type: 'tool_start',
            toolName: toolCall.name,
            arguments: toolCall.arguments,
            timestamp: Date.now(),
          };

          const result = await this.registry.execute(toolCall.name, toolCall.arguments, context);

          toolCalls.push({
            tool: toolCall.name,
            arguments: toolCall.arguments,
            result,
          });

          yield {
            type: 'tool_end',
            toolName: toolCall.name,
            result,
            timestamp: Date.now(),
          };

          // Add tool result to messages
          messages.push({
            role: 'tool',
            content: formatToolResult(result),
            toolCallId: toolCall.id,
          } as Message);
        }
      }

      if (iteration >= this.config.maxIterations && !finalContent) {
        throw new AgentErrorClass(
          ErrorCode.MAX_ITERATIONS_EXCEEDED,
          `Max iterations (${this.config.maxIterations}) exceeded`,
          undefined,
          false
        );
      }

      const result: AgentExecuteResult = {
        content: finalContent,
        toolCalls,
        iterations: iteration,
      };

      yield { type: 'complete', result, timestamp: Date.now() };
    } catch (error) {
      const agentError =
        error instanceof AgentErrorClass
          ? error.toJSON()
          : createAgentError(ErrorCode.UNKNOWN_ERROR, (error as Error).message, error, false);

      yield { type: 'error', error: agentError, timestamp: Date.now() };
      throw error;
    }
  }

  /**
   * Execute the agent loop (non-streaming)
   */
  private async executeLoop(
    messages: Message[],
    sessionId: string,
    abortSignal?: AbortSignal,
    onEvent?: (event: AgentEvent) => void
  ): Promise<AgentExecuteResult> {
    const toolCalls: Array<{
      tool: string;
      arguments: Record<string, unknown>;
      result: ToolResult;
    }> = [];

    let iteration = 0;

    while (iteration < this.config.maxIterations) {
      iteration++;
      this.emitEvent(onEvent, { type: 'iteration', iteration, timestamp: Date.now() });
      this.emitEvent(onEvent, { type: 'thinking', timestamp: Date.now() });

      // Check abort
      if (abortSignal?.aborted) {
        throw new AgentErrorClass(ErrorCode.ABORTED, 'Aborted');
      }

      // Get tool definitions
      const tools = this.registry.getDefinitions();

      // Call LLM
      const response = await this.provider.chat({
        messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        return {
          content: response.content,
          toolCalls,
          iterations: iteration,
          usage: response.usage,
        };
      }

      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
      } as Message);

      // Execute tool calls
      const context: ToolContext = {
        sessionId,
        workingDirectory: this.config.workingDirectory,
        abortSignal,
      };

      const callsToExecute = response.toolCalls.slice(0, this.config.maxToolCallsPerIteration);

      for (const toolCall of callsToExecute) {
        this.emitEvent(onEvent, {
          type: 'tool_start',
          toolName: toolCall.name,
          arguments: toolCall.arguments,
          timestamp: Date.now(),
        });

        const result = await this.registry.execute(toolCall.name, toolCall.arguments, context);

        toolCalls.push({
          tool: toolCall.name,
          arguments: toolCall.arguments,
          result,
        });

        this.emitEvent(onEvent, {
          type: 'tool_end',
          toolName: toolCall.name,
          result,
          timestamp: Date.now(),
        });

        // Add tool result to messages
        messages.push({
          role: 'tool',
          content: formatToolResult(result),
          toolCallId: toolCall.id,
        } as Message);
      }
    }

    throw new AgentErrorClass(
      ErrorCode.MAX_ITERATIONS_EXCEEDED,
      `Max iterations (${this.config.maxIterations}) exceeded`,
      undefined,
      false
    );
  }

  /**
   * Emit an event if callback is provided
   */
  private emitEvent(onEvent: ((event: AgentEvent) => void) | undefined, event: AgentEvent): void {
    if (onEvent) {
      try {
        onEvent(event);
      } catch {
        // Ignore event handler errors
      }
    }
  }
}
