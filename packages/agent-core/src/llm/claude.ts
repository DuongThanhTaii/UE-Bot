/**
 * @fileoverview Anthropic Claude LLM Provider with tool use support
 * @module @ue-bot/agent-core/llm/claude
 */

import Anthropic from '@anthropic-ai/sdk';

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
 * Claude provider configuration
 */
export interface ClaudeConfig {
  /** Anthropic API key */
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
  model: 'claude-sonnet-4-20250514',
  timeout: 60000,
  maxRetries: 3,
};

/**
 * Claude LLM Provider implementation
 */
export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;
  private config: Required<ClaudeConfig>;

  constructor(config: ClaudeConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<ClaudeConfig>;

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      maxRetries: 0,
    });
  }

  /**
   * Extract system message and convert remaining to Claude format
   */
  private toClaudeMessages(messages: Message[]): {
    system: string | undefined;
    messages: Anthropic.MessageParam[];
  } {
    let system: string | undefined;
    const claudeMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = msg.content;
        continue;
      }

      if (msg.role === 'user') {
        claudeMessages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        const assistantMsg = msg as Message & { toolCalls?: ToolCall[] };
        if (assistantMsg.toolCalls?.length) {
          const content: Anthropic.ContentBlockParam[] = [];
          if (msg.content) {
            content.push({ type: 'text', text: msg.content });
          }
          for (const tc of assistantMsg.toolCalls) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.arguments,
            });
          }
          claudeMessages.push({ role: 'assistant', content });
        } else {
          claudeMessages.push({ role: 'assistant', content: msg.content });
        }
      } else if (msg.role === 'tool') {
        const toolMsg = msg as Message & { toolCallId: string };
        // Claude expects tool results as user messages with tool_result content
        claudeMessages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolMsg.toolCallId,
              content: msg.content,
            },
          ],
        });
      }
    }

    return { system, messages: claudeMessages };
  }

  /**
   * Convert tool definitions to Claude format
   */
  private toClaudeTools(tools?: ToolDefinition[]): Anthropic.Tool[] | undefined {
    if (!tools?.length) return undefined;

    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Tool.InputSchema,
    }));
  }

  /**
   * Parse Claude response to internal format
   */
  private parseResponse(response: Anthropic.Message): LLMResponse {
    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    let finishReason: LLMResponse['finishReason'] = 'stop';
    if (response.stop_reason === 'tool_use') {
      finishReason = 'tool_calls';
    } else if (response.stop_reason === 'max_tokens') {
      finishReason = 'length';
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  /**
   * Execute chat completion
   */
  async chat(request: LLMChatRequest): Promise<LLMResponse> {
    return withRetry(
      async () => {
        try {
          const { system, messages } = this.toClaudeMessages(request.messages);

          const response = await this.client.messages.create({
            model: this.config.model,
            system,
            messages,
            tools: this.toClaudeTools(request.tools),
            temperature: request.temperature,
            max_tokens: request.maxTokens || 4096,
          });

          return this.parseResponse(response);
        } catch (error) {
          if (error instanceof Anthropic.APIError) {
            if (error.status === 429) {
              throw new AgentErrorClass(
                ErrorCode.LLM_RATE_LIMIT,
                'Claude rate limit exceeded',
                { originalError: error },
                true
              );
            }
            throw new AgentErrorClass(
              ErrorCode.LLM_API_ERROR,
              `Claude API error: ${error.message}`,
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
    const { system, messages } = this.toClaudeMessages(request.messages);

    const stream = this.client.messages.stream({
      model: this.config.model,
      system,
      messages,
      tools: this.toClaudeTools(request.tools),
      temperature: request.temperature,
      max_tokens: request.maxTokens || 4096,
    });

    const toolCallsInProgress: Map<string, { id: string; name: string; arguments: string }> =
      new Map();

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          const toolUse = event.content_block;
          toolCallsInProgress.set(toolUse.id, {
            id: toolUse.id,
            name: toolUse.name,
            arguments: '',
          });
          yield {
            type: 'tool_call_start',
            toolCall: {
              id: toolUse.id,
              name: toolUse.name,
            },
          };
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield { type: 'text_delta', content: event.delta.text };
        } else if (event.delta.type === 'input_json_delta') {
          // Find the tool call being built
          for (const tc of toolCallsInProgress.values()) {
            tc.arguments += event.delta.partial_json;
            yield {
              type: 'tool_call_delta',
              toolCallId: tc.id,
              argumentsDelta: event.delta.partial_json,
            };
          }
        }
      } else if (event.type === 'message_stop') {
        // Emit completed tool calls
        for (const tc of toolCallsInProgress.values()) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.arguments);
          } catch {
            // Keep empty object
          }
          yield {
            type: 'tool_call_complete',
            toolCall: {
              id: tc.id,
              name: tc.name,
              arguments: args,
            },
          };
        }

        yield { type: 'done', finishReason: 'stop' };
      }
    }
  }
}
