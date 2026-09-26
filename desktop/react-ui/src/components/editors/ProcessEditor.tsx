import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type {
  CalculationSetup,
  Contribution,
  Descriptor,
  DQSystemDetail,
  Exchange,
  FlowDetail,
  FlowResult,
  ImpactResult,
  Process,
  ProcessParameter,
  SankeyGraph,
} from '../../api/types'
import {
  calcState,
  calculate,
  createProductSystem,
  deleteEntity,
  disposeResult,
  getDescriptors,
  getEntity,
  impactContributions,
  sankeyGraph,
  totalFlows,
  totalImpacts,
  updateEntity,
} from '../../api/ipc'
import { invalidateDescriptors, resolveUnit } from '../../api/entityCache'
import { isPlainNumber, tryEvaluate } from '../../lib/formula'
import { fmt, saveCsv, toCsv } from '../../lib/export'
import { useI18n } from '../../i18n'
import { useEngine } from '../../stores/engine'
import { useTabs, tabKey } from '../../stores/tabs'
import { Button, ErrorBox, Field, Spinner } from '../ui/primitives'
import { FlowPicker } from '../FlowPicker'
import { ReportBuilder } from '../ReportBuilder'
import { ExchangeDetails } from '../ExchangeDetails'
import { AnalysisPanel } from '../AnalysisPanel'
import { MonteCarloPanel } from '../MonteCarloPanel'
import { useCloud } from '../../stores/cloud'
import { toast } from '../../lib/toast'
import { saveResultsXlsx } from '../../lib/xlsx'

const systemCache = new Map<string, string>()
let systemCacheDbVersion = 0

