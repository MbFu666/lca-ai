import { useI18n } from '../i18n'
import { DOCS } from '../docs/content'
import { Markdown } from './Markdown'

/** In-app usage documentation (RU/EN/ZH), opened from Home and Help menu. */
export function DocsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useI18n((s) => s.t)
  const lang = useI18n((s) => s.lang)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-paper border border-line w-[860px] max-h-[86vh] flex flex-col shadow-xl rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">? {t('docs_title')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <Markdown text={DOCS[lang]} />
        </div>
      </div>
    </div>
  )
}
