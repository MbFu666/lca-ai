import { useState, type ReactNode } from 'react'

/** Collapsible step group row (OpenCode-GUI style "N steps" line). */
export function StepGroup({
  label,
  count,
  children,
  defaultOpen = false,
}: {
  label: string
  count?: number
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="stepgroup">
      <button onClick={() => setOpen((o) => !o)} className="stepgroup-head">
        <span className="stepgroup-caret">{open ? '▾' : '▸'}</span>
        <span className="flex-1 truncate text-left">{label}</span>
        {count !== undefined && <span className="stepgroup-count font-mono">{count}</span>}
      </button>
      {open && <div className="stepgroup-body">{children}</div>}
    </div>
  )
}
