import { useMemo } from 'react'
import { useHistory } from '../stores/history'
import { useTabs, tabKey } from '../stores/tabs'
import { useI18n } from '../i18n'

function dayLabel(ts: number, t: (k: string) => string): string {
  const d = new Date(ts)
  const now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000)
  if (diff === 0) return t('hist_today')
  if (diff === 1) return t('hist_yesterday')
  return d.toLocaleDateString()
}

export function HistoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useI18n((s) => s.t)
  const entries = useHistory((s) => s.entries)
  const clear = useHistory((s) => s.clear)
  const openTab = useTabs((s) => s.open)

  const groups = useMemo(() => {
    const m = new Map<string, typeof entries>()
    for (const e of entries) {
      const k = dayLabel(e.ts, t)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(e)
    }
    return [...m.entries()]
  }, [entries, t])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[65]" onClick={onClose}>
      <aside
        className="hist-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-line">
          <span className="text-[12px] font-sans uppercase tracking-widest">↺ {t('hist_title')}</span>
          <span className="flex items-center gap-2">
            {entries.length > 0 && (
              <button onClick={clear} className="text-[11px] text-graphite-soft hover:text-e-4 cursor-pointer">
                {t('hist_clear')}
              </button>
            )}
            <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[16px] cursor-pointer">
              ×
            </button>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 && <div className="p-4 text-[12px] text-graphite-soft">{t('hist_empty')}</div>}
          {groups.map(([day, list]) => (
            <div key={day}>
              <div className="px-3 py-1 text-[10px] font-sans uppercase tracking-widest text-graphite-soft bg-paper-3">
                {day}
              </div>
              {list.map((e, i) => (
                <button
                  key={`${e.type}:${e.id}-${i}`}
                  onClick={() => {
                    openTab({ key: tabKey(e.type, e.id), type: e.type, id: e.id, name: e.name })
                    onClose()
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] text-graphite-mid hover:text-graphite hover:bg-paper-3 cursor-pointer"
                >
                  <span className="text-[10px] font-mono text-graphite-soft shrink-0">{e.type.slice(0, 4)}</span>
                  <span className="flex-1 truncate">{e.name}</span>
                  <span className="text-[10px] font-mono text-graphite-soft shrink-0">
                    {new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
