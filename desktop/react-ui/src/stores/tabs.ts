import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EntityType } from '../api/types'

export interface Tab {
  key: string
  type: EntityType
  id: string
  name: string
}

interface TabsState {
  tabs: Tab[]
  active: string | null
  open: (tab: Tab) => void
  close: (key: string) => void
  setActive: (key: string) => void
}

export const useTabs = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      active: null,
      open: (tab) => {
        const exists = get().tabs.some((t) => t.key === tab.key)
        set((s) => ({
          tabs: exists ? s.tabs : [...s.tabs, tab],
          active: tab.key,
        }))
      },
      close: (key) => {
        set((s) => {
          const tabs = s.tabs.filter((t) => t.key !== key)
          const active = s.active === key ? (tabs[tabs.length - 1]?.key ?? null) : s.active
          return { tabs, active }
        })
      },
      setActive: (key) => set({ active: key }),
    }),
    {
      name: 'lca-ai-tabs',
      partialize: (s) => ({ tabs: s.tabs, active: s.active }) as TabsState,
    },
  ),
)

export function tabKey(type: EntityType, id: string): string {
  return `${type}:${id}`
}
