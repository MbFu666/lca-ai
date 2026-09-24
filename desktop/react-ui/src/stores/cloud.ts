import { create } from 'zustand'

export interface PendingReport {
  product_title: string
  functional_unit: string
  total_co2eq: number
  report_data: Record<string, unknown>
}

interface CloudState {
  open: boolean
  pendingReport: PendingReport | null
  setOpen: (v: boolean) => void
  setPendingReport: (r: PendingReport | null) => void
}

export const useCloud = create<CloudState>((set) => ({
  open: false,
  pendingReport: null,
  setOpen: (v) => set({ open: v, ...(v ? {} : { pendingReport: null }) }),
  setPendingReport: (r) => set({ pendingReport: r }),
}))
