import { useCallback, useEffect, useState } from 'react'
import type { UnitDetail, UnitGroupDetail } from '../../api/types'
import { deleteEntity, getEntity, updateEntity } from '../../api/ipc'
import { invalidateDescriptors } from '../../api/entityCache'
import { useI18n } from '../../i18n'
import { useTabs, tabKey } from '../../stores/tabs'
import { Button, ErrorBox, Field, Spinner } from '../ui/primitives'

const INPUT_CLASS =
  'w-full px-2 py-1 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid'

export function UnitGroupEditor({ id }: { id: string }) {
  const t = useI18n((s) => s.t)
  const closeTab = useTabs((s) => s.close)
  const [draft, setDraft] = useState<UnitGroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setDraft(await getEntity<UnitGroupDetail>('UnitGroup', id))
      setDirty(false)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const units = draft?.units ?? []

  const patchUnit = (idx: number, p: Partial<UnitDetail>) => {
    if (!draft) return
    setDraft({ ...draft, units: units.map((u, i) => (i === idx ? { ...u, ...p } : u)) })
    setDirty(true)
  }

  const addUnit = () => {
    if (!draft) return
    setDraft({
      ...draft,
      units: [
        ...units,
        { '@type': 'Unit', name: '', conversionFactor: 1, isRefUnit: units.length === 0 },
      ],
    })
    setDirty(true)
  }

  const removeUnit = (idx: number) => {
    if (!draft) return
    setDraft({ ...draft, units: units.filter((_, i) => i !== idx) })
    setDirty(true)
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      await updateEntity('UnitGroup', draft)
      invalidateDescriptors('UnitGroup')
      setDirty(false)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setError('')
    try {
      await deleteEntity('UnitGroup', id)
      invalidateDescriptors('UnitGroup')
      closeTab(tabKey('UnitGroup', id))
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setConfirmDelete(false)
    }
  }

  if (loading) return <div className="p-6"><Spinner label={t('loading')} /></div>
  if (!draft) return <div className="p-6"><ErrorBox message={error || 'Not found'} onRetry={load} /></div>

  const category = typeof draft.category === 'string' ? draft.category : (draft.category?.name ?? '—')

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-[1000px]">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-sans uppercase tracking-widest text-graphite-soft mb-1">
              {t('nav_unit_groups')}
            </div>
            <h2 className="text-[22px] leading-tight">{draft.name}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {savedFlash && <span className="text-[12px] text-ok">{t('saved')}</span>}
            {confirmDelete ? (
              <span className="flex items-center gap-2">
                <Button variant="danger" onClick={remove}>{t('db_confirm')}</Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>{t('db_cancel')}</Button>
              </span>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)}>{t('delete')}</Button>
            )}
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? t('loading') : t('save')}
            </Button>
          </div>
        </div>

        {error && <div className="mb-4"><ErrorBox message={error} /></div>}

        <section className="mb-8">
          <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid border-b border-line pb-1.5 mb-3">
            {t('general_info')}
          </h3>
          <Field label={t('name')}>
            <input
              value={draft.name}
              onChange={(e) => {
                setDraft({ ...draft, name: e.target.value })
                setDirty(true)
              }}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label={t('category')}>{category}</Field>
          <Field label={t('description')}>
            <textarea
              value={draft.description ?? ''}
              onChange={(e) => {
                setDraft({ ...draft, description: e.target.value })
                setDirty(true)
              }}
              rows={3}
              className={INPUT_CLASS}
            />
          </Field>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between border-b border-line pb-1.5 mb-3">
            <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid">
              {t('units')} ({units.length})
            </h3>
            <button onClick={addUnit} className="text-[12px] font-sans text-graphite-mid hover:text-graphite cursor-pointer">
              + {t('add_property')}
            </button>
          </div>
          {units.length === 0 ? (
            <div className="text-[13px] text-graphite-soft py-2">—</div>
          ) : (
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
                  <th className="py-1.5 pr-3 font-medium w-[160px]">{t('unit')}</th>
                  <th className="py-1.5 pr-3 font-medium w-[180px] text-right">{t('conversion_factor')}</th>
                  <th className="py-1.5 pr-3 font-medium w-[90px] text-center">{t('ref')}</th>
                  <th className="py-1.5 pr-3 font-medium">{t('description')}</th>
                  <th className="py-1.5 font-medium w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {units.map((u, i) => (
                  <tr key={u['@id'] ?? i} className="border-t border-line">
                    <td className="py-1.5 pr-3">
                      <input
                        value={u.name}
                        onChange={(e) => patchUnit(i, { name: e.target.value })}
                        className={INPUT_CLASS}
                      />
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      <input
                        type="number"
                        step="any"
                        value={u.conversionFactor ?? 1}
                        onChange={(e) => patchUnit(i, { conversionFactor: Number(e.target.value) })}
                        className="w-[150px] px-2 py-1 bg-paper border border-line font-mono text-[12px] outline-none focus:border-graphite-mid text-right"
                      />
                    </td>
                    <td className="py-1.5 pr-3 text-center">
                      <input
                        type="radio"
                        checked={!!u.isRefUnit}
                        onChange={() => {
                          setDraft({ ...draft, units: units.map((x, j) => ({ ...x, isRefUnit: j === i })) })
                          setDirty(true)
                        }}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="py-1.5 pr-3">
                      <input
                        value={u.description ?? ''}
                        onChange={(e) => patchUnit(i, { description: e.target.value })}
                        className={INPUT_CLASS}
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <button
                        onClick={() => removeUnit(i)}
                        disabled={units.length === 1}
                        className="text-graphite-soft hover:text-e-4 cursor-pointer text-[14px] disabled:opacity-30"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
