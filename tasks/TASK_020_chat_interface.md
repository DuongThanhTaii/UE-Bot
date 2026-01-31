# TASK-020: Create Chat Interface

## Task Information

- **ID**: T020
- **Phase**: 2 - Core Integration
- **Priority**: High
- **Estimated Hours**: 8h
- **Dependencies**: T018 (Webapp Layout), T015 (Gateway Wrapper)

---

## Objective

Implement chat interface đầy đủ tính năng:

- Real-time message display
- Text input với auto-resize
- Voice input button
- Typing indicator
- Message history
- Session management

---

## Acceptance Criteria

- [ ] Chat UI renders correctly
- [ ] Messages sent to Gateway
- [ ] Responses displayed real-time
- [ ] Voice input button working
- [ ] Typing indicator shown
- [ ] Message history scrollable
- [ ] Auto-scroll to new messages
- [ ] Error handling for failed messages
- [ ] Mobile-responsive design

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chat Interface                           │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Chat Header                           │ │
│  │  🤖 UE-Bot Assistant          🟢 Online    [Settings]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Message Area                          │ │
│  │                                                        │ │
│  │   [User Avatar] Hello, bot!                            │ │
│  │                              12:30 PM                  │ │
│  │                                                        │ │
│  │                      Hi! How can I help? [Bot Avatar]  │ │
│  │   12:30 PM                                             │ │
│  │                                                        │ │
│  │   [User Avatar] Turn on the lights                     │ │
│  │                              12:31 PM                  │ │
│  │                                                        │ │
│  │                      Done! Lights on. [Bot Avatar]     │ │
│  │   12:31 PM                                             │ │
│  │                                                        │ │
│  │   ● ● ● Bot is typing...                               │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  [🎤] │ Type a message...                     [Send →] │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Instructions

### Step 1: Install Dependencies

```bash
cd packages/webapp

# Shadcn components
npx shadcn@latest add input
npx shadcn@latest add textarea

# Additional
pnpm add @tanstack/react-query
```

### Step 2: Create Chat Types

Tạo file `packages/webapp/src/types/chat.ts`:

```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

export interface ChatSession {
  id: string;
  title?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isTyping: boolean;
  isConnected: boolean;
}
```

### Step 3: Create Message Bubble Component

Tạo file `packages/webapp/src/components/features/chat/message-bubble.tsx`:

```tsx
'use client';

import { format } from 'date-fns';
import { User, Bot, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Message } from '@/types/chat';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isSending = message.status === 'sending';

  return (
    <div className={cn('flex gap-3 mb-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <Avatar className="h-8 w-8 mt-1">
        <AvatarFallback className={cn(isUser ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn('flex flex-col max-w-[70%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-lg px-4 py-2',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
            isError && 'bg-destructive/10 text-destructive'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Timestamp and Status */}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{format(message.timestamp, 'HH:mm')}</span>
          {isSending && <Loader2 className="h-3 w-3 animate-spin" />}
          {isError && (
            <div className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>Failed to send</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Step 4: Create Typing Indicator

Tạo file `packages/webapp/src/components/features/chat/typing-indicator.tsx`:

```tsx
'use client';

import { Bot } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4">
      <Avatar className="h-8 w-8 mt-1">
        <AvatarFallback className="bg-muted">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1 rounded-lg bg-muted px-4 py-3">
        <div className="flex space-x-1">
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
```

### Step 5: Create Chat Input Component

Tạo file `packages/webapp/src/components/features/chat/chat-input.tsx`:

```tsx
'use client';

import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  disabled?: boolean;
  isRecording?: boolean;
}

