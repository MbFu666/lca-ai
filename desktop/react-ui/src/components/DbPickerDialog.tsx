import { useEffect, useState } from 'react'
import type { DbInfo } from '../types/desktop'
import { useI18n } from '../i18n'
import { Spinner } from './ui/primitives'

/** Create / open (switch) a database — File menu entries. */
export function DbPickerDialog({ mode, onClose }: { mode: 'create' | 'open'; onClose: () => void }) {
  const t = useI18n((s) => s.t)
  const [dbs, setDbs] = useState<DbInfo[]>([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.desktop
      ?.dbList()
      .then((r) => setDbs(r.databases))
      .catch(() => setDbs([]))
  }, [])

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      onClose()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-paper border border-line w-[460px] max-h-[70vh] flex flex-col shadow-xl rounded-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">
            🗄 {mode === 'create' ? t('file_create_db') : t('file_open_db')}
          </h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">
            ×
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-2">
          {mode === 'create' ? (
            <>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim()) run(() => window.desktop!.dbCreate(name.trim()))
                }}
                placeholder={t('dbp_name')}
                className="w-full px-3 py-2 bg-paper border border-line text-[13px] font-mono outline-none focus:border-graphite-mid"
              />
              <button
                onClick={() => name.trim() && run(() => window.desktop!.dbCreate(name.trim()))}
                disabled={busy || !name.trim()}
                className="px-3 py-1.5 border border-line text-[12px] cursor-pointer hover:bg-paper-2 disabled:opacity-40"
              >
                {busy ? '…' : t('dbp_create_btn')}
              </button>
            </>
          ) : (
            <>
              {dbs.length === 0 && <Spinner label={t('loading')} />}
              {dbs.map((d) => (
                <button
                  key={d.name}
                  disabled={busy || d.active}
                  onClick={() => run(() => window.desktop!.dbSwitch(d.name))}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] font-mono border border-line hover:bg-paper-2 cursor-pointer disabled:opacity-50 disabled:cursor-default"
                >
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="text-[10px] text-graphite-soft">{d.sizeMb} MB</span>
                  {d.active && <span className="text-[9px] font-sans uppercase text-ok">{t('db_active')}</span>}
                  {d.isBase && <span className="text-[9px] font-sans uppercase text-graphite-soft">{t('db_base')}</span>}
                </button>
              ))}
            </>
          )}
          {error && <div className="text-[12px] text-e-ink">{error}</div>}
        </div>
      </div>
    </div>
  )
}
