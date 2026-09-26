import { useEffect, useState } from 'react'
import { useTabs } from '../stores/tabs'
import { useEngine } from '../stores/engine'
import { useI18n } from '../i18n'
import { toast } from '../lib/toast'

export interface QuickCmd {
  id: string
  label: string
  run: () => void
}

type Mode = 'ai' | 'calc' | 'mc' | 'report'

export function Composer({
  onAi,
  onAutoFill,
  onReport,
  onOpenDb,
  quick,
}: {
  onAi: (prompt: string) => void
  onAutoFill: () => void
  onReport: () => void
  onOpenDb: () => void
  quick: QuickCmd[]
}) {
  const t = useI18n((s) => s.t)
  const active = useTabs((s) => s.active)
  const tabs = useTabs((s) => s.tabs)
  const status = useEngine((s) => s.status)
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('lcaai-composer-mode') as Mode) || 'ai')
  const [text, setText] = useState('')
  const [db, setDb] = useState('')

  useEffect(() => {
    localStorage.setItem('lcaai-composer-mode', mode)
  }, [mode])

  useEffect(() => {
    if (!window.desktop) return
    let mounted = true
    const load = () => window.desktop?.dbList().then((r) => mounted && setDb(r.current)).catch(() => undefined)
    load()
    const off = window.desktop.onDbChanged((d) => setDb(d.db))
    return () => {
      mounted = false
      off?.()
    }
  }, [])

  const activeType = tabs.find((x) => x.key === active)?.type ?? null
  const slash = text.startsWith('/') ? text.slice(1).toLowerCase() : null
  const quickHits = slash !== null ? quick.filter((q) => q.label.toLowerCase().includes(slash) || q.id.includes(slash)) : []

  const send = () => {
    const v = text.trim()
    if (slash !== null) {
      const hit = quickHits[0]
      if (hit) {
        hit.run()
        setText('')
      }
      return
    }
    if (!v && mode === 'ai') return
    if (mode === 'ai') {
      onAi(v)
    } else if (mode === 'calc') {
      if (activeType === 'Project' || activeType === 'Process') {
        window.dispatchEvent(new CustomEvent('lcaai:run-calc'))
      } else {
        toast.warn(t('composer_need_open'))
        return
      }
    } else if (mode === 'mc') {
      if (activeType === 'Process') {
        window.dispatchEvent(new CustomEvent('lcaai:run-mc'))
      } else {
        toast.warn(t('composer_need_process'))
        return
      }
    } else {
      onReport()
    }
    setText('')
  }

  return (
    <footer className="shrink-0 border-t border-line bg-paper-2 px-3 py-2">
      <div className="mx-auto max-w-[820px]">
        {slash !== null && quickHits.length > 0 && (
          <div className="composer-quick">
            {quickHits.map((q) => (
              <button
                key={q.id}
                className="appmenu-item"
                onClick={() => {
                  q.run()
                  setText('')
                }}
              >
                <span className="flex-1 truncate text-left">/{q.id} — {q.label}</span>
              </button>
            ))}
          </div>
        )}
        <div className="composer-box">
          <div className="flex items-center gap-2 px-3 pt-2">
            <button onClick={onAutoFill} title={t('af_title')} className="composer-plus no-drag">
              +
            </button>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="composer-select"
              title={t('composer_mode')}
            >
              <option value="ai">✦ {t('mode_ai')}</option>
              <option value="calc">Σ {t('mode_calc')}</option>
              <option value="mc">~ {t('mode_mc')}</option>
              <option value="report">▤ {t('mode_report')}</option>
            </select>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send()
              }}
              placeholder={slash !== null ? t('composer_quick') : t('composer_placeholder')}
              className="flex-1 min-w-0 bg-transparent outline-none text-[13px]"
            />
            <button
              onClick={send}
              title={t('composer_send')}
              className="composer-send"
              disabled={mode === 'ai' && !text.trim() && slash === null}
            >
              ↑
            </button>
          </div>
          <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] font-mono text-graphite-soft">
            <button
              onClick={() => {
                if (status !== 'online') window.desktop?.startEngine()
              }}
              title={status === 'online' ? t('engine_online') : t('engine_start')}
              className="flex items-center gap-1.5 cursor-pointer hover:text-graphite"
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  status === 'online' ? 'bg-ok' : status === 'checking' ? 'bg-e-2' : 'bg-e-4'
                }`}
              />
              {status === 'online' ? t('engine_online') : status === 'checking' ? t('engine_checking') : t('engine_offline')}
            </button>
            <button onClick={onOpenDb} title={t('db_manager')} className="hover:text-graphite cursor-pointer truncate">
              ▤ {db || '…'}
            </button>
            <span className="flex-1" />
            <span>openLCA IPC · JSON-RPC</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