export function ChatInput({
  onSend,
  onVoiceStart,
  onVoiceStop,
  disabled = false,
  isRecording = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    if (!message.trim() || disabled || isSending) return;

    setIsSending(true);
    try {
      await onSend(message.trim());
      setMessage('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSending(false);
    }
  }, [message, disabled, isSending, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      onVoiceStop?.();
    } else {
      onVoiceStart?.();
    }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t bg-background">
      {/* Voice Button */}
      <Button
        variant={isRecording ? 'destructive' : 'outline'}
        size="icon"
        onClick={handleVoiceToggle}
        disabled={disabled}
        className="shrink-0"
      >
        {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        <span className="sr-only">{isRecording ? 'Stop recording' : 'Start recording'}</span>
      </Button>

      {/* Message Input */}
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled || isSending}
          className={cn(
            'min-h-[44px] max-h-[200px] resize-none pr-12',
            isRecording && 'border-red-500 focus-visible:ring-red-500'
          )}
          rows={1}
        />

        {isRecording && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 rounded-md pointer-events-none">
            <div className="flex items-center gap-2 text-red-500">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Recording...</span>
            </div>
          </div>
        )}
      </div>

      {/* Send Button */}
      <Button
        onClick={() => void handleSend()}
        disabled={!message.trim() || disabled || isSending}
        size="icon"
        className="shrink-0"
      >
        {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        <span className="sr-only">Send message</span>
      </Button>
    </div>
  );
}
```

### Step 6: Create Chat Header Component

Tạo file `packages/webapp/src/components/features/chat/chat-header.tsx`:

```tsx
'use client';

import { Bot, Settings, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
  title?: string;
  isConnected: boolean;
  onClearChat?: () => void;
  onOpenSettings?: () => void;
}

export function ChatHeader({
  title = 'UE-Bot Assistant',
  isConnected,
  onClearChat,
  onOpenSettings,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-muted">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Claude
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearChat} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
```

### Step 7: Create Chat Store

Tạo file `packages/webapp/src/stores/chat.store.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, ChatSession } from '@/types/chat';

interface ChatStore {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isTyping: boolean;
  isConnected: boolean;

  // Session actions
  createSession: () => string;
  deleteSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string) => void;

  // Message actions
  addMessage: (sessionId: string, message: Message) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void;
  clearMessages: (sessionId: string) => void;

  // UI state
  setTyping: (typing: boolean) => void;
  setConnected: (connected: boolean) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      isTyping: false,
      isConnected: false,

      createSession: () => {
        const id = `session-${Date.now()}`;
        const newSession: ChatSession = {
          id,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          sessions: [...state.sessions, newSession],
          activeSessionId: id,
        }));

        return id;
      },

      deleteSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          activeSessionId:
            state.activeSessionId === sessionId
              ? (state.sessions[0]?.id ?? null)
              : state.activeSessionId,
        }));
      },

      setActiveSession: (sessionId) => {
        set({ activeSessionId: sessionId });
      },

      addMessage: (sessionId, message) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: [...session.messages, message],
                  updatedAt: new Date(),
                }
              : session
          ),
        }));
      },

      updateMessage: (sessionId, messageId, updates) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, ...updates } : msg
                  ),
                }
              : session
          ),
        }));
      },

      clearMessages: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, messages: [], updatedAt: new Date() } : session
          ),
        }));
      },

      setTyping: (typing) => set({ isTyping: typing }),
      setConnected: (connected) => set({ isConnected: connected }),
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);
```

### Step 8: Create Chat Container

Tạo file `packages/webapp/src/components/features/chat/chat-container.tsx`:

```tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './message-bubble';
import { TypingIndicator } from './typing-indicator';
import { ChatInput } from './chat-input';
import { ChatHeader } from './chat-header';
import { useChatStore } from '@/stores/chat.store';
import type { Message } from '@/types/chat';

interface ChatContainerProps {
  onSendMessage: (content: string) => Promise<void>;
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  isRecording?: boolean;
}

export function ChatContainer({
  onSendMessage,
  onVoiceStart,
  onVoiceStop,
  isRecording,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    sessions,
    activeSessionId,
    isTyping,
    isConnected,
    createSession,
    clearMessages,
    addMessage,
    updateMessage,
  } = useChatStore();

  // Get active session
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages ?? [];

  // Create session if none exists
  useEffect(() => {
    if (!activeSessionId) {
      createSession();
    }
  }, [activeSessionId, createSession]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!activeSessionId) return;

      // Add user message
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
        status: 'sending',
      };

      addMessage(activeSessionId, userMessage);

      try {
        // Send to backend
        await onSendMessage(content);

        // Update status
        updateMessage(activeSessionId, userMessage.id, { status: 'sent' });
      } catch (error) {
        updateMessage(activeSessionId, userMessage.id, { status: 'error' });
      }
    },
    [activeSessionId, addMessage, updateMessage, onSendMessage]
  );

  const handleClearChat = useCallback(() => {
    if (activeSessionId) {
      clearMessages(activeSessionId);
    }
  }, [activeSessionId, clearMessages]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] border rounded-lg overflow-hidden">
      {/* Header */}
      <ChatHeader isConnected={isConnected} onClearChat={handleClearChat} />

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <span className="text-4xl">👋</span>
            </div>
            <h3 className="font-semibold mb-2">Start a conversation</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Type a message or use voice input to start chatting with UE-Bot
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onVoiceStart={onVoiceStart}
        onVoiceStop={onVoiceStop}
        isRecording={isRecording}
        disabled={!isConnected}
      />
    </div>
  );
}
```

### Step 9: Create Chat Page

Tạo file `packages/webapp/src/app/(dashboard)/chat/page.tsx`:

```tsx
'use client';

