import { useEffect, useMemo, useState } from 'react'
import type { DbInfo } from '../types/desktop'
import { useHistory } from '../stores/history'
import { useTabs } from '../stores/tabs'
import { useI18n } from '../i18n'
import { Spinner } from './ui/primitives'

function dayLabel(ts: number): 'today' | 'earlier' {
  const d = new Date(ts)
  const now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  return startOf(now) - startOf(d) <= 0 ? 'today' : 'earlier'
}

/** OpenCode-style home: DB list (like projects) + DB-open history (like sessions). */
export function HomeView({
  onCreateDb,
}: {
  onCreateDb: () => void
}) {
  const t = useI18n((s) => s.t)
  const [dbs, setDbs] = useState<DbInfo[] | null>(null)
  const entries = useHistory((s) => s.entries)
  const closeAll = useTabs((s) => s.closeAll)

  useEffect(() => {
    if (!window.desktop) return
    let mounted = true
    const load = () =>
      window.desktop
        ?.dbList()
        .then((r) => mounted && setDbs(r.databases))
        .catch(() => mounted && setDbs([]))
    load()
    const off = window.desktop.onDbChanged(() => load())
    return () => {
      mounted = false
      off?.()
    }
  }, [])

  const groups = useMemo(() => {
    const today = entries.filter((e) => e.type === 'DB' && dayLabel(e.ts) === 'today')
    const earlier = entries.filter((e) => e.type === 'DB' && dayLabel(e.ts) === 'earlier')
    return { today, earlier }
  }, [entries])

  const switchDb = (name: string) => {
    window.desktop?.dbSwitch(name).catch(() => undefined)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[980px] px-6 py-6">
        <div className="grid grid-cols-[260px_1fr] gap-8">
          {/* databases (like OpenCode projects) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-sans uppercase tracking-widest">{t('home_dbs')}</span>
              <button onClick={onCreateDb} title={t('file_create_db')} className="text-[14px] font-bold text-graphite-mid hover:text-graphite cursor-pointer">
                +
              </button>
            </div>
            {dbs === null ? (
              <Spinner label={t('loading')} />
            ) : (
              <div className="space-y-1">
                {dbs.map((d) => (
                  <button
                    key={d.name}
                    onClick={() => switchDb(d.name)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-[13px] rounded-md hover:bg-paper-2 cursor-pointer"
                  >
                    <span className="w-4 h-4 shrink-0 flex items-center justify-center text-[9px] font-bold bg-paper-3 border border-line rounded">
                      D
                    </span>
                    <span className={`flex-1 truncate font-mono text-[12px] ${d.active ? 'text-graphite font-bold' : 'text-graphite-mid'}`}>
                      {d.name}
                    </span>
                    {d.isBase && <span className="text-[9px] font-sans uppercase text-graphite-soft">{t('db_base')}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* db-open history (like OpenCode sessions) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-sans uppercase tracking-widest">{t('home_history')}</span>
              <button onClick={() => closeAll()} className="flex items-center gap-1.5 text-[12px] text-graphite-mid hover:text-graphite cursor-pointer">
                ✎ {t('home_new_session')}
              </button>
            </div>
            {(['today', 'earlier'] as const).map((g) => {
              const list = groups[g]
              if (list.length === 0) return null
              return (
                <div key={g} className="mb-5">
                  <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-soft mb-2">
                    {g === 'today' ? t('hist_today') : t('hist_earlier')}
                  </div>
                  <div className="space-y-1">
                    {list.map((e, i) => (
                      <button
                        key={`${e.id}-${i}`}
                        onClick={() => switchDb(e.name)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md hover:bg-paper-2 cursor-pointer"
                      >
                        <span className="w-4 h-4 shrink-0 flex items-center justify-center text-[9px] font-bold bg-paper-3 border border-line rounded">
                          D
                        </span>
                        <span className="flex-1 truncate text-[13px] font-mono text-[12px]">{e.name}</span>
                        <span className="text-[10px] font-mono text-graphite-soft">
                          {new Date(e.ts).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
            {groups.today.length === 0 && groups.earlier.length === 0 && (
              <div className="text-[12px] text-graphite-soft">{t('hist_empty')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
