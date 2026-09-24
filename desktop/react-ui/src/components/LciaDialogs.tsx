import { useEffect, useMemo, useState } from 'react'
import type { Descriptor } from '../api/types'
import { updateEntity } from '../api/ipc'
import { getDescriptorsCached, invalidateDescriptors } from '../api/entityCache'
import { useI18n } from '../i18n'
import { Button, ErrorBox, Spinner } from './ui/primitives'

const INPUT_CLASS =
  'w-full px-2.5 py-1.5 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid'

export function CategoryPicker({
  onPick,
  onClose,
}: {
  onPick: (d: Descriptor) => void
  onClose: () => void
}) {
  const t = useI18n((s) => s.t)
  const [all, setAll] = useState<Descriptor[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    getDescriptorsCached('ImpactCategory')
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
          <h3 className="text-[14px] font-sans uppercase tracking-widest">{t('pick_category')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">×</button>
        </div>
        <div className="p-3 border-b border-line">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className={INPUT_CLASS}
          />
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

export function ImpactCategoryCreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: string, name: string) => void
}) {
  const t = useI18n((s) => s.t)
  const [name, setName] = useState('')
  const [refUnit, setRefUnit] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      const id = crypto.randomUUID()
      await updateEntity('ImpactCategory', {
        '@type': 'ImpactCategory',
        '@id': id,
        name: name.trim(),
        version: '01.00.000',
        lastChange: new Date().toISOString(),
        refUnit: refUnit.trim() || 'kg',
        impactFactors: [],
      })
      invalidateDescriptors('ImpactCategory')
      onCreated(id, name.trim())
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-paper border border-line w-[480px] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">{t('new_category')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">×</button>
        </div>
        <div className="p-4 space-y-3">
          {error && <ErrorBox message={error} />}
          <label className="block">
            <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">{t('name')}</div>
            <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} autoFocus />
          </label>
          <label className="block">
            <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">
              {t('reference_unit')}
            </div>
            <input value={refUnit} onChange={(e) => setRefUnit(e.target.value)} placeholder="kg CO2-Equivalents" className={INPUT_CLASS} />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>{t('db_cancel')}</Button>
            <Button onClick={create} disabled={busy || !name.trim()}>
              {busy ? t('loading') : t('db_create')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ImpactMethodCreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: string, name: string) => void
}) {
  const t = useI18n((s) => s.t)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      const id = crypto.randomUUID()
      await updateEntity('ImpactMethod', {
        '@type': 'ImpactMethod',
        '@id': id,
        name: name.trim(),
        version: '01.00.000',
        lastChange: new Date().toISOString(),
        impactCategories: [],
      })
      invalidateDescriptors('ImpactMethod')
      onCreated(id, name.trim())
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-paper border border-line w-[480px] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">{t('new_method')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">×</button>
        </div>
        <div className="p-4 space-y-3">
          {error && <ErrorBox message={error} />}
          <label className="block">
            <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">{t('name')}</div>
            <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} autoFocus />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>{t('db_cancel')}</Button>
            <Button onClick={create} disabled={busy || !name.trim()}>
              {busy ? t('loading') : t('db_create')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
