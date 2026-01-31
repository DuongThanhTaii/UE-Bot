'use client';

import { Bot, Loader2, Mic, MicOff, Send, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useChatStore, type Message } from '@/stores/chat-store';

export default function ChatPage() {
  const { messages, isLoading, sendMessage } = useChatStore();
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold">UE-Bot Assistant</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Thinking...' : 'Online - Ready to help'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => useChatStore.getState().clearMessages()}
          >
            Clear Chat
          </Button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 py-4" ref={scrollRef}>
          <div className="space-y-4 px-1">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Start a conversation</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask me anything or give me a voice command!
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    'What can you do?',
                    'Tell me a joke',
                    'Help me with coding',
                    'Explain something',
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInput(suggestion);
                        textareaRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}

            {isLoading && (
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <Card className="flex items-center gap-2 p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t pt-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Button
              type="button"
              variant={isRecording ? 'destructive' : 'outline'}
              size="icon"
              onClick={toggleRecording}
              className="shrink-0"
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message or use voice..."
                className="min-h-[44px] resize-none pr-12"
                rows={1}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" disabled={!input.trim() || isLoading} className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      <Avatar>
        <AvatarFallback
          className={cn(isUser ? 'bg-secondary' : 'bg-primary text-primary-foreground')}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <Card className={cn('max-w-[80%] p-3', isUser ? 'bg-primary text-primary-foreground' : '')}>
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        <p
          className={cn(
            'mt-1 text-xs',
            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </Card>
    </div>
  );
}
