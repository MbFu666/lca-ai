import { useEffect, useMemo, useRef, useState } from 'react'
import type { Descriptor, EntityType } from '../api/types'
import { getDescriptorsCached } from '../api/entityCache'
import { useI18n } from '../i18n'
import { Spinner } from './ui/primitives'

const SEARCH_TYPES: Array<{ type: EntityType; labelKey: string }> = [
  { type: 'Process', labelKey: 'nav_processes' },
  { type: 'Flow', labelKey: 'nav_flows' },
  { type: 'ImpactMethod', labelKey: 'nav_methods' },
  { type: 'ImpactCategory', labelKey: 'nav_impact_categories' },
  { type: 'ProductSystem', labelKey: 'nav_systems' },
  { type: 'FlowProperty', labelKey: 'nav_flow_properties' },
  { type: 'UnitGroup', labelKey: 'nav_unit_groups' },
  { type: 'Source', labelKey: 'nav_sources' },
  { type: 'Actor', labelKey: 'nav_actors' },
  { type: 'Location', labelKey: 'nav_locations' },
]

const PER_TYPE = 5

interface Hit {
  type: EntityType
  labelKey: string
  d: Descriptor
}

export function GlobalSearch({
  onOpen,
  onClose,
}: {
  onOpen: (type: EntityType, id: string, name: string) => void
  onClose: () => void
}) {
  const t = useI18n((s) => s.t)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Map<EntityType, Descriptor[]> | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(async () => {
      const settled = await Promise.allSettled(
        SEARCH_TYPES.map(async ({ type }) => ({
          type,
          list: (await getDescriptorsCached(type)).filter((d) => d.name.toLowerCase().includes(q)),
        })),
      )
      if (cancelled) return
      const map = new Map<EntityType, Descriptor[]>()
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value.list.length > 0) {
          map.set(r.value.type, r.value.list.slice(0, PER_TYPE))
        }
      }
      setResults(map)
      setLoading(false)
      setSelected(0)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const hits = useMemo<Hit[]>(() => {
    if (!results) return []
    const out: Hit[] = []
    for (const { type, labelKey } of SEARCH_TYPES) {
      for (const d of results.get(type) ?? []) out.push({ type, labelKey, d })
    }
    return out
  }, [results])

  const openHit = (h: Hit) => {
    onOpen(h.type, h.d['@id'], h.d.name)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && hits[selected]) {
      openHit(hits[selected])
    }
  }

  let idx = -1

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-start justify-center pt-[12vh]" onClick={onClose}>
      <div
        className="bg-paper border border-line w-[640px] max-h-[70vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-line">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('search_all')}
            className="w-full px-3 py-2 bg-paper border border-line text-[14px] outline-none focus:border-graphite-mid"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-3"><Spinner label={t('loading')} /></div>}
          {!loading && results && hits.length === 0 && (
            <div className="p-4 text-[13px] text-graphite-soft text-center">{t('no_results')}</div>
          )}
          {!loading &&
            results &&
            SEARCH_TYPES.map(({ type, labelKey }) => {
              const list = results.get(type)
              if (!list) return null
              return (
                <div key={type}>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-sans uppercase tracking-widest text-graphite-soft">
                    {t(labelKey)}
                  </div>
                  {list.map((d) => {
                    idx++
                    const i = idx
                    return (
                      <button
                        key={`${type}:${d['@id']}`}
                        onClick={() => openHit({ type, labelKey, d })}
                        onMouseEnter={() => setSelected(i)}
                        className={`w-full px-3 py-1.5 text-left text-[13px] cursor-pointer truncate ${
                          i === selected ? 'bg-paper-3 text-graphite' : 'text-graphite-mid hover:bg-paper-2'
                        }`}
                        title={d.name}
                      >
                        {d.name}
                      </button>
                    )
                  })}
                </div>
              )
            })}
        </div>
        <div className="px-3 py-1.5 border-t border-line text-[10px] text-graphite-soft font-mono">
          ↑↓ · Enter · Esc
        </div>
      </div>
    </div>
  )
}
