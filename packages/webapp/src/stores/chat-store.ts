import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,
      error: null,

      sendMessage: async (content: string) => {
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: [...state.messages, userMessage],
          isLoading: true,
          error: null,
        }));

        try {
          // Call our API route that connects to Groq
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [...get().messages, userMessage].map((m) => ({
                role: m.role,
                content: m.content,
              })),
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get response');
          }

          const data = await response.json();

          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.content,
            timestamp: Date.now(),
          };

          set((state) => ({
            messages: [...state.messages, assistantMessage],
            isLoading: false,
          }));
        } catch (error) {
          console.error('Chat error:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Add error message
          const errorMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
            timestamp: Date.now(),
          };

          set((state) => ({
            messages: [...state.messages, errorMessage],
          }));
        }
      },

      clearMessages: () => {
        set({ messages: [], error: null });
      },

      setError: (error) => {
        set({ error });
      },
    }),
    {
      name: 'ue-bot-chat-storage',
      partialize: (state) => ({ messages: state.messages }),
    }
  )
);
