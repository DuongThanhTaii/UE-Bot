/**
 * Agent adapter for CLI
 * Wraps the Groq API directly for simpler CLI usage
 */

import Groq from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { generateId } from './session.js';

export interface AgentConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatCallbacks {
  stream?: boolean;
  onToolCall?: (toolCall: { name: string; args: unknown }) => Promise<boolean> | boolean;
  onToolResult?: (result: { success: boolean; output?: unknown }) => void;
  onToken?: (token: string) => void;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Session {
  id: string;
  messages: Message[];
  createdAt: string;
}

/**
 * Agent class for CLI
 */
export class Agent {
  private client: Groq;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private history: Message[] = [];
  private sessionId: string;
  private sessionCreatedAt: string;

  constructor(config: AgentConfig) {
    this.client = new Groq({ apiKey: config.apiKey });
    this.model = config.model || 'llama-3.3-70b-versatile';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.7;
    this.sessionId = generateId('sess');
    this.sessionCreatedAt = new Date().toISOString();
  }

  /**
   * Chat with the agent
   */
  async chat(userMessage: string, callbacks?: ChatCallbacks): Promise<ChatResponse> {
    // Add user message to history
    this.history.push({ role: 'user', content: userMessage });

    // Build messages for API
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are UE-Bot, a helpful AI assistant. Be concise and helpful.`,
      },
      ...this.history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    try {
      if (callbacks?.stream && callbacks.onToken) {
        // Streaming response
        const stream = await this.client.chat.completions.create({
          model: this.model,
          messages,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          stream: true,
        });

        let fullContent = '';
        let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            callbacks.onToken(delta);
          }

          // Get usage from final chunk (if available in x_groq extension)
          // Streaming chunks don't include standard usage, only available via x_groq
          const xGroq = chunk as unknown as {
            x_groq?: {
              usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
            };
          };
          if (xGroq.x_groq?.usage) {
            usage = {
              promptTokens: xGroq.x_groq.usage.prompt_tokens ?? 0,
              completionTokens: xGroq.x_groq.usage.completion_tokens ?? 0,
              totalTokens: xGroq.x_groq.usage.total_tokens ?? 0,
            };
          }
        }

        // Add assistant message to history
        this.history.push({ role: 'assistant', content: fullContent });

        return { content: fullContent, usage };
      } else {
        // Non-streaming response
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
        });

        const content = response.choices[0]?.message?.content || '';

        // Add assistant message to history
        this.history.push({ role: 'assistant', content });

        return {
          content,
          usage: response.usage
            ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
              }
            : undefined,
        };
      }
    } catch (error) {
      // Remove the user message on error
      this.history.pop();
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): Message[] {
    return [...this.history];
  }

  /**
   * Get current session info
   */
  getSession(): Session {
    return {
      id: this.sessionId,
      messages: [...this.history],
      createdAt: this.sessionCreatedAt,
    };
  }

  /**
   * Load a session (stub for now)
   */
  async loadSession(sessionId: string): Promise<void> {
    // TODO: Implement session persistence
    this.sessionId = sessionId;
  }

  /**
   * Save current session (stub for now)
   */
  async saveSession(): Promise<string> {
    // TODO: Implement session persistence
    return this.sessionId;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Set model
   */
  setModel(model: string): void {
    this.model = model;
  }
}
