import { moltbotConfig, getMoltbotEndpoints } from "../moltbot-config";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  message: string;
  conversationId?: string;
  context?: Record<string, unknown>;
}

interface ChatResponse {
  message: string;
  conversationId: string;
  metadata?: Record<string, unknown>;
}

export class MoltbotClient {
  private config = moltbotConfig;
  private endpoints = getMoltbotEndpoints(this.config);

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(this.endpoints.chat, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey && {
          Authorization: `Bearer ${this.config.apiKey}`,
        }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(
        `Moltbot error: ${String(response.status)} ${response.statusText}`,
      );
    }

    return response.json() as Promise<ChatResponse>;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.endpoints.health, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getConversation(conversationId: string): Promise<ChatMessage[]> {
    const response = await fetch(
      `${this.endpoints.conversation}/${conversationId}`,
      {
        method: "GET",
        headers: {
          ...(this.config.apiKey && {
            Authorization: `Bearer ${this.config.apiKey}`,
          }),
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get conversation: ${response.statusText}`);
    }

    return response.json() as Promise<ChatMessage[]>;
  }
}

// Singleton instance
export const moltbotClient = new MoltbotClient();
