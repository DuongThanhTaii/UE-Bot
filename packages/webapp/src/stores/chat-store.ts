import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSettingsStore } from './settings-store';

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
          // Get provider settings
          const { provider } = useSettingsStore.getState();

          if (!provider?.apiKey) {
            throw new Error('API key not configured. Please set up your API key in Settings.');
          }

          // Call our API route with provider settings
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
              provider: provider.type,
              apiKey: provider.apiKey,
              model: provider.model,
            }),
          });

          if (!response.ok) {
            const errorData = (await response.json()) as { error?: string };
            throw new Error(errorData.error ?? 'Failed to get response');
          }

          const data = (await response.json()) as { content: string };

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
