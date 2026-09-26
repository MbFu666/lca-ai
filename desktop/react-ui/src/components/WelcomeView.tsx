import { useI18n } from '../i18n'

/** Welcome home page (openLCA Welcome style) — rendered as a closable tab. */
export function WelcomeView({ onDocs }: { onDocs: () => void }) {
  const t = useI18n((s) => s.t)
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[980px] px-6 py-10">
        <div className="grid grid-cols-[260px_1fr] gap-8">
          <div className="space-y-2.5">
            <button onClick={onDocs} className="home-link">
              {t('home_docs_btn')}
            </button>
            <a href="https://lca-ai.ru" target="_blank" rel="noreferrer" className="home-link">
              {t('home_site')}
            </a>
            <a href="https://github.com/MbFu666/lca-ai-releases" target="_blank" rel="noreferrer" className="home-link">
              {t('home_repo')}
            </a>
          </div>
          <div className="text-[13px] text-graphite-mid leading-relaxed pt-0.5 whitespace-pre-line">
            {t('home_welcome')}
          </div>
        </div>
      </div>
    </div>
  )
}
