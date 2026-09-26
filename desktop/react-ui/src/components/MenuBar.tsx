import { useRef, useState } from 'react'

export interface MenuBarItem {
  id: string
  label: string
  hint?: string
  separator?: boolean
  run?: () => void
}
export interface MenuBarColumn {
  id: string
  label: string
  items: MenuBarItem[]
}

/** Classic menu bar: hovering a top-level item opens its submenu (OpenCode-style). */
export function MenuBar({ columns }: { columns: MenuBarColumn[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const closeTimer = useRef<number | null>(null)

  const enter = (id: string) => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setOpen(id)
  }
  const leave = () => {
    closeTimer.current = window.setTimeout(() => setOpen(null), 160)
  }

  return (
    <div className="menubar no-drag" onMouseLeave={leave}>
      {columns.map((col) => (
        <div key={col.id} className="relative h-full" onMouseEnter={() => enter(col.id)}>
          <button className={`menubar-item ${open === col.id ? 'menubar-item-on' : ''}`}>{col.label}</button>
          {open === col.id && (
            <div className="appmenu" onMouseEnter={() => enter(col.id)}>
              {col.items.map((it, i) =>
                it.separator ? (
                  <div key={`sep-${i}`} className="appmenu-sep" />
                ) : (
                  <button
                    key={it.id}
                    className="appmenu-item"
                    onClick={() => {
                      setOpen(null)
                      it.run?.()
                    }}
                  >
                    <span className="flex-1 truncate text-left">{it.label}</span>
                    {it.hint && <span className="appmenu-hint font-mono">{it.hint}</span>}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
