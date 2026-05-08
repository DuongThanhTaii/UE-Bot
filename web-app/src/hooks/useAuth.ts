import { create } from 'zustand'
import {
  ConsumePromptResult,
  SyncAuthUser,
  isSyncApiEnabled,
  syncApiClient,
} from '@/lib/sync-api'

const TOKEN_KEY = 'sync-auth-token'
const USER_KEY = 'sync-auth-user'
const GUEST_SESSION_KEY = 'sync-guest-session-id'

type AuthState = {
  isReady: boolean
  isSyncEnabled: boolean
  user: SyncAuthUser | null
  token: string | null
  guestSessionId: string | null
  remainingPrompts: number | null
  promptLimit: number
  authRequired: boolean
  authError: string | null
  initialize: () => Promise<void>
  consumePrompt: () => Promise<ConsumePromptResult>
  requestOtp: (email: string) => Promise<void>
  verifyOtp: (email: string, otp: string) => Promise<void>
  openGoogleLogin: () => void
  completeOAuthFromUrl: () => Promise<void>
  logout: () => void
  setAuthRequired: (required: boolean) => void
}

const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

const readGuestSessionId = () => sessionStorage.getItem(GUEST_SESSION_KEY)
const saveGuestSessionId = (id: string) => sessionStorage.setItem(GUEST_SESSION_KEY, id)

export const useAuth = create<AuthState>((set, get) => ({
  isReady: false,
  isSyncEnabled: isSyncApiEnabled(),
  user: null,
  token: null,
  guestSessionId: null,
  remainingPrompts: null,
  promptLimit: 0,
  authRequired: false,
  authError: null,

  initialize: async () => {
    const enabled = isSyncApiEnabled()
    if (!enabled) {
      set({ isReady: true, isSyncEnabled: false })
      return
    }

    const guestSessionId = readGuestSessionId()
    const nextGuestSessionId =
      guestSessionId ?? (await syncApiClient.createGuestSession()).guestSessionId
    if (!guestSessionId) {
      saveGuestSessionId(nextGuestSessionId)
    }

    set({
      isReady: true,
      isSyncEnabled: true,
      token: null,
      user: null,
      guestSessionId: nextGuestSessionId,
      remainingPrompts: null,
      promptLimit: 0,
      authRequired: false,
      authError: null,
    })
  },

  consumePrompt: async () => {
    set({
      remainingPrompts: null,
      promptLimit: 0,
      authRequired: false,
      authError: null,
    })

    return {
      allowed: true,
      requiresLogin: false,
      remainingPrompts: null,
    }
  },

  requestOtp: async () => {},

  verifyOtp: async () => {},

  openGoogleLogin: () => {},

  completeOAuthFromUrl: async () => {},

  logout: () => {
    clearAuth()
    sessionStorage.removeItem(GUEST_SESSION_KEY)

    set({
      token: null,
      user: null,
      guestSessionId: null,
      remainingPrompts: null,
      authRequired: false,
      authError: null,
      isReady: false,
    })

    void get().initialize()
  },

  setAuthRequired: (required: boolean) => {
    set({ authRequired: required })
  },
}))