export function ProcessEditor({ id }: { id: string }) {
  const t = useI18n((s) => s.t)
  const openTab = useTabs((s) => s.open)
  const closeTab = useTabs((s) => s.close)
  const [draft, setDraft] = useState<Process | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [pickerFor, setPickerFor] = useState<'input' | 'output' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [detailsIdx, setDetailsIdx] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const p = await getEntity<Process>('Process', id)
      setDraft(p)
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

  const exchanges = useMemo(() => {
    const list = draft?.exchanges ?? []
    const isIn = (e: Exchange) => !!(e.isInput ?? e.input)
    return [...list].sort((a, b) => Number(isIn(b)) - Number(isIn(a)))
  }, [draft])

  const updateExchange = (idx: number, patch: Partial<Exchange>) => {
    if (!draft) return
    const next = { ...draft, exchanges: (draft.exchanges ?? []).map((e, i) => (i === idx ? { ...e, ...patch } : e)) }
    setDraft(next)
    setDirty(true)
  }

  const removeExchange = (idx: number) => {
    if (!draft) return
    setDraft({ ...draft, exchanges: (draft.exchanges ?? []).filter((_, i) => i !== idx) })
    setDirty(true)
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      await updateEntity('Process', draft)
      setDirty(false)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setSaving(false)
    }
  }

  const addExchange = async (d: Descriptor, input: boolean) => {
    if (!draft) return
    setPickerFor(null)
    try {
      const full = await getEntity<FlowDetail>('Flow', d['@id'])
      const refFp = (full?.flowProperties ?? []).find((f) => f.isRefFlowProperty) ?? full?.flowProperties?.[0]
      const unit = await resolveUnit(refFp?.flowProperty?.refUnit)
      const nextInternalId = Math.max(0, ...(draft.exchanges ?? []).map((e) => e.internalId ?? 0)) + 1
      const ex: Exchange = {
        '@type': 'Exchange',
        internalId: nextInternalId,
        input,
        isInput: input,
        amount: 0,
        flow: { '@type': 'Flow', '@id': d['@id'], name: d.name },
        ...(refFp?.flowProperty
          ? {
              flowProperty: {
                '@type': 'FlowProperty',
                '@id': refFp.flowProperty['@id'],
                name: refFp.flowProperty.name,
              },
            }
          : {}),
        ...(unit ? { unit } : {}),
      }
      setDraft({ ...draft, exchanges: [...(draft.exchanges ?? []), ex] })
      setDirty(true)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    }
  }

  const createSystem = async () => {
    setError('')
    try {
      const sys = await createProductSystem(id)
      invalidateDescriptors('ProductSystem')
      openTab({
        key: tabKey('ProductSystem', sys['@id']),
        type: 'ProductSystem',
        id: sys['@id'],
        name: sys.name || draft?.name || sys['@id'],
      })
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    }
  }

  const remove = async () => {
    setError('')
    try {
      await deleteEntity('Process', id)
      invalidateDescriptors('Process')
      closeTab(tabKey('Process', id))
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setConfirmDelete(false)
    }
  }

  const parameters = (draft?.parameters ?? []) as ProcessParameter[]

  const paramVars = useMemo(() => {
    const v: Record<string, number> = {}
    for (const p of parameters) {
      if (p.name && typeof p.value === 'number') v[p.name] = p.value
    }
    return v
  }, [parameters])

  const patchParam = (idx: number, patch: Partial<ProcessParameter>) => {
    if (!draft) return
    const list = parameters.map((p, i) => (i === idx ? { ...p, ...patch } : p))
    setDraft({ ...draft, parameters: list })
    setDirty(true)
  }

  const addParameter = () => {
    if (!draft) return
    setDraft({
      ...draft,
      parameters: [...parameters, { name: '', value: 0, formula: '', description: '' }],
    })
    setDirty(true)
  }

  const removeParameter = (idx: number) => {
    if (!draft) return
    setDraft({ ...draft, parameters: parameters.filter((_, i) => i !== idx) })
    setDirty(true)
  }

  if (loading) return <div className="p-6"><Spinner label={t('loading')} /></div>
  if (!draft) return <div className="p-6"><ErrorBox message={error || 'Not found'} onRetry={load} /></div>

  const outputs = exchanges.filter((e) => !(e.isInput ?? e.input))
  const inputs = exchanges.filter((e) => !!(e.isInput ?? e.input))

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-[1100px]">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-sans uppercase tracking-widest text-graphite-soft mb-1">Process</div>
            <h2 className="text-[22px] leading-tight">{draft.name}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {savedFlash && <span className="text-[12px] text-ok">{t('saved')}</span>}
            <Button variant="ghost" onClick={createSystem}>
              {t('create_system')}
            </Button>
            {confirmDelete ? (
              <span className="flex items-center gap-2">
                <Button variant="danger" onClick={remove}>{t('db_confirm')}</Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>{t('db_cancel')}</Button>
              </span>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                {t('delete')}
              </Button>
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
          <Field label={t('name')}>{draft.name}</Field>
          <Field label={t('category')}>
            {typeof draft.category === 'string' ? draft.category : (draft.category?.name ?? '—')}
          </Field>
          <Field label={t('location')}>
            {typeof draft.location === 'string' ? draft.location : (draft.location?.name ?? '—')}
          </Field>
          <Field label={t('process_type')}>{draft.processType ?? '—'}</Field>
          <Field label={t('ref_flow')}>{draft.refFlow?.name ?? draft.unit?.name ?? '—'}</Field>
          <Field label={t('version')}>{draft.version ?? '—'}</Field>
          {draft.description && (
            <Field label={t('description')}>
              <span className="text-graphite-mid whitespace-pre-wrap">{draft.description}</span>
            </Field>
          )}
        </section>

        <DQSection
          draft={draft}
          patch={(p) => {
            setDraft({ ...draft, ...p })
            setDirty(true)
          }}
        />

        {parameters.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between border-b border-line pb-1.5 mb-3">
              <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid">
                {t('parameters')} ({parameters.length})
              </h3>
              <button onClick={addParameter} className="text-[12px] font-sans text-graphite-mid hover:text-graphite cursor-pointer">
                + {t('add_parameter')}
              </button>
            </div>
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
                  <th className="py-1.5 pr-3 font-medium w-[180px]">{t('name')}</th>
                  <th className="py-1.5 pr-3 font-medium w-[140px] text-right">{t('value')}</th>
                  <th className="py-1.5 pr-3 font-medium w-[200px]">{t('formula')}</th>
                  <th className="py-1.5 pr-3 font-medium w-[140px] text-right">{t('preview')}</th>
                  <th className="py-1.5 pr-3 font-medium">{t('description')}</th>
                  <th className="py-1.5 font-medium w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((p, i) => {
                  const r = p.formula ? tryEvaluate(p.formula, paramVars) : null
                  return (
                    <tr key={p['@id'] ?? i} className="border-t border-line">
                      <td className="py-1.5 pr-3">
                        <input
                          value={p.name ?? ''}
                          onChange={(e) => patchParam(i, { name: e.target.value })}
                          className="w-full px-2 py-1 bg-paper border border-line font-mono text-[12px] outline-none focus:border-graphite-mid"
                        />
                      </td>
                      <td className="py-1.5 pr-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={typeof p.value === 'number' ? p.value : 0}
                          onChange={(e) => patchParam(i, { value: Number(e.target.value) })}
                          className="w-[120px] px-2 py-1 bg-paper border border-line font-mono text-[12px] outline-none focus:border-graphite-mid text-right"
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          value={p.formula ?? ''}
                          onChange={(e) => patchParam(i, { formula: e.target.value })}
                          placeholder="2 * p1 + 3"
                          className="w-full px-2 py-1 bg-paper border border-line font-mono text-[12px] outline-none focus:border-graphite-mid"
                        />
                      </td>
                      <td className="py-1.5 pr-3 text-right font-mono text-[12px]">
                        {r ? (
                          r.ok ? (
                            <span className="text-ok">= {fmt(r.value)}</span>
                          ) : (
                            <span className="text-e-ink" title={r.error}>!</span>
                          )
                        ) : (
                          ''
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          value={p.description ?? ''}
                          onChange={(e) => patchParam(i, { description: e.target.value })}
                          className="w-full px-2 py-1 bg-paper border border-line text-[12px] outline-none focus:border-graphite-mid"
                        />
                      </td>
                      <td className="py-1.5 text-center">
                        <button
                          onClick={() => removeParameter(i)}
                          className="text-graphite-soft hover:text-e-4 cursor-pointer text-[14px]"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}
        {parameters.length === 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between border-b border-line pb-1.5">
              <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid">
                {t('parameters')} (0)
              </h3>
              <button onClick={addParameter} className="text-[12px] font-sans text-graphite-mid hover:text-graphite cursor-pointer">
                + {t('add_parameter')}
              </button>
            </div>
          </section>
        )}

        <ExchangeSection title={`${t('output')} · ${t('exchanges')}`} rows={outputs} t={t}
          onEdit={updateExchange} onRemove={removeExchange} allExchanges={exchanges}
          onAdd={() => setPickerFor('output')} addLabel={`+ ${t('add_output')}`} paramVars={paramVars}
          onDetails={setDetailsIdx} />
        <ExchangeSection title={`${t('input')} · ${t('exchanges')}`} rows={inputs} t={t}
          onEdit={updateExchange} onRemove={removeExchange} allExchanges={exchanges}
          onAdd={() => setPickerFor('input')} addLabel={`+ ${t('add_input')}`} paramVars={paramVars}
          onDetails={setDetailsIdx} />

        <CalcPanel processId={id} processName={draft.name} />
      </div>

      {pickerFor && (
        <FlowPicker
          onClose={() => setPickerFor(null)}
          onPick={(d) => addExchange(d, pickerFor === 'input')}
        />
      )}

      {detailsIdx !== null && draft?.exchanges?.[detailsIdx] && (
        <ExchangeDetails
          exchange={draft.exchanges[detailsIdx]}
          onPatch={(p) => updateExchange(detailsIdx, p)}
          onClose={() => setDetailsIdx(null)}
        />
      )}
    </div>
  )
}

function ExchangeSection({
  title, rows, t, onEdit, onRemove, allExchanges, onAdd, addLabel, paramVars, onDetails,
}: {
  title: string
  rows: Exchange[]
  t: (k: string) => string
  onEdit: (globalIdx: number, patch: Partial<Exchange>) => void
  onRemove: (globalIdx: number) => void
  allExchanges: Exchange[]
  onAdd: () => void
  addLabel: string
  paramVars: Record<string, number>
  onDetails: (globalIdx: number) => void
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between border-b border-line pb-1.5 mb-3">
        <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid">
          {title} ({rows.length})
        </h3>
        <button
          onClick={onAdd}
          className="text-[12px] font-sans text-graphite-mid hover:text-graphite cursor-pointer"
        >
          {addLabel}
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="text-[13px] text-graphite-soft py-2">—</div>
      ) : (
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="text-left text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
              <th className="py-1.5 pr-3 font-medium">{t('flow')}</th>
              <th className="py-1.5 pr-3 font-medium w-[140px]">{t('amount')}</th>
              <th className="py-1.5 pr-3 font-medium w-[90px]">{t('unit')}</th>
              <th className="py-1.5 pr-3 font-medium w-[90px]">{t('quantitative_ref')}</th>
              <th className="py-1.5 font-medium w-[60px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((ex) => {
              const globalIdx = allExchanges.indexOf(ex)
              return (
                <tr key={ex['@id'] ?? globalIdx} className="border-t border-line align-middle">
                  <td className="py-1.5 pr-3">
                    <div className="truncate max-w-[420px]" title={ex.flow?.name}>{ex.flow?.name ?? '—'}</div>
                    {ex.description && <div className="text-[11px] text-graphite-soft truncate">{ex.description}</div>}
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      value={ex.amountFormula ?? ex.amount ?? 0}
                      onChange={(e) => {
                        const s = e.target.value
                        if (isPlainNumber(s)) {
                          onEdit(globalIdx, { amount: Number(s), amountFormula: undefined })
                        } else {
                          onEdit(globalIdx, { amountFormula: s })
                        }
                      }}
                      className="w-full px-2 py-1 bg-paper border border-line font-mono text-[12px] outline-none focus:border-graphite-mid"
                    />
                    {ex.amountFormula && <FormulaPreview formula={ex.amountFormula} vars={paramVars} t={t} />}
                  </td>
                  <td className="py-1.5 pr-3 text-graphite-mid">{ex.unit?.name ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-center">{ex.isQuantitativeReference || ex.quantitativeReference ? '✓' : ''}</td>
                  <td className="py-1.5 text-center whitespace-nowrap">
                    <button
                      onClick={() => onDetails(globalIdx)}
                      className="text-graphite-soft hover:text-graphite cursor-pointer text-[13px] mr-2"
                      title={t('details')}
                    >
                      ⚙
                    </button>
                    <button
                      onClick={() => onRemove(globalIdx)}
                      className="text-graphite-soft hover:text-e-4 cursor-pointer text-[14px]"
                      title="Delete"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}

interface CalcResults {
  flows: FlowResult[]
  impacts: ImpactResult[]
}

function FormulaPreview({
  formula,
  vars,
  t,
}: {
  formula: string
  vars: Record<string, number>
  t: (k: string) => string
}) {
  const r = tryEvaluate(formula, vars)
  return r.ok ? (
    <div className="text-[10px] text-ok font-mono mt-0.5">= {fmt(r.value)}</div>
  ) : (
    <div className="text-[10px] text-e-ink font-mono mt-0.5" title={r.error}>
      {t('invalid_formula')}: {r.error}
    </div>
  )
}

function CalcPanel({ processId, processName }: { processId: string; processName: string }) {
  const t = useI18n((s) => s.t)
  const [methods, setMethods] = useState<Descriptor[]>([])
  const [methodId, setMethodId] = useState('')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<CalcResults | null>(null)
  const [error, setError] = useState('')
  const [mcSetup, setMcSetup] = useState<CalculationSetup | null>(null)
  const [showMC, setShowMC] = useState(false)
  const cancelRef = useRef(false)
  const resultIdRef = useRef('')

  useEffect(() => {
    getDescriptors('ImpactMethod')
      .then((list) => {
        setMethods(list)
        if (list.length > 0) setMethodId(list[0]['@id'])
      })
      .catch(() => setMethods([]))
  }, [])

  useEffect(() => {
    return () => {
      cancelRef.current = true
      if (resultIdRef.current) {
        disposeResult(resultIdRef.current).catch(() => undefined)
        resultIdRef.current = ''
      }
    }
  }, [processId])

  const run = async () => {
    setRunning(true)
    setError('')
    setResults(null)
    cancelRef.current = false
    if (resultIdRef.current) {
      disposeResult(resultIdRef.current).catch(() => undefined)
      resultIdRef.current = ''
    }
    try {
      const dbVersion = useEngine.getState().dbVersion
      if (dbVersion !== systemCacheDbVersion) {
        systemCache.clear()
        systemCacheDbVersion = dbVersion
      }
      let systemId = systemCache.get(processId)
      if (!systemId) {
        const system = await createProductSystem(processId)
        systemId = system['@id']
        systemCache.set(processId, systemId)
      }
      const setupObj: CalculationSetup = {
        productSystem: { '@type': 'ProductSystem', '@id': systemId },
        ...(methodId ? { impactMethod: { '@type': 'ImpactMethod', '@id': methodId } } : {}),
      }
      setMcSetup(setupObj)
      const state = await calculate(setupObj)
      const resultId = state['@id']
      resultIdRef.current = resultId

      let ready = state.isReady
      for (let i = 0; i < 150 && !ready; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        if (cancelRef.current) return
        const st = await calcState(resultId)
        ready = st.isReady
      }
      if (!ready) throw new Error('calculation timeout')
      if (cancelRef.current) return

      const [flows, impacts] = await Promise.all([totalFlows(resultId), totalImpacts(resultId)])
      if (cancelRef.current) return
      setResults({ flows, impacts })
    } catch (e) {
      if (!cancelRef.current) setError(String(e instanceof Error ? e.message : e))
    } finally {
      setRunning(false)
    }
  }

  // Composer command bus: run calculation / open Monte-Carlo from the bottom composer.
  const runRef = useRef(run)
  runRef.current = run
  const mcReadyRef = useRef({ results, mcSetup })
  mcReadyRef.current = { results, mcSetup }
  useEffect(() => {
    const onCalc = () => void runRef.current()
    const onMc = () => {
      if (mcReadyRef.current.results && mcReadyRef.current.mcSetup) setShowMC(true)
      else toast.warn(t('composer_calc_first'))
    }
    window.addEventListener('lcaai:run-calc', onCalc)
    window.addEventListener('lcaai:run-mc', onMc)
    return () => {
      window.removeEventListener('lcaai:run-calc', onCalc)
      window.removeEventListener('lcaai:run-mc', onMc)
    }
  }, [t])

  return (
    <section className="mb-8 border border-line bg-paper-2 p-4">
      <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid mb-3">{t('calculate')}</h3>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-[12px] font-sans uppercase tracking-wide text-graphite-mid">{t('method')}</label>
        <select
          value={methodId}
          onChange={(e) => setMethodId(e.target.value)}
          className="px-2 py-1.5 bg-paper border border-line text-[13px] outline-none min-w-[280px]"
        >
          {methods.map((m) => (
            <option key={m['@id']} value={m['@id']}>{m.name}</option>
          ))}
        </select>
        <Button onClick={run} disabled={running} variant="danger">
          {running ? t('calculating') : t('calculate')}
        </Button>
        <Button variant="ghost" onClick={() => setShowMC(true)} disabled={!results || !mcSetup}>
          {t('monte_carlo')}
        </Button>
      </div>
      {running && <div className="mt-3"><Spinner label={t('calculating')} /></div>}
      {error && <div className="mt-3"><ErrorBox message={error} /></div>}
      {results && (
        <ResultView
          results={results}
          resultId={resultIdRef.current}
          t={t}
          processName={processName}
          methodName={methods.find((m) => m['@id'] === methodId)?.name ?? ''}
        />
      )}

      {showMC && mcSetup && results && (
        <MonteCarloPanel
          setup={mcSetup}
          impacts={results.impacts}
          flows={results.flows}
          onClose={() => setShowMC(false)}
        />
      )}
    </section>
  )
}

function ResultView({
  results,
  resultId,
  t,
  processName,
  methodName,
}: {
  results: CalcResults
  resultId: string
  t: (k: string) => string
  processName: string
  methodName: string
}) {
  const [showReport, setShowReport] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const flows = useMemo(
    () => [...results.flows].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
    [results.flows],
  )
  const impacts = useMemo(() => {
    const max = Math.max(...results.impacts.map((i) => Math.abs(i.amount)), 0)
    return [...results.impacts]
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .map((i) => ({ ...i, share: max > 0 ? Math.abs(i.amount) / max : 0 }))
  }, [results.impacts])

  const [catId, setCatId] = useState('')
  useEffect(() => {
    if (!catId && impacts.length > 0) {
      const nonzero = impacts.find((i) => i.amount !== 0) ?? impacts[0]
      setCatId(nonzero.impactCategory['@id'])
    }
  }, [impacts, catId])

  const [publishing, setPublishing] = useState(false)
  const publishToCloud = async () => {
    if (publishing) return
    setPublishing(true)
    try {
      const climate = impacts.find((i) => /climate|co2|gwp/i.test(i.impactCategory.name))
      const main = climate ?? impacts.find((i) => i.amount !== 0) ?? impacts[0]
      let stages: Array<Record<string, unknown>> = []
      if (main && resultId) {
        try {
          const contributions = await impactContributions(resultId, main.impactCategory['@id'])
          const total = contributions.reduce((s, c) => s + (c.amount || 0), 0)
          stages = [...contributions]
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
            .slice(0, 30)
            .map((c) => ({
              name: c.techFlow.provider?.name ?? c.techFlow.flow?.name ?? '—',
              co2eq: c.amount,
              share_pct: total ? (c.amount / total) * 100 : 0,
              description: [c.techFlow.provider?.category, c.techFlow.provider?.location]
                .filter(Boolean)
                .join(', '),
            }))
        } catch {
          stages = []
        }
      }
      useCloud.getState().setPendingReport({
        product_title: processName,
        functional_unit: methodName || 'LCIA',
        total_co2eq: main?.amount ?? 0,
        report_data: {
          product_title: processName,
          functional_unit: methodName || 'LCIA',
          total_co2eq: main?.amount ?? 0,
          method: methodName,
          source: 'engine',
          created: new Date().toISOString(),
          lcia: impacts.map((i) => ({
            name: i.impactCategory.name,
            amount: i.amount,
            unit: i.impactCategory.refUnit?.trim() ?? '',
          })),
          stages,
        },
      })
      useCloud.getState().setOpen(true)
    } finally {
      setPublishing(false)
    }
  }

  const exportLcia = () =>
    saveCsv(
      'lcia_results.csv',
      toCsv([
        [t('impact_categories'), t('amount'), t('unit')],
        ...impacts.map((i) => [i.impactCategory.name, i.amount, i.impactCategory.refUnit?.trim() ?? '']),
      ]),
    )

  const exportInventory = () =>
    saveCsv(
      'inventory.csv',
      toCsv([
        [t('flow'), t('flow_type'), t('category'), t('amount'), t('unit')],
        ...flows.map((f) => [
          f.enviFlow.flow.name,
          f.enviFlow.flow.flowType ?? '',
          f.enviFlow.flow.category ?? '',
          f.amount,
          f.enviFlow.flow.refUnit ?? '',
        ]),
      ]),
    )

  return (
    <div className="mt-4 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
            {t('total_impact')} · LCIA
          </div>
          <div className="flex items-center gap-3">
            {window.desktop && (
              <button
                onClick={publishToCloud}
                disabled={publishing}
                className="text-[11px] font-sans text-graphite-mid hover:text-graphite cursor-pointer disabled:opacity-40"
                title={t('cloud_save')}
              >
                ☁ {t('cloud')}
              </button>
            )}
            <button onClick={() => setShowAnalysis(true)} className="text-[11px] font-sans text-graphite-mid hover:text-graphite cursor-pointer">
              ▥ {t('analysis')}
            </button>
            <button onClick={() => setShowReport(true)} className="text-[11px] font-sans text-graphite-mid hover:text-graphite cursor-pointer">
              ▤ {t('report')}
            </button>
            <button onClick={exportLcia} className="text-[11px] font-sans text-graphite-mid hover:text-graphite cursor-pointer">
              ⇓ CSV
            </button>
            <button
              onClick={() => saveResultsXlsx({ title: processName, method: methodName, impacts, flows })}
              className="text-[11px] font-sans text-graphite-mid hover:text-graphite cursor-pointer"
            >
              ⇓ XLSX
            </button>
          </div>
        </div>
        {impacts.length === 0 ? (
          <div className="text-[13px] text-graphite-mid">{t('no_results')}</div>
        ) : (
          <table className="w-full text-[12px] border-collapse">
            <tbody>
              {impacts.map((i) => (
                <tr key={i.impactCategory['@id']} className="border-t border-line">
                  <td className="py-1 pr-3 w-[45%]">
                    <div className="truncate" title={i.impactCategory.name}>{i.impactCategory.name}</div>
                  </td>
                  <td className="py-1 pr-3 w-[35%]">
                    <div className="h-[10px] bg-paper border border-line">
                      <div className="h-full bg-e-3" style={{ width: `${(i.share * 100).toFixed(1)}%` }} />
                    </div>
                  </td>
                  <td className="py-1 pr-3 text-right font-mono whitespace-nowrap">{fmt(i.amount)}</td>
                  <td className="py-1 text-graphite-soft whitespace-nowrap">{i.impactCategory.refUnit?.trim() ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {resultId && impacts.length > 0 && (
        <ContributionsPanel resultId={resultId} impacts={impacts} catId={catId} setCatId={setCatId} t={t} />
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
            {t('inventory')} · {results.flows.length}
          </div>
          <button onClick={exportInventory} className="text-[11px] font-sans text-graphite-mid hover:text-graphite cursor-pointer">
            ⇓ CSV
          </button>
        </div>
        {flows.length === 0 ? (
          <div className="text-[13px] text-graphite-mid">{t('no_results')}</div>
        ) : (
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
                <th className="py-1.5 pr-3 font-medium">{t('flow')}</th>
                <th className="py-1.5 pr-3 font-medium w-[140px] text-right">{t('amount')}</th>
                <th className="py-1.5 font-medium w-[80px]">{t('unit')}</th>
              </tr>
            </thead>
            <tbody>
              {flows.slice(0, 200).map((f, idx) => (
                <tr key={`${f.enviFlow.flow['@id']}-${idx}`} className="border-t border-line">
                  <td className="py-1 pr-3">
                    <div className="truncate max-w-[480px]" title={f.enviFlow.flow.name}>{f.enviFlow.flow.name}</div>
                    {f.enviFlow.flow.category && (
                      <div className="text-[10px] text-graphite-soft truncate">{f.enviFlow.flow.category}</div>
                    )}
                  </td>
                  <td className="py-1 pr-3 text-right font-mono whitespace-nowrap">{fmt(f.amount)}</td>
                  <td className="py-1 text-graphite-mid">{f.enviFlow.flow.refUnit ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {flows.length > 200 && (
          <div className="text-[11px] text-graphite-soft mt-2">
            {t('items_shown')} 200 {t('items_total')} {flows.length} — CSV
          </div>
        )}
      </div>

      {showReport && (
        <ReportBuilder
          results={results}
          resultId={resultId}
          processName={processName}
          methodName={methodName}
          onClose={() => setShowReport(false)}
        />
      )}

      {showAnalysis && (
        <AnalysisPanel
          resultId={resultId}
          impacts={results.impacts}
          flows={results.flows}
          onClose={() => setShowAnalysis(false)}
        />
      )}
    </div>
  )
}

function ContributionsPanel({
  resultId,
  impacts,
  catId,
  setCatId,
  t,
}: {
  resultId: string
  impacts: ImpactResult[]
  catId: string
  setCatId: (id: string) => void
  t: (k: string) => string
}) {
  const openTab = useTabs((s) => s.open)
  const [rows, setRows] = useState<Contribution[] | null>(null)
  const [graph, setGraph] = useState<SankeyGraph | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!catId || !resultId) return
    let on = true
    setRows(null)
    setGraph(null)
    setError('')
    impactContributions(resultId, catId)
      .then((r) => on && setRows([...r].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))))
      .catch((e) => on && setError(String(e instanceof Error ? e.message : e)))
    sankeyGraph(resultId, catId)
      .then((g) => on && setGraph(g))
      .catch(() => on && setGraph(null))
    return () => {
      on = false
    }
  }, [catId, resultId])

  const max = useMemo(() => Math.max(...(rows ?? []).map((r) => Math.abs(r.amount)), 0), [rows])

  const { nodes, edges } = useMemo(() => {
    if (!graph || graph.nodes.length <= 1) return { nodes: [] as Node[], edges: [] as Edge[] }
    const depth = new Map<number, number>()
    depth.set(graph.rootIndex, 0)
    const byNode = new Map<number, number[]>()
    for (const e of graph.edges) {
      if (!byNode.has(e.nodeIndex)) byNode.set(e.nodeIndex, [])
      byNode.get(e.nodeIndex)!.push(e.providerIndex)
    }
    const queue = [graph.rootIndex]
    while (queue.length > 0) {
      const cur = queue.shift()!
      const d = depth.get(cur)!
      for (const up of byNode.get(cur) ?? []) {
        if (!depth.has(up)) {
          depth.set(up, d + 1)
          queue.push(up)
        }
      }
    }
    const byDepth = new Map<number, number[]>()
    for (const n of graph.nodes) {
      const d = depth.get(n.index) ?? 0
      if (!byDepth.has(d)) byDepth.set(d, [])
      byDepth.get(d)!.push(n.index)
    }
    const pos = new Map<number, { x: number; y: number }>()
    for (const [d, idxs] of byDepth) {
      idxs.forEach((ni, i) => {
        pos.set(ni, { x: d * 300, y: i * 110 - ((idxs.length - 1) * 110) / 2 })
      })
    }
    const maxTotal = Math.max(...graph.nodes.map((n) => Math.abs(n.totalResult)), 0)
    const nodes: Node[] = graph.nodes
      .filter((n) => pos.has(n.index))
      .map((n) => ({
        id: String(n.index),
        position: pos.get(n.index)!,
        data: { label: `${n.techFlow.provider?.name ?? ''}\n${fmt(n.totalResult)}` },
        style: {
          background: n.index === graph.rootIndex ? '#2f5d43' : '#fdfdfb',
          color: n.index === graph.rootIndex ? '#fdfdfb' : '#26292c',
          border: '1px solid #b9b4a8',
          borderRadius: '2px',
          fontSize: '10px',
          padding: '6px 8px',
          width: 220,
          opacity: maxTotal > 0 ? 0.55 + 0.45 * (Math.abs(n.totalResult) / maxTotal) : 1,
        },
      }))
    const edges: Edge[] = graph.edges
      .filter((e) => pos.has(e.nodeIndex) && pos.has(e.providerIndex))
      .map((e, i) => ({
        id: `se${i}`,
        source: String(e.providerIndex),
        target: String(e.nodeIndex),
        style: { stroke: '#8a8577', strokeWidth: 1 + 5 * Math.min(Math.max(e.upstreamShare, 0), 1) },
      }))
    return { nodes, edges }
  }, [graph])

  const exportContributions = () => {
    if (!rows) return
    const cat = impacts.find((i) => i.impactCategory['@id'] === catId)
    saveCsv(
      'contributions.csv',
      toCsv([
        [`${t('contributions')}: ${cat?.impactCategory.name ?? ''}`],
        [t('name'), t('location'), t('amount')],
        ...rows.map((r) => [r.techFlow.provider?.name ?? '', r.techFlow.provider?.location ?? '', r.amount]),
      ]),
    )
  }

  return (
    <div className="border border-line bg-paper p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-soft">{t('contributions')}</div>
        <div className="flex items-center gap-2">
          <select
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            className="px-2 py-1 bg-paper border border-line text-[12px] outline-none max-w-[420px]"
          >
            {impacts.map((i) => (
              <option key={i.impactCategory['@id']} value={i.impactCategory['@id']}>
                {i.impactCategory.name}
              </option>
            ))}
          </select>
          {rows && rows.length > 0 && (
            <button onClick={exportContributions} className="text-[11px] font-sans text-graphite-mid hover:text-graphite cursor-pointer">
              ⇓ CSV
            </button>
          )}
        </div>
      </div>

      {error && <ErrorBox message={error} />}
      {!rows && !error && <Spinner label={t('loading')} />}

      {rows && rows.length > 0 && (
        <table className="w-full text-[12px] border-collapse mb-3">
          <thead>
            <tr className="text-left text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
              <th className="py-1.5 pr-3 font-medium">{t('name')}</th>
              <th className="py-1.5 pr-3 font-medium w-[80px]">{t('location')}</th>
              <th className="py-1.5 pr-3 font-medium w-[220px]"></th>
              <th className="py-1.5 font-medium w-[130px] text-right">{t('amount')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((r, i) => {
              const pid = r.techFlow.provider?.['@id']
              const share = max > 0 ? Math.abs(r.amount) / max : 0
              return (
                <tr
                  key={`${pid}-${i}`}
                  className={`border-t border-line ${pid ? 'cursor-pointer hover:bg-paper-2' : ''}`}
                  onClick={() =>
                    pid &&
                    openTab({
                      key: tabKey('Process', pid),
                      type: 'Process',
                      id: pid,
                      name: r.techFlow.provider?.name ?? pid,
                    })
                  }
                >
                  <td className="py-1 pr-3">
                    <div className="truncate max-w-[420px]" title={r.techFlow.provider?.name}>
                      {r.techFlow.provider?.name ?? '—'}
                    </div>
                    <div className="text-[10px] text-graphite-soft truncate">{r.techFlow.flow?.name}</div>
                  </td>
                  <td className="py-1 pr-3 text-graphite-mid">{r.techFlow.provider?.location ?? '—'}</td>
                  <td className="py-1 pr-3">
                    <div className="h-[10px] bg-paper-2 border border-line">
                      <div className="h-full bg-e-3" style={{ width: `${(share * 100).toFixed(1)}%` }} />
                    </div>
                  </td>
                  <td className="py-1 text-right font-mono whitespace-nowrap">{fmt(r.amount)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {nodes.length > 1 && (
        <div className="h-[360px] border border-line bg-paper-2">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            nodesConnectable={false}
            minZoom={0.1}
            proOptions={{ hideAttribution: false }}
          >
            <Background gap={24} size={1} color="#d8d4c8" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      )}
    </div>
  )
}

function parseEntry(entry: unknown, n: number): number[] {
  const values = new Array<number>(n).fill(0)
  if (typeof entry !== 'string') return values
  const s = entry.trim()
  if (s.length < 2) return values
  const parts = s.slice(1, -1).split(';')
  for (let i = 0; i < n; i++) {
    const p = (parts[i] ?? '').trim()
    if (p === '' || p === 'n.a.') continue
    const v = parseInt(p)
    if (v > 0) values[i] = v
  }
  return values
}

function buildEntry(values: number[]): string {
  return '(' + values.map((v) => (v > 0 ? String(v) : 'n.a.')).join(';') + ')'
}

function DQSection({ draft, patch }: { draft: Process; patch: (p: Partial<Process>) => void }) {
  const t = useI18n((s) => s.t)
  const [systems, setSystems] = useState<Descriptor[] | null>(null)
  const [system, setSystem] = useState<DQSystemDetail | null>(null)

  useEffect(() => {
    getDescriptors('DQSystem')
      .then(setSystems)
      .catch(() => setSystems([]))
  }, [])

  const selectedId =
    typeof draft.dqSystem === 'string' ? draft.dqSystem : ((draft.dqSystem as Descriptor | undefined)?.['@id'] ?? '')

  useEffect(() => {
    if (!selectedId) {
      setSystem(null)
      return
    }
    let alive = true
    getEntity<DQSystemDetail>('DQSystem', selectedId)
      .then((s) => alive && setSystem(s))
      .catch(() => alive && setSystem(null))
    return () => {
      alive = false
    }
  }, [selectedId])

  const indicators = useMemo(
    () => [...(system?.indicators ?? [])].sort((a, b) => a.position - b.position),
    [system],
  )
  const values = useMemo(() => parseEntry(draft.dqEntry, indicators.length), [draft.dqEntry, indicators.length])

  const setValue = (idx: number, v: number) => {
    const next = [...values]
    next[idx] = v
    patch({ dqEntry: buildEntry(next) })
  }

  return (
    <section className="mb-8">
      <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid border-b border-line pb-1.5 mb-3">
        {t('dq_title')}
      </h3>
      <Field label={t('dq_system')}>
        <select
          value={selectedId}
          onChange={(e) => {
            const id = e.target.value
            if (!id) {
              patch({ dqSystem: null, dqEntry: null })
            } else {
              const d = systems?.find((s) => s['@id'] === id)
              patch({
                dqSystem: { '@type': 'DQSystem', '@id': id, name: d?.name ?? '' },
                dqEntry: draft.dqEntry ?? null,
              })
            }
          }}
          className="w-full px-2 py-1 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid"
        >
          <option value="">—</option>
          {(systems ?? []).map((s) => (
            <option key={s['@id']} value={s['@id']}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      {selectedId && !system && <div className="py-2"><Spinner label={t('loading')} /></div>}
      {system && indicators.length > 0 && (
        <table className="w-full text-[13px] border-collapse mt-2">
          <tbody>
            {indicators.map((ind, i) => (
              <tr key={i} className="border-t border-line">
                <td className="py-1.5 pr-3 w-[320px]">
                  {ind.position}. {ind.name}
                </td>
                <td className="py-1.5">
                  <select
                    value={values[i] ?? 0}
                    onChange={(e) => setValue(i, Number(e.target.value))}
                    className="w-full px-2 py-1 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid"
                  >
                    <option value={0}>{t('dq_na')}</option>
                    {[...ind.scores]
                      .sort((a, b) => a.position - b.position)
                      .map((s) => (
                        <option key={s.position} value={s.position}>
                          {s.position} — {s.label}
                        </option>
                      ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
