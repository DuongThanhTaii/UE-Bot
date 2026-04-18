import type { ThreadMessage } from '@janhq/core'

export type SyncAuthUser = {
  id: string
  email: string
  name?: string | null
}

export type ConsumePromptResult = {
  allowed: boolean
  requiresLogin: boolean
  remainingPrompts: number | null
  promptLimit?: number
  promptCount?: number
}

const normalizeBaseUrl = (value?: string) =>
  (value ?? '').trim().replace(/\/+$/, '')

export const getSyncApiBaseUrl = () =>
  normalizeBaseUrl(import.meta.env.VITE_SYNC_API_URL)

export const isSyncApiEnabled = () => Boolean(getSyncApiBaseUrl())

const syncFetch = async <T>(
  path: string,
  options?: RequestInit & { token?: string | null }
): Promise<T> => {
  const baseUrl = getSyncApiBaseUrl()
  if (!baseUrl) {
    throw new Error('VITE_SYNC_API_URL is not configured')
  }

  const headers = new Headers(options?.headers)
  if (!headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (options?.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      (payload && typeof payload.error === 'string' && payload.error) ||
      `Request failed (${response.status})`
    throw new Error(message)
  }

  return payload as T
}

export const syncApiClient = {
  createGuestSession() {
    return syncFetch<{
      guestSessionId: string
      promptLimit: number
      promptCount: number
      remainingPrompts: number
    }>('/auth/guest/session', {
      method: 'POST',
    })
  },

  getMe(token: string) {
    return syncFetch<{ user: SyncAuthUser }>('/auth/me', {
      method: 'GET',
      token,
    })
  },

  requestOtp(email: string) {
    return syncFetch<{ ok: boolean; otpExpiresInMinutes: number }>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  verifyOtp(email: string, otp: string, guestSessionId?: string | null) {
    return syncFetch<{ token: string; user: SyncAuthUser }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp, guestSessionId }),
    })
  },

  consumePrompt(token: string | null, guestSessionId?: string | null) {
    return syncFetch<ConsumePromptResult>('/usage/consume', {
      method: 'POST',
      token,
      body: JSON.stringify({ guestSessionId }),
    })
  },

  getPromptStatus(token: string | null, guestSessionId?: string | null) {
    const query = token
      ? ''
      : `?guestSessionId=${encodeURIComponent(guestSessionId ?? '')}`

    return syncFetch<ConsumePromptResult>(`/usage/status${query}`, {
      method: 'GET',
      token,
    })
  },

  listThreads(token: string | null, guestSessionId?: string | null) {
    const query = token
      ? ''
      : `?guestSessionId=${encodeURIComponent(guestSessionId ?? '')}`

    return syncFetch<Thread[]>(`/threads${query}`, {
      method: 'GET',
      token,
    })
  },

  createThread(thread: Thread, token: string | null, guestSessionId?: string | null) {
    return syncFetch<Thread>('/threads', {
      method: 'POST',
      token,
      body: JSON.stringify({ thread, guestSessionId }),
    })
  },

  updateThread(thread: Thread, token: string | null, guestSessionId?: string | null) {
    return syncFetch<Thread>(`/threads/${encodeURIComponent(thread.id)}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ thread, guestSessionId }),
    })
  },

  deleteThread(threadId: string, token: string | null, guestSessionId?: string | null) {
    const query = token
      ? ''
      : `?guestSessionId=${encodeURIComponent(guestSessionId ?? '')}`

    return syncFetch<{ ok: boolean }>(`/threads/${encodeURIComponent(threadId)}${query}`, {
      method: 'DELETE',
      token,
      body: token ? undefined : JSON.stringify({ guestSessionId }),
    })
  },

  listMessages(threadId: string, token: string | null, guestSessionId?: string | null) {
    const query = token
      ? ''
      : `?guestSessionId=${encodeURIComponent(guestSessionId ?? '')}`

    return syncFetch<ThreadMessage[]>(
      `/threads/${encodeURIComponent(threadId)}/messages${query}`,
      {
        method: 'GET',
        token,
      }
    )
  },

  createMessage(
    threadId: string,
    message: ThreadMessage,
    token: string | null,
    guestSessionId?: string | null
  ) {
    return syncFetch<ThreadMessage>(`/threads/${encodeURIComponent(threadId)}/messages`, {
      method: 'POST',
      token,
      body: JSON.stringify({ message, guestSessionId }),
    })
  },

  updateMessage(
    threadId: string,
    message: ThreadMessage,
    token: string | null,
    guestSessionId?: string | null
  ) {
    return syncFetch<ThreadMessage>(
      `/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(message.id)}`,
      {
        method: 'PATCH',
        token,
        body: JSON.stringify({ message, guestSessionId }),
      }
    )
  },

  deleteMessage(
    threadId: string,
    messageId: string,
    token: string | null,
    guestSessionId?: string | null
  ) {
    const query = token
      ? ''
      : `?guestSessionId=${encodeURIComponent(guestSessionId ?? '')}`

    return syncFetch<{ ok: boolean }>(
      `/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}${query}`,
      {
        method: 'DELETE',
        token,
        body: token ? undefined : JSON.stringify({ guestSessionId }),
      }
    )
  },

  getGoogleStartUrl(guestSessionId?: string | null) {
    const baseUrl = getSyncApiBaseUrl()
    const redirect = window.location.origin + window.location.pathname
    return `${baseUrl}/auth/google/start?guestSessionId=${encodeURIComponent(
      guestSessionId ?? ''
    )}&redirect=${encodeURIComponent(redirect)}`
  },
}
