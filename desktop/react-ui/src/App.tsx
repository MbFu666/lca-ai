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
import { UpdateOverlay } from './components/UpdateOverlay'
import { TitleTabs, type MenuGroup } from './components/TitleTabs'
import { Composer, type QuickCmd } from './components/Composer'
import { HistoryPanel } from './components/HistoryPanel'
import { Toasts } from './components/ui/charts'
import { toast } from './lib/toast'
import { useCloud } from './stores/cloud'
import { useTabs, tabKey, type Tab } from './stores/tabs'
import { useEngine } from './stores/engine'
import { useI18n, type Lang } from './i18n'
import { EmptyState } from './components/ui/primitives'

export default function App() {
  const t = useI18n((s) => s.t)
  const setLang = useI18n((s) => s.setLang)
  const { tabs, active, second, split, close, setActive, toggleSplit, setSecond } = useTabs()
  const openTab = useTabs((s) => s.open)
  const { status, check } = useEngine()
  const [showDbManager, setShowDbManager] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showGP, setShowGP] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [aiSeed, setAiSeed] = useState('')
  const [showScenario, setShowScenario] = useState(false)
  const [showPlant, setShowPlant] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showAutoFill, setShowAutoFill] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(() => localStorage.getItem('lcaai-sidebar') === 'hidden')
  const [themeDark, setThemeDark] = useState(() => localStorage.getItem('lcaai-theme') === 'dark')
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeDark)
  }, [themeDark])

  useEffect(() => {
    localStorage.setItem('lcaai-sidebar', sidebarHidden ? 'hidden' : 'shown')
  }, [sidebarHidden])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowSearch(true)
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        if (active) close(active)
      } else if (mod && !e.shiftKey && e.key === 'Tab') {
        e.preventDefault()
        if (tabs.length > 1) {
          const i = tabs.findIndex((x) => x.key === active)
          setActive(tabs[(i + 1) % tabs.length].key)
        }
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setSidebarHidden((h) => !h)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, tabs, close, setActive])

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

  const checkUpdates = async () => {
    const d = window.desktop!
    const r = await d.checkUpdates()
    if (r && r.ok && r.version) {
      // overlay picks up 'available' and shows the download popup
    } else if (r && r.ok) {
      const v = await d.appVersion().catch(() => '')
      toast.ok(`${t('up_latest')}: ${v}`)
    } else {
      toast.warn(`${t('up_title')}: ${r?.reason ?? 'error'}`)
    }
  }

  const menu: MenuGroup[] = [
    {
      group: t('menu_modules'),
      items: [
        { id: 'ai', label: `✦ ${t('ai_title')}`, run: () => setShowAI(true) },
        { id: 'scenario', label: `◈ ${t('scenario_title')}`, run: () => setShowScenario(true) },
        { id: 'plant', label: ` ${t('pw_title')}`, run: () => setShowPlant(true) },
        { id: 'report', label: `▤ ${t('rs_title')}`, run: () => setShowReport(true) },
        { id: 'autofill', label: `📥 ${t('af_title')}`, run: () => setShowAutoFill(true) },
        { id: 'cloud', label: `☁ ${t('cloud')}`, run: () => useCloud.getState().setOpen(true) },
      ],
    },
    {
      group: t('menu_view'),
      items: [
        { id: 'search', label: t('search_all'), hint: 'Ctrl+K', run: () => setShowSearch(true) },
        { id: 'palette', label: t('menu_palette'), hint: 'Ctrl+Shift+P', run: () => setPaletteOpen(true) },
        { id: 'history', label: t('hist_title'), run: () => setShowHistory(true) },
        { id: 'split', label: t('split_toggle'), run: () => toggleSplit() },
        { id: 'sidebar', label: t('sidebar_toggle'), hint: 'Ctrl+B', run: () => setSidebarHidden((h) => !h) },
        {
          id: 'theme',
          label: themeDark ? t('theme_light') : t('theme_dark'),
          run: () => setThemeDark((d) => !d),
        },
      ],
    },
    {
      group: t('menu_data'),
      items: [
        { id: 'db', label: t('db_manager'), run: () => setShowDbManager(true) },
        { id: 'gp', label: t('nav_global_params'), run: () => setShowGP(true) },
        {
          id: 'engine-start',
          label: `▶ ${t('engine_start')}`,
          run: () => {
            window.desktop?.startEngine()
          },
        },
        {
          id: 'engine-stop',
          label: `■ ${t('engine_stop')}`,
          run: () => {
            window.desktop?.stopEngine()
          },
        },
      ],
    },
    {
      group: t('menu_lang'),
      items: (['ru', 'en', 'zh'] as Lang[]).map((l) => ({
        id: `lang-${l}`,
        label: l === 'ru' ? 'Русский' : l === 'en' ? 'English' : '中文',
        run: () => setLang(l),
      })),
    },
    {
      group: t('menu_help'),
      items: [
        { id: 'updates', label: t('up_title'), run: () => void checkUpdates() },
        {
          id: 'about',
          label: t('menu_about'),
          run: () => {
            window.desktop?.appVersion().then((v) => toast.ok(`LCA·AI Studio ${v}`))
          },
        },
      ],
    },
  ]

  const quick: QuickCmd[] = [
    { id: 'ai', label: t('ai_title'), run: () => setShowAI(true) },
    { id: 'scenario', label: t('scenario_title'), run: () => setShowScenario(true) },
    { id: 'plant', label: t('pw_title'), run: () => setShowPlant(true) },
    { id: 'report', label: t('rs_title'), run: () => setShowReport(true) },
    { id: 'autofill', label: t('af_title'), run: () => setShowAutoFill(true) },
    { id: 'cloud', label: t('cloud'), run: () => useCloud.getState().setOpen(true) },
    { id: 'db', label: t('db_manager'), run: () => setShowDbManager(true) },
    { id: 'search', label: t('search_all'), run: () => setShowSearch(true) },
  ]

  const activeTab = tabs.find((tb) => tb.key === active) ?? null
  const secondTab = split ? (tabs.find((tb) => tb.key === second) ?? null) : null

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TitleTabs
        themeDark={themeDark}
        onToggleTheme={() => setThemeDark((d) => !d)}
        onSearch={() => setShowSearch(true)}
        onHistory={() => setShowHistory(true)}
        onToggleSplit={() => toggleSplit()}
        onToggleSidebar={() => setSidebarHidden((h) => !h)}
        sidebarHidden={sidebarHidden}
        menu={menu}
      />

      <div className="flex-1 flex min-h-0">
        {!sidebarHidden && window.desktop && <Navigator />}
        <main className="flex-1 flex min-w-0">
          <div className="flex-1 min-w-0 overflow-hidden">
            <EditorPane tab={activeTab} engineOffline={status !== 'online'} />
          </div>
          {split && (
            <div className="flex-1 min-w-0 overflow-hidden border-l border-line flex flex-col">
              {secondTab ? (
                <div className="flex-1 min-h-0">
                  <EditorPane tab={secondTab} engineOffline={status !== 'online'} />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  <div className="text-[11px] font-sans uppercase tracking-widest text-graphite-soft mb-2">
                    {t('split_pick')}
                  </div>
                  {tabs
                    .filter((x) => x.key !== active)
                    .map((x) => (
                      <button
                        key={x.key}
                        onClick={() => setSecond(x.key)}
                        className="w-full px-2 py-1 text-left text-[12px] text-graphite-mid hover:text-graphite hover:bg-paper-3 cursor-pointer truncate"
                      >
                        {x.name}
                      </button>
                    ))}
                </div>
              )}
              {secondTab && (
                <div className="shrink-0 border-t border-line px-2 py-1 flex items-center gap-2">
                  <select
                    value={second ?? ''}
                    onChange={(e) => setSecond(e.target.value || null)}
                    className="flex-1 min-w-0 bg-paper border border-line text-[11px] px-1 py-0.5 outline-none"
                  >
                    <option value="">—</option>
                    {tabs
                      .filter((x) => x.key !== active)
                      .map((x) => (
                        <option key={x.key} value={x.key}>
                          {x.name}
                        </option>
                      ))}
                  </select>
                  <button onClick={() => toggleSplit()} className="text-[11px] text-graphite-soft hover:text-e-4 cursor-pointer">
                    ×
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <Composer
        onAi={(p) => {
          setAiSeed(p)
          setShowAI(true)
        }}
        onAutoFill={() => setShowAutoFill(true)}
        onReport={() => setShowReport(true)}
        onOpenDb={() => setShowDbManager(true)}
        quick={quick}
      />

      {showDbManager && window.desktop && <DatabaseManager onClose={() => setShowDbManager(false)} />}

      {showGP && <GlobalParameters onClose={() => setShowGP(false)} />}

      {window.desktop && <CloudPanel />}

      {window.desktop && <AiPanel open={showAI} seed={aiSeed} onClose={() => setShowAI(false)} />}
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
      <HistoryPanel open={showHistory} onClose={() => setShowHistory(false)} />
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
          { id: 'updates', label: t('up_title'), run: () => void checkUpdates() },
          { id: 'db', label: t('db_manager'), run: () => setShowDbManager(true) },
          { id: 'gp', label: t('nav_global_params'), run: () => setShowGP(true) },
          {
            id: 'theme',
            label: themeDark ? t('theme_light') : t('theme_dark'),
            run: () => setThemeDark((d) => !d),
          },
        ]}
      />
      <Toasts />
      <UpdateOverlay />
    </div>
  )
}

function EditorPane({ tab, engineOffline }: { tab: Tab | null; engineOffline: boolean }) {
  const t = useI18n((s) => s.t)
  if (!tab) {
    return (
      <EmptyState>
        <div className="text-center">
          <div className="text-[40px] mb-3 font-sans">∅</div>
          <div>{t('empty_editor')}</div>
          {engineOffline && <div className="mt-4 text-[12px] text-graphite-soft font-mono">{t('engine_hint')}</div>}
        </div>
      </EmptyState>
    )
  }
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1200px] min-h-full">
        <EditorFor type={tab.type} id={tab.id} />
      </div>
    </div>
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
