import { useEffect, useMemo, useState } from 'react'
import { useI18n, type Lang } from '../i18n'
import { getDescriptors } from '../api/ipc'
import { buildPlant, type CoprodMode, type PlantResult } from '../lib/plant'
import { CULT_NORMS, FEEDS, GEO, TECHS, feedYield, resolveParams } from '../lib/refdata'
import { monteCarlo, sensitivity, type UncertInput } from '../lib/uncertainty'
import { toast } from '../lib/toast'
import { Sankey } from './Sankey'
import { BarList, Histogram, KpiCard, Tornado } from './ui/charts'
import { Button, ErrorBox, Spinner } from './ui/primitives'

const INPUT =
  'w-full px-2.5 py-1.5 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid'

export function PlantWizard({
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
  const [province, setProvince] = useState('Heilongjiang')
  const [city, setCity] = useState<string | null>('Harbin')
  const [techId, setTechId] = useState('corn-ssf')
  const [coprodMode, setCoprodMode] = useState<CoprodMode>('expansion')
  const [capacityT, setCapacityT] = useState(10000)
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<PlantResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [uncert, setUncert] = useState<{
    mc: ReturnType<typeof monteCarlo>
    sens: ReturnType<typeof sensitivity>
  } | null>(null)
  const [showSankey, setShowSankey] = useState(false)
  const [sankeyCat, setSankeyCat] = useState('')

  useEffect(() => {
    if (!result) return
    getDescriptors('ImpactCategory')
      .then((cs) => {
        const cc = cs.find((c) => /climate change/i.test(c.name) && !/fossil|biogenic/i.test(c.name))
        if (cc) setSankeyCat(cc['@id'])
      })
      .catch(() => undefined)
  }, [result])

  const geo = GEO.find((g) => g.province === province) ?? GEO[0]
  const tech = TECHS.find((x) => x.id === techId) ?? TECHS[0]
  const pick = (l: { ru: string; en: string; zh: string }) => l[lang] ?? l.en

  const sheet = useMemo(() => {
    const cityEntry = city ? geo.cities.find((c) => c.id === city) ?? null : null
    const yieldDp = feedYield(geo, cityEntry, tech.feed)
    const transportDp = cityEntry?.transportRadiusKm ?? geo.transportRadiusKm
    const norms = CULT_NORMS[tech.feed]
    return [
      // --- MACRO ASSUMPTIONS (technology parameters) ---
      ...resolveParams(tech, overrides),
      {
        key: 'yield',
        label: {
          ru: `Урожайность: ${FEEDS[tech.feed]?.label.ru ?? tech.feed}`,
          en: `Yield: ${FEEDS[tech.feed]?.label.en ?? tech.feed}`,
          zh: `单产: ${FEEDS[tech.feed]?.label.zh ?? tech.feed}`,
        },
        unit: yieldDp.unit,
        value: overrides['yield'] ?? yieldDp.value,
        source: yieldDp.source,
        overridden: overrides['yield'] !== undefined,
      },
      {
        key: 'grid_ef',
        label: { ru: 'EF электросети провинции', en: 'Provincial grid EF', zh: '省电网排放因子' },
        unit: geo.gridEF.unit,
        value: overrides['grid_ef'] ?? geo.gridEF.value,
        source: geo.gridEF.source,
        overridden: overrides['grid_ef'] !== undefined,
      },
      {
        key: 'transport_radius_km',
        label: { ru: 'Транспортное плечо (поле→завод)', en: 'Transport radius (farm→plant)', zh: '运输半径（农田→工厂）' },
        unit: 'km',
        value: overrides['transport_radius_km'] ?? transportDp.value,
        source: transportDp.source,
        overridden: overrides['transport_radius_km'] !== undefined,
      },
      ...(tech.coprod
        ? [
            {
              key: 'coprod',
              label: tech.coprod.label,
              unit: tech.coprod.unit,
              value: overrides['coprod'] ?? tech.coprod.value,
              source: { title: 'process template', publisher: '', year: 2021 },
              overridden: overrides['coprod'] !== undefined,
            },
          ]
        : []),
      // --- PROCESS DATA (cultivation norms per ha) ---
      {
        key: 'cult_n',
        label: { ru: 'Азотные удобрения (N)', en: 'Nitrogen fertilizer (N)', zh: '氮肥（N）' },
        unit: norms.nKgPerHa.unit,
        value: overrides['cult_n'] ?? norms.nKgPerHa.value,
        source: norms.nKgPerHa.source,
        overridden: overrides['cult_n'] !== undefined,
      },
      {
        key: 'cult_p',
        label: { ru: 'Фосфорные удобрения (P2O5)', en: 'Phosphorus fertilizer (P2O5)', zh: '磷肥（P2O5）' },
        unit: norms.pKgPerHa.unit,
        value: overrides['cult_p'] ?? norms.pKgPerHa.value,
        source: norms.pKgPerHa.source,
        overridden: overrides['cult_p'] !== undefined,
      },
      {
        key: 'cult_k',
        label: { ru: 'Калийные удобрения (K2O)', en: 'Potassium fertilizer (K2O)', zh: '钾肥（K2O）' },
        unit: norms.kKgPerHa.unit,
        value: overrides['cult_k'] ?? norms.kKgPerHa.value,
        source: norms.kKgPerHa.source,
        overridden: overrides['cult_k'] !== undefined,
      },
      {
        key: 'cult_diesel',
        label: { ru: 'Дизель для с/х техники', en: 'Diesel for agricultural machinery', zh: '农业机械用柴油' },
        unit: norms.dieselLPerHa.unit,
        value: overrides['cult_diesel'] ?? norms.dieselLPerHa.value,
        source: norms.dieselLPerHa.source,
        overridden: overrides['cult_diesel'] !== undefined,
      },
      {
        key: 'cult_seed',
        label: { ru: 'Семена', en: 'Seeds', zh: '种子' },
        unit: norms.seedKgPerHa.unit,
        value: overrides['cult_seed'] ?? norms.seedKgPerHa.value,
        source: norms.seedKgPerHa.source,
        overridden: overrides['cult_seed'] !== undefined,
      },
      {
        key: 'cult_herbicide',
        label: { ru: 'Гербициды', en: 'Herbicides', zh: '除草剂' },
        unit: norms.herbicideKgPerHa.unit,
        value: overrides['cult_herbicide'] ?? norms.herbicideKgPerHa.value,
        source: norms.herbicideKgPerHa.source,
        overridden: overrides['cult_herbicide'] !== undefined,
      },
      {
        key: 'cult_pesticide',
        label: { ru: 'Пестициды', en: 'Pesticides', zh: '杀虫剂' },
        unit: norms.pesticideKgPerHa.unit,
        value: overrides['cult_pesticide'] ?? norms.pesticideKgPerHa.value,
        source: norms.pesticideKgPerHa.source,
        overridden: overrides['cult_pesticide'] !== undefined,
      },
      {
        key: 'cult_irrig_water',
        label: { ru: 'Вода для ирригации', en: 'Irrigation water', zh: '灌溉用水' },
        unit: norms.irrigWaterM3PerHa.unit,
        value: overrides['cult_irrig_water'] ?? norms.irrigWaterM3PerHa.value,
        source: norms.irrigWaterM3PerHa.source,
        overridden: overrides['cult_irrig_water'] !== undefined,
      },
      {
        key: 'cult_irrig_elec',
        label: { ru: 'Электроэнергия для ирригации', en: 'Irrigation electricity', zh: '灌溉用电' },
        unit: norms.irrigElecKwhPerHa.unit,
        value: overrides['cult_irrig_elec'] ?? norms.irrigElecKwhPerHa.value,
        source: norms.irrigElecKwhPerHa.source,
        overridden: overrides['cult_irrig_elec'] !== undefined,
      },
    ]
  }, [tech, overrides, geo, city])

  if (!open) return null

  const run = async () => {
    setBusy(true)
    setError('')
    setResult(null)
    setSaved(false)
    try {
      const r = await buildPlant(
        { province, city, techId, capacityT, overrides, coprodMode },
        (n) => setNote(t('sc_prog_' + n) || n),
      )
      setResult(r)
      setStep(5)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
      setNote('')
    }
  }

  const computeUncert = () => {
    const cityEntry = city ? geo.cities.find((c) => c.id === city) ?? null : null
    const yieldDp = feedYield(geo, cityEntry, tech.feed)
    const uinp: UncertInput = {
      tech,
      yieldT: overrides['yield'] ?? yieldDp.value,
      gridEF: overrides['grid_ef'] ?? geo.gridEF.value,
      transportKm: overrides['transport_radius_km'] ?? (cityEntry?.transportRadiusKm?.value ?? geo.transportRadiusKm.value),
      overrides,
      coprodMode,
    }
    setUncert({ mc: monteCarlo(uinp, 1000), sens: sensitivity(uinp) })
  }

  const saveCloud = async () => {
    if (!result) return
    setBusy(true)
    setError('')
    try {
      const cc = result.impacts.find(
        (i) => /climate change/i.test(i.name) && !/fossil|biogenic/i.test(i.name),
      )
      await window.desktop!.cloudReportSave({
        source: 'plant',
        product_title: `${pick(tech.label)} — ${city ?? province}, ${capacityT} t/y`,
        functional_unit: `1 t bioethanol; annual ${capacityT} t`,
        system_boundary: t('ex_boundary'),
        method: result.methodName,
        region: `${province}${city ? ' / ' + city : ''}`,
        total_co2eq: cc?.perT ?? 0,
        report_data: {
          source: 'plant',
          site: { province, city },
          tech: techId,
          coprod_mode: result.coprodModeUsed,
          capacity_t: capacityT,
          overrides,
          assumptions: result.assumptions,
          area_ha_per_t: result.areaHaPerT,
          ps_id: result.psId,
          result_id: result.resultId,
          impacts: result.impacts,
          warnings: result.warnings,
        },
      })
      setSaved(true)
      toast.ok(t('sc_saved'))
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e)
      setError(msg)
      toast.err(msg)
    } finally {
      setBusy(false)
    }
  }

  const steps = [
    t('pw_step_site'),
    t('pw_step_tech'),
    t('pw_step_capacity'),
    t('pw_step_assumptions'),
    t('sc_step_results'),
  ]

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-paper border border-line w-[820px] max-h-[88vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">⌂ {t('pw_title')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">
            ×
          </button>
        </div>

        <div className="px-4 py-2 border-b border-line flex gap-1 text-[12px] flex-wrap">
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
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-[11px] uppercase tracking-wide text-graphite-mid mb-1">{t('pw_province')}</div>
                  <select
                    value={province}
                    onChange={(e) => {
                      setProvince(e.target.value)
                      setCity(null)
                    }}
                    className={INPUT}
                  >
                    {GEO.map((g) => (
                      <option key={g.province} value={g.province}>
                        {pick(g.label)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <div className="text-[11px] uppercase tracking-wide text-graphite-mid mb-1">{t('pw_city')}</div>
                  <select value={city ?? ''} onChange={(e) => setCity(e.target.value || null)} className={INPUT}>
                    <option value="">{t('pw_city_none')}</option>
                    {geo.cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {pick(c.label)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="text-[12px] text-graphite-soft">
                {t('pw_site_hint')} {geo.gridProcessMatch}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>{t('sc_next')}</Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                {TECHS.map((r) => (
                  <label
                    key={r.id}
                    className={`block border p-2.5 cursor-pointer ${
                      techId === r.id ? 'border-graphite bg-paper-2' : 'border-line'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="tech"
                        checked={techId === r.id}
                        onChange={() => setTechId(r.id)}
                        className="cursor-pointer"
                      />
                      <span className="text-[13px] font-semibold">{pick(r.label)}</span>
                    </div>
                    <div className="text-[12px] text-graphite-soft ml-6 mt-1">{pick(r.desc)}</div>
                  </label>
                ))}
              </div>
              {tech.coprod && (
                <label className="block">
                  <div className="text-[11px] uppercase tracking-wide text-graphite-mid mb-1">{t('pw_coprod_mode')}</div>
                  <select value={coprodMode} onChange={(e) => setCoprodMode(e.target.value as CoprodMode)} className={INPUT}>
                    <option value="expansion">{t('pw_mode_expansion')}</option>
                    <option value="alloc-mass">{t('pw_mode_alloc_mass')}</option>
                    <option value="alloc-economic">{t('pw_mode_alloc_ec')}</option>
                    <option value="none">{t('pw_mode_none')}</option>
                  </select>
                </label>
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
                value={capacityT}
                onChange={(e) => setCapacityT(Math.max(1, Number(e.target.value) || 1))}
                className={INPUT}
              />
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  {t('sc_back')}
                </Button>
                <Button onClick={() => setStep(4)}>{t('sc_next')}</Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="bg-paper-2">
                    <th className="text-left px-2 py-1 border border-line">{t('pw_param')}</th>
                    <th className="text-right px-2 py-1 border border-line">{t('pw_value')}</th>
                    <th className="text-left px-2 py-1 border border-line">{t('pw_unit')}</th>
                    <th className="text-left px-2 py-1 border border-line">{t('pw_source')}</th>
                    <th className="text-right px-2 py-1 border border-line">{t('pw_override')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.map((row) => (
                    <tr key={row.key}>
                      <td className="px-2 py-1 border border-line">
                        {pick(row.label)}
                        {row.overridden && <span className="text-graphite-soft"> ✎</span>}
                      </td>
                      <td className="px-2 py-1 border border-line text-right font-mono">{row.value}</td>
                      <td className="px-2 py-1 border border-line">{row.unit}</td>
                      <td className="px-2 py-1 border border-line text-graphite-soft">
                        {row.source.title} ({row.source.year})
                      </td>
                      <td className="px-2 py-1 border border-line text-right">
                        <input
                          type="number"
                          step="any"
                          placeholder="—"
                          value={overrides[row.key] ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            setOverrides((o) => {
                              const n = { ...o }
                              if (v === '') delete n[row.key]
                              else n[row.key] = Number(v)
                              return n
                            })
                          }}
                          className="w-[90px] px-1 py-0.5 bg-paper border border-line text-[12px] text-right outline-none focus:border-graphite-mid"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[11px] text-graphite-soft">{t('pw_assumptions_hint')}</div>
              <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => setStep(3)}>
                  {t('sc_back')}
                </Button>
                <div className="flex items-center gap-3">
                  {busy && <Spinner label={`${t('sc_running')} ${note}`} />}
                  <Button onClick={() => void run()} disabled={busy}>
                    {t('pw_calc')}
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 5 && result && (
            <>
              <div className="text-[12px] text-graphite-soft">
                {pick(tech.label)} · {city ?? province} · {capacityT} t/y · {result.methodName} ·{' '}
                {t('pw_area')}: {result.areaHaPerT.toFixed(3)} ha/t · PS:{' '}
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
                      ⚠{' '}
                      {w === 'NO_REGIONAL_GRID'
                        ? t('pw_warn_grid')
                        : w === 'NO_STEAM_PROVIDER'
                          ? t('pw_warn_steam')
                          : w === 'EXPANSION_FALLBACK'
                            ? t('pw_warn_expansion')
                            : w === 'NO_METHOD'
                              ? t('sc_warn_method')
                              : w}
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
              {(() => {
                const cc = result.impacts.find((i) => /climate change/i.test(i.name) && !/fossil|biogenic/i.test(i.name))
                const fos = result.impacts.find((i) => /climate change - fossil/i.test(i.name))
                const bio = result.impacts.find((i) => /climate change - biogenic/i.test(i.name))
                return (
                  <div className="space-y-3">
                    <div className="kpi-grid">
                      {cc && <KpiCard label={cc.name} value={cc.perT.toPrecision(4)} unit={cc.unit} tone={cc.perT < 0 ? 'pos' : 'neg'} />}
                      {fos && <KpiCard label={fos.name} value={fos.perT.toPrecision(4)} unit={fos.unit} tone="neg" />}
                      {bio && <KpiCard label={bio.name} value={bio.perT.toPrecision(4)} unit={bio.unit} tone="pos" />}
                    </div>
                    <BarList
                      items={result.impacts.map((i) => ({
                        label: `${i.name} [${i.unit}]`,
                        value: i.perT,
                        display: i.perT.toPrecision(4),
                        neg: i.perT > 0,
                      }))}
                    />
                    <div>
                      <Button variant="ghost" onClick={() => setShowSankey((s) => !s)}>
                        {showSankey ? '− Sankey' : '+ Sankey'}
                      </Button>
                    </div>
                    {showSankey && sankeyCat && <Sankey psId={result.psId} impactCategoryId={sankeyCat} />}
                  </div>
                )
              })()}
              {result.econ && (
                <div className="space-y-1">
                  <div className="text-[12px] font-semibold uppercase tracking-wide">{t('ec_title')}</div>
                  <table className="w-full text-[12px] border-collapse">
                    <tbody>
                      <tr>
                        <td className="px-2 py-1 border border-line">{t('ec_capex')}</td>
                        <td className="px-2 py-1 border border-line text-right font-mono">
                          {(result.econ.capexYuan / 1e6).toFixed(1)} {t('ec_mln_yuan')} ({result.econ.capexLevel})
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 border border-line">{t('ec_station_capex')}</td>
                        <td className="px-2 py-1 border border-line text-right font-mono">
                          {(result.econ.stationCapexYuan / 1e6).toFixed(1)} {t('ec_mln_yuan')}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 border border-line">{t('ec_opex')}</td>
                        <td className="px-2 py-1 border border-line text-right font-mono">
                          {(result.econ.annualOpexYuan / 1e6).toFixed(1)} {t('ec_mln_yuan')}/y
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 border border-line">{t('ec_revenue')}</td>
                        <td className="px-2 py-1 border border-line text-right font-mono">
                          {(result.econ.annualRevenueYuan / 1e6).toFixed(1)} {t('ec_mln_yuan')}/y
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 border border-line">{t('ec_net')}</td>
                        <td className="px-2 py-1 border border-line text-right font-mono">
                          {(result.econ.annualNetYuan / 1e6).toFixed(1)} {t('ec_mln_yuan')}/y
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 border border-line">{t('ec_cost_per_t')}</td>
                        <td className="px-2 py-1 border border-line text-right font-mono">
                          {result.econ.costPerTEtOH.toFixed(0)} {t('ec_yuan_t')}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 border border-line">{t('ec_breakeven')}</td>
                        <td className="px-2 py-1 border border-line text-right font-mono">
                          {result.econ.breakEvenPriceYuanPerT.toFixed(0)} {t('ec_yuan_t')}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 border border-line">{t('ec_payback')}</td>
                        <td className="px-2 py-1 border border-line text-right font-mono">
                          {isFinite(result.econ.paybackYr) ? result.econ.paybackYr.toFixed(1) : '∞'} {t('ec_yr')}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 border border-line">{t('ec_npv')}</td>
                        <td className="px-2 py-1 border border-line text-right font-mono">
                          {(result.econ.npvYuan / 1e6).toFixed(1)} {t('ec_mln_yuan')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={computeUncert}>
                  {t('un_run')}
                </Button>
              </div>
              {uncert && (
                <div className="space-y-2">
                  <div className="text-[12px] font-semibold uppercase tracking-wide">
                    {t('un_title')} ({uncert.mc.samples} {t('un_samples')})
                  </div>
                  <div className="kpi-grid">
                    <KpiCard label="MC net P50" value={uncert.mc.net.p50.toFixed(0)} tone={uncert.mc.net.p50 < 0 ? 'pos' : 'neg'} />
                    <KpiCard label="MC net mean" value={uncert.mc.net.mean.toFixed(0)} tone={uncert.mc.net.mean < 0 ? 'pos' : 'neg'} />
                    <KpiCard label="MC net P5–P95" value={`${uncert.mc.net.p5.toFixed(0)} … ${uncert.mc.net.p95.toFixed(0)}`} />
                  </div>
                  <Histogram buckets={uncert.mc.histogram} unit="kg CO2-eq / t" />
                  <div className="text-[12px] font-semibold uppercase tracking-wide">{t('un_sens')}</div>
                  <Tornado rows={uncert.sens.map((s) => ({ label: s.label, low: s.low, high: s.high }))} />
                </div>
              )}
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
