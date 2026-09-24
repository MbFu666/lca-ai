import { useEffect, useMemo, useRef, useState } from 'react'

export interface PaletteAction {
  id: string
  label: string
  hint?: string
  run: () => void
}

export function CommandPalette({ open, onClose, actions }: { open: boolean; onClose: () => void; actions: PaletteAction[] }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return actions
    return actions.filter((a) => (a.label + ' ' + (a.hint ?? '')).toLowerCase().includes(s))
  }, [q, actions])

  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  if (!open) return null

  const pick = (a: PaletteAction) => {
    onClose()
    a.run()
  }

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          placeholder="Type a command…"
          onChange={(e) => {
            setQ(e.target.value)
            setSel(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSel((s) => Math.min(filtered.length - 1, s + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSel((s) => Math.max(0, s - 1))
            } else if (e.key === 'Enter') {
              const a = filtered[sel]
              if (a) pick(a)
            } else if (e.key === 'Escape') {
              onClose()
            }
          }}
        />
        {filtered.map((a, i) => (
          <button key={a.id} className={`item ${i === sel ? 'sel' : ''}`} onClick={() => pick(a)} onMouseEnter={() => setSel(i)}>
            <span>{a.label}</span>
            <span className="hint">{a.hint}</span>
          </button>
        ))}
        {filtered.length === 0 && <div className="hint" style={{ padding: 12 }}>no matches</div>}
      </div>
    </div>
  )
}
