import { useEffect, useState } from 'react'
import { Navigator } from './components/navigator/Navigator'
import { ProcessEditor } from './components/editors/ProcessEditor'
import { ProjectEditor } from './components/editors/ProjectEditor'
import { FlowEditor } from './components/editors/FlowEditor'
import { ImpactCategoryEditor } from './components/editors/ImpactCategoryEditor'
import { ImpactMethodEditor } from './components/editors/ImpactMethodEditor'
import { UnitGroupEditor } from './components/editors/UnitGroupEditor'
import { DQSystemEditor } from './components/editors/DQSystemEditor'
import { ProductSystemEditor } from './components/editors/ProductSystemEditor'
import { GenericEditor } from './components/editors/GenericEditor'
import { SimpleEntityEditor } from './components/editors/SimpleEditors'
import { DatabaseManager } from './components/DatabaseManager'
import { GlobalSearch } from './components/GlobalSearch'
import { GlobalParameters } from './components/GlobalParameters'
import { CloudPanel } from './components/CloudPanel'
import { AiPanel } from './components/AiPanel'
import { ScenarioBuilder } from './components/ScenarioBuilder'
import { PlantWizard } from './components/PlantWizard'
import { ReportStudio } from './components/ReportStudio'
import { AutoFill } from './components/AutoFill'
import { CommandPalette } from './components/CommandPalette'
import { Toasts } from './components/ui/charts'
import { toast } from './lib/toast'
import { useCloud } from './stores/cloud'
import { useTabs, tabKey, type Tab } from './stores/tabs'
import { useEngine } from './stores/engine'
import { useI18n, type Lang } from './i18n'
import { EmptyState } from './components/ui/primitives'

