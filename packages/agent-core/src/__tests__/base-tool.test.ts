/**
 * @fileoverview Tests for base tool
 * @module @ue-bot/agent-core/__tests__/base-tool.test
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BaseTool } from '../tools/base-tool';
import type { ToolContext, ToolGroup } from '../types';

// Mock tool for testing
class TestTool extends BaseTool {
  readonly name = 'test_tool';
  readonly group: ToolGroup = 'fs';
  readonly description = 'A test tool';
  readonly parameters = z.object({
    input: z.string().describe('Input string'),
    count: z.number().optional().describe('Optional count'),
  });

  protected async execute(
    args: { input: string; count?: number },
    _context: ToolContext
  ): Promise<string> {
    const count = args.count || 1;
    return args.input.repeat(count);
  }
}

class ErrorTool extends BaseTool {
  readonly name = 'error_tool';
  readonly group: ToolGroup = 'runtime';
  readonly description = 'A tool that throws errors';
  readonly parameters = z.object({});

  protected async execute(): Promise<never> {
    throw new Error('Test error');
  }
}

describe('BaseTool', () => {
  let tool: TestTool;
  let context: ToolContext;

  beforeEach(() => {
    tool = new TestTool();
    context = {
      sessionId: 'test-session',
      workingDirectory: '/test',
    };
  });

  describe('getDefinition', () => {
    it('should return correct tool definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('test_tool');
      expect(definition.description).toBe('A test tool');
      expect(definition.parameters).toBeDefined();
      expect(definition.parameters.type).toBe('object');
      expect(definition.parameters.properties).toBeDefined();
    });

    it('should include parameter descriptions', () => {
      const definition = tool.getDefinition();
      const props = definition.parameters.properties as Record<string, { description?: string }>;

      expect(props['input']?.description).toBe('Input string');
      expect(props['count']?.description).toBe('Optional count');
    });

    it('should mark required parameters', () => {
      const definition = tool.getDefinition();

      expect(definition.parameters.required).toContain('input');
      expect(definition.parameters.required).not.toContain('count');
    });
  });

  describe('run', () => {
    it('should execute with valid arguments', async () => {
      const result = await tool.run({ input: 'hello' }, context);

      expect(result.success).toBe(true);
      expect(result.result).toBe('hello');
    });

    it('should handle optional arguments', async () => {
      const result = await tool.run({ input: 'hi', count: 3 }, context);

      expect(result.success).toBe(true);
      expect(result.result).toBe('hihihi');
    });

    it('should return error for invalid arguments', async () => {
      const result = await tool.run({ invalid: 'arg' }, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for wrong argument type', async () => {
      const result = await tool.run({ input: 123 }, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle execution errors', async () => {
      const errorTool = new ErrorTool();
      const result = await errorTool.run({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Test error');
    });
  });

  describe('validation', () => {
    it('should validate required fields', async () => {
      const result = await tool.run({}, context);

      expect(result.success).toBe(false);
    });

    it('should validate field types', async () => {
      const result = await tool.run({ input: 'test', count: 'not a number' }, context);

      expect(result.success).toBe(false);
    });

    it('should pass validation for correct types', async () => {
      const result = await tool.run({ input: 'test', count: 5 }, context);

      expect(result.success).toBe(true);
    });
  });
});
