/**
 * @fileoverview OpenAI LLM Provider with function calling support
 * @module @ue-bot/agent-core/llm/openai
 */

import OpenAI from 'openai';

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
 * OpenAI provider configuration
 */
export interface OpenAIConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use */
  model?: string;
  /** Base URL for API (optional, for Azure or proxies) */
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
  model: 'gpt-4o-mini',
  timeout: 60000,
  maxRetries: 3,
};

/**
 * OpenAI LLM Provider implementation
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private config: Required<OpenAIConfig>;

  constructor(config: OpenAIConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<OpenAIConfig>;

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      maxRetries: 0,
    });
  }

  /**
   * Convert internal messages to OpenAI format
   */
  private toOpenAIMessages(
    messages: Message[]
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
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
   * Convert tool definitions to OpenAI format
   */
  private toOpenAITools(
    tools?: ToolDefinition[]
  ): OpenAI.Chat.Completions.ChatCompletionTool[] | undefined {
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
   * Parse OpenAI response to internal format
   */
  private parseResponse(
    choice: OpenAI.Chat.Completions.ChatCompletion.Choice,
    usage?: OpenAI.Completions.CompletionUsage
  ): LLMResponse {
    const message = choice.message;
    const toolCalls: ToolCall[] | undefined = message.tool_calls
      ?.filter(
        (tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageToolCall & { type: 'function' } =>
          tc.type === 'function'
      )
      .map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: this.safeParseJSON(tc.function.arguments),
      }));

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
      toolCalls,
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
   * Safely parse JSON
   */
  private safeParseJSON(str: string): Record<string, unknown> {
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  }

  /**
   * Execute chat completion
   */
  async chat(request: LLMChatRequest): Promise<LLMResponse> {
    return withRetry(
      async () => {
        try {
          const response = await this.client.chat.completions.create({
            model: this.config.model,
            messages: this.toOpenAIMessages(request.messages),
            tools: this.toOpenAITools(request.tools),
            temperature: request.temperature,
            max_tokens: request.maxTokens,
          });

          const choice = response.choices[0];
          if (!choice) {
            throw new AgentErrorClass(ErrorCode.LLM_INVALID_RESPONSE, 'No response from OpenAI');
          }

          return this.parseResponse(choice, response.usage ?? undefined);
        } catch (error) {
          if (error instanceof OpenAI.APIError) {
            if (error.status === 429) {
              throw new AgentErrorClass(
                ErrorCode.LLM_RATE_LIMIT,
                'OpenAI rate limit exceeded',
                { originalError: error },
                true
              );
            }
            throw new AgentErrorClass(
              ErrorCode.LLM_API_ERROR,
              `OpenAI API error: ${error.message}`,
              { originalError: error }
            );
          }
          throw error;
        }
      },
      { maxRetries: this.config.maxRetries }
    );
  }

  /**
   * Execute streaming chat completion
   */
  async *chatStream(request: LLMChatRequest): AsyncGenerator<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: this.toOpenAIMessages(request.messages),
      tools: this.toOpenAITools(request.tools),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: true,
    });

    const toolCallsInProgress: Map<number, { id: string; name: string; arguments: string }> =
      new Map();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        yield { type: 'text_delta', content: delta.content };
      }

      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          const index = toolCall.index;

          if (toolCall.id) {
            // New tool call starting
            toolCallsInProgress.set(index, {
              id: toolCall.id,
              name: toolCall.function?.name || '',
              arguments: toolCall.function?.arguments || '',
            });

            yield {
              type: 'tool_call_start',
              toolCall: {
                id: toolCall.id,
                name: toolCall.function?.name || '',
              },
            };
          } else if (toolCall.function?.arguments) {
            // Arguments streaming
            const existing = toolCallsInProgress.get(index);
            if (existing) {
              existing.arguments += toolCall.function.arguments;
              yield {
                type: 'tool_call_delta',
                toolCallId: existing.id,
                argumentsDelta: toolCall.function.arguments,
              };
            }
          }
        }
      }

      if (chunk.choices[0]?.finish_reason) {
        // Emit completed tool calls
        for (const tc of toolCallsInProgress.values()) {
          yield {
            type: 'tool_call_complete',
            toolCall: {
              id: tc.id,
              name: tc.name,
              arguments: this.safeParseJSON(tc.arguments),
            },
          };
        }

        yield {
          type: 'done',
          finishReason: chunk.choices[0].finish_reason,
        };
      }
    }
  }
}