export default function App() {
  const t = useI18n((s) => s.t)
  const lang = useI18n((s) => s.lang)
  const setLang = useI18n((s) => s.setLang)
  const { tabs, active, close, setActive } = useTabs()
  const openTab = useTabs((s) => s.open)
  const { status, check, summary } = useEngine()
  const [showDbManager, setShowDbManager] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showGP, setShowGP] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showScenario, setShowScenario] = useState(false)
  const [showPlant, setShowPlant] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showAutoFill, setShowAutoFill] = useState(false)
  const [upd, setUpd] = useState('')
  const [themeDark, setThemeDark] = useState(() => localStorage.getItem('lcaai-theme') === 'dark')
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeDark)
  }, [themeDark])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const d = window.desktop
    if (!d || !d.onUpdateEvent) return
    const off = d.onUpdateEvent((e) => {
      if (e.type === 'available') toast.ok(`${t('up_available')}: ${e.payload?.version ?? ''}`)
      else if (e.type === 'progress') setUpd(`${Math.round(e.payload?.percent ?? 0)}%`)
      else if (e.type === 'downloaded') {
        setUpd('ready')
        toast.ok(t('up_downloaded'))
        if (window.confirm(t('up_install_now'))) void d.installUpdates()
      } else if (e.type === 'error') toast.warn(`${t('up_title')}: ${e.payload?.message ?? ''}`)
    })
    return off
  }, [t])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    check()
    const timer = setInterval(check, 15000)
    const off = window.desktop?.onEngineStatus(() => {
      check()
    })
    return () => {
      clearInterval(timer)
      off?.()
    }
  }, [check])

  const activeTab = tabs.find((tb) => tb.key === active) ?? null

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="h-[46px] shrink-0 border-b border-line bg-paper-2 flex items-center px-4 gap-4">
        <div className="flex items-baseline gap-2">
          <span className="font-sans font-semibold text-[15px] uppercase tracking-widest">LCA·AI</span>
          <span className="text-[12px] text-graphite-soft font-sans uppercase tracking-wide">Studio</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowSearch(true)}
          title={`${t('search_all')} (Ctrl+K)`}
          className="text-[13px] text-graphite-soft hover:text-graphite cursor-pointer border border-line px-2 py-1"
        >
          ⌕
        </button>
        <button
          onClick={() => setShowGP(true)}
          title={t('nav_global_params')}
          className="text-[13px] text-graphite-soft hover:text-graphite cursor-pointer border border-line px-2 py-1 font-mono"
        >
          ƒ
        </button>
        <button
          onClick={() => setPaletteOpen(true)}
          title="Command palette (Ctrl+Shift+P)"
          className="text-[13px] text-graphite-soft hover:text-graphite cursor-pointer border border-line px-2 py-1"
        >
          ⌘
        </button>
        <button
          onClick={() => {
            const dark = !document.documentElement.classList.contains('dark')
            document.documentElement.classList.toggle('dark', dark)
            localStorage.setItem('lcaai-theme', dark ? 'dark' : 'light')
            setThemeDark(dark)
          }}
          title={themeDark ? 'Light theme' : 'Dark theme'}
          className="text-[13px] text-graphite-soft hover:text-graphite cursor-pointer border border-line px-2 py-1"
        >
          {themeDark ? '☀' : '🌙'}
        </button>
        {window.desktop && <DbBadge onClick={() => setShowDbManager(true)} />}
        <EngineBadge />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="px-2 py-1 bg-paper border border-line text-[12px] outline-none cursor-pointer"
        >
          <option value="ru">RU</option>
          <option value="en">EN</option>
          <option value="zh">中文</option>
        </select>
      </header>
      {window.desktop && (
        <nav className="shrink-0 border-b border-line bg-paper flex items-center gap-1 px-3 py-1.5 overflow-x-auto">
          {(
            [
              { ico: '✦', label: t('ai_title'), run: () => setShowAI(true) },
              { ico: '◈', label: t('scenario_title'), run: () => setShowScenario(true) },
              { ico: '⌂', label: t('pw_title'), run: () => setShowPlant(true) },
              { ico: '▤', label: t('rs_title'), run: () => setShowReport(true) },
              { ico: '📥', label: t('af_title'), run: () => setShowAutoFill(true) },
              { ico: '☁', label: t('cloud'), run: () => useCloud.getState().setOpen(true) },
            ] as Array<{ ico: string; label: string; run: () => void }>
          ).map((m) => (
            <button
              key={m.label}
              onClick={m.run}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-sans uppercase tracking-wide text-graphite-mid hover:text-graphite hover:bg-paper-2 border border-transparent hover:border-line rounded cursor-pointer whitespace-nowrap"
            >
              <span className="ico">{m.ico}</span>
              {m.label}
            </button>
          ))}
        </nav>
      )}

      <div className="flex-1 flex min-h-0">
        <Navigator />
        <main className="flex-1 flex flex-col min-w-0">
          {tabs.length > 0 && (
            <div className="h-[36px] shrink-0 border-b border-line bg-paper-2 flex items-stretch overflow-x-auto">
              {tabs.map((tb) => (
                <div
                  key={tb.key}
                  onClick={() => setActive(tb.key)}
                  className={`flex items-center gap-2 px-3 text-[12px] cursor-pointer border-r border-line max-w-[220px] ${
                    tb.key === active ? 'bg-paper text-graphite' : 'text-graphite-mid hover:bg-paper-3'
                  }`}
                >
                  <span className="truncate" title={tb.name}>{tb.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      close(tb.key)
                    }}
                    className="text-graphite-soft hover:text-e-4 shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-0">
            {!activeTab ? (
              <EmptyState>
                <div className="text-center">
                  <div className="text-[40px] mb-3 font-sans">∅</div>
                  <div>{t('empty_editor')}</div>
                  {status !== 'online' && (
                    <div className="mt-4 text-[12px] text-graphite-soft font-mono">{t('engine_hint')}</div>
                  )}
                </div>
              </EmptyState>
            ) : (
              <EditorFor type={activeTab.type} id={activeTab.id} />
            )}
          </div>
        </main>
      </div>

      <footer className="h-[26px] shrink-0 border-t border-line bg-paper-2 flex items-center px-4 gap-3 text-[11px] text-graphite-soft font-mono">
        <span className={`inline-block w-2 h-2 rounded-full ${status === 'online' ? 'bg-ok' : status === 'checking' ? 'bg-e-2' : 'bg-e-4'}`} />
        <span>
          {status === 'online' ? t('engine_online') : status === 'checking' ? t('engine_checking') : t('engine_offline')}
        </span>
        {summary && (
          <span>
            · {summary.processes.toLocaleString()} {t('nav_processes').toLowerCase()}
            {' · '}
            {summary.flows.toLocaleString()} {t('nav_flows').toLowerCase()}
            {' · '}
            {summary.impactCategories} LCIA
          </span>
        )}
        <div className="flex-1" />
        <span>openLCA IPC · JSON-RPC</span>
      </footer>

      {showDbManager && window.desktop && <DatabaseManager onClose={() => setShowDbManager(false)} />}

      {showGP && <GlobalParameters onClose={() => setShowGP(false)} />}

      {window.desktop && <CloudPanel />}

      {window.desktop && <AiPanel open={showAI} onClose={() => setShowAI(false)} />}
      {window.desktop && (
        <ScenarioBuilder
          open={showScenario}
          onClose={() => setShowScenario(false)}
          onOpenEntity={(type, id, name) => {
            setShowScenario(false)
            openTab({ key: tabKey(type, id), type, id, name })
          }}
        />
      )}
      {window.desktop && (
        <PlantWizard
          open={showPlant}
          onClose={() => setShowPlant(false)}
          onOpenEntity={(type, id, name) => {
            setShowPlant(false)
            openTab({ key: tabKey(type, id), type, id, name })
          }}
        />
      )}
      {window.desktop && <ReportStudio open={showReport} onClose={() => setShowReport(false)} />}
      {window.desktop && <AutoFill open={showAutoFill} onClose={() => setShowAutoFill(false)} />}

      {showSearch && (
        <GlobalSearch
          onClose={() => setShowSearch(false)}
          onOpen={(type, id, name) => {
            openTab({ key: tabKey(type, id), type, id, name })
            setShowSearch(false)
          }}
        />
      )}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={[
          { id: 'search', label: t('search_all'), hint: 'Ctrl+K', run: () => setShowSearch(true) },
          { id: 'ai', label: t('ai_title'), run: () => setShowAI(true) },
          { id: 'scenario', label: t('scenario_title'), run: () => setShowScenario(true) },
          { id: 'plant', label: t('pw_title'), run: () => setShowPlant(true) },
          { id: 'report', label: t('rs_title'), run: () => setShowReport(true) },
          { id: 'autofill', label: t('af_title'), run: () => setShowAutoFill(true) },
          { id: 'cloud', label: t('cloud'), run: () => useCloud.getState().setOpen(true) },
          {
            id: 'updates',
            label: t('up_title'),
            hint: upd === 'ready' ? t('up_install') : upd,
            run: async () => {
              const d = window.desktop!
              if (upd === 'ready') {
                await d.installUpdates()
                return
              }
              setUpd('check')
              const r = await d.checkUpdates()
              if (r && r.ok && r.version) {
                await d.downloadUpdates()
              } else if (r && r.ok) {
                const v = await d.appVersion().catch(() => '')
                toast.ok(`${t('up_latest')}: ${v}`)
              } else {
                setUpd('')
                toast.warn(`${t('up_title')}: ${r?.reason ?? 'error'}`)
              }
            },
          },
          { id: 'db', label: t('db_manager'), run: () => setShowDbManager(true) },
          { id: 'gp', label: t('nav_global_params'), run: () => setShowGP(true) },
          {
            id: 'theme',
            label: themeDark ? 'Switch to light theme' : 'Switch to dark theme',
            run: () => setThemeDark((d) => !d),
          },
        ]}
      />
      <Toasts />
    </div>
  )
}

function DbBadge({ onClick }: { onClick: () => void }) {
  const t = useI18n((s) => s.t)
  const [db, setDb] = useState('')
  useEffect(() => {
    let mounted = true
    const load = () => window.desktop?.dbList().then((r) => mounted && setDb(r.current)).catch(() => undefined)
    load()
    const off = window.desktop?.onDbChanged((d) => setDb(d.db))
    return () => {
      mounted = false
      off?.()
    }
  }, [])
  return (
    <button
      onClick={onClick}
      title={t('db_manager')}
      className="flex items-center gap-1.5 text-[11px] font-sans uppercase tracking-wide text-graphite-mid hover:text-graphite cursor-pointer border border-line px-2 py-1"
    >
      <span className="text-graphite-soft">▤</span>
      <span className="font-mono normal-case">{db || '…'}</span>
    </button>
  )
}

function EditorFor({ type, id }: { type: Tab['type']; id: string }) {
  switch (type) {
    case 'Process':
      return <ProcessEditor id={id} />
    case 'Project':
      return <ProjectEditor id={id} />
    case 'Flow':
      return <FlowEditor id={id} />
    case 'ImpactCategory':
      return <ImpactCategoryEditor id={id} />
    case 'ImpactMethod':
      return <ImpactMethodEditor id={id} />
    case 'UnitGroup':
      return <UnitGroupEditor id={id} />
    case 'DQSystem':
      return <DQSystemEditor id={id} />
    case 'ProductSystem':
      return <ProductSystemEditor id={id} />
    case 'Location':
    case 'Source':
    case 'Actor':
    case 'FlowProperty':
      return <SimpleEntityEditor type={type} id={id} />
    default:
      return <GenericEditor type={type} id={id} />
  }
}

function EngineBadge() {
  const status = useEngine((s) => s.status)
  const check = useEngine((s) => s.check)
  const t = useI18n((s) => s.t)
  const desktop = window.desktop
  if (status === 'online') {
    return (
      <span className="flex items-center gap-2">
        <span className="text-[11px] font-sans uppercase tracking-wide text-ok">● {t('engine_online')}</span>
        {desktop && (
          <button
            onClick={() => desktop.stopEngine()}
            className="text-[11px] font-sans text-graphite-soft hover:text-e-4 cursor-pointer"
            title={t('engine_stop')}
          >
            ■
          </button>
        )}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-2">
      <button
        onClick={check}
        className="text-[11px] font-sans uppercase tracking-wide text-e-ink hover:text-e-4 cursor-pointer"
        title={t('engine_hint')}
      >
        ● {status === 'checking' ? t('engine_checking') : t('engine_offline')}
      </button>
      {desktop && status === 'offline' && (
        <button
          onClick={() => desktop.startEngine()}
          className="text-[11px] font-sans uppercase tracking-wide text-ok hover:text-graphite cursor-pointer"
          title={t('engine_start')}
        >
          ▶ {t('engine_start')}
        </button>
      )}
    </span>
  )
}
