import { useEffect, useState } from 'react'
import { useI18n, type Lang } from '../i18n'
import { toast } from '../lib/toast'

export function SettingsDialog({
  open,
  onClose,
  themeDark,
  onToggleTheme,
}: {
  open: boolean
  onClose: () => void
  themeDark: boolean
  onToggleTheme: () => void
}) {
  const t = useI18n((s) => s.t)
  const lang = useI18n((s) => s.lang)
  const setLang = useI18n((s) => s.setLang)
  const [version, setVersion] = useState('')

  useEffect(() => {
    if (!open) return
    window.desktop?.appVersion().then(setVersion).catch(() => setVersion(''))
  }, [open])

  if (!open) return null

  const checkUpdates = async () => {
    const d = window.desktop!
    const r = await d.checkUpdates()
    if (r && r.ok && r.version) return
    if (r && r.ok) {
      toast.ok(`${t('up_latest')}: ${version}`)
    } else {
      toast.warn(`${t('up_title')}: ${r?.reason ?? 'error'}`)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-paper border border-line w-[440px] shadow-xl rounded-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">{t('settings_title')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">
            ×
          </button>
        </div>
        <div className="p-4 space-y-4 text-[13px]">
          <div className="flex items-center justify-between gap-4">
            <span>{t('menu_lang')}</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="px-2 py-1 bg-paper border border-line text-[12px] outline-none cursor-pointer"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>{themeDark ? t('theme_dark') : t('theme_light')}</span>
            <button onClick={onToggleTheme} className="px-2 py-1 border border-line cursor-pointer hover:bg-paper-2">
              <span className="theme-dot" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>{t('up_title')}</span>
            <button onClick={() => void checkUpdates()} className="px-2 py-1 border border-line cursor-pointer hover:bg-paper-2">
              {t('up_title')}
            </button>
          </div>
          <div className="flex items-center justify-between gap-4 text-graphite-soft font-mono text-[12px]">
            <span>{t('about_version')}</span>
            <span>{version || '…'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
