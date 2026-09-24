import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Descriptor, FlowDetail, ImpactCategoryDetail, ImpactFactor } from '../../api/types'
import { deleteEntity, getEntity, updateEntity } from '../../api/ipc'
import { invalidateDescriptors, resolveUnit } from '../../api/entityCache'
import { useI18n } from '../../i18n'
import { useTabs, tabKey } from '../../stores/tabs'
import { Button, ErrorBox, Field, Spinner } from '../ui/primitives'
import { FlowPicker } from '../FlowPicker'

const ROW_LIMIT = 400
const INPUT_CLASS =
  'w-full px-2 py-1 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid'

export function ImpactCategoryEditor({ id }: { id: string }) {
  const t = useI18n((s) => s.t)
  const closeTab = useTabs((s) => s.close)
  const [draft, setDraft] = useState<ImpactCategoryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setDraft(await getEntity<ImpactCategoryDetail>('ImpactCategory', id))
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

  const factors = useMemo(() => {
    const list = draft?.impactFactors ?? []
    const q = query.trim().toLowerCase()
    const filtered = q ? list.filter((f) => f.flow?.name?.toLowerCase().includes(q)) : list
    return [...filtered].sort((a, b) => Math.abs(b.value ?? 0) - Math.abs(a.value ?? 0))
  }, [draft, query])

  const patchFactor = (flowId: string, p: Partial<ImpactFactor>) => {
    if (!draft) return
    const list = (draft.impactFactors ?? []).map((f) =>
      f.flow?.['@id'] === flowId ? { ...f, ...p } : f,
    )
    setDraft({ ...draft, impactFactors: list })
    setDirty(true)
  }

  const removeFactor = (flowId: string) => {
    if (!draft) return
    setDraft({ ...draft, impactFactors: (draft.impactFactors ?? []).filter((f) => f.flow?.['@id'] !== flowId) })
    setDirty(true)
  }

  const addFactor = async (d: Descriptor) => {
    setShowPicker(false)
    if (!draft) return
    if ((draft.impactFactors ?? []).some((f) => f.flow?.['@id'] === d['@id'])) return
    try {
      const full = await getEntity<FlowDetail>('Flow', d['@id'])
      const refFp = (full?.flowProperties ?? []).find((f) => f.isRefFlowProperty) ?? full?.flowProperties?.[0]
      const unit = await resolveUnit(refFp?.flowProperty?.refUnit)
      const factor: ImpactFactor = {
        value: 0,
        flow: { '@type': 'Flow', '@id': d['@id'], name: d.name },
        ...(unit ? { unit } : {}),
        ...(refFp?.flowProperty
          ? {
              flowProperty: {
                '@type': 'FlowProperty',
                '@id': refFp.flowProperty['@id'],
                name: refFp.flowProperty.name,
              },
            }
          : {}),
      }
      setDraft({ ...draft, impactFactors: [...(draft.impactFactors ?? []), factor] })
      setDirty(true)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    }
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      await updateEntity('ImpactCategory', draft)
      invalidateDescriptors('ImpactCategory')
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
      await deleteEntity('ImpactCategory', id)
      invalidateDescriptors('ImpactCategory')
      closeTab(tabKey('ImpactCategory', id))
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setConfirmDelete(false)
    }
  }

  if (loading) return <div className="p-6"><Spinner label={t('loading')} /></div>
  if (!draft) return <div className="p-6"><ErrorBox message={error || 'Not found'} onRetry={load} /></div>

  const total = draft.impactFactors?.length ?? 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-[1100px]">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-sans uppercase tracking-widest text-graphite-soft mb-1">
              {t('nav_impact_categories')}
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
          <Field label={t('reference_unit')}>
            <input
              value={draft.refUnit?.trim() ?? ''}
              onChange={(e) => {
                setDraft({ ...draft, refUnit: e.target.value })
                setDirty(true)
              }}
              className={INPUT_CLASS}
            />
          </Field>
          {draft.version && <Field label={t('version')}>{draft.version}</Field>}
          {draft.lastChange && <Field label={t('last_change')}>{draft.lastChange.slice(0, 10)}</Field>}
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
          <div className="flex items-center justify-between gap-3 border-b border-line pb-1.5 mb-3">
            <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid">
              {t('characterization_factors')} ({total})
            </h3>
            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search_placeholder')}
                className="px-2 py-1 bg-paper border border-line text-[12px] outline-none focus:border-graphite-mid w-[220px]"
              />
              <Button variant="ghost" onClick={() => setShowPicker(true)}>+ {t('add_factor')}</Button>
            </div>
          </div>
          {factors.length === 0 ? (
            <div className="text-[13px] text-graphite-soft py-2">—</div>
          ) : (
            <>
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="text-left text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
                    <th className="py-1.5 pr-3 font-medium">{t('flow')}</th>
                    <th className="py-1.5 pr-3 font-medium w-[180px] text-right">{t('factor')}</th>
                    <th className="py-1.5 pr-3 font-medium w-[80px]">{t('unit')}</th>
                    <th className="py-1.5 font-medium w-[40px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {factors.slice(0, ROW_LIMIT).map((f, i) => (
                    <tr key={`${f.flow?.['@id']}-${i}`} className="border-t border-line">
                      <td className="py-1 pr-3">
                        <div className="truncate max-w-[520px]" title={f.flow?.name}>{f.flow?.name ?? '—'}</div>
                        {f.flow?.category && (
                          <div className="text-[10px] text-graphite-soft truncate">{f.flow.category}</div>
                        )}
                      </td>
                      <td className="py-1 pr-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={f.value ?? 0}
                          onChange={(e) => f.flow?.['@id'] && patchFactor(f.flow['@id'], { value: Number(e.target.value) })}
                          className="w-[160px] px-2 py-1 bg-paper border border-line font-mono text-[12px] outline-none focus:border-graphite-mid text-right"
                        />
                      </td>
                      <td className="py-1 pr-3 text-graphite-mid">{f.unit?.name ?? f.flow?.refUnit ?? ''}</td>
                      <td className="py-1 text-center">
                        <button
                          onClick={() => f.flow?.['@id'] && removeFactor(f.flow['@id'])}
                          className="text-graphite-soft hover:text-e-4 cursor-pointer text-[14px]"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {factors.length > ROW_LIMIT && (
                <div className="text-[11px] text-graphite-soft mt-2">
                  {t('items_shown')} {ROW_LIMIT} {t('items_total')} {factors.length}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {showPicker && (
        <FlowPicker onClose={() => setShowPicker(false)} onPick={(d) => addFactor(d)} />
      )}
    </div>
  )
}
