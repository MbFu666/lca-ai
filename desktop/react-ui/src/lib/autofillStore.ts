// Pending overrides produced by AI Auto-Fill, consumed by Plant Wizard on open.
let pending: Record<string, number> = {}
let pendingFeed: string | null = null

export function setPendingAutofill(overrides: Record<string, number>, feed: string | null) {
  pending = overrides
  pendingFeed = feed
}

export function takePendingAutofill(): { overrides: Record<string, number>; feed: string | null } {
  const o = pending
  const f = pendingFeed
  pending = {}
  pendingFeed = null
  return { overrides: o, feed: f }
}
