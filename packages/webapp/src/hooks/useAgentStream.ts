/**
 * @fileoverview Hook for streaming agent responses
 * @module webapp/hooks/useAgentStream
 */

'use client';

import type { AgentEvent } from '@ue-bot/agent-core';
import { useCallback, useRef, useState } from 'react';

export interface UseAgentStreamOptions {
  onEvent?: (event: AgentEvent) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
}

export interface ToolCallInfo {
  tool: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'completed' | 'error';
}

export interface UseAgentStreamReturn {
  isLoading: boolean;
  isStreaming: boolean;
  content: string;
  toolCalls: ToolCallInfo[];
  error: Error | null;
  sessionId: string | null;
  send: (message: string, sessionId?: string) => Promise<void>;
  abort: () => void;
  reset: () => void;
}

export function useAgentStream(options?: UseAgentStreamOptions): UseAgentStreamReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setContent('');
    setToolCalls([]);
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const send = useCallback(
    async (message: string, existingSessionId?: string) => {
      reset();
      setIsLoading(true);
      setError(null);

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            sessionId: existingSessionId || sessionId,
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send message');
        }

        // Get session ID from header
        const newSessionId = response.headers.get('X-Session-Id');
        if (newSessionId) {
          setSessionId(newSessionId);
        }

        // Process SSE stream
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        setIsStreaming(true);
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete events
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const eventStr of events) {
            const dataMatch = eventStr.match(/^data: (.+)$/m);
            if (dataMatch) {
              try {
                const event = JSON.parse(dataMatch[1]) as AgentEvent;
                processEvent(event);
                options?.onEvent?.(event);
              } catch {
                // Invalid JSON, skip
              }
            }
          }
        }

        setIsStreaming(false);
        setIsLoading(false);
        options?.onComplete?.(content);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setIsStreaming(false);
          setIsLoading(false);
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsStreaming(false);
        setIsLoading(false);
        options?.onError?.(error);
      }
    },
    [sessionId, options, reset, content]
  );

  const processEvent = useCallback((event: AgentEvent) => {
    switch (event.type) {
      case 'text_delta':
        setContent((prev) => prev + event.content);
        break;

      case 'tool_start':
        setToolCalls((prev) => [
          ...prev,
          {
            tool: event.toolName,
            arguments: event.arguments,
            status: 'running',
          },
        ]);
        break;

      case 'tool_end':
        setToolCalls((prev) =>
          prev.map((tc) =>
            tc.tool === event.toolName && tc.status === 'running'
              ? {
                  ...tc,
                  result: event.result,
                  status: event.result.success ? 'completed' : 'error',
                }
              : tc
          )
        );
        break;

      case 'complete':
        setContent(event.result.content);
        break;

      case 'error':
        setError(new Error(event.error.message));
        break;
    }
  }, []);

  return {
    isLoading,
    isStreaming,
    content,
    toolCalls,
    error,
    sessionId,
    send,
    abort,
    reset,
  };
}
