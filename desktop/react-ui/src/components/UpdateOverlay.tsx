import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'

type Status = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error'

export function UpdateOverlay() {
  const t = useI18n((s) => s.t)
  const [status, setStatus] = useState<Status>('idle')
  const [version, setVersion] = useState('')
  const [percent, setPercent] = useState(0)
  const [error, setError] = useState('')
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const d = window.desktop
    if (!d || !d.onUpdateEvent) return
    const off = d.onUpdateEvent((e) => {
      setHidden(false)
      if (e.type === 'available') {
        setStatus('available')
        setVersion(String(e.payload?.version ?? ''))
        // start download immediately so the popup shows progress
        void d.downloadUpdates()
        setStatus('downloading')
      } else if (e.type === 'progress') {
        setStatus('downloading')
        setPercent(Math.round(e.payload?.percent ?? 0))
      } else if (e.type === 'downloaded') {
        setStatus('downloaded')
        setPercent(100)
      } else if (e.type === 'error') {
        setStatus('error')
        setError(String(e.payload?.message ?? ''))
      } else if (e.type === 'not-available') {
        setStatus('idle')
      }
    })
    return off
  }, [])

  if (status === 'idle' || hidden) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[95] w-[320px] border border-line bg-paper-2 shadow-xl p-3 space-y-2"
      style={{ borderRadius: 8 }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-sans uppercase tracking-wide">
          {status === 'downloaded' ? t('up_downloaded') : status === 'error' ? t('up_error') : `${t('up_available')}: ${version}`}
        </div>
        <button className="text-graphite-soft hover:text-graphite cursor-pointer" onClick={() => setHidden(true)} aria-label={t('up_hide')}>
          ×
        </button>
      </div>

      {status === 'downloading' && (
        <>
          <div className="h-2 bg-paper-3" style={{ borderRadius: 4 }}>
            <div className="h-2 bg-[color:var(--color-accent)]" style={{ width: `${percent}%`, borderRadius: 4, transition: 'width .2s' }} />
          </div>
          <div className="text-[12px] text-graphite-mid num">{percent}% · {t('up_downloading')}</div>
        </>
      )}

      {status === 'available' && <div className="text-[12px] text-graphite-mid">{t('up_downloading')}</div>}

      {status === 'error' && <div className="text-[12px] text-[color:var(--color-neg)] break-all">{error}</div>}

      {status === 'downloaded' && (
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 text-[12px] font-sans uppercase tracking-wide bg-graphite text-paper hover:bg-graphite/85 cursor-pointer"
            onClick={() => void window.desktop?.installUpdates()}
          >
            {t('up_install')}
          </button>
          <button className="px-3 py-1.5 text-[12px] border border-line hover:bg-paper-3 cursor-pointer" onClick={() => setHidden(true)}>
            {t('up_later')}
          </button>
        </div>
      )}
    </div>
  )
}
