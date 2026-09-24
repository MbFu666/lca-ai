import { useEffect, useMemo, useState } from 'react'
import type { DbInfo } from '../../types/desktop'
import type { Descriptor, EntityType } from '../../api/types'
import { getDescriptorsCached, invalidateDescriptors } from '../../api/entityCache'
import { getGlobalParameters, updateEntity } from '../../api/ipc'
import { useTabs, tabKey } from '../../stores/tabs'
import { useEngine } from '../../stores/engine'
import { useI18n } from '../../i18n'
import { Spinner } from '../ui/primitives'
import { FlowCreateDialog, ProcessCreateDialog } from '../CreateDialogs'
import { ImpactCategoryCreateDialog, ImpactMethodCreateDialog } from '../LciaDialogs'

interface SectionDef {
  type: EntityType
  labelKey: string
  color: string
  creatable?: boolean
}

const TOP: SectionDef[] = [
  { type: 'Project', labelKey: 'nav_projects', color: '#4a90d9', creatable: true },
  { type: 'ProductSystem', labelKey: 'nav_systems', color: '#5b8dd9' },
  { type: 'Process', labelKey: 'nav_processes', color: '#9b59b6', creatable: true },
  { type: 'Flow', labelKey: 'nav_flows', color: '#2ecc71', creatable: true },
  { type: 'EPD', labelKey: 'nav_epds', color: '#f1c40f' },
  { type: 'Result', labelKey: 'nav_results', color: '#f39c12' },
]

const INDICATORS: SectionDef[] = [
  { type: 'ImpactMethod', labelKey: 'nav_methods', color: '#7ed321', creatable: true },
  { type: 'ImpactCategory', labelKey: 'nav_impact_categories', color: '#27ae60', creatable: true },
  { type: 'SocialIndicator', labelKey: 'nav_social_indicators', color: '#e67e22' },
  { type: 'Parameter', labelKey: 'nav_global_params', color: '#e74c3c' },
  { type: 'DQSystem', labelKey: 'nav_dq_systems', color: '#16a085', creatable: true },
]

const BACKGROUND: SectionDef[] = [
  { type: 'FlowProperty', labelKey: 'nav_flow_properties', color: '#a0522d' },
  { type: 'UnitGroup', labelKey: 'nav_unit_groups', color: '#4682b4' },
  { type: 'Currency', labelKey: 'nav_currencies', color: '#2e8b57' },
  { type: 'Actor', labelKey: 'nav_actors', color: '#5f9ea0' },
  { type: 'Source', labelKey: 'nav_sources', color: '#708090' },
  { type: 'Location', labelKey: 'nav_locations', color: '#1f77b4' },
]

const DISPLAY_LIMIT = 500

