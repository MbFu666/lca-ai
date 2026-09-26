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
import { SettingsDialog } from './components/SettingsDialog'
import { AboutDialog } from './components/AboutDialog'
import { TitleTabs, type ModuleButton } from './components/TitleTabs'
import { type MenuBarColumn } from './components/MenuBar'
import { DbPickerDialog } from './components/DbPickerDialog'
import { HistoryPanel } from './components/HistoryPanel'
import { HomeView } from './components/HomeView'
import { Toasts } from './components/ui/charts'
import { toast } from './lib/toast'
import { createProjectSession } from './lib/session'
import { useCloud } from './stores/cloud'
import { useHistory } from './stores/history'
import { useTabs, tabKey, type Tab } from './stores/tabs'
import { useI18n } from './i18n'
import { EmptyState } from './components/ui/primitives'

export default function App() {
  const t = useI18n((s) => s.t)
  const { tabs, active, second, split, close, closeAll, setActive, toggleSplit, setSecond } = useTabs()
  const openTab = useTabs((s) => s.open)
  const [showDbManager, setShowDbManager] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showGP, setShowGP] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showScenario, setShowScenario] = useState(false)
  const [showPlant, setShowPlant] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showAutoFill, setShowAutoFill] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [dbPicker, setDbPicker] = useState<'create' | 'open' | null>(null)
  const [sidebarHidden, setSidebarHidden] = useState(() => localStorage.getItem('lcaai-sidebar') === 'hidden')
  const [themeDark, setThemeDark] = useState(() => localStorage.getItem('lcaai-theme') === 'dark')
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeDark)
  }, [themeDark])

  useEffect(() => {
    localStorage.setItem('lcaai-sidebar', sidebarHidden ? 'hidden' : 'shown')
  }, [sidebarHidden])

  // History = database-open history (user requirement).
  useEffect(() => {
    if (!window.desktop) return
    let mounted = true
    const record = (name: string) => {
      if (name) useHistory.getState().push({ type: 'DB', id: name, name })
    }
    window.desktop
      .dbList()
      .then((r) => mounted && record(r.current))
      .catch(() => undefined)
    const off = window.desktop.onDbChanged((d) => record(d.db))
    return () => {
      mounted = false
      off?.()
    }
  }, [])

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

  // Single action bus: hamburger menu, native Electron menu (menu:action) and hotkeys.
  const runAction = (id: string) => {
    switch (id) {
      case 'new-session':
        closeAll()
        createProjectSession().catch((e) => toast.err(String(e instanceof Error ? e.message : e)))
        break
      case 'close-all-tabs':
        closeAll()
        break
      case 'open-project':
        useCloud.getState().setOpen(true)
        break
      case 'settings':
        setShowSettings(true)
        break
      case 'new-window':
        window.desktop?.newWindow()
        break
      case 'close-window':
        window.desktop?.winClose()
        break
      case 'search':
        setShowSearch(true)
        break
      case 'palette':
        setPaletteOpen(true)
        break
      case 'history':
        setShowHistory(true)
        break
      case 'split':
        toggleSplit()
        break
      case 'sidebar':
        setSidebarHidden((h) => !h)
        break
      case 'theme':
        setThemeDark((d) => !d)
        break
      case 'ai':
        setShowAI(true)
        break
      case 'scenario':
        setShowScenario(true)
        break
      case 'plant':
        setShowPlant(true)
        break
      case 'report':
        setShowReport(true)
        break
      case 'autofill':
        setShowAutoFill(true)
        break
      case 'cloud':
        useCloud.getState().setOpen(true)
        break
      case 'db':
        setShowDbManager(true)
        break
      case 'gp':
        setShowGP(true)
        break
      case 'updates':
        void checkUpdates()
        break
      case 'about':
        setShowAbout(true)
        break
      case 'create-db':
        setDbPicker('create')
        break
      case 'open-db':
        setDbPicker('open')
        break
      case 'undo':
      case 'redo':
      case 'cut':
      case 'copy':
      case 'paste':
      case 'delete':
      case 'selectall':
        window.desktop?.editAction(id)
        break
      case 'reload':
      case 'devtools':
      case 'zoomin':
      case 'zoomout':
      case 'zoom0':
      case 'fullscreen':
        window.desktop?.viewAction(id)
        break
      case 'minimize':
        window.desktop?.winMinimize()
        break
      case 'maximize':
        window.desktop?.winMaximize()
        break
      default:
        break
    }
  }

  useEffect(() => {
    return window.desktop?.onMenuAction(runAction)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        runAction('new-session')
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        runAction('new-window')
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowSearch(true)
      } else if (mod && !e.shiftKey && e.key === ',') {
        e.preventDefault()
        setShowSettings(true)
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
  })

  const columns: MenuBarColumn[] = [
    {
      id: 'file',
      label: t('menu_file'),
      items: [
        { id: 'new-session', label: t('file_new_session'), hint: 'Ctrl+Shift+S', run: () => runAction('new-session') },
        { id: 'close-all-tabs', label: t('file_close_all_tabs'), run: () => runAction('close-all-tabs') },
        { id: 'sep-1', label: '', separator: true },
        { id: 'create-db', label: t('file_create_db'), run: () => runAction('create-db') },
        { id: 'open-db', label: t('file_open_db'), run: () => runAction('open-db') },
        { id: 'sep-2', label: '', separator: true },
        { id: 'settings', label: t('file_settings'), hint: 'Ctrl+,', run: () => runAction('settings') },
        { id: 'new-window', label: t('file_new_window'), hint: 'Ctrl+Shift+N', run: () => runAction('new-window') },
        { id: 'close-window', label: t('file_close_window'), run: () => runAction('close-window') },
      ],
    },
    {
      id: 'edit',
      label: t('menu_edit'),
      items: [
        { id: 'undo', label: t('edit_undo'), hint: 'Ctrl+Z', run: () => runAction('undo') },
        { id: 'redo', label: t('edit_redo'), hint: 'Ctrl+Y', run: () => runAction('redo') },
        { id: 'sep-1', label: '', separator: true },
        { id: 'cut', label: t('edit_cut'), hint: 'Ctrl+X', run: () => runAction('cut') },
        { id: 'copy', label: t('edit_copy'), hint: 'Ctrl+C', run: () => runAction('copy') },
        { id: 'paste', label: t('edit_paste'), hint: 'Ctrl+V', run: () => runAction('paste') },
        { id: 'delete', label: t('edit_delete'), run: () => runAction('delete') },
        { id: 'selectall', label: t('edit_select_all'), hint: 'Ctrl+A', run: () => runAction('selectall') },
      ],
    },
    {
      id: 'view',
      label: t('menu_view'),
      items: [
        { id: 'sidebar', label: t('sidebar_toggle'), hint: 'Ctrl+B', run: () => runAction('sidebar') },
        { id: 'split', label: t('split_toggle'), run: () => runAction('split') },
        { id: 'history', label: t('hist_title'), run: () => runAction('history') },
        { id: 'theme', label: themeDark ? t('theme_light') : t('theme_dark'), run: () => runAction('theme') },
        { id: 'sep-1', label: '', separator: true },
        { id: 'reload', label: t('view_reload'), run: () => runAction('reload') },
        { id: 'devtools', label: t('view_devtools'), run: () => runAction('devtools') },
        { id: 'sep-2', label: '', separator: true },
        { id: 'zoom0', label: t('view_zoom0'), hint: 'Ctrl+0', run: () => runAction('zoom0') },
        { id: 'zoomin', label: t('view_zoomin'), hint: 'Ctrl++', run: () => runAction('zoomin') },
        { id: 'zoomout', label: t('view_zoomout'), hint: 'Ctrl+-', run: () => runAction('zoomout') },
        { id: 'sep-3', label: '', separator: true },
        { id: 'fullscreen', label: t('view_fullscreen'), run: () => runAction('fullscreen') },
      ],
    },
    {
      id: 'window',
      label: t('menu_window'),
      items: [
        { id: 'minimize', label: t('win_minimize'), run: () => runAction('minimize') },
        { id: 'maximize', label: t('win_maximize'), run: () => runAction('maximize') },
        { id: 'sep-1', label: '', separator: true },
        { id: 'close-all-tabs', label: t('file_close_all_tabs'), run: () => runAction('close-all-tabs') },
        { id: 'close-window', label: t('file_close_window'), run: () => runAction('close-window') },
      ],
    },
    {
      id: 'help',
      label: t('menu_help'),
      items: [
        { id: 'about', label: t('about_title'), run: () => runAction('about') },
        { id: 'updates', label: t('up_title'), run: () => runAction('updates') },
      ],
    },
  ]

  const modules: ModuleButton[] = [
    { id: 'ai', ico: '✦', label: t('ai_title'), run: () => runAction('ai') },
    { id: 'scenario', ico: '◈', label: t('scenario_title'), run: () => runAction('scenario') },
    { id: 'plant', ico: '⌂', label: t('pw_title'), run: () => runAction('plant') },
    { id: 'report', ico: '▤', label: t('rs_title'), run: () => runAction('report') },
    { id: 'autofill', ico: '📥', label: t('af_title'), run: () => runAction('autofill') },
    { id: 'cloud', ico: '☁', label: t('cloud'), run: () => runAction('cloud') },
    { id: 'db', ico: '🗄', label: t('db_manager'), run: () => runAction('db') },
    { id: 'gp', ico: 'ƒ', label: t('nav_global_params'), run: () => runAction('gp') },
  ]

  const activeTab = tabs.find((tb) => tb.key === active) ?? null
  const secondTab = split ? (tabs.find((tb) => tb.key === second) ?? null) : null

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TitleTabs
        columns={columns}
        modules={modules}
        themeDark={themeDark}
        onToggleTheme={() => setThemeDark((d) => !d)}
        onSearch={() => setShowSearch(true)}
        onHistory={() => setShowHistory(true)}
        onToggleSplit={() => toggleSplit()}
        onToggleSidebar={() => setSidebarHidden((h) => !h)}
        sidebarHidden={sidebarHidden}
      />

      <div className="flex-1 flex min-h-0">
        {!sidebarHidden && window.desktop && <Navigator />}
        <main className="flex-1 flex min-w-0">
          <div className="flex-1 min-w-0 overflow-hidden">
            <EditorPane
              tab={activeTab}
              onSearch={() => setShowSearch(true)}
              onCreateDb={() => setDbPicker('create')}
            />
          </div>
          {split && (
            <div className="flex-1 min-w-0 overflow-hidden border-l border-line flex flex-col">
              {secondTab ? (
                <div className="flex-1 min-h-0">
                  <EditorPane
                    tab={secondTab}
                    onSearch={() => setShowSearch(true)}
                    onCreateDb={() => setDbPicker('create')}
                  />
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
      <HistoryPanel open={showHistory} onClose={() => setShowHistory(false)} />
      {dbPicker && <DbPickerDialog mode={dbPicker} onClose={() => setDbPicker(null)} />}
      <SettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        themeDark={themeDark}
        onToggleTheme={() => setThemeDark((d) => !d)}
      />
      <AboutDialog open={showAbout} onClose={() => setShowAbout(false)} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={[
          { id: 'search', label: t('search_all'), hint: 'Ctrl+K', run: () => setShowSearch(true) },
          { id: 'new-session', label: t('file_new_session'), hint: 'Ctrl+Shift+S', run: () => runAction('new-session') },
          { id: 'close-all-tabs', label: t('file_close_all_tabs'), run: () => runAction('close-all-tabs') },
          { id: 'settings', label: t('file_settings'), hint: 'Ctrl+,', run: () => setShowSettings(true) },
          { id: 'ai', label: t('ai_title'), run: () => setShowAI(true) },
          { id: 'scenario', label: t('scenario_title'), run: () => setShowScenario(true) },
          { id: 'plant', label: t('pw_title'), run: () => setShowPlant(true) },
          { id: 'report', label: t('rs_title'), run: () => setShowReport(true) },
          { id: 'autofill', label: t('af_title'), run: () => setShowAutoFill(true) },
          { id: 'cloud', label: t('cloud'), run: () => useCloud.getState().setOpen(true) },
          { id: 'updates', label: t('up_title'), run: () => void checkUpdates() },
          { id: 'db', label: t('db_manager'), run: () => setShowDbManager(true) },
          { id: 'gp', label: t('nav_global_params'), run: () => setShowGP(true) },
          { id: 'about', label: t('about_title'), run: () => setShowAbout(true) },
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

function EditorPane({
  tab,
  onSearch,
  onCreateDb,
}: {
  tab: Tab | null
  onSearch: () => void
  onCreateDb: () => void
}) {
  const t = useI18n((s) => s.t)
  if (!tab) {
    if (window.desktop) return <HomeView onSearch={onSearch} onCreateDb={onCreateDb} />
    return (
      <EmptyState>
        <div className="text-center">
          <div className="text-[40px] mb-3 font-sans">∅</div>
          <div>{t('empty_editor')}</div>
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
