/**
 * @fileoverview Groq LLM Provider with function calling support
 * @module @ue-bot/agent-core/llm/groq
 */

import Groq from 'groq-sdk';

import { AgentErrorClass, withRetry } from '../errors';
import type {
  LLMChatRequest,
  LLMProvider,
  LLMResponse,
  Message,
  StreamChunk,
  ToolCall,
  ToolDefinition,
} from '../types';
import { ErrorCode } from '../types';

/**
 * Groq provider configuration
 */
export interface GroqConfig {
  /** Groq API key */
  apiKey: string;
  /** Model to use */
  model?: string;
  /** Base URL for API (optional) */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retries */
  maxRetries?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  model: 'llama-3.3-70b-versatile',
  timeout: 60000,
  maxRetries: 3,
};

/**
 * Groq LLM Provider implementation
 */
export class GroqProvider implements LLMProvider {
  private client: Groq;
  private config: Required<GroqConfig>;

  constructor(config: GroqConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<GroqConfig>;

    this.client = new Groq({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      maxRetries: 0, // We handle retries ourselves
    });
  }

  /**
   * Convert internal messages to Groq format
   */
  private toGroqMessages(messages: Message[]): Groq.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      switch (msg.role) {
        case 'system':
          return { role: 'system' as const, content: msg.content };
        case 'user':
          return { role: 'user' as const, content: msg.content };
        case 'assistant':
          const assistantMsg = msg as Message & { toolCalls?: ToolCall[] };
          if (assistantMsg.toolCalls?.length) {
            return {
              role: 'assistant' as const,
              content: msg.content || null,
              tool_calls: assistantMsg.toolCalls.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: {
                  name: tc.name,
                  arguments: JSON.stringify(tc.arguments),
                },
              })),
            };
          }
          return { role: 'assistant' as const, content: msg.content };
        case 'tool':
          const toolMsg = msg as Message & { toolCallId: string };
          return {
            role: 'tool' as const,
            tool_call_id: toolMsg.toolCallId,
            content: msg.content,
          };
        default:
          throw new Error(`Unknown message role: ${(msg as Message).role}`);
      }
    });
  }

  /**
   * Convert tool definitions to Groq format
   */
  private toGroqTools(
    tools?: ToolDefinition[]
  ): Groq.Chat.Completions.ChatCompletionTool[] | undefined {
    if (!tools?.length) return undefined;

    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as unknown as Record<string, unknown>,
      },
    }));
  }

  /**
   * Parse Groq response to internal format
   */
  private parseResponse(
    choice: Groq.Chat.Completions.ChatCompletion.Choice,
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  ): LLMResponse {
    const message = choice.message;
    const toolCalls: ToolCall[] | undefined = message.tool_calls?.map(
      (tc: { id: string; function: { name: string; arguments: string } }) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: this.safeParseJSON(tc.function.arguments),
      })
    );

    let finishReason: LLMResponse['finishReason'] = 'stop';
    switch (choice.finish_reason) {
      case 'tool_calls':
        finishReason = 'tool_calls';
        break;
      case 'length':
        finishReason = 'length';
        break;
    }

    return {
      content: message.content || '',
      toolCalls: toolCalls?.length ? toolCalls : undefined,
      finishReason,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Safely parse JSON arguments
   */
  private safeParseJSON(str: string): Record<string, unknown> {
    try {
      return JSON.parse(str);
    } catch {
      return { raw: str };
    }
  }

  /**
   * Send chat request (non-streaming)
   */
  async chat(request: LLMChatRequest): Promise<LLMResponse> {
    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.config.model,
            messages: this.toGroqMessages(request.messages),
            tools: this.toGroqTools(request.tools),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? 4096,
            stream: false,
          });

          if (!response.choices?.[0]) {
            throw new AgentErrorClass(ErrorCode.LLM_INVALID_RESPONSE, 'No response from Groq API');
          }

          return this.parseResponse(response.choices[0], response.usage);
        } catch (error) {
          if (error instanceof AgentErrorClass) throw error;

          // Handle Groq-specific errors
          const groqError = error as { status?: number; message?: string };
          if (groqError.status === 429) {
            throw new AgentErrorClass(ErrorCode.LLM_RATE_LIMIT, 'Rate limit exceeded', error, true);
          }
          if (groqError.status === 401) {
            throw new AgentErrorClass(ErrorCode.LLM_API_ERROR, 'Invalid API key', error, false);
          }
          if (groqError.status && groqError.status >= 500) {
            throw new AgentErrorClass(ErrorCode.LLM_API_ERROR, 'Groq API error', error, true);
          }

          throw new AgentErrorClass(
            ErrorCode.LLM_API_ERROR,
            groqError.message || 'Unknown Groq API error',
            error,
            false
          );
        }
      },
      { maxRetries: this.config.maxRetries }
    );
  }

  /**
   * Send chat request with streaming
   */
  async *chatStream(request: LLMChatRequest): AsyncGenerator<StreamChunk> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: this.toGroqMessages(request.messages),
        tools: this.toGroqTools(request.tools),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        stream: true,
      });

      // Track tool calls being built
      const toolCallsInProgress =
        new Map<number, { id: string; name: string; arguments: string }>();

      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta;

        // Handle text content
        if (delta.content) {
          yield { type: 'text_delta', content: delta.content };
        }

        // Handle tool calls
        if (delta.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            const index = toolCallDelta.index;

            if (!toolCallsInProgress.has(index)) {
              // New tool call starting
              const newToolCall = {
                id: toolCallDelta.id || `call_${index}`,
                name: toolCallDelta.function?.name || '',
                arguments: toolCallDelta.function?.arguments || '',
              };
              toolCallsInProgress.set(index, newToolCall);

              yield {
                type: 'tool_call_start',
                toolCall: { id: newToolCall.id, name: newToolCall.name },
              };
            } else {
              // Continuing existing tool call
              const existing = toolCallsInProgress.get(index)!;

              if (toolCallDelta.function?.name) {
                existing.name += toolCallDelta.function.name;
              }

              if (toolCallDelta.function?.arguments) {
                existing.arguments += toolCallDelta.function.arguments;
                yield {
                  type: 'tool_call_delta',
                  toolCallId: existing.id,
                  argumentsDelta: toolCallDelta.function.arguments,
                };
              }
            }
          }
        }

        // Handle finish
        if (choice.finish_reason) {
          // Emit completed tool calls
          for (const [, toolCall] of toolCallsInProgress) {
            yield {
              type: 'tool_call_complete',
              toolCall: {
                id: toolCall.id,
                name: toolCall.name,
                arguments: this.safeParseJSON(toolCall.arguments),
              },
            };
          }

          yield {
            type: 'done',
            finishReason: choice.finish_reason,
          };
        }
      }
    } catch (error) {
      const groqError = error as { status?: number; message?: string };
      if (groqError.status === 429) {
        throw new AgentErrorClass(ErrorCode.LLM_RATE_LIMIT, 'Rate limit exceeded', error, true);
      }
      throw AgentErrorClass.fromError(error);
    }
  }
}