export function Navigator() {
  const t = useI18n((s) => s.t)
  const openTab = useTabs((s) => s.open)
  const dbVersion = useEngine((s) => s.dbVersion)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    top: true,
    indicators: true,
    background: true,
  })
  const [expanded, setExpanded] = useState<EntityType | null>('Process')
  const [data, setData] = useState<Record<string, Descriptor[]>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<EntityType | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState<EntityType | null>(null)
  const [dbs, setDbs] = useState<DbInfo[]>([])

  useEffect(() => {
    if (!window.desktop) return
    const load = () => window.desktop!.dbList().then((r) => setDbs(r.databases)).catch(() => undefined)
    load()
    const off = window.desktop.onDbChanged(() => load())
    return off
  }, [])

  useEffect(() => {
    if (dbVersion === 0) return
    invalidateDescriptors()
    setData({})
    setCounts({})
    setQuery('')
  }, [dbVersion])

  const loadSection = async (def: SectionDef, force = false) => {
    setExpanded(def.type)
    setError('')
    if (force) invalidateDescriptors(def.type)
    setLoading(def.type)
    try {
      const descriptors =
        def.type === 'Parameter' ? await getGlobalParameters() : await getDescriptorsCached(def.type)
      setData((d) => ({ ...d, [def.type]: descriptors }))
      setCounts((c) => ({ ...c, [def.type]: descriptors.length }))
    } catch {
      setData((d) => ({ ...d, [def.type]: [] }))
      setCounts((c) => ({ ...c, [def.type]: 0 }))
    } finally {
      setLoading(null)
    }
  }

  const filtered = useMemo(() => {
    if (!expanded) return []
    const list = data[expanded] ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list.slice(0, DISPLAY_LIMIT)
    return list.filter((d) => d.name.toLowerCase().includes(q)).slice(0, DISPLAY_LIMIT)
  }, [expanded, data, query])

  const activeDb = dbs.find((d) => d.active)

  const createProject = async () => {
    const id = crypto.randomUUID()
    const name = 'New project'
    try {
      await updateEntity('Project', { '@type': 'Project', '@id': id, name, variants: [] })
      invalidateDescriptors('Project')
      openTab({ key: tabKey('Project', id), type: 'Project', id, name })
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    }
  }

  const createDQSystem = async () => {
    const id = crypto.randomUUID()
    const name = 'New data quality system'
    const labels = ['Very high', 'High', 'Medium', 'Low', 'Very low']
    const indicators = [
      'Reliability',
      'Completeness',
      'Temporal correlation',
      'Geographical correlation',
      'Further technological correlation',
    ].map((indName, i) => ({
      name: indName,
      position: i + 1,
      scores: labels.map((label, j) => ({ position: j + 1, label, description: '' })),
    }))
    try {
      await updateEntity('DQSystem', { '@type': 'DQSystem', '@id': id, name, indicators })
      invalidateDescriptors('DQSystem')
      openTab({ key: tabKey('DQSystem', id), type: 'DQSystem', id, name })
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    }
  }

  const renderGroup = (key: string, label: string, defs: SectionDef[]) => (
    <div key={key}>
      <button
        onClick={() => setOpenGroups((g) => ({ ...g, [key]: !g[key] }))}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-[12px] font-sans uppercase tracking-wide text-graphite hover:bg-paper-3 cursor-pointer"
      >
        <span className="text-[13px] w-3">{openGroups[key] ? '▾' : '▸'}</span>
        <span className="text-graphite-soft">▦</span>
        <span className="flex-1 truncate">{label}</span>
      </button>
      {openGroups[key] && <div className="pl-3">{defs.map((def) => renderSection(def))}</div>}
    </div>
  )

  const renderSection = (def: SectionDef) => {
    const isOpen = expanded === def.type
    const count = counts[def.type]
    return (
      <div key={def.type}>
        <div className="flex items-center">
          <button
            onClick={() => (isOpen ? setExpanded(null) : loadSection(def))}
            title={t(def.labelKey)}
            className={`flex-1 flex items-center gap-2 px-2 py-1.5 text-left text-[13px] cursor-pointer hover:bg-paper-3 ${
              isOpen ? 'text-graphite' : 'text-graphite-mid'
            }`}
          >
            <span className="text-[13px] w-3">{isOpen ? '▾' : '▸'}</span>
            <span className="inline-block w-2.5 h-2.5 shrink-0" style={{ background: def.color }} />
            <span className="flex-1 truncate">{t(def.labelKey)}</span>
            {count !== undefined && <span className="text-[11px] text-graphite-soft font-mono">{count}</span>}
          </button>
          {def.creatable && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (def.type === 'Project') createProject()
                else if (def.type === 'DQSystem') createDQSystem()
                else setCreating(def.type)
              }}
              title={
                def.type === 'Process'
                  ? t('new_process')
                  : def.type === 'Flow'
                    ? t('new_flow')
                    : def.type === 'ImpactMethod'
                      ? t('new_method')
                      : def.type === 'Project'
                        ? t('nav_projects')
                        : def.type === 'DQSystem'
                          ? t('nav_dq_systems')
                          : t('new_category')
              }
              className="px-2 py-1 text-[13px] text-graphite-soft hover:text-ok cursor-pointer"
            >
              +
            </button>
          )}
        </div>

        {isOpen && (
          <div className="pb-1">
            {loading === def.type && <div className="px-4 py-2"><Spinner label={t('loading')} /></div>}
            {error && <div className="px-4 py-2 text-[12px] text-e-ink">{error}</div>}
            {filtered.map((d) => (
              <button
                key={d['@id']}
                onClick={() => openTab({ key: tabKey(def.type, d['@id']), type: def.type, id: d['@id'], name: d.name })}
                title={d.name}
                className="w-full px-4 py-1 text-left text-[13px] text-graphite-mid hover:text-graphite hover:bg-paper-3 cursor-pointer truncate"
              >
                {d.name}
              </button>
            ))}
            {data[def.type] && filtered.length === 0 && (
              <div className="px-4 py-2 text-[12px] text-graphite-soft">{t('no_results')}</div>
            )}
            {data[def.type] && data[def.type].length > DISPLAY_LIMIT && query.trim() === '' && (
              <div className="px-4 py-1 text-[11px] text-graphite-soft">
                {DISPLAY_LIMIT} {t('items_shown')} / {data[def.type].length} {t('items_total')} — {t('refine_search')}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="w-[300px] shrink-0 border-r border-line bg-paper-2 flex flex-col h-full">
      <div className="p-2 border-b border-line">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search_placeholder')}
          className="w-full px-2.5 py-1.5 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeDb && (
          <div className="flex items-center gap-2 px-2 py-2 text-[13px] font-sans text-graphite border-b border-line">
            <span className="text-graphite-soft">🗄</span>
            <span className="flex-1 truncate font-mono text-[12px]">{activeDb.name}</span>
          </div>
        )}
        <div>{TOP.map((def) => renderSection(def))}</div>
        {renderGroup('indicators', t('group_indicators'), INDICATORS)}
        {renderGroup('background', t('group_background'), BACKGROUND)}
      </div>

      {window.desktop && dbs.filter((d) => !d.active).length > 0 && (
        <div className="border-t border-line">
          {dbs
            .filter((d) => !d.active)
            .map((d) => (
              <button
                key={d.name}
                onClick={() => window.desktop!.dbSwitch(d.name)}
                title={`${t('db_switch')}: ${d.name}`}
                className="w-full flex items-center gap-2 px-2 py-2 text-left text-[12px] font-mono text-graphite-mid hover:text-graphite hover:bg-paper-3 cursor-pointer"
              >
                <span className="text-graphite-soft">🗄</span>
                <span className="flex-1 truncate">{d.name}</span>
                {d.isBase && <span className="text-[9px] font-sans uppercase text-ok">{t('db_base')}</span>}
              </button>
            ))}
        </div>
      )}

      {creating === 'Process' && (
        <ProcessCreateDialog
          onClose={() => setCreating(null)}
          onCreated={(id, name) => {
            setCreating(null)
            loadSection({ type: 'Process', labelKey: 'nav_processes', color: '', creatable: true }, true)
            openTab({ key: tabKey('Process', id), type: 'Process', id, name })
          }}
        />
      )}
      {creating === 'Flow' && (
        <FlowCreateDialog
          onClose={() => setCreating(null)}
          onCreated={(f) => {
            setCreating(null)
            loadSection({ type: 'Flow', labelKey: 'nav_flows', color: '', creatable: true }, true)
            openTab({ key: tabKey('Flow', f.id), type: 'Flow', id: f.id, name: f.name })
          }}
        />
      )}
      {creating === 'ImpactCategory' && (
        <ImpactCategoryCreateDialog
          onClose={() => setCreating(null)}
          onCreated={(id, name) => {
            setCreating(null)
            loadSection({ type: 'ImpactCategory', labelKey: 'nav_impact_categories', color: '', creatable: true }, true)
            openTab({ key: tabKey('ImpactCategory', id), type: 'ImpactCategory', id, name })
          }}
        />
      )}
      {creating === 'ImpactMethod' && (
        <ImpactMethodCreateDialog
          onClose={() => setCreating(null)}
          onCreated={(id, name) => {
            setCreating(null)
            loadSection({ type: 'ImpactMethod', labelKey: 'nav_methods', color: '', creatable: true }, true)
            openTab({ key: tabKey('ImpactMethod', id), type: 'ImpactMethod', id, name })
          }}
        />
      )}
    </aside>
  )
}
