import { useEffect, useState } from 'react'
import { getDescriptors } from '../api/ipc'
import type { Descriptor } from '../api/types'
import {
  chooseCategory,
  collectEntities,
  functionalUnit,
  reportBody,
  reportDoc,
  renderPdfBase64,
  saveViaDialog,
  screening,
} from '../lib/dbexport'
import { useI18n } from '../i18n'
import { Button, ErrorBox, Spinner } from './ui/primitives'

interface Stage {
  name: string
  co2eq: number
  share_pct: number
  sub_processes: Array<{ name: string; amount: number; unit: string; factor: number; factor_source: string; co2eq: number }>
}

interface Rd {
  source?: string
  product_title: string
  functional_unit: string
  system_boundary: string
  method: string
  region: string
  total_co2eq: number
  total_description?: string
  stages: Stage[]
  assumptions?: string[]
  limitations?: string[]
  recommendations?: string[]
  db_name?: string
  saved_at?: string
}

interface HistRow {
  id: string
  product_title: string | null
  total_co2eq: number | null
  report_data: Record<string, unknown> | null
  created_at: string | null
}

export function ReportStudio({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useI18n((s) => s.t)
  const lang = useI18n((s) => s.lang)
  const desktop = window.desktop
  const [cats, setCats] = useState<Descriptor[]>([])
  const [catId, setCatId] = useState('')
  const [rd, setRd] = useState<Rd | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [hist, setHist] = useState<HistRow[] | null>(null)
  const [showHist, setShowHist] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    getDescriptors('ImpactCategory')
      .then(setCats)
      .catch((e) => setError(String(e instanceof Error ? e.message : e)))
    try { desktop?.cloudReportsList?.().then(setHist).catch(() => setHist([])) } catch { setHist([]) }
  }, [open, desktop])

  if (!open || !desktop) return null

  const docLabels = () => ({
    saved: t('ex_l_saved'),
    db: t('ex_l_db'),
    entities: t('ex_l_entities'),
    inventory: t('ex_inventory'),
    lcia: t('ex_lcia'),
    io: t('ex_l_io'),
    flow: t('ex_l_flow'),
    amount: t('ex_l_amount'),
    unit: t('ex_l_unit'),
    provider: t('ex_l_provider'),
    dq: t('ex_l_dq'),
    factor: t('ex_l_factor'),
    in: t('ex_l_in'),
    out: t('ex_l_out'),
  })
  const sections = () => [
    { key: 'analysis', label: t('ex_sec_analysis') },
    { key: 'assumptions', label: t('ex_sec_assumptions') },
    { key: 'limitations', label: t('ex_sec_limitations') },
    { key: 'recommendations', label: t('ex_sec_recommendations') },
  ]

  const generate = async () => {
    setBusy('gen')
    setError('')
    setMsg('')
    try {
      const entities = await collectEntities()
      const cat = (catId && (entities.ImpactCategory || []).find((c) => c['@id'] === catId)) || chooseCategory(entities)
      if (!cat) throw new Error(t('ex_no_cat'))
      const scr = screening(entities, cat, t('ex_factor_source'))
      const method = (entities.ImpactMethod || [])[0]?.name || '—'
      const locs: Record<string, number> = {}
      for (const p of entities.Process || []) {
        const l = typeof p.location === 'string' ? p.location : p.location?.name
        if (l) locs[l] = (locs[l] || 0) + 1
      }
      const region = Object.keys(locs).sort((a, b) => locs[b] - locs[a])[0] || '—'
      const limits = [t('ex_note_screening').replace('{cat}', cat.name || '').replace('{method}', method)]
      if (scr.resultsTotal !== null) limits.push(t('ex_note_results').replace('{v}', String(scr.resultsTotal)))
      let ai: { analysis?: string; assumptions?: string[]; limitations?: string[]; recommendations?: string[] } = {}
      try {
        ai = await desktop.aiReportNarrative({
          lang,
          method,
          impact_category: cat.name,
          ref_unit: cat.refUnit || '',
          functional_unit: functionalUnit(entities),
          region,
          total_screening: scr.sum,
          saved_result: scr.resultsTotal,
          stages: scr.stages.map((g) => ({
            name: g.name,
            value: g.co2eq,
            share_pct: g.share_pct,
            processes: g.sub_processes.map((x) => x.name),
          })),
          db: String((await desktop.getConfig())?.db ?? ''),
          entities: Object.values(entities).reduce((a, x) => a + x.length, 0),
        })
      } catch {
        ai = {}
      }
      setRd({
        source: 'db',
        product_title: `${String((await desktop.getConfig())?.db ?? '')} — ${t('ex_report_suffix')}`,
        functional_unit: functionalUnit(entities),
        system_boundary: t('ex_boundary'),
        method: `${method} / ${cat.name || ''}`,
        region,
        total_co2eq: scr.resultsTotal !== null ? scr.resultsTotal : scr.sum,
        total_description: ai.analysis || '',
        stages: scr.stages,
        assumptions: ai.assumptions || [],
        limitations: (ai.limitations || []).concat(limits),
        recommendations: ai.recommendations || [],
        db_name: String((await desktop.getConfig())?.db ?? ''),
        saved_at: new Date().toLocaleString(),
      })
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy('')
    }
  }

  const exportAs = async (kind: 'word' | 'pdf' | 'json') => {
    if (!rd) return
    setBusy(kind)
    setError('')
    try {
      const base = rd.db_name || 'report'
      if (kind === 'json') {
        const p = await saveViaDialog(desktop, `${base}.json`, [{ name: 'JSON', extensions: ['json'] }], JSON.stringify(rd, null, 2), false)
        if (p) setMsg(`${t('ex_done')}: ${p}`)
        return
      }
      const entities = await collectEntities()
      const inp = {
        title: rd.product_title,
        savedAt: rd.saved_at ?? new Date().toLocaleString(),
        dbName: rd.db_name ?? '',
        entitiesTotal: Object.values(entities).reduce((a, x) => a + x.length, 0),
        rep: {
          analysis: rd.total_description,
          assumptions: rd.assumptions,
          limitations: rd.limitations,
          recommendations: rd.recommendations,
        },
        sections: sections(),
        entities,
        labels: docLabels(),
      }
      if (kind === 'word') {
        const p = await saveViaDialog(desktop, `${base}_report.doc`, [{ name: 'Word', extensions: ['doc'] }], '\ufeff' + reportDoc(inp), false)
        if (p) setMsg(`${t('ex_done')}: ${p}`)
      } else {
        const b64 = await renderPdfBase64(reportBody(inp))
        const p = await saveViaDialog(desktop, `${base}_report.pdf`, [{ name: 'PDF', extensions: ['pdf'] }], b64, true)
        if (p) setMsg(`${t('ex_done')}: ${p}`)
      }
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy('')
    }
  }

  const saveCloud = async () => {
    if (!rd) return
    setBusy('save')
    setError('')
    try {
      const r = await desktop.cloudReportSave(rd as unknown as Record<string, unknown>)
      setMsg(`${t('ex_saved_report')}${r.projectId ? ' (+ ' + t('ex_linked_project') + ')' : ''}`)
      setHist(await desktop.cloudReportsList().catch(() => hist))
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy('')
    }
  }

  const openHist = (h: HistRow) => {
    const d = (h.report_data ?? {}) as unknown as Rd
    setRd({
      source: (d.source as string) || 'history',
      product_title: d.product_title || h.product_title || '—',
      functional_unit: d.functional_unit || '—',
      system_boundary: d.system_boundary || '—',
      method: d.method || '—',
      region: d.region || '—',
      total_co2eq: typeof d.total_co2eq === 'number' ? d.total_co2eq : (h.total_co2eq ?? 0),
      total_description: d.total_description,
      stages: (d.stages as Stage[]) || [],
      assumptions: d.assumptions,
      limitations: d.limitations,
      recommendations: d.recommendations,
      db_name: d.db_name,
      saved_at: h.created_at ?? undefined,
    })
    setShowHist(false)
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-paper border border-line w-[860px] max-h-[90vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">▤ {t('rs_title')}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHist((v) => !v)}
              className="text-[12px] text-graphite-soft hover:text-graphite cursor-pointer border border-line px-2 py-1"
            >
              {t('rs_history')}
            </button>
            <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">
              ×
            </button>
          </div>
        </div>

        <div className="px-4 py-2 border-b border-line flex items-center gap-2 text-[12px] flex-wrap">
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className="px-2 py-1 bg-paper border border-line outline-none">
            <option value="">{t('rs_cat_auto')}</option>
            {cats.map((c) => (
              <option key={c['@id']} value={c['@id']}>
                {c.name}
              </option>
            ))}
          </select>
          <Button onClick={() => void generate()} disabled={!!busy}>
            {busy === 'gen' ? t('loading') : rd ? t('rs_regen') : t('rs_generate')}
          </Button>
          {rd && (
            <>
              <Button variant="ghost" onClick={() => void exportAs('word')} disabled={!!busy}>
                {t('ex_word')}
              </Button>
              <Button variant="ghost" onClick={() => void exportAs('pdf')} disabled={!!busy}>
                {t('ex_pdf')}
              </Button>
              <Button variant="ghost" onClick={() => void exportAs('json')} disabled={!!busy}>
                {t('ex_json')}
              </Button>
              <Button variant="ghost" onClick={() => void saveCloud()} disabled={!!busy}>
                ☁ {t('cloud_save')}
              </Button>
            </>
          )}
          {busy && busy !== 'gen' && <Spinner label={t('loading')} />}
        </div>

        <div className="flex-1 min-h-0 flex">
          {showHist && (
            <div className="w-[240px] shrink-0 border-r border-line overflow-y-auto">
              {!hist && <div className="p-2 text-[12px] text-graphite-soft">{t('loading')}</div>}
              {hist && hist.length === 0 && <div className="p-2 text-[12px] text-graphite-soft">{t('rs_no_history')}</div>}
              {hist?.map((h) => (
                <button
                  key={h.id}
                  onClick={() => openHist(h)}
                  className="block w-full text-left px-2 py-1.5 border-b border-line hover:bg-paper-2 cursor-pointer"
                >
                  <div className="text-[12px] truncate">{h.product_title || '—'}</div>
                  <div className="text-[11px] text-graphite-soft">
                    {h.total_co2eq != null ? `${Number(h.total_co2eq).toPrecision(4)} kg CO2-eq · ` : ''}
                    {(h.created_at || '').slice(0, 10)}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {error && <ErrorBox message={error} />}
            {msg && <div className="text-[12px] text-graphite-soft">{msg}</div>}

            {!rd && !error && (
              <div className="text-[13px] text-graphite-soft p-6 border border-line bg-paper-2">
                {t('rs_hint')}
              </div>
            )}

            {rd && (
              <>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[16px]">{rd.product_title}</h4>
                    <span className="text-[10px] uppercase tracking-widest border border-line px-1.5 py-0.5 text-graphite-soft">
                      {rd.source === 'db' ? t('rs_badge_db') : t('rs_badge_hist')}
                    </span>
                  </div>
                  <div className="text-[12px] text-graphite-soft mt-1 flex flex-wrap gap-x-3">
                    <span>
                      <b>{t('rs_fu')}:</b> {rd.functional_unit}
                    </span>
                    <span>
                      <b>{t('rs_method')}:</b> {rd.method}
                    </span>
                    <span>
                      <b>{t('rs_region')}:</b> {rd.region}
                    </span>
                    <span>
                      <b>{t('rs_total')}:</b> {Number(rd.total_co2eq).toPrecision(5)} kg CO2-eq
                    </span>
                  </div>
                  <div className="text-[12px] text-graphite-soft mt-0.5">{rd.system_boundary}</div>
                </div>

                <div>
                  <h5 className="text-[13px] uppercase tracking-wide text-graphite-mid mb-1">{t('rs_stages')}</h5>
                  {(rd.stages || []).map((s, i) => (
                    <div key={i} className="border border-line mb-2">
                      <div className="flex justify-between px-3 py-1.5 bg-paper-2 text-[12px]">
                        <span>{s.name}</span>
                        <span className="font-mono">
                          {s.co2eq.toPrecision(4)} ({s.share_pct}%)
                        </span>
                      </div>
                      <table className="w-full text-[12px] border-collapse">
                        <tbody>
                          {(s.sub_processes || []).map((sp, j) => (
                            <tr key={j} className="border-t border-line">
                              <td className="py-1 px-3">{sp.name}</td>
                              <td className="py-1 px-3 text-graphite-mid">
                                {sp.amount} {sp.unit} × {sp.factor.toPrecision(3)}
                              </td>
                              <td className="py-1 px-3 text-right font-mono">{sp.co2eq.toPrecision(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                  {(rd.stages || []).length === 0 && (
                    <div className="text-[12px] text-graphite-soft">{t('sc_no_impacts')}</div>
                  )}
                </div>

                {rd.total_description && (
                  <div>
                    <h5 className="text-[13px] uppercase tracking-wide text-graphite-mid mb-1">{t('ex_sec_analysis')}</h5>
                    <p className="text-[13px] whitespace-pre-wrap">{rd.total_description}</p>
                  </div>
                )}
                {(['assumptions', 'limitations', 'recommendations'] as const).map((k) => {
                  const arr = rd[k]
                  if (!arr?.length) return null
                  return (
                    <div key={k}>
                      <h5 className="text-[13px] uppercase tracking-wide text-graphite-mid mb-1">
                        {k === 'assumptions' ? t('ex_sec_assumptions') : k === 'limitations' ? t('ex_sec_limitations') : t('ex_sec_recommendations')}
                      </h5>
                      <ul className="list-disc ml-5 text-[13px] space-y-1">
                        {arr.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
