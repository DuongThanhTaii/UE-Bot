/**
 * @fileoverview Agent Core integration for Telegram Bot
 * @module @ue-bot/telegram-bot/agent
 */

import {
  Agent,
  GroqProvider,
  InMemoryStore,
  ToolRegistry,
  buildSystemPrompt,
  createFsTools,
  createMemoryTools,
  createOpenTools,
  createRuntimeTools,
  createWebTools,
  setMemoryStore,
} from '@ue-bot/agent-core';

/**
 * Configuration for creating Telegram agent
 */
export interface TelegramAgentConfig {
  apiKey: string;
  model?: string;
  braveApiKey?: string;
  workingDirectory?: string;
}

/**
 * Tool execution info for telegram display
 */
export interface ToolUsedInfo {
  name: string;
  success: boolean;
  error?: string;
}

// Store agents per user (session persistence)
const userAgents = new Map<number, Agent>();

// Initialize memory store (in-memory for Telegram)
const memoryStore = new InMemoryStore();
setMemoryStore(memoryStore);

/**
 * Create a new agent with all tools
 */
function createTelegramAgent(config: TelegramAgentConfig): Agent {
  // Create provider
  const provider = new GroqProvider({
    apiKey: config.apiKey,
    model: config.model ?? 'llama-3.3-70b-versatile',
  });

  // Create registry and register all tools
  const registry = new ToolRegistry();

  // Register filesystem tools
  const fsTools = createFsTools();
  registry.registerMany(fsTools);

  // Register runtime tools
  const runtimeTools = createRuntimeTools();
  registry.registerMany(runtimeTools);

  // Register open tools (URL/app opening)
  const openTools = createOpenTools();
  registry.registerMany(openTools);

  // Register web tools if Brave API key provided
  if (config.braveApiKey) {
    const webTools = createWebTools(config.braveApiKey);
    registry.registerMany(webTools);
  }

  // Register memory tools
  const memoryTools = createMemoryTools();
  registry.registerMany(memoryTools);

  // Get tool names for system prompt
  const toolNames = registry.getToolNames();

  // Build system prompt
  const workingDir = config.workingDirectory ?? process.cwd();
  const systemPrompt = buildSystemPrompt({
    workspaceDir: workingDir,
    toolNames,
    channel: 'telegram',
    userTimezone: 'Asia/Ho_Chi_Minh',
    extraSystemPrompt: `Bạn đang trò chuyện qua Telegram. Hãy trả lời ngắn gọn, hữu ích và thân thiện.
Khi sử dụng tools, hãy báo cáo kết quả một cách tóm tắt.`,
  });

  // Create agent
  return new Agent(provider, registry, {
    model: config.model ?? 'llama-3.3-70b-versatile',
    systemPrompt,
    workingDirectory: workingDir,
    maxIterations: 5,
    temperature: 0.7,
  });
}

/**
 * Get or create agent for a user
 */
export function getAgentForUser(userId: number, config: TelegramAgentConfig): Agent {
  let agent = userAgents.get(userId);

  if (!agent) {
    agent = createTelegramAgent(config);
    userAgents.set(userId, agent);
  }

  return agent;
}

/**
 * Clear agent for a user (reset session)
 */
export function clearUserAgent(userId: number): void {
  userAgents.delete(userId);
}

/**
 * Execute message response
 */
export interface ExecuteMessageResult {
  content: string;
  toolsUsed: ToolUsedInfo[];
}

/**
 * Execute a message with the agent (non-streaming for Telegram)
 * @param agent - Agent instance
 * @param message - User message
 * @param onToolStart - Callback when tool starts
 * @param onToolResult - Callback when tool completes
 */
export async function executeMessage(
  agent: Agent,
  message: string,
  onToolStart?: (name: string, args: Record<string, unknown>) => void,
  onToolResult?: (name: string, success: boolean) => void
): Promise<ExecuteMessageResult> {
  const toolsUsed: ToolUsedInfo[] = [];

  try {
    // Use streaming API to track tool calls
    const stream = agent.chatStream(message);
    let content = '';

    for await (const event of stream) {
      switch (event.type) {
        case 'text_delta':
          content += event.content;
          break;

        case 'tool_start':
          onToolStart?.(event.toolName, event.arguments);
          break;

        case 'tool_end': {
          const toolResult = event.result;
          onToolResult?.(event.toolName, toolResult.success);
          toolsUsed.push({
            name: event.toolName,
            success: toolResult.success,
            error: toolResult.error,
          });
          break;
        }

        case 'complete': {
          const resultContent = event.result.content;
          if (resultContent) {
            content = resultContent;
          }
          break;
        }
      }
    }

    return { content, toolsUsed };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw err;
  }
}

/**
 * Format tools used message for Telegram
 */
export function formatToolsUsedMessage(toolsUsed: ToolUsedInfo[]): string {
  if (toolsUsed.length === 0) return '';

  const lines = ['🔧 _Tools used:_'];

  for (const tool of toolsUsed) {
    const status = tool.success ? '✅' : '❌';
    lines.push(`${status} \`${tool.name}\`${tool.error ? ` - ${tool.error}` : ''}`);
  }

  return lines.join('\n');
}
