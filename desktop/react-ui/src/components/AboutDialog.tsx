import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useI18n((s) => s.t)
  const [version, setVersion] = useState('')

  useEffect(() => {
    if (!open) return
    window.desktop?.appVersion().then(setVersion).catch(() => setVersion(''))
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-paper border border-line w-[420px] shadow-xl rounded-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">{t('about_title')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">
            ×
          </button>
        </div>
        <div className="p-5 text-center space-y-2">
          <div className="text-[26px] font-sans uppercase tracking-widest">LCA·AI</div>
          <div className="text-[12px] text-graphite-soft font-sans uppercase tracking-wide">Studio</div>
          <div className="text-[13px] font-mono pt-2">
            {t('about_version')}: {version || '…'}
          </div>
          <div className="text-[12px] text-graphite-mid">{t('about_desc')}</div>
          <div className="text-[11px] text-graphite-soft font-mono pt-1">{t('about_feed')}</div>
          <div className="flex items-center justify-center gap-4 pt-3 text-[12px]">
            <a href="https://lca-ai.ru" target="_blank" rel="noreferrer" className="text-e-ink underline">
              lca-ai.ru
            </a>
            <a
              href="https://github.com/MbFu666/lca-ai-releases"
              target="_blank"
              rel="noreferrer"
              className="text-e-ink underline"
            >
              GitHub
            </a>
          </div>
          <div className="text-[11px] text-graphite-soft pt-2">© 2026 LCA·AI</div>
        </div>
      </div>
    </div>
  )
}
