import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EntityType } from '../api/types'

export interface Tab {
  key: string
  type: EntityType | 'Home'
  id: string
  name: string
}

interface TabsState {
  tabs: Tab[]
  active: string | null
  split: boolean
  second: string | null
  open: (tab: Tab) => void
  close: (key: string) => void
  setActive: (key: string) => void
  rename: (key: string, name: string) => void
  reorder: (from: string, to: string) => void
  closeAll: () => void
  toggleSplit: () => void
  setSecond: (key: string | null) => void
}

export const useTabs = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      active: null,
      split: false,
      second: null,
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
          const second = s.second === key ? null : s.second
          return { tabs, active, second }
        })
      },
      setActive: (key) => set({ active: key }),
      closeAll: () => set({ tabs: [], active: null, second: null }),
      rename: (key, name) =>
        set((s) => ({ tabs: s.tabs.map((t) => (t.key === key ? { ...t, name } : t)) })),
      reorder: (from, to) =>
        set((s) => {
          if (from === to) return s
          const tabs = [...s.tabs]
          const fi = tabs.findIndex((t) => t.key === from)
          const ti = tabs.findIndex((t) => t.key === to)
          if (fi < 0 || ti < 0) return s
          const [moved] = tabs.splice(fi, 1)
          tabs.splice(ti, 0, moved)
          return { tabs }
        }),
      toggleSplit: () =>
        set((s) => {
          const split = !s.split
          // pick a different tab for the second pane when enabling
          let second = s.second
          if (split && (!second || second === s.active || !s.tabs.some((t) => t.key === second))) {
            second = s.tabs.find((t) => t.key !== s.active)?.key ?? null
          }
          return { split, second }
        }),
      setSecond: (key) => set({ second: key }),
    }),
    {
      name: 'lca-ai-tabs',
      partialize: (s) => ({ tabs: s.tabs, active: s.active, split: s.split, second: s.second }) as TabsState,
    },
  ),
)

export function tabKey(type: EntityType, id: string): string {
  return `${type}:${id}`
}
