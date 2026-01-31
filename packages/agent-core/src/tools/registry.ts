/**
 * @fileoverview Tool registry for managing and executing tools
 * @module @ue-bot/agent-core/tools/registry
 */

import type { ToolContext, ToolDefinition, ToolGroup, ToolResult } from '../types';
import { generateId, matchGlob } from '../utils';
import { BaseTool } from './base-tool';

/**
 * Registry configuration
 */
export interface RegistryConfig {
  /** Allowed tools (glob patterns) */
  allow: string[];
  /** Denied tools (glob patterns, takes precedence) */
  deny: string[];
}

/**
 * Default registry configuration
 */
const DEFAULT_CONFIG: RegistryConfig = {
  allow: ['*'],
  deny: [],
};

/**
 * Tool registry for managing available tools
 */
export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();
  private config: RegistryConfig;

  constructor(config?: Partial<RegistryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a single tool
   * @param tool - Tool to register
   */
  register(tool: BaseTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools
   * @param tools - Array of tools to register
   */
  registerMany(tools: BaseTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Unregister a tool
   * @param name - Tool name to unregister
   */
  unregister(name: string): void {
    this.tools.delete(name);
  }

  /**
   * Get a tool by name
   * @param name - Tool name
   * @returns Tool instance or undefined
   */
  get(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   * @param name - Tool name
   * @returns True if tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Update registry configuration
   * @param config - New configuration
   */
  updateConfig(config: Partial<RegistryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a tool is allowed based on config
   * @param name - Tool name
   * @returns True if tool is allowed
   */
  isAllowed(name: string): boolean {
    // Check deny list first (takes precedence)
    for (const pattern of this.config.deny) {
      if (matchGlob(pattern, name)) {
        return false;
      }
    }

    // Check allow list
    for (const pattern of this.config.allow) {
      if (matchGlob(pattern, name)) {
        return true;
      }
    }

    // If allow list is empty, default to allow all
    return this.config.allow.length === 0;
  }

  /**
   * Get all tool definitions (filtered by allow/deny)
   * @returns Array of tool definitions
   */
  getDefinitions(): ToolDefinition[] {
    const definitions: ToolDefinition[] = [];

    for (const [name, tool] of this.tools) {
      if (this.isAllowed(name)) {
        definitions.push(tool.getDefinition());
      }
    }

    return definitions;
  }

  /**
   * Get tools by group
   * @param group - Tool group
   * @returns Array of tools in the group
   */
  getByGroup(group: ToolGroup): BaseTool[] {
    const tools: BaseTool[] = [];

    for (const [name, tool] of this.tools) {
      if (tool.group === group && this.isAllowed(name)) {
        tools.push(tool);
      }
    }

    return tools;
  }

  /**
   * Get all registered tool names
   * @returns Array of tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys()).filter((name) => this.isAllowed(name));
  }

  /**
   * Execute a tool by name
   * @param name - Tool name
   * @param params - Tool parameters
   * @param context - Execution context
   * @returns Tool result
   */
  async execute(
    name: string,
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        toolCallId: generateId('tc'),
        success: false,
        error: `Tool "${name}" not found`,
      };
    }

    if (!this.isAllowed(name)) {
      return {
        toolCallId: generateId('tc'),
        success: false,
        error: `Tool "${name}" is not allowed`,
      };
    }

    return tool.run(params, context);
  }

  /**
   * Execute multiple tools in parallel
   * @param calls - Array of tool calls
   * @param context - Execution context
   * @returns Array of tool results
   */
  async executeMany(
    calls: Array<{ name: string; params: Record<string, unknown> }>,
    context: ToolContext
  ): Promise<ToolResult[]> {
    return Promise.all(calls.map((call) => this.execute(call.name, call.params, context)));
  }

  /**
   * Get registry statistics
   * @returns Registry stats
   */
  getStats(): {
    total: number;
    allowed: number;
    denied: number;
    byGroup: Record<ToolGroup, number>;
  } {
    const byGroup: Partial<Record<ToolGroup, number>> = {};
    let allowed = 0;
    let denied = 0;

    for (const [name, tool] of this.tools) {
      if (this.isAllowed(name)) {
        allowed++;
        byGroup[tool.group] = (byGroup[tool.group] || 0) + 1;
      } else {
        denied++;
      }
    }

    return {
      total: this.tools.size,
      allowed,
      denied,
      byGroup: byGroup as Record<ToolGroup, number>,
    };
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }
}

/**
 * Create a default tool registry
 */
export function createToolRegistry(config?: Partial<RegistryConfig>): ToolRegistry {
  return new ToolRegistry(config);
}
