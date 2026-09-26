import { useRef, useState } from 'react'
import { useTabs } from '../stores/tabs'
import { WindowControls } from './WindowControls'
import { HamburgerMenu, type MenuBarColumn } from './MenuBar'
import { useI18n } from '../i18n'

export interface ModuleButton {
  id: string
  ico: string
  label: string
  run: () => void
}

export function TitleTabs({
  columns,
  modules,
  themeDark,
  onToggleTheme,
  onSearch,
  onHistory,
  onToggleSplit,
  onToggleSidebar,
  sidebarHidden,
}: {
  columns: MenuBarColumn[]
  modules: ModuleButton[]
  themeDark: boolean
  onToggleTheme: () => void
  onSearch: () => void
  onHistory: () => void
  onToggleSplit: () => void
  onToggleSidebar: () => void
  sidebarHidden: boolean
}) {
  const t = useI18n((s) => s.t)
  const { tabs, active, split, setActive, close, rename, reorder } = useTabs()
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const dragKey = useRef<string | null>(null)

  const commitRename = (key: string) => {
    const v = editVal.trim()
    if (v) rename(key, v)
    setEditing(null)
  }

  return (
    <div className="shrink-0 border-b border-line bg-paper-2">
      {/* row 1: hamburger menu + modules + cluster + window controls (drag region) */}
      <div className="titlebar h-[36px] flex items-stretch">
        <HamburgerMenu columns={columns} title="LCA·AI" />

        <div className="no-drag flex items-stretch border-l border-line overflow-x-auto">
          {modules.map((m) => (
            <button key={m.id} onClick={m.run} title={m.label} className="ic-btn">
              <span className="ico">{m.ico}</span>
            </button>
          ))}
        </div>

        <div className="no-drag flex items-center px-2 border-l border-line">
          <span className="font-sans font-semibold text-[12px] uppercase tracking-widest whitespace-nowrap">LCA·AI</span>
        </div>

        <div className="flex-1" />

        <div className="no-drag flex items-stretch border-l border-line">
          <button onClick={onSearch} title={`${t('search_all')} (Ctrl+K)`} className="ic-btn">
            ⌕
          </button>
          <button onClick={onHistory} title={t('hist_title')} className="ic-btn">
            ↺
          </button>
          <button onClick={onToggleSplit} title={t('split_toggle')} className={`ic-btn ${split ? 'ic-btn-on' : ''}`}>
            ◫
          </button>
          <button
            onClick={onToggleSidebar}
            title={t('sidebar_toggle')}
            className={`ic-btn ${sidebarHidden ? 'ic-btn-on' : ''}`}
          >
            ◧
          </button>
          <button onClick={onToggleTheme} title={themeDark ? t('theme_light') : t('theme_dark')} className="ic-btn">
            <span className="theme-dot" aria-hidden="true" />
          </button>
        </div>

        <WindowControls />
      </div>

      {/* row 2: editor tabs, wheel-scrollable */}
      <nav
        className="no-drag h-[34px] flex items-stretch overflow-x-auto border-t border-line"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY
        }}
      >
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
        <button onClick={onSearch} title={`${t('search_all')} (Ctrl+K)`} className="tabitem-add">
          +
        </button>
      </nav>
    </div>
  )
}
