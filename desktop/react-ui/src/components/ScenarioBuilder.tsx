import { useMemo, useState } from 'react'
import { getDescriptors } from '../api/ipc'
import type { Descriptor } from '../api/types'
import { useI18n, type Lang } from '../i18n'
import { buildScenario, PROVINCES, ROUTES, type ScenarioResult } from '../lib/scenario'
import { Button, ErrorBox, Spinner } from './ui/primitives'

const INPUT =
  'w-full px-2.5 py-1.5 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid'

export function ScenarioBuilder({
  open,
  onClose,
  onOpenEntity,
}: {
  open: boolean
  onClose: () => void
  onOpenEntity: (type: 'ProductSystem', id: string, name: string) => void
}) {
  const t = useI18n((s) => s.t)
  const lang = useI18n((s) => s.lang) as Lang
  const [step, setStep] = useState(1)
  const [province, setProvince] = useState<string | null>('Heilongjiang')
  const [routeId, setRouteId] = useState('ethanol-sorghum')
  const [customIds, setCustomIds] = useState<string[]>([])
  const [customRefId, setCustomRefId] = useState<string | null>(null)
  const [customQuery, setCustomQuery] = useState('')
  const [customList, setCustomList] = useState<Descriptor[] | null>(null)
  const [annualT, setAnnualT] = useState(10000)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ScenarioResult | null>(null)
  const [saved, setSaved] = useState(false)

  const route = ROUTES.find((r) => r.id === routeId) ?? ROUTES[0]

  const loadCustom = async () => {
    if (customList) return
    setCustomList(await getDescriptors('Process'))
  }
  const filteredCustom = useMemo(() => {
    if (!customList) return []
    const q = customQuery.trim().toLowerCase()
    return (q ? customList.filter((d) => d.name.toLowerCase().includes(q)) : customList).slice(0, 200)
  }, [customList, customQuery])

  if (!open) return null

  const pick = (l: { ru: string; en: string; zh: string }) => l[lang] ?? l.en

  const run = async () => {
    setBusy(true)
    setError('')
    setResult(null)
    setSaved(false)
    try {
      const r = await buildScenario(
        { province, routeId, customIds, customRefId, annualT },
        (n) => setNote(t('sc_prog_' + n) || n),
      )
      setResult(r)
      setStep(4)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
      setNote('')
    }
  }

  const saveCloud = async () => {
    if (!result) return
    setBusy(true)
    setError('')
    try {
      const cc = result.impacts.find((i) => /climate change/i.test(i.name) && !/fossil|biogenic/i.test(i.name))
      await window.desktop!.cloudReportSave({
        source: 'scenario',
        product_title: `${pick(route.label)} — ${province ?? 'CN'} (${annualT} t/y)`,
        functional_unit: `1 t ${result.refFlowName}; annual ${annualT} t`,
        system_boundary: t('ex_boundary'),
        method: result.methodName,
        region: province ?? 'CN',
        total_co2eq: cc?.perT ?? 0,
        report_data: {
          source: 'scenario',
          route: route.id,
          province,
          annual_t: annualT,
          ps_id: result.psId,
          result_id: result.resultId,
          impacts: result.impacts,
          warnings: result.warnings,
        },
      })
      setSaved(true)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
    }
  }

  const steps = [t('sc_step_region'), t('sc_step_route'), t('sc_step_volume'), t('sc_step_results')]

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-paper border border-line w-[760px] max-h-[88vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">◈ {t('scenario_title')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">
            ×
          </button>
        </div>

        <div className="px-4 py-2 border-b border-line flex gap-1 text-[12px]">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => !busy && setStep(i + 1)}
              className={`px-2 py-1 border cursor-pointer ${
                step === i + 1 ? 'border-graphite bg-paper-2' : 'border-line text-graphite-soft'
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && <ErrorBox message={error} />}

          {step === 1 && (
            <>
              <div className="text-[12px] text-graphite-soft">{t('sc_region_hint')}</div>
              <select value={province ?? ''} onChange={(e) => setProvince(e.target.value || null)} className={INPUT}>
                <option value="">{t('sc_region_nat')}</option>
                {PROVINCES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {pick(p.label)}
                  </option>
                ))}
              </select>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>{t('sc_next')}</Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                {ROUTES.map((r) => (
                  <label
                    key={r.id}
                    className={`block border p-2.5 cursor-pointer ${
                      routeId === r.id ? 'border-graphite bg-paper-2' : 'border-line'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="route"
                        checked={routeId === r.id}
                        onChange={() => setRouteId(r.id)}
                        className="cursor-pointer"
                      />
                      <span className="text-[13px] font-semibold">{pick(r.label)}</span>
                    </div>
                    <div className="text-[12px] text-graphite-soft ml-6 mt-1">{pick(r.desc)}</div>
                  </label>
                ))}
              </div>

              {route.custom && (
                <div className="border border-line p-2 space-y-2">
                  <input
                    value={customQuery}
                    onChange={(e) => {
                      setCustomQuery(e.target.value)
                      void loadCustom()
                    }}
                    onFocus={() => void loadCustom()}
                    placeholder={t('search_placeholder')}
                    className={INPUT}
                  />
                  <div className="max-h-[220px] overflow-y-auto border border-line">
                    {!customList && <div className="p-2 text-[12px] text-graphite-soft">{t('loading')}</div>}
                    {filteredCustom.map((d) => (
                      <div key={d['@id']} className="flex items-center gap-2 px-2 py-1 border-t border-line text-[12px]">
                        <input
                          type="checkbox"
                          checked={customIds.includes(d['@id'])}
                          onChange={(e) =>
                            setCustomIds(
                              e.target.checked
                                ? [...customIds, d['@id']]
                                : customIds.filter((x) => x !== d['@id']),
                            )
                          }
                          className="cursor-pointer"
                        />
                        <input
                          type="radio"
                          name="customref"
                          title={t('sc_custom_ref')}
                          checked={customRefId === d['@id']}
                          onChange={() => setCustomRefId(d['@id'])}
                          className="cursor-pointer"
                        />
                        <span className="truncate">{d.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-graphite-soft">{t('sc_custom_hint')}</div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  {t('sc_back')}
                </Button>
                <Button onClick={() => setStep(3)}>{t('sc_next')}</Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <label className="block text-[12px] text-graphite-soft">{t('sc_volume_hint')}</label>
              <input
                type="number"
                min={1}
                value={annualT}
                onChange={(e) => setAnnualT(Math.max(1, Number(e.target.value) || 1))}
                className={INPUT}
              />
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  {t('sc_back')}
                </Button>
                <Button onClick={() => void run()} disabled={busy}>
                  {busy ? `${t('sc_running')} ${note}` : t('sc_run')}
                </Button>
              </div>
              {busy && <Spinner label={t('loading')} />}
            </>
          )}

          {step === 4 && result && (
            <>
              <div className="text-[12px] text-graphite-soft">
                {pick(route.label)} · {province ?? 'CN'} · {annualT} t/y · {result.methodName} · PS:{' '}
                <button
                  className="underline cursor-pointer"
                  onClick={() => onOpenEntity('ProductSystem', result.psId, result.psName)}
                >
                  {result.psName}
                </button>
              </div>
              {result.warnings.length > 0 && (
                <div className="border border-line bg-paper-2 p-2 text-[12px] space-y-1">
                  {result.warnings.map((w, i) => (
                    <div key={i}>
                      ⚠ {w.startsWith('CHAIN_MISSING:') ? t('sc_warn_missing') + ' ' + w.slice(14) : w === 'NO_REGIONAL_PROVIDER' ? t('sc_warn_regional') : w === 'NO_METHOD' ? t('sc_warn_method') : w}
                    </div>
                  ))}
                </div>
              )}
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="bg-paper-2">
                    <th className="text-left px-2 py-1 border border-line">{t('sc_category')}</th>
                    <th className="text-right px-2 py-1 border border-line">{t('sc_per_t')}</th>
                    <th className="text-right px-2 py-1 border border-line">{t('sc_per_year')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.impacts.map((i, k) => (
                    <tr key={k}>
                      <td className="px-2 py-1 border border-line">
                        {i.name} <span className="text-graphite-soft">[{i.unit}]</span>
                      </td>
                      <td className="px-2 py-1 border border-line text-right font-mono">{i.perT.toPrecision(4)}</td>
                      <td className="px-2 py-1 border border-line text-right font-mono">{i.annual.toPrecision(4)}</td>
                    </tr>
                  ))}
                  {result.impacts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-2 py-2 border border-line text-graphite-soft">
                        {t('sc_no_impacts')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  {t('sc_again')}
                </Button>
                <Button onClick={() => void saveCloud()} disabled={busy}>
                  ☁ {t('cloud_save')}
                </Button>
                {saved && <span className="text-[12px] text-graphite-soft">{t('sc_saved')}</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
