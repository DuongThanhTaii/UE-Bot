/**
 * @fileoverview Streaming utilities for SSE and async generators
 * @module @ue-bot/agent-core/streaming
 */

import type { AgentEvent } from './types';

/**
 * Convert agent events to SSE format
 * @param event - Agent event to convert
 * @returns SSE formatted string
 */
export function eventToSSE(event: AgentEvent): string {
  const data = JSON.stringify(event);
  return `event: ${event.type}\ndata: ${data}\n\n`;
}

/**
 * Convert an async generator to a ReadableStream for SSE
 * @param generator - Async generator of agent events
 * @returns ReadableStream for SSE
 */
export function agentStreamToSSE(
  generator: AsyncGenerator<AgentEvent>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator) {
          const sseData = eventToSSE(event);
          controller.enqueue(encoder.encode(sseData));
        }
        controller.close();
      } catch (error) {
        // Send error event before closing
        const errorEvent: AgentEvent = {
          type: 'error',
          error: {
            code: 'UNKNOWN_ERROR' as any,
            message: (error as Error).message,
            retryable: false,
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        };
        controller.enqueue(encoder.encode(eventToSSE(errorEvent)));
        controller.close();
      }
    },
  });
}

/**
 * Parse SSE data from a string
 * @param data - SSE data string
 * @returns Parsed event or null
 */
export function parseSSE(data: string): AgentEvent | null {
  try {
    const lines = data.split('\n');
    let eventData = '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        eventData = line.slice(6);
      }
    }

    if (eventData) {
      return JSON.parse(eventData);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create an async generator that parses SSE from a ReadableStream
 * @param stream - ReadableStream from fetch response
 * @returns Async generator of agent events
 */
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<AgentEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete events (separated by double newlines)
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const eventStr of events) {
        const event = parseSSE(eventStr);
        if (event) {
          yield event;
        }
      }
    }

    // Process any remaining data
    if (buffer.trim()) {
      const event = parseSSE(buffer);
      if (event) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Collect streaming events into a final result
 * @param generator - Async generator of agent events
 * @returns Promise resolving to collected content and events
 */
export async function collectStreamEvents(generator: AsyncGenerator<AgentEvent>): Promise<{
  content: string;
  events: AgentEvent[];
  toolCalls: Array<{ tool: string; result: unknown }>;
}> {
  const events: AgentEvent[] = [];
  let content = '';
  const toolCalls: Array<{ tool: string; result: unknown }> = [];

  for await (const event of generator) {
    events.push(event);

    switch (event.type) {
      case 'text_delta':
        content += event.content;
        break;
      case 'tool_end':
        toolCalls.push({
          tool: event.toolName,
          result: event.result,
        });
        break;
      case 'complete':
        // Override with final content
        content = event.result.content;
        break;
    }
  }

  return { content, events, toolCalls };
}

/**
 * Create a text accumulator for streaming
 * Useful for building up text content from deltas
 */
export function createTextAccumulator(): {
  add: (text: string) => void;
  get: () => string;
  clear: () => void;
} {
  let accumulated = '';

  return {
    add: (text: string) => {
      accumulated += text;
    },
    get: () => accumulated,
    clear: () => {
      accumulated = '';
    },
  };
}

/**
 * Debounced callback for rate-limiting UI updates
 * @param callback - Callback to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced callback
 */
export function debouncedCallback<T>(
  callback: (value: T) => void,
  delay: number
): (value: T) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let latestValue: T;

  return (value: T) => {
    latestValue = value;

    if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        callback(latestValue);
        timeoutId = null;
      }, delay);
    }
  };
}
