import { useEffect, useMemo, useState } from 'react'
import type { Descriptor } from '../api/types'
import { getDescriptorsCached } from '../api/entityCache'
import { useI18n } from '../i18n'
import { Spinner } from './ui/primitives'

export function FlowPicker({
  onPick,
  onClose,
  allowCreate,
  onCreateRequest,
}: {
  onPick: (d: Descriptor) => void
  onClose: () => void
  allowCreate?: boolean
  onCreateRequest?: () => void
}) {
  const t = useI18n((s) => s.t)
  const [all, setAll] = useState<Descriptor[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    getDescriptorsCached('Flow')
      .then(setAll)
      .catch((e) => setError(String(e instanceof Error ? e.message : e)))
  }, [])

  const filtered = useMemo(() => {
    if (!all) return []
    const q = query.trim().toLowerCase()
    const list = q ? all.filter((d) => d.name.toLowerCase().includes(q)) : all
    return list.slice(0, 300)
  }, [all, query])

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-paper border border-line w-[680px] max-h-[75vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">{t('pick_flow')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">×</button>
        </div>
        <div className="p-3 border-b border-line flex gap-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="flex-1 px-2.5 py-1.5 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid"
          />
          {allowCreate && onCreateRequest && (
            <button
              onClick={onCreateRequest}
              className="px-3 py-1.5 text-[12px] font-sans uppercase tracking-wide border border-line text-graphite hover:bg-paper-2 cursor-pointer"
            >
              + {t('new_flow')}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {error && <div className="p-3 text-[12px] text-e-ink font-mono">{error}</div>}
          {!all && !error && <div className="p-3"><Spinner label={t('loading')} /></div>}
          {all && (
            <table className="w-full text-[12px] border-collapse">
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={d['@id']}
                    className="border-t border-line cursor-pointer hover:bg-paper-2"
                    onClick={() => onPick(d)}
                  >
                    <td className="py-1.5 px-3">
                      <div className="truncate max-w-[600px]" title={d.name}>{d.name}</div>
                      {d.description && (
                        <div className="text-[10px] text-graphite-soft truncate">{d.description.slice(0, 120)}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {all && filtered.length === 0 && (
            <div className="p-4 text-[13px] text-graphite-soft text-center">{t('no_results')}</div>
          )}
        </div>
      </div>
    </div>
  )
}
