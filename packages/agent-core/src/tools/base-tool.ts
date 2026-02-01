/**
 * @fileoverview Base tool class with Zod validation
 * @module @ue-bot/agent-core/tools/base-tool
 */

import { z, ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { ToolContext, ToolDefinition, ToolGroup, ToolParameters, ToolResult } from '../types';
import { generateId } from '../utils';

/**
 * Sanitize a JSON Schema property to remove unsupported fields for Groq API
 * Groq requires exclusiveMinimum/exclusiveMaximum to be numbers, not booleans
 */
function sanitizeSchemaProperty(prop: unknown): unknown {
  if (typeof prop !== 'object' || prop === null) {
    return prop;
  }

  const obj = prop as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Remove boolean exclusiveMinimum/exclusiveMaximum (not supported by Groq)
    if ((key === 'exclusiveMinimum' || key === 'exclusiveMaximum') && typeof value === 'boolean') {
      continue;
    }
    // Recursively sanitize nested objects
    if (key === 'items' || key === 'properties' || key === 'additionalProperties') {
      sanitized[key] = sanitizeSchemaProperty(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeSchemaProperty(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Abstract base class for all tools
 */
export abstract class BaseTool<TParams extends ZodSchema = ZodSchema> {
  /** Unique tool name */
  abstract name: string;

  /** Tool group for categorization */
  abstract group: ToolGroup;

  /** Human-readable description */
  abstract description: string;

  /** Zod schema for parameter validation */
  abstract parameters: TParams;

  /**
   * Execute the tool with validated parameters
   * @param params - Validated parameters
   * @param context - Execution context
   * @returns Tool execution result
   */
  protected abstract execute(params: z.infer<TParams>, context: ToolContext): Promise<unknown>;

  /**
   * Get the tool definition for LLM
   */
  getDefinition(): ToolDefinition {
    const jsonSchema = zodToJsonSchema(this.parameters, {
      target: 'openApi3',
      $refStrategy: 'none',
    });

    // Extract properties and required from JSON schema
    const schemaObj = jsonSchema as {
      type?: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };

    // Sanitize properties to remove unsupported JSON Schema fields for Groq
    const sanitizedProperties: Record<string, unknown> = {};
    if (schemaObj.properties) {
      for (const [key, value] of Object.entries(schemaObj.properties)) {
        sanitizedProperties[key] = sanitizeSchemaProperty(value);
      }
    }

    return {
      name: this.name,
      group: this.group,
      description: this.description,
      parameters: {
        type: 'object',
        properties: sanitizedProperties as ToolParameters['properties'],
        required: schemaObj.required || [],
      },
    };
  }

  /**
   * Validate parameters against schema
   * @param params - Raw parameters to validate
   * @returns Validated parameters
   * @throws ZodError if validation fails
   */
  validate(params: unknown): z.infer<TParams> {
    return this.parameters.parse(params);
  }

  /**
   * Run the tool with validation and error handling
   * @param params - Raw parameters
   * @param context - Execution context
   * @returns Tool result
   */
  async run(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const toolCallId = generateId('tc');

    try {
      // Validate parameters
      const validatedParams = this.validate(params);

      // Execute tool
      const result = await this.execute(validatedParams, context);

      return {
        toolCallId,
        success: true,
        result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof z.ZodError
          ? `Validation error: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          : error instanceof Error
            ? error.message
            : String(error);

      return {
        toolCallId,
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }
}
