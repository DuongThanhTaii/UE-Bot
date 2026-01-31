/**
 * @fileoverview Agent Core adapter for CLI
 * Integrates @ue-bot/agent-core with full tool support
 */

import {
  Agent,
  GroqProvider,
  ToolRegistry,
  createFsTools,
  createRuntimeTools,
  createWebTools,
  createMemoryTools,
  createOpenTools,
  setMemoryStore,
  SQLiteMemoryStore,
  buildSystemPrompt,
} from '@ue-bot/agent-core';
import * as path from 'path';
import * as os from 'os';
import { getConfigValue } from './utils/config.js';

export interface AgentCoreConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  workingDirectory?: string;
  braveApiKey?: string;
}

export interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResultInfo {
  name: string;
  success: boolean;
  result: unknown;
  error?: string;
}

export interface StreamCallbacks {
  onText?: (text: string) => void;
  onToolCall?: (toolCall: ToolCallInfo) => Promise<boolean> | boolean;
  onToolResult?: (result: ToolResultInfo) => void;
  onThinking?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Create and configure the full Agent with tools
 */
export function createAgent(config: AgentCoreConfig): {
  agent: Agent;
  registry: ToolRegistry;
} {
  // Initialize provider
  const provider = new GroqProvider({
    apiKey: config.apiKey,
    model: config.model || 'llama-3.3-70b-versatile',
  });

  // Initialize memory store
  const dataDir = process.env['DATA_DIR'] || path.join(os.homedir(), '.ue-bot', 'data');
  const memoryStore = new SQLiteMemoryStore({
    dbPath: path.join(dataDir, 'memory.db'),
  });
  setMemoryStore(memoryStore);

  // Initialize tool registry with all tools
  const registry = new ToolRegistry();
  registry.registerMany([
    ...createFsTools(),
    ...createRuntimeTools(),
    ...createWebTools(config.braveApiKey || process.env['BRAVE_SEARCH_API_KEY']),
    ...createMemoryTools(),
    ...createOpenTools(),
  ]);

  // Build system prompt
  const workingDir = config.workingDirectory || process.cwd();
  const toolNames = registry.getToolNames();
  const systemPrompt = buildSystemPrompt({
    workspaceDir: workingDir,
    toolNames,
    channel: 'cli',
    userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Create agent
  const agent = new Agent(provider, registry, {
    systemPrompt,
    workingDirectory: workingDir,
    maxIterations: 15,
    maxTokens: config.maxTokens || 4096,
    temperature: config.temperature || 0.7,
  });

  return { agent, registry };
}

/**
 * Execute a message with streaming and tool execution
 */
export async function executeWithStream(
  agent: Agent,
  message: string,
  callbacks: StreamCallbacks
): Promise<string> {
  let fullResponse = '';

  try {
    // Use chatStream which returns an async generator
    const stream = agent.chatStream(message);

    for await (const event of stream) {
      switch (event.type) {
        case 'text_delta':
          fullResponse += event.content;
          callbacks.onText?.(event.content);
          break;

        case 'thinking':
          callbacks.onThinking?.();
          break;

        case 'tool_start':
          if (callbacks.onToolCall) {
            await callbacks.onToolCall({
              name: event.toolName,
              args: event.arguments,
            });
          }
          break;

        case 'tool_end':
          callbacks.onToolResult?.({
            name: event.toolName,
            success: event.result.success,
            result: event.result.data,
            error: event.result.error,
          });
          break;

        case 'error':
          callbacks.onError?.(new Error(event.error.message));
          break;

        case 'complete':
          if (event.result?.content) {
            fullResponse = event.result.content;
          }
          break;
      }
    }

    return fullResponse;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    callbacks.onError?.(err);
    throw err;
  }
}

/**
 * Get a simple agent instance for quick usage
 */
export function getSimpleAgent(): Agent | null {
  const apiKey = getConfigValue('groqApiKey');
  if (!apiKey) {
    return null;
  }

  const { agent } = createAgent({
    apiKey,
    braveApiKey: getConfigValue('braveApiKey'),
  });

  return agent;
}

/**
 * List available tools
 */
export function listAvailableTools(registry: ToolRegistry): string[] {
  const definitions = registry.getDefinitions();
  return definitions.map((t) => `${t.name}: ${t.description}`);
}
