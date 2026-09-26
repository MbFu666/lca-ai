import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EntityType } from '../api/types'

export interface HistoryEntry {
  type: EntityType
  id: string
  name: string
  ts: number
}

interface HistoryState {
  entries: HistoryEntry[]
  push: (e: { type: EntityType; id: string; name: string }) => void
  clear: () => void
}

const CAP = 100

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      push: (e) =>
        set((s) => {
          const rest = s.entries.filter((x) => !(x.type === e.type && x.id === e.id))
          return { entries: [{ ...e, ts: Date.now() }, ...rest].slice(0, CAP) }
        }),
      clear: () => set({ entries: [] }),
    }),
    { name: 'lcaai-history' },
  ),
)
