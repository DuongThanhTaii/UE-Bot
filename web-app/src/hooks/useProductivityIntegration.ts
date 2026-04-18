import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { localStorageKey } from '@/constants/localStorage'

type ProductivityIntegrationState = {
  enabled: boolean
  jiraBaseUrl: string
  jiraEmail: string
  jiraApiToken: string
  jiraOAuthClientId: string
  jiraOAuthClientSecret: string
  googleAccessToken: string
  googleOAuthClientId: string
  googleOAuthClientSecret: string
  googleCalendarId: string
  googleCalendarBaseUrl: string
  setEnabled: (value: boolean) => void
  setJiraBaseUrl: (value: string) => void
  setJiraEmail: (value: string) => void
  setJiraApiToken: (value: string) => void
  setJiraOAuthClientId: (value: string) => void
  setJiraOAuthClientSecret: (value: string) => void
  setGoogleAccessToken: (value: string) => void
  setGoogleOAuthClientId: (value: string) => void
  setGoogleOAuthClientSecret: (value: string) => void
  setGoogleCalendarId: (value: string) => void
  setGoogleCalendarBaseUrl: (value: string) => void
}

export const useProductivityIntegration =
  create<ProductivityIntegrationState>()(
    persist(
      (set) => ({
        enabled: true,
        jiraBaseUrl: '',
        jiraEmail: '',
        jiraApiToken: '',
        jiraOAuthClientId: '',
        jiraOAuthClientSecret: '',
        googleAccessToken: '',
        googleOAuthClientId: '',
        googleOAuthClientSecret: '',
        googleCalendarId: 'primary',
        googleCalendarBaseUrl: 'https://www.googleapis.com/',
        setEnabled: (value) => set({ enabled: value }),
        setJiraBaseUrl: (value) => set({ jiraBaseUrl: value }),
        setJiraEmail: (value) => set({ jiraEmail: value }),
        setJiraApiToken: (value) => set({ jiraApiToken: value }),
        setJiraOAuthClientId: (value) => set({ jiraOAuthClientId: value }),
        setJiraOAuthClientSecret: (value) =>
          set({ jiraOAuthClientSecret: value }),
        setGoogleAccessToken: (value) => set({ googleAccessToken: value }),
        setGoogleOAuthClientId: (value) =>
          set({ googleOAuthClientId: value }),
        setGoogleOAuthClientSecret: (value) =>
          set({ googleOAuthClientSecret: value }),
        setGoogleCalendarId: (value) => set({ googleCalendarId: value }),
        setGoogleCalendarBaseUrl: (value) =>
          set({ googleCalendarBaseUrl: value }),
      }),
      {
        name: localStorageKey.settingProductivityIntegration,
        storage: createJSONStorage(() => localStorage),
      }
    )
  )
