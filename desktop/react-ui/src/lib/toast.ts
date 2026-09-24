import { create } from 'zustand'

export interface Toast {
  id: number
  kind: 'ok' | 'err' | 'warn'
  text: string
}

let nextId = 1

interface ToastState {
  toasts: Toast[]
  push: (kind: Toast['kind'], text: string) => void
  dismiss: (id: number) => void
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, text) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  ok: (t: string) => useToasts.getState().push('ok', t),
  err: (t: string) => useToasts.getState().push('err', t),
  warn: (t: string) => useToasts.getState().push('warn', t),
}
