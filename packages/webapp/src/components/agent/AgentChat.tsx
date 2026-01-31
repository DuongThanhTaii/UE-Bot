/**
 * @fileoverview Agent chat components
 * @module webapp/components/agent
 */

'use client';

import { useAgentStream, type ToolCallInfo } from '@/hooks/useAgentStream';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Send,
  Square,
  Terminal,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ============================================================================
// Streaming Text Component
// ============================================================================

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamingText({ content, isStreaming, className }: StreamingTextProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <p className="whitespace-pre-wrap">
        {content}
        {isStreaming && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />}
      </p>
    </div>
  );
}

// ============================================================================
// Tool Call Card Component
// ============================================================================

interface ToolCallCardProps {
  toolCall: ToolCallInfo;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusIcon = {
    pending: <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />,
    running: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
    completed: <CheckCircle className="w-4 h-4 text-green-500" />,
    error: <XCircle className="w-4 h-4 text-red-500" />,
  };

  return (
    <div className="border rounded-lg p-3 my-2 bg-muted/50">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Terminal className="w-4 h-4 text-muted-foreground" />
        <span className="font-mono text-sm font-medium">{toolCall.tool}</span>
        <div className="ml-auto">{statusIcon[toolCall.status]}</div>
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Arguments:</p>
            <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {toolCall.result !== undefined && toolCall.result !== null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Result:</p>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto max-h-40">
                {typeof toolCall.result === 'string'
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Thinking Indicator Component
// ============================================================================

interface ThinkingIndicatorProps {
  isThinking: boolean;
}

export function ThinkingIndicator({ isThinking }: ThinkingIndicatorProps) {
  if (!isThinking) return null;

  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Thinking...</span>
    </div>
  );
}

// ============================================================================
// Message Input Component
// ============================================================================

interface MessageInputProps {
  onSend: (message: string) => void;
  onAbort: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function MessageInput({ onSend, onAbort, isLoading, disabled }: MessageInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!input.trim() || isLoading || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className="flex gap-2 p-4 border-t">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      {isLoading ? (
        <button
          onClick={onAbort}
          className="rounded-lg bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90"
        >
          <Square className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Agent Chat Component
// ============================================================================

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallInfo[];
}

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isLoading, isStreaming, content, toolCalls, error, sessionId, send, abort } =
    useAgentStream({
      onComplete: (finalContent) => {
        // Add assistant message when complete
        setMessages((prev) => [...prev, { role: 'assistant', content: finalContent, toolCalls }]);
      },
    });

  const handleSend = async (message: string) => {
    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    // Send to agent
    await send(message, sessionId || undefined);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, content]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              'max-w-[80%] rounded-lg p-4',
              msg.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'
            )}
          >
            {msg.role === 'assistant' &&
              msg.toolCalls?.map((tc, tcIdx) => <ToolCallCard key={tcIdx} toolCall={tc} />)}
            <StreamingText content={msg.content} isStreaming={false} />
          </div>
        ))}

        {/* Streaming response */}
        {(isLoading || content) && (
          <div className="max-w-[80%] rounded-lg p-4 bg-muted">
            {toolCalls.map((tc, idx) => (
              <ToolCallCard key={idx} toolCall={tc} />
            ))}
            <ThinkingIndicator isThinking={isLoading && !content && toolCalls.length === 0} />
            {content && <StreamingText content={content} isStreaming={isStreaming} />}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-[80%] rounded-lg p-4 bg-destructive/10 text-destructive">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} onAbort={abort} isLoading={isLoading} />
    </div>
  );
}
