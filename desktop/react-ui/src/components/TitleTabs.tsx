import { useEffect, useRef, useState } from 'react'
import { useTabs } from '../stores/tabs'
import { WindowControls } from './WindowControls'
import { useI18n } from '../i18n'

export interface MenuItem {
  id: string
  label: string
  hint?: string
  run: () => void
}
export interface MenuGroup {
  group: string
  items: MenuItem[]
}

export function TitleTabs({
  themeDark,
  onToggleTheme,
  onSearch,
  onHistory,
  onToggleSplit,
  onToggleSidebar,
  sidebarHidden,
  menu,
}: {
  themeDark: boolean
  onToggleTheme: () => void
  onSearch: () => void
  onHistory: () => void
  onToggleSplit: () => void
  onToggleSidebar: () => void
  sidebarHidden: boolean
  menu: MenuGroup[]
}) {
  const t = useI18n((s) => s.t)
  const { tabs, active, split, setActive, close, rename, reorder } = useTabs()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const dragKey = useRef<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const commitRename = (key: string) => {
    const v = editVal.trim()
    if (v) rename(key, v)
    setEditing(null)
  }

  return (
    <header className="titlebar h-[40px] shrink-0 border-b border-line bg-paper-2 flex items-stretch">
      {/* hamburger app menu */}
      <div className="relative no-drag flex items-center px-2" ref={rootRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          title={t('menu_title')}
          className="h-full px-2 text-[15px] text-graphite-mid hover:text-graphite hover:bg-paper-3 cursor-pointer"
        >
          ☰
        </button>
        {menuOpen && (
          <div className="appmenu" onClick={() => setMenuOpen(false)}>
            {menu.map((g) => (
              <div key={g.group} className="appmenu-group">
                <div className="appmenu-head">{g.group}</div>
                {g.items.map((it) => (
                  <button key={it.id} onClick={it.run} className="appmenu-item">
                    <span className="flex-1 truncate text-left">{it.label}</span>
                    {it.hint && <span className="appmenu-hint font-mono">{it.hint}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="no-drag flex items-center px-1 border-r border-line">
        <span className="font-sans font-semibold text-[13px] uppercase tracking-widest">LCA·AI</span>
      </div>

      {/* editor tabs */}
      <nav className="no-drag flex-1 flex items-stretch overflow-x-auto min-w-0">
        {tabs.map((tb) => (
          <div
            key={tb.key}
            draggable={editing !== tb.key}
            onDragStart={() => (dragKey.current = tb.key)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (dragKey.current) reorder(dragKey.current, tb.key)
              dragKey.current = null
            }}
            onClick={() => setActive(tb.key)}
            onDoubleClick={() => {
              setEditing(tb.key)
              setEditVal(tb.name)
            }}
            title={tb.name}
            className={`tabitem ${tb.key === active ? 'tabitem-active' : ''}`}
          >
            {editing === tb.key ? (
              <input
                autoFocus
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={() => commitRename(tb.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(tb.key)
                  if (e.key === 'Escape') setEditing(null)
                }}
                onClick={(e) => e.stopPropagation()}
                className="tabitem-input"
              />
            ) : (
              <span className="truncate">{tb.name}</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                close(tb.key)
              }}
              className="tabitem-close"
            >
              ×
            </button>
          </div>
        ))}
        <button onClick={onSearch} title={`${t('search_all')} (Ctrl+K)`} className="tabitem-add no-drag">
          +
        </button>
      </nav>

      {/* right icon cluster */}
      <div className="no-drag flex items-stretch border-l border-line">
        <button onClick={onSearch} title={`${t('search_all')} (Ctrl+K)`} className="ic-btn">
          ⌕
        </button>
        <button onClick={onHistory} title={t('hist_title')} className="ic-btn">
          ↺
        </button>
        <button
          onClick={onToggleSplit}
          title={t('split_toggle')}
          className={`ic-btn ${split ? 'ic-btn-on' : ''}`}
        >
          ◫
        </button>
        <button
          onClick={onToggleSidebar}
          title={t('sidebar_toggle')}
          className={`ic-btn ${sidebarHidden ? 'ic-btn-on' : ''}`}
        >
          ▤
        </button>
        <button onClick={onToggleTheme} title={themeDark ? t('theme_light') : t('theme_dark')} className="ic-btn">
          <span className="theme-dot" aria-hidden="true" />
        </button>
      </div>

      <WindowControls />
    </header>
  )
}
