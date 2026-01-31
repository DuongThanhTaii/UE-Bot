import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
  checkAuth: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // In real app, call your auth API
          // const response = await fetch('/api/auth/login', { ... });

          // For demo, accept any credentials
          if (email && password) {
            const user = {
              email,
              name: email.split('@')[0],
            };

            set({
              user,
              token: 'demo-token-' + Date.now(),
              isAuthenticated: true,
              isLoading: false,
            });

            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error) {
          console.error('Login error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true });

        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // In real app, call your auth API
          // const response = await fetch('/api/auth/register', { ... });

          if (name && email && password) {
            const user = { name, email };

            set({
              user,
              token: 'demo-token-' + Date.now(),
              isAuthenticated: true,
              isLoading: false,
            });

            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error) {
          console.error('Register error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      checkAuth: () => {
        const { token, user } = get();
        return !!(token && user);
      },
    }),
    {
      name: 'ue-bot-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
