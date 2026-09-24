import { useCallback, useEffect, useState } from 'react'
import type { Descriptor, FlowDetail, FlowPropertyFactor } from '../../api/types'
import { deleteEntity, getEntity, updateEntity } from '../../api/ipc'
import { getDescriptorsCached, invalidateDescriptors } from '../../api/entityCache'
import { useI18n } from '../../i18n'
import { useTabs, tabKey } from '../../stores/tabs'
import { Button, ErrorBox, Field, Spinner } from '../ui/primitives'

const INPUT_CLASS =
  'w-full px-2 py-1 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid'

function catEditable(c: FlowDetail['category']): string {
  if (!c) return ''
  return typeof c === 'string' ? c : (c.name ?? '')
}

export function FlowEditor({ id }: { id: string }) {
  const t = useI18n((s) => s.t)
  const closeTab = useTabs((s) => s.close)
  const [draft, setDraft] = useState<FlowDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [props, setProps] = useState<Descriptor[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setDraft(await getEntity<FlowDetail>('Flow', id))
      setDirty(false)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
    getDescriptorsCached('FlowProperty')
      .then(setProps)
      .catch(() => setProps([]))
  }, [load])

  const patch = (p: Partial<FlowDetail>) => {
    if (!draft) return
    setDraft({ ...draft, ...p })
    setDirty(true)
  }

  const patchFactor = (idx: number, p: Partial<FlowPropertyFactor>) => {
    if (!draft) return
    const list = (draft.flowProperties ?? []).map((f, i) => (i === idx ? { ...f, ...p } : f))
    setDraft({ ...draft, flowProperties: list })
    setDirty(true)
  }

  const removeFactor = (idx: number) => {
    if (!draft) return
    setDraft({ ...draft, flowProperties: (draft.flowProperties ?? []).filter((_, i) => i !== idx) })
    setDirty(true)
  }

  const addFactor = (fpId: string) => {
    if (!draft) return
    const fp = props.find((p) => p['@id'] === fpId)
    if (!fp) return
    const factor: FlowPropertyFactor = {
      '@type': 'FlowPropertyFactor',
      isRefFlowProperty: (draft.flowProperties ?? []).length === 0,
      conversionFactor: 1,
      flowProperty: { '@type': 'FlowProperty', '@id': fp['@id'], name: fp.name },
    }
    setDraft({ ...draft, flowProperties: [...(draft.flowProperties ?? []), factor] })
    setDirty(true)
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      const { ...payload } = draft
      payload.category = catEditable(draft.category) || undefined
      await updateEntity('Flow', payload)
      invalidateDescriptors('Flow')
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
      await deleteEntity('Flow', id)
      invalidateDescriptors('Flow')
      closeTab(tabKey('Flow', id))
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setConfirmDelete(false)
    }
  }

  if (loading) return <div className="p-6"><Spinner label={t('loading')} /></div>
  if (!draft) return <div className="p-6"><ErrorBox message={error || 'Not found'} onRetry={load} /></div>

  const factors = draft.flowProperties ?? []
  const usedProps = new Set(factors.map((f) => f.flowProperty?.['@id']))

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-[1000px]">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-sans uppercase tracking-widest text-graphite-soft mb-1">Flow</div>
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
            <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} className={INPUT_CLASS} />
          </Field>
          <Field label={t('category')}>
            <input
              value={catEditable(draft.category)}
              onChange={(e) => patch({ category: e.target.value })}
              placeholder="Emissions/Emissions to air/..."
              className={INPUT_CLASS}
            />
          </Field>
          <Field label={t('flow_type')}>
            <select
              value={draft.flowType ?? 'PRODUCT_FLOW'}
              onChange={(e) => patch({ flowType: e.target.value })}
              className={INPUT_CLASS}
            >
              <option value="PRODUCT_FLOW">{t('ft_product')}</option>
              <option value="ELEMENTARY_FLOW">{t('ft_elementary')}</option>
              <option value="WASTE_FLOW">{t('ft_waste')}</option>
            </select>
          </Field>
          {draft.cas && <Field label={t('cas')}>{draft.cas}</Field>}
          {draft.version && <Field label={t('version')}>{draft.version}</Field>}
          {draft.lastChange && <Field label={t('last_change')}>{draft.lastChange.slice(0, 10)}</Field>}
          <Field label={t('description')}>
            <textarea
              value={draft.description ?? ''}
              onChange={(e) => patch({ description: e.target.value })}
              rows={3}
              className={INPUT_CLASS}
            />
          </Field>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between border-b border-line pb-1.5 mb-3">
            <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid">
              {t('flow_properties')} ({factors.length})
            </h3>
            <select
              value=""
              onChange={(e) => e.target.value && addFactor(e.target.value)}
              className="px-2 py-1 bg-paper border border-line text-[12px] outline-none max-w-[260px]"
            >
              <option value="">+ {t('add_property')}</option>
              {props
                .filter((p) => !usedProps.has(p['@id']))
                .map((p) => (
                  <option key={p['@id']} value={p['@id']}>{p.name}</option>
                ))}
            </select>
          </div>
          {factors.length === 0 ? (
            <div className="text-[13px] text-graphite-soft py-2">—</div>
          ) : (
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
                  <th className="py-1.5 pr-3 font-medium">{t('nav_flow_properties')}</th>
                  <th className="py-1.5 pr-3 font-medium w-[120px]">{t('unit')}</th>
                  <th className="py-1.5 pr-3 font-medium w-[180px] text-right">{t('conversion_factor')}</th>
                  <th className="py-1.5 pr-3 font-medium w-[90px] text-center">{t('ref')}</th>
                  <th className="py-1.5 font-medium w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {factors.map((fp, i) => (
                  <tr key={fp.flowProperty?.['@id'] ?? i} className="border-t border-line">
                    <td className="py-1.5 pr-3">{fp.flowProperty?.name ?? '—'}</td>
                    <td className="py-1.5 pr-3 text-graphite-mid">{fp.flowProperty?.refUnit ?? '—'}</td>
                    <td className="py-1.5 pr-3 text-right">
                      <input
                        type="number"
                        value={fp.conversionFactor ?? 1}
                        onChange={(e) => patchFactor(i, { conversionFactor: Number(e.target.value) })}
                        className="w-[140px] px-2 py-1 bg-paper border border-line font-mono text-[12px] outline-none focus:border-graphite-mid"
                      />
                    </td>
                    <td className="py-1.5 pr-3 text-center">
                      <input
                        type="radio"
                        checked={!!fp.isRefFlowProperty}
                        onChange={() => {
                          setDraft({
                            ...draft,
                            flowProperties: factors.map((f, j) => ({ ...f, isRefFlowProperty: j === i })),
                          })
                          setDirty(true)
                        }}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <button
                        onClick={() => removeFactor(i)}
                        disabled={factors.length === 1}
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
