import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Descriptor, ImpactResult, Ref } from '../../api/types'
import {
  calculate,
  calcState,
  deleteEntity,
  getDescriptors,
  getEntity,
  totalImpacts,
  updateEntity,
} from '../../api/ipc'
import { invalidateDescriptors } from '../../api/entityCache'
import { fmt, saveCsv, toCsv } from '../../lib/export'
import { useI18n } from '../../i18n'
import { useTabs, tabKey } from '../../stores/tabs'
import { Button, ErrorBox, Field, Spinner } from '../ui/primitives'

const INPUT_CLASS =
  'w-full px-2 py-1 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid'

interface Variant {
  '@type'?: string
  '@id'?: string
  name?: string
  description?: string
  amount?: number
  isDisabled?: boolean
  productSystem?: Ref
  [key: string]: unknown
}

interface ProjectDetail {
  '@type'?: string
  '@id': string
  name: string
  description?: string
  impactMethod?: Ref
  variants?: Variant[]
  [key: string]: unknown
}

export function ProjectEditor({ id }: { id: string }) {
  const t = useI18n((s) => s.t)
  const closeTab = useTabs((s) => s.close)
  const [draft, setDraft] = useState<ProjectDetail | null>(null)
  const [systems, setSystems] = useState<Descriptor[]>([])
  const [methods, setMethods] = useState<Descriptor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [calcRunning, setCalcRunning] = useState(false)
  const [comparison, setComparison] = useState<{
    categories: Array<{ id: string; name: string; unit: string }>
    columns: string[]
    rows: Array<Array<number | null>>
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [p, sys, met] = await Promise.all([
        getEntity<ProjectDetail>('Project', id),
        getDescriptors('ProductSystem'),
        getDescriptors('ImpactMethod'),
      ])
      setDraft(p)
      setSystems(sys)
      setMethods(met)
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

  const variants = draft?.variants ?? []

  const patchVariant = (idx: number, p: Partial<Variant>) => {
    if (!draft) return
    setDraft({ ...draft, variants: variants.map((v, i) => (i === idx ? { ...v, ...p } : v)) })
    setDirty(true)
  }

  const addVariant = () => {
    if (!draft) return
    setDraft({
      ...draft,
      variants: [...variants, { '@type': 'ProjectVariant', '@id': crypto.randomUUID(), name: `Variant ${variants.length + 1}`, amount: 1 }],
    })
    setDirty(true)
  }

  const removeVariant = (idx: number) => {
    if (!draft) return
    setDraft({ ...draft, variants: variants.filter((_, i) => i !== idx) })
    setDirty(true)
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      await updateEntity('Project', draft)
      invalidateDescriptors('Project')
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
      await deleteEntity('Project', id)
      invalidateDescriptors('Project')
      closeTab(tabKey('Project', id))
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setConfirmDelete(false)
    }
  }

  const calcVariants = async () => {
    if (!draft || variants.length === 0) return
    setCalcRunning(true)
    setError('')
    setComparison(null)
    try {
      const columns: string[] = []
      const catMap = new Map<string, { name: string; unit: string }>()
      const rows: Array<Array<number | null>> = []
      const perVariant: Array<Map<string, number>> = []
      for (const v of variants) {
        const sysId = v.productSystem?.['@id']
        if (!sysId) continue
        columns.push(v.name ?? sysId)
        const setup: Record<string, unknown> = {
          productSystem: { '@type': 'ProductSystem', '@id': sysId },
        }
        if (draft.impactMethod?.['@id']) {
          setup.impactMethod = { '@type': 'ImpactMethod', '@id': draft.impactMethod['@id'] }
        }
        const st = await calculate(setup as never)
        let ready = st.isReady
        for (let i = 0; i < 120 && !ready; i++) {
          await new Promise((r) => setTimeout(r, 1500))
          ready = (await calcState(st['@id'])).isReady
        }
        const impacts = await totalImpacts(st['@id'])
        const m = new Map<string, number>()
        for (const imp of impacts as ImpactResult[]) {
          m.set(imp.impactCategory['@id'], imp.amount)
          catMap.set(imp.impactCategory['@id'], {
            name: imp.impactCategory.name,
            unit: imp.impactCategory.refUnit?.trim() ?? '',
          })
        }
        perVariant.push(m)
      }
      const categories = [...catMap.entries()].map(([cid, v]) => ({ id: cid, ...v }))
      for (let c = 0; c < categories.length; c++) {
        rows.push(perVariant.map((m) => m.get(categories[c].id) ?? null))
      }
      setComparison({ categories, columns, rows })
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setCalcRunning(false)
    }
  }

  // Composer command bus: trigger variant comparison from the bottom composer.
  const calcRef = useRef(calcVariants)
  calcRef.current = calcVariants
  useEffect(() => {
    const onCalc = () => void calcRef.current()
    window.addEventListener('lcaai:run-calc', onCalc)
    return () => window.removeEventListener('lcaai:run-calc', onCalc)
  }, [])

  const exportComparison = () => {
    if (!comparison) return
    saveCsv(
      'project_comparison.csv',
      toCsv([
        [t('impact_categories'), ...comparison.columns],
        ...comparison.categories.map((c, i) => [
          c.name,
          ...comparison.rows[i].map((v) => (v === null ? '' : v)),
        ]),
      ]),
    )
  }

  const maxPerRow = useMemo(
    () => (comparison ? comparison.rows.map((r) => Math.max(...r.map((v) => Math.abs(v ?? 0)), 0)) : []),
    [comparison],
  )

  if (loading) return <div className="p-6"><Spinner label={t('loading')} /></div>
  if (!draft) return <div className="p-6"><ErrorBox message={error || 'Not found'} onRetry={load} /></div>

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-[1100px]">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-sans uppercase tracking-widest text-graphite-soft mb-1">
              {t('nav_projects')}
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
          <Field label={t('method')}>
            <select
              value={draft.impactMethod?.['@id'] ?? ''}
              onChange={(e) => {
                const m = methods.find((x) => x['@id'] === e.target.value)
                setDraft({
                  ...draft,
                  impactMethod: m ? { '@type': 'ImpactMethod', '@id': m['@id'], name: m.name } : undefined,
                })
                setDirty(true)
              }}
              className={INPUT_CLASS}
            >
              <option value="">—</option>
              {methods.map((m) => (
                <option key={m['@id']} value={m['@id']}>{m.name}</option>
              ))}
            </select>
          </Field>
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
              {t('variants')} ({variants.length})
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={calcVariants} disabled={calcRunning || variants.length === 0}>
                {calcRunning ? t('calculating') : t('calculate_variants')}
              </Button>
              <button onClick={addVariant} className="text-[12px] font-sans text-graphite-mid hover:text-graphite cursor-pointer">
                + {t('add_variant')}
              </button>
            </div>
          </div>
          {variants.length === 0 ? (
            <div className="text-[13px] text-graphite-soft py-2">—</div>
          ) : (
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
                  <th className="py-1.5 pr-3 font-medium w-[200px]">{t('name')}</th>
                  <th className="py-1.5 pr-3 font-medium">{t('nav_systems')}</th>
                  <th className="py-1.5 pr-3 font-medium w-[120px] text-right">{t('amount')}</th>
                  <th className="py-1.5 font-medium w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v['@id'] ?? i} className="border-t border-line">
                    <td className="py-1.5 pr-3">
                      <input
                        value={v.name ?? ''}
                        onChange={(e) => patchVariant(i, { name: e.target.value })}
                        className={INPUT_CLASS}
                      />
                    </td>
                    <td className="py-1.5 pr-3">
                      <select
                        value={v.productSystem?.['@id'] ?? ''}
                        onChange={(e) => {
                          const s = systems.find((x) => x['@id'] === e.target.value)
                          patchVariant(i, {
                            productSystem: s ? { '@type': 'ProductSystem', '@id': s['@id'], name: s.name } : undefined,
                          })
                        }}
                        className={INPUT_CLASS}
                      >
                        <option value="">—</option>
                        {systems.map((s) => (
                          <option key={s['@id']} value={s['@id']}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      <input
                        type="number"
                        step="any"
                        value={v.amount ?? 1}
                        onChange={(e) => patchVariant(i, { amount: Number(e.target.value) })}
                        className="w-[100px] px-2 py-1 bg-paper border border-line font-mono text-[12px] outline-none focus:border-graphite-mid text-right"
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <button
                        onClick={() => removeVariant(i)}
                        className="text-graphite-soft hover:text-e-4 cursor-pointer text-[14px]"
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

        {comparison && (
          <section className="mb-8">
            <div className="flex items-center justify-between border-b border-line pb-1.5 mb-3">
              <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid">
                {t('results')} · {comparison.columns.length}
              </h3>
              <button onClick={exportComparison} className="text-[11px] font-sans text-graphite-mid hover:text-graphite cursor-pointer">
                ⇓ CSV
              </button>
            </div>
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
                  <th className="py-1.5 pr-3 font-medium">{t('impact_categories')}</th>
                  {comparison.columns.map((c) => (
                    <th key={c} className="py-1.5 pr-3 font-medium text-right">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.categories.map((c, ri) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="py-1 pr-3 truncate max-w-[360px]" title={c.name}>
                      {c.name} <span className="text-[10px] text-graphite-soft">{c.unit}</span>
                    </td>
                    {comparison.rows[ri].map((v, ci) => {
                      const max = maxPerRow[ri]
                      const share = max > 0 && v !== null ? Math.abs(v) / max : 0
                      return (
                        <td
                          key={ci}
                          className="py-1 pr-3 text-right font-mono whitespace-nowrap"
                          style={{ background: v !== null ? `rgba(47,93,67,${(share * 0.25).toFixed(2)})` : undefined }}
                        >
                          {v === null ? '—' : fmt(v)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  )
}
