/**
 * @fileoverview Tests for tool registry
 * @module @ue-bot/agent-core/__tests__/registry.test
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BaseTool } from '../tools/base-tool';
import { ToolRegistry, createToolRegistry } from '../tools/registry';
import type { ToolContext, ToolGroup } from '../types';

// Mock tool for testing
class MockTool extends BaseTool {
  readonly name = 'mock_tool';
  readonly group: ToolGroup = 'fs';
  readonly description = 'A mock tool for testing';
  readonly parameters = z.object({
    message: z.string().describe('Test message'),
  });

  protected async execute(args: { message: string }, _context: ToolContext): Promise<string> {
    return `Mock result: ${args.message}`;
  }
}

class AnotherMockTool extends BaseTool {
  readonly name = 'another_tool';
  readonly group: ToolGroup = 'fs';
  readonly description = 'Another mock tool';
  readonly parameters = z.object({
    value: z.number().describe('Test value'),
  });

  protected async execute(args: { value: number }, _context: ToolContext): Promise<number> {
    return args.value * 2;
  }
}

class DangerousTool extends BaseTool {
  readonly name = 'dangerous_tool';
  readonly group: ToolGroup = 'runtime';
  readonly description = 'A dangerous tool';
  readonly parameters = z.object({});

  protected async execute(): Promise<string> {
    return 'danger!';
  }
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let mockTool: MockTool;
  let anotherTool: AnotherMockTool;
  let dangerousTool: DangerousTool;

  beforeEach(() => {
    registry = createToolRegistry();
    mockTool = new MockTool();
    anotherTool = new AnotherMockTool();
    dangerousTool = new DangerousTool();
  });

  describe('register', () => {
    it('should register a tool', () => {
      registry.register(mockTool);
      expect(registry.get('mock_tool')).toBe(mockTool);
    });

    it('should register multiple tools with registerMany', () => {
      registry.registerMany([mockTool, anotherTool]);
      expect(registry.get('mock_tool')).toBe(mockTool);
      expect(registry.get('another_tool')).toBe(anotherTool);
    });

    it('should throw on duplicate registration', () => {
      registry.register(mockTool);
      expect(() => registry.register(mockTool)).toThrow();
    });
  });

  describe('get', () => {
    beforeEach(() => {
      registry.register(mockTool);
    });

    it('should return registered tool', () => {
      const tool = registry.get('mock_tool');
      expect(tool).toBe(mockTool);
    });

    it('should return undefined for non-existent tool', () => {
      const tool = registry.get('non_existent');
      expect(tool).toBeUndefined();
    });
  });

  describe('getDefinitions', () => {
    it('should return tool definitions', () => {
      registry.register(mockTool);
      const definitions = registry.getDefinitions();

      expect(definitions.length).toBe(1);
      expect(definitions[0]?.name).toBe('mock_tool');
      expect(definitions[0]?.description).toBe('A mock tool for testing');
      expect(definitions[0]?.parameters).toBeDefined();
    });

    it('should return definitions for multiple tools', () => {
      registry.registerMany([mockTool, anotherTool, dangerousTool]);
      const definitions = registry.getDefinitions();

      expect(definitions.length).toBe(3);
    });
  });

  describe('unregister', () => {
    it('should remove a registered tool', () => {
      registry.register(mockTool);
      registry.unregister('mock_tool');
      expect(registry.get('mock_tool')).toBeUndefined();
    });

    it('should not throw when removing non-existent tool', () => {
      expect(() => registry.unregister('non_existent')).not.toThrow();
    });
  });
});