import { useEffect, useCallback, useState } from 'react';
import { ChatContainer } from '@/components/features/chat/chat-container';
import { useChatStore } from '@/stores/chat.store';
import { useWebSocket } from '@/hooks/use-websocket';

export default function ChatPage() {
  const [isRecording, setIsRecording] = useState(false);
  const { setConnected, setTyping, addMessage, activeSessionId } = useChatStore();

  // WebSocket connection (will be implemented in T021)
  const { sendMessage, isConnected } = useWebSocket({
    url: process.env['NEXT_PUBLIC_WS_URL'] ?? 'ws://localhost:8080/ws',
    onMessage: (data) => {
      if (data.type === 'message' && activeSessionId) {
        addMessage(activeSessionId, {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
          status: 'sent',
        });
        setTyping(false);
      } else if (data.type === 'typing') {
        setTyping(true);
      }
    },
    onConnect: () => setConnected(true),
    onDisconnect: () => setConnected(false),
  });

  // Update connection status
  useEffect(() => {
    setConnected(isConnected);
  }, [isConnected, setConnected]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      setTyping(true);

      // Send via WebSocket or HTTP fallback
      if (isConnected) {
        sendMessage({
          type: 'message',
          content,
          sessionId: activeSessionId,
        });
      } else {
        // HTTP fallback
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, sessionId: activeSessionId }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();

        if (activeSessionId) {
          addMessage(activeSessionId, {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            status: 'sent',
          });
        }

        setTyping(false);
      }
    },
    [isConnected, sendMessage, activeSessionId, addMessage, setTyping]
  );

  const handleVoiceStart = useCallback(() => {
    setIsRecording(true);
    // Voice recording logic will be implemented later
  }, []);

  const handleVoiceStop = useCallback(() => {
    setIsRecording(false);
    // Voice processing logic will be implemented later
  }, []);

  return (
    <div className="h-full">
      <ChatContainer
        onSendMessage={handleSendMessage}
        onVoiceStart={handleVoiceStart}
        onVoiceStop={handleVoiceStop}
        isRecording={isRecording}
      />
    </div>
  );
}
```

### Step 10: Create Components Index

Tạo file `packages/webapp/src/components/features/chat/index.ts`:

```typescript
export { ChatContainer } from './chat-container';
export { ChatHeader } from './chat-header';
export { ChatInput } from './chat-input';
export { MessageBubble } from './message-bubble';
export { TypingIndicator } from './typing-indicator';
```

---

## File Structure After Completion

```
packages/webapp/src/
├── app/
│   └── (dashboard)/
│       └── chat/
│           └── page.tsx
├── components/
│   └── features/
│       └── chat/
│           ├── chat-container.tsx
│           ├── chat-header.tsx
│           ├── chat-input.tsx
│           ├── index.ts
│           ├── message-bubble.tsx
│           └── typing-indicator.tsx
├── stores/
│   └── chat.store.ts
└── types/
    └── chat.ts
```

---

## Verification Checklist

- [ ] Chat page loads correctly
- [ ] Message bubbles display properly
- [ ] User/bot messages styled differently
- [ ] Typing indicator shows
- [ ] Input auto-resizes
- [ ] Send button works
- [ ] Voice button present
- [ ] Auto-scroll to new messages
- [ ] Clear chat works
- [ ] Messages persist in store
- [ ] Dark mode works
- [ ] Mobile responsive

---

## Related Tasks

- **T018**: Create Webapp Layout (prerequisite)
- **T015**: Gateway Wrapper Service (backend)
- **T021**: Implement WebSocket Client (real-time)
- **T032**: Add voice recording (ESP32 integration)
