import { create } from 'zustand'
import { engineSummary, ping, type EngineSummary } from '../api/ipc'

export type EngineStatus = 'offline' | 'checking' | 'online'

interface EngineState {
  status: EngineStatus
  url: string
  summary: EngineSummary | null
  lastError: string
  dbVersion: number
  check: () => Promise<void>
  resetSummary: () => void
  bumpDbVersion: () => void
}

export const useEngine = create<EngineState>((set) => ({
  status: 'offline',
  url: import.meta.env.VITE_OLCA_URL ?? 'http://localhost:8080',
  summary: null,
  lastError: '',
  dbVersion: 0,
  check: async () => {
    set({ status: 'checking' })
    try {
      const ok = await ping()
      if (!ok) {
        set({ status: 'offline', summary: null })
        return
      }
      const { summary: prev } = useEngine.getState()
      const summary = prev ?? (await engineSummary())
      set({ status: 'online', summary, lastError: '' })
    } catch (e) {
      set({ status: 'offline', summary: null, lastError: String(e) })
    }
  },
  resetSummary: () => set({ summary: null }),
  bumpDbVersion: () => set((s) => ({ dbVersion: s.dbVersion + 1, summary: null })),
}))
