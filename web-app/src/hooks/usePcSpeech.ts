import { create } from 'zustand'

type PcSpeechState = {
  listeningRequested: boolean
  requestListening: (value: boolean) => void
  toggleListening: () => void
}

export const usePcSpeech = create<PcSpeechState>()((set, get) => ({
  listeningRequested: false,
  requestListening: (value) => set({ listeningRequested: value }),
  toggleListening: () =>
    set({ listeningRequested: !get().listeningRequested }),
}))
