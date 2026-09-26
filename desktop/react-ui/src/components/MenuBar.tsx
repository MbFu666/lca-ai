import { useRef, useState } from 'react'
import { IconMenu } from './icons'

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

/** OpenCode-style: three-stripes button opens a vertical menu; hovering a column flies its submenu out to the right. */
export function HamburgerMenu({ columns, title }: { columns: MenuBarColumn[]; title: string }) {
  const [open, setOpen] = useState(false)
  const [sub, setSub] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const cancelClose = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    timer.current = window.setTimeout(() => {
      setOpen(false)
      setSub(null)
    }, 160)
  }

  return (
    <div className="relative h-full flex items-center" onMouseLeave={scheduleClose} onMouseEnter={cancelClose}>
      <button
        className="ham-btn"
        title={title}
        onClick={() => {
          setOpen((o) => !o)
          setSub(null)
        }}
      >
        <IconMenu />
      </button>
      {open && (
        <div className="ham-menu" onMouseEnter={cancelClose}>
          <div className="ham-head">{title}</div>
          {columns.map((col) => (
            <div key={col.id} className="relative" onMouseEnter={() => setSub(col.id)}>
              <button className={`ham-item ${sub === col.id ? 'ham-item-on' : ''}`}>
                <span className="flex-1 truncate text-left">{col.label}</span>
                <span className="ham-arrow">▸</span>
              </button>
              {sub === col.id && (
                <div className="ham-sub">
                  {col.items.map((it, i) =>
                    it.separator ? (
                      <div key={`sep-${i}`} className="appmenu-sep" />
                    ) : (
                      <button
                        key={it.id}
                        className="appmenu-item"
                        onClick={() => {
                          setOpen(false)
                          setSub(null)
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
      )}
    </div>
  )
}
