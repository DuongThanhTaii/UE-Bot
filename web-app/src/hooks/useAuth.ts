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

const readToken = () => localStorage.getItem(TOKEN_KEY)
const readUser = (): SyncAuthUser | null => {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SyncAuthUser
  } catch {
    return null
  }
}

const saveAuth = (token: string, user: SyncAuthUser) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
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
  promptLimit: 3,
  authRequired: false,
  authError: null,

  initialize: async () => {
    const enabled = isSyncApiEnabled()
    if (!enabled) {
      set({ isReady: true, isSyncEnabled: false })
      return
    }

    const token = readToken()
    const cachedUser = readUser()
    const guestSessionId = readGuestSessionId()

    if (token) {
      try {
        const { user } = await syncApiClient.getMe(token)
        set({
          isReady: true,
          isSyncEnabled: true,
          token,
          user,
          guestSessionId: guestSessionId ?? null,
          authRequired: false,
          authError: null,
          remainingPrompts: null,
        })
        return
      } catch {
        clearAuth()
      }
    }

    const nextGuestSessionId = guestSessionId ?? (await syncApiClient.createGuestSession()).guestSessionId
    if (!guestSessionId) {
      saveGuestSessionId(nextGuestSessionId)
    }

    const usageStatus = await syncApiClient.getPromptStatus(null, nextGuestSessionId)

    set({
      isReady: true,
      isSyncEnabled: true,
      token: null,
      user: cachedUser && token ? cachedUser : null,
      guestSessionId: nextGuestSessionId,
      remainingPrompts: usageStatus.remainingPrompts,
      promptLimit: usageStatus.promptLimit ?? 3,
      authRequired: usageStatus.requiresLogin,
      authError: null,
    })
  },

  consumePrompt: async () => {
    if (!get().isSyncEnabled) {
      return {
        allowed: true,
        requiresLogin: false,
        remainingPrompts: null,
      }
    }

    const { token, guestSessionId } = get()
    const result = await syncApiClient.consumePrompt(token, guestSessionId)

    set({
      remainingPrompts: result.remainingPrompts,
      promptLimit: result.promptLimit ?? get().promptLimit,
      authRequired: result.requiresLogin,
      authError: result.requiresLogin
        ? 'B?n dã dùng h?t 3 prompt mi?n phí. Vui lòng dang nh?p d? ti?p t?c.'
        : null,
    })

    return result
  },

  requestOtp: async (email: string) => {
    await syncApiClient.requestOtp(email)
  },

  verifyOtp: async (email: string, otp: string) => {
    const { guestSessionId } = get()
    const result = await syncApiClient.verifyOtp(email, otp, guestSessionId)

    saveAuth(result.token, result.user)
    sessionStorage.removeItem(GUEST_SESSION_KEY)

    set({
      token: result.token,
      user: result.user,
      guestSessionId: null,
      remainingPrompts: null,
      authRequired: false,
      authError: null,
    })
  },

  openGoogleLogin: () => {
    const { guestSessionId, isSyncEnabled } = get()
    if (!isSyncEnabled) return
    window.location.href = syncApiClient.getGoogleStartUrl(guestSessionId)
  },

  completeOAuthFromUrl: async () => {
    if (!get().isSyncEnabled) return

    const url = new URL(window.location.href)
    const authToken = url.searchParams.get('authToken')
    const authError = url.searchParams.get('authError')

    if (!authToken && !authError) return

    url.searchParams.delete('authToken')
    url.searchParams.delete('authError')
    window.history.replaceState({}, '', url.toString())

    if (authError) {
      set({ authError })
      return
    }

    if (!authToken) return

    const { user } = await syncApiClient.getMe(authToken)
    saveAuth(authToken, user)
    sessionStorage.removeItem(GUEST_SESSION_KEY)

    set({
      token: authToken,
      user,
      guestSessionId: null,
      remainingPrompts: null,
      authRequired: false,
      authError: null,
    })
  },

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
