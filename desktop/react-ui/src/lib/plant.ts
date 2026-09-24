import { getDescriptors, rpc } from '../api/ipc'
import type { L10n } from './refdata'
import {
  CONVERSION_CONSTANTS,
  CULT_NORMS,
  FEEDS,
  GEO,
  TECHS,
  TRANSPORT_PARAMS,
  computeEconomics,
  feedYield,
  resolveParams,
  type EconResult,
} from './refdata'

export type CoprodMode = 'expansion' | 'alloc-mass' | 'alloc-economic' | 'none'

export interface PlantInput {
  province: string
  city: string | null
  techId: string
  capacityT: number
  overrides: Record<string, number>
  coprodMode: CoprodMode
}

export interface AssumptionRow {
  key: string
  label: L10n
  value: number
  unit: string
  year: number
  source: string
  overridden: boolean
}

export interface PlantImpact {
  name: string
  unit: string
  perT: number
  annual: number
}

export interface PlantResult {
  psId: string
  psName: string
  resultId: string
  methodName: string
  impacts: PlantImpact[]
  warnings: string[]
  assumptions: AssumptionRow[]
  areaHaPerT: number
  coprodModeUsed: CoprodMode
  econ: EconResult | null
}

interface Ref {
  '@type'?: string
  '@id': string
  name?: string
}
interface Exch {
  flow?: Ref
  amount?: number
  isInput?: boolean
  unit?: Ref
  flowProperty?: Ref
  defaultProvider?: Ref
  isQuantitativeReference?: boolean
}
interface Proc {
  '@type': string
  '@id': string
  name: string
  processType?: string
  category?: unknown
  exchanges?: Exch[]
  [k: string]: unknown
}

const MJ_PER_T_STEAM = CONVERSION_CONSTANTS.mjPerTSteam.value
const MJ_PER_L_DIESEL = CONVERSION_CONSTANTS.mjPerLDiesel.value
const KG_CO2_PER_L_DIESEL = CONVERSION_CONSTANTS.kgCo2PerLDiesel.value
const KG_WW_PER_M3 = CONVERSION_CONSTANTS.kgWwPerM3Water.value
const EXPANSION_FACTOR = CONVERSION_CONSTANTS.expansionFactor.value
const FERM_CO2_PER_T = CONVERSION_CONSTANTS.fermCo2PerTEthanol.value
const TR_DIESEL_PER_TKM = TRANSPORT_PARAMS.dieselLPerTkm.value
const TR_CO2_PER_L = TRANSPORT_PARAMS.co2KgPerLDiesel.value

export async function buildPlant(
  inp: PlantInput,
  onProgress?: (note: string) => void,
): Promise<PlantResult> {
  const warnings: string[] = []
  const geo = GEO.find((g) => g.province === inp.province)
  if (!geo) throw new Error('GEO_NOT_FOUND')
  const tech = TECHS.find((t) => t.id === inp.techId)
  if (!tech) throw new Error('TECH_NOT_FOUND')
  const params = resolveParams(tech, inp.overrides)
  const P = (k: string) => params.find((p) => p.key === k)?.value ?? 0

  const city = inp.city ? geo.cities.find((c) => c.id === inp.city) ?? null : null
  const feedMeta = FEEDS[tech.feed] ?? FEEDS.sorghum
  const yieldDp = feedYield(geo, city, tech.feed)
  const yieldT = inp.overrides['yield'] ?? yieldDp.value
  const feedPerT = P('feed_per_t')
  const areaHaPerT = feedPerT / Math.max(yieldT, 1e-9)

  onProgress?.('lookup')
  const procs = await getDescriptors('Process')
  const flowsD = await getDescriptors('Flow')
  const flowByName = new Map(flowsD.map((f) => [f.name.toLowerCase(), f]))
  const procByName = (re: RegExp) => procs.find((p) => re.test(p.name))

  const units = new Map<string, Ref>()
  const fps = new Map<string, Ref>()
  for (const ug of await rpc<Array<{ units?: Array<{ '@id': string; name: string }> }>>('data/get/all', {
    '@type': 'UnitGroup',
  })) {
    for (const u of ug.units ?? []) units.set(u.name.toLowerCase(), { '@type': 'Unit', '@id': u['@id'], name: u.name })
  }
  for (const fp of await rpc<Array<{ '@id': string; name: string }>>('data/get/all', { '@type': 'FlowProperty' })) {
    fps.set(fp.name.toLowerCase(), { '@type': 'FlowProperty', '@id': fp['@id'], name: fp.name })
  }
  const U = (n: string) => units.get(n.toLowerCase())
  const FP = (n: string) => fps.get(n.toLowerCase())

  async function ensureFlow(name: string, flowType: string, category: string): Promise<Ref> {
    const hit = flowByName.get(name.toLowerCase())
    if (hit) return { '@type': 'Flow', '@id': hit['@id'], name: hit.name }
    const id = crypto.randomUUID()
    await rpc('data/put', {
      '@type': 'Flow',
      '@id': id,
      name,
      flowType,
      category: { name: category },
      flowProperties: [{ flowProperty: FP('mass'), conversionFactor: 1.0, isRefFlowProperty: true }],
    })
    const ref = { '@type': 'Flow', '@id': id, name }
    flowByName.set(name.toLowerCase(), { '@id': id, name })
    return ref
  }

  const ex = (flow: Ref, amount: number, isInput: boolean, unit?: Ref, fp?: Ref, ref = false): Exch => {
    const e: Exch = { flow, amount, isInput, unit: unit ?? U('kg'), flowProperty: fp ?? FP('mass') }
    if (ref) e.isQuantitativeReference = true
    return e
  }

  // ---- flows
  const feedFlow = await ensureFlow(feedMeta.flowName, 'PRODUCT_FLOW', feedMeta.flowCategory)
  const productFlow = await ensureFlow('bioethanol, anhydrous (99.5%)', 'PRODUCT_FLOW', 'Energy carriers')
  const coprodFlow = tech.coprod
    ? tech.coprod.key === 'ddgs'
      ? await ensureFlow('DDGS, feed, at plant', 'PRODUCT_FLOW', 'Feeds')
      : await ensureFlow('sweet sorghum bagasse, wet (50% H2O), at mill', 'PRODUCT_FLOW', 'Residues')
    : null
  const waterHit = flowByName.get('water, river') ?? flowByName.get('tap water, cn')
  const waterFlow = waterHit
    ? { '@type': 'Flow', '@id': waterHit['@id'], name: waterHit.name }
    : await ensureFlow('water, river', 'ELEMENTARY_FLOW', 'Resources from water')
  const wwFlow = await ensureFlow('wastewater, average, to treatment', 'WASTE_FLOW', 'Wastes')
  const enzymeFlow = await ensureFlow('glucoamylase enzyme', 'PRODUCT_FLOW', 'Chemicals')
  const yeastFlow = await ensureFlow('yeast, Saccharomyces cerevisiae', 'PRODUCT_FLOW', 'Chemicals')
  const ureaFlow = await ensureFlow('urea, as N', 'PRODUCT_FLOW', 'Fertilizers')
  const sspFlow = await ensureFlow('single superphosphate, as P2O5', 'PRODUCT_FLOW', 'Fertilizers')
  const kclFlow = await ensureFlow('potassium chloride, as K2O', 'PRODUCT_FLOW', 'Fertilizers')
  const dieselFlow = await ensureFlow('diesel, burned in agricultural machinery', 'PRODUCT_FLOW', 'Energy carriers')
  const heatFlow = await ensureFlow('heat, district or industrial, natural gas, CN', 'PRODUCT_FLOW', 'Energy carriers')
  const co2bFlow = await ensureFlow('Carbon dioxide, biogenic', 'ELEMENTARY_FLOW', 'Emissions to air')
  const co2fFlow = await ensureFlow('Carbon dioxide, fossil', 'ELEMENTARY_FLOW', 'Emissions to air')
  const n2oFlow = await ensureFlow('Dinitrogen monoxide', 'ELEMENTARY_FLOW', 'Emissions to air')
  const nh3Flow = await ensureFlow('Ammonia', 'ELEMENTARY_FLOW', 'Emissions to air')
  const no3Flow = await ensureFlow('Nitrate', 'ELEMENTARY_FLOW', 'Emissions to water')
  const po4Flow = await ensureFlow('Phosphate', 'ELEMENTARY_FLOW', 'Emissions to water')
  const occFlow = await ensureFlow('Occupation, arable land', 'ELEMENTARY_FLOW', 'Land use')

  // ---- regional grid
  let gridProc: Proc | null = null
  const gridHit = procByName(new RegExp(geo.gridProcessMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
    ?? procByName(/Electricity mix.*Heilongjiang|electricity.*grid.*Heilongjiang/i)
  if (gridHit) {
    gridProc = await rpc<Proc>('data/get', { '@type': 'Process', '@id': gridHit['@id'] })
  } else {
    warnings.push('NO_REGIONAL_GRID')
  }

  // ---- upstream process providers (for defaultProvider linking)
  const ureaProc = procByName(/Urea production/i)
  const sspProc = procByName(/superphosphate production/i)
  const kclProc = procByName(/potassium chloride production/i)
  const dieselProc = procByName(/Diesel production|diesel.*refinery/i)
  const seedProc = procByName(/Seed production/i)
  const herbProc = procByName(/Herbicide production/i)
  const pestProc = procByName(/Pesticide production/i)
  const heatProc = procByName(/Heat production.*boiler|boiler.*heat/i)
  const makeProvider = (hit: { '@id': string; name: string } | undefined): Ref | undefined =>
    hit ? { '@type': 'Process', '@id': hit['@id'], name: hit.name } : undefined

  // ---- cultivation process (per ha)
  const norms = CULT_NORMS[tech.feed]
  // Allow overriding cultivation norms via overrides object
  const normVal = (key: string, dp: { value: number }) => inp.overrides[key] ?? dp.value
  const dmFrac = feedMeta.dmFrac
  const cFrac = CONVERSION_CONSTANTS.cFraction.value
  const co2PerC = CONVERSION_CONSTANTS.co2PerC.value
  const uptakeKg = yieldT * 1000 * dmFrac * cFrac * co2PerC
  const dieselL = normVal('cult_diesel', norms.dieselLPerHa)
  const cultName = `${feedMeta.label.en} cultivation, ${city?.id ?? geo.province} | PLANT`
  const cultId = crypto.randomUUID()

  // --- new flows for missing cultivation inputs ---
  const seedFlow = await ensureFlow(
    `${feedMeta.label.en.toLowerCase()} seed, for sowing`,
    'PRODUCT_FLOW', 'Agricultural products',
  )
  const herbicideFlow = await ensureFlow('herbicide, unspecified, for crop protection', 'PRODUCT_FLOW', 'Chemicals')
  const pesticideFlow = await ensureFlow('pesticide, unspecified, for crop protection', 'PRODUCT_FLOW', 'Chemicals')
  const irrigWaterFlow = waterFlow // reuse water flow for irrigation
  const irrigElecFlow = gridProc
    ? (gridProc.exchanges?.find((e) => e.isQuantitativeReference && !e.isInput) ?? gridProc.exchanges?.find((e) => !e.isInput))?.flow ?? null
    : null
  const machineryFlow = await ensureFlow('agricultural machinery, amortization (tractor, harvester)', 'PRODUCT_FLOW', 'Machinery')

  const cultEx: Exch[] = [
    // fertilizers (overridable, with upstream providers)
    { ...ex(ureaFlow, normVal('cult_n', norms.nKgPerHa), true), defaultProvider: makeProvider(ureaProc) },
    { ...ex(sspFlow, normVal('cult_p', norms.pKgPerHa), true), defaultProvider: makeProvider(sspProc) },
    { ...ex(kclFlow, normVal('cult_k', norms.kKgPerHa), true), defaultProvider: makeProvider(kclProc) },
    // diesel for field operations (overridable, with upstream provider)
    { ...ex(dieselFlow, dieselL * MJ_PER_L_DIESEL, true, U('mj'), FP('energy')), defaultProvider: makeProvider(dieselProc) },
    // --- NEW: seeds, agrochemicals, irrigation, machinery (all overridable, with providers) ---
    { ...ex(seedFlow, normVal('cult_seed', norms.seedKgPerHa), true), defaultProvider: makeProvider(seedProc) },
    { ...ex(herbicideFlow, normVal('cult_herbicide', norms.herbicideKgPerHa), true), defaultProvider: makeProvider(herbProc) },
    { ...ex(pesticideFlow, normVal('cult_pesticide', norms.pesticideKgPerHa), true), defaultProvider: makeProvider(pestProc) },
    ex(irrigWaterFlow, normVal('cult_irrig_water', norms.irrigWaterM3PerHa), true, U('m3'), FP('volume')),
    ex(machineryFlow, norms.machineryUnitPerHa.value, true, U('unit'), FP('mass')),
    // land occupation
    ex(occFlow, 10000, false, U('m2*a'), FP('land occupation')),
    // reference output: harvested feedstock
    ex(feedFlow, yieldT * 1000, false, U('kg'), FP('mass'), true),
    // biogenic CO2 uptake (negative emission)
    ex(co2bFlow, -uptakeKg, false),
    // fossil CO2 from diesel combustion
    ex(co2fFlow, dieselL * KG_CO2_PER_L_DIESEL, false),
    // field emissions (overridable)
    ex(n2oFlow, normVal('cult_n2o', norms.n2oKgPerHa), false),
    ex(nh3Flow, normVal('cult_nh3', norms.nh3KgPerHa), false),
    ex(no3Flow, normVal('cult_no3', norms.no3KgPerHa), false),
    ex(po4Flow, normVal('cult_po4', norms.po4KgPerHa), false),
  ]
  // irrigation electricity (link to regional grid if available, overridable)
  const irrigElec = normVal('cult_irrig_elec', norms.irrigElecKwhPerHa)
  if (irrigElecFlow && irrigElec > 0) {
    cultEx.push({
      flow: irrigElecFlow,
      amount: irrigElec,
      isInput: true,
      unit: U('kwh'),
      flowProperty: FP('energy'),
      defaultProvider: gridProc ? { '@type': 'Process', '@id': gridProc['@id'], name: gridProc.name } : undefined,
    })
  }

  const cult: Proc = {
    '@type': 'Process',
    '@id': cultId,
    name: cultName,
    processType: 'UNIT_PROCESS',
    category: { name: 'Agriculture' },
    exchanges: cultEx,
  }

  // ---- transport process (farm → plant) ----
  const transportRadiusKm = inp.overrides['transport_radius_km'] ?? (city?.transportRadiusKm?.value ?? geo.transportRadiusKm.value)
  const transportName = `Transport, farm to plant, ${city?.id ?? geo.province} | PLANT`
  const transportId = crypto.randomUUID()
  const truckDieselFlow = await ensureFlow('diesel, burned in transport vehicle', 'PRODUCT_FLOW', 'Energy carriers')
  const transportMassT = feedPerT // tonnes of feedstock per tonne of ethanol
  const transportDieselL = transportMassT * transportRadiusKm * TR_DIESEL_PER_TKM
  const transportEx: Exch[] = [
    // input: feedstock at farm (linked to cultivation)
    { ...ex(feedFlow, transportMassT * 1000, true), defaultProvider: { '@type': 'Process', '@id': cultId, name: cultName } },
    // input: diesel for truck (linked to diesel production)
    { ...ex(truckDieselFlow, transportDieselL * MJ_PER_L_DIESEL, true, U('mj'), FP('energy')), defaultProvider: makeProvider(dieselProc) },
    // output: feedstock at plant (quantitative reference)
    ex(feedFlow, transportMassT * 1000, false, U('kg'), FP('mass'), true),
    // emissions: CO2 from diesel combustion
    ex(co2fFlow, transportDieselL * TR_CO2_PER_L, false),
  ]
  const transportProc: Proc = {
    '@type': 'Process',
    '@id': transportId,
    name: transportName,
    processType: 'UNIT_PROCESS',
    category: { name: 'Transport' },
    exchanges: transportEx,
  }

  // ---- plant process (per 1 t EtOH)
  const siteLabel = city?.id ?? geo.province
  const plantName = `${tech.label.en} plant, ${siteLabel} | PLANT`
  const plantId = crypto.randomUUID()

  let share = 1
  let coprodModeUsed: CoprodMode = inp.coprodMode
  const coprodKg = tech.coprod ? (inp.overrides['coprod'] ?? tech.coprod.value) * 1000 : 0
  if (tech.coprod && coprodModeUsed !== 'none' && coprodModeUsed !== 'expansion') {
    const priceE = tech.ethanolPriceCnyPerT
    const priceC = tech.coprod.priceCnyPerT
    share =
      coprodModeUsed === 'alloc-mass'
        ? 1000 / (1000 + coprodKg)
        : priceE / (priceE + priceC * (coprodKg / 1000))
  }

  const plantEx: Exch[] = []
  // feedstock now comes from transport process (which links to cultivation)
  plantEx.push({ ...ex(feedFlow, feedPerT * 1000 * share, true), defaultProvider: { '@type': 'Process', '@id': transportId, name: transportName } })
  if (P('steam_per_t') > 0) {
    const steamEx = ex(heatFlow, P('steam_per_t') * MJ_PER_T_STEAM * share, true, U('mj'), FP('energy'))
    const hp = makeProvider(heatProc)
    if (hp) steamEx.defaultProvider = hp
    else warnings.push('NO_STEAM_PROVIDER')
    plantEx.push(steamEx)
  }
  if (P('elec_per_t') > 0) {
    if (gridProc) {
      const ro =
        gridProc.exchanges?.find((e) => e.isQuantitativeReference && !e.isInput) ??
        gridProc.exchanges?.find((e) => !e.isInput)
      if (ro?.flow) {
        let amt = P('elec_per_t') * share
        const un = ro.unit?.name?.toLowerCase() ?? 'kwh'
        if (un.includes('mj')) amt *= 3.6
        plantEx.push({
          flow: ro.flow,
          amount: amt,
          isInput: true,
          unit: ro.unit ?? U('kwh'),
          flowProperty: ro.flowProperty ?? FP('energy'),
          defaultProvider: { '@type': 'Process', '@id': gridProc['@id'], name: gridProc.name },
        })
      } else {
        warnings.push('NO_REGIONAL_GRID')
      }
    } else {
      const ef = await ensureFlow('electricity, medium voltage, CN', 'PRODUCT_FLOW', 'Energy carriers')
      plantEx.push(ex(ef, P('elec_per_t') * share, true, U('kwh'), FP('energy')))
    }
  }
  // water: now share-scaled
  if (P('water_per_t') > 0) plantEx.push(ex(waterFlow, P('water_per_t') * share, true, U('m3'), FP('volume')))
  if (P('enzyme_per_t') > 0) plantEx.push(ex(enzymeFlow, P('enzyme_per_t') * share, true))
  if (P('yeast_per_t') > 0) plantEx.push(ex(yeastFlow, P('yeast_per_t') * share, true))
  // reference output: ethanol
  plantEx.push(ex(productFlow, 1000, false, U('kg'), FP('mass'), true))
  // co-product output
  if (tech.coprod && coprodFlow && coprodModeUsed !== 'expansion') {
    plantEx.push(ex(coprodFlow, coprodKg, false))
  }
  if (tech.coprod && coprodFlow && coprodModeUsed === 'expansion') {
    plantEx.push(ex(coprodFlow, coprodKg, false))
    const avoided = procByName(/feeding stuff|feed production|soybean meal|distillers/i)
    if (avoided) {
      const ap = await rpc<Proc>('data/get', { '@type': 'Process', '@id': avoided['@id'] })
      const aro =
        ap.exchanges?.find((e) => e.isQuantitativeReference && !e.isInput) ??
        ap.exchanges?.find((e) => !e.isInput)
      if (aro?.flow) {
        plantEx.push({
          flow: aro.flow,
          amount: -coprodKg * EXPANSION_FACTOR,
          isInput: true,
          unit: aro.unit ?? U('kg'),
          flowProperty: aro.flowProperty ?? FP('mass'),
          defaultProvider: { '@type': 'Process', '@id': ap['@id'], name: ap.name },
        })
      } else {
        coprodModeUsed = 'none'
        warnings.push('EXPANSION_FALLBACK')
      }
    } else {
      coprodModeUsed = 'none'
      warnings.push('EXPANSION_FALLBACK')
    }
  }
  // --- NEW: fermentation CO2 (biogenic) ---
  // C6H12O6 → 2 C2H5OH + 2 CO2; ~956 kg CO2 per tonne ethanol
  plantEx.push(ex(co2bFlow, FERM_CO2_PER_T * share, false))
  // wastewater: now share-scaled
  plantEx.push(ex(wwFlow, P('water_per_t') * share * KG_WW_PER_M3, false))

  const plant: Proc = {
    '@type': 'Process',
    '@id': plantId,
    name: plantName,
    processType: 'UNIT_PROCESS',
    category: { name: 'Bioethanol production' },
    exchanges: plantEx,
  }

  onProgress?.('put')
  await rpc('data/put', cult)
  await rpc('data/put', transportProc)
  await rpc('data/put', plant)

  onProgress?.('system')
  const ps = await rpc<{ '@id': string; name: string }>('data/create/system', {
    process: { '@id': plantId },
  })

  const methods = await rpc<Array<{ '@id': string; name: string }>>('data/get/all', { '@type': 'ImpactMethod' })
  const method =
    methods.find((m) => /environmental footprint/i.test(m.name)) ??
    methods.find((m) => /impact|cipe|cml/i.test(m.name)) ??
    methods[0]
  if (!method) warnings.push('NO_METHOD')

  onProgress?.('calc')
  const setup: Record<string, unknown> = {
    productSystem: { '@id': ps['@id'] },
    amount: inp.capacityT * 1000,
    unit: U('kg'),
    flowProperty: FP('mass'),
  }
  if (method) setup.impactMethod = { '@id': method['@id'] }
  const st = await rpc<{ '@id': string }>('result/calculate', setup)
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const s = await rpc<{ isReady?: boolean }>('result/state', { '@id': st['@id'] })
    if (s.isReady) break
  }
  const imps = method
    ? await rpc<Array<{ impactCategory?: { name?: string; refUnit?: string }; amount?: number }>>(
        'result/total-impacts',
        { '@id': st['@id'] },
      )
    : []
  const div = Math.max(inp.capacityT, 1e-9)

  // ---- economics ----
  let econ: EconResult | null = null
  try {
    econ = computeEconomics({
      capacityT: inp.capacityT,
      feed: tech.feed,
      ethanolPriceYuanPerT: inp.overrides['ethanol_price'] ?? tech.ethanolPriceCnyPerT,
      coprodPriceYuanPerT: tech.coprod ? (inp.overrides['coprod_price'] ?? tech.coprod.priceCnyPerT) : 0,
      coprodTPerTEtOH: tech.coprod ? (inp.overrides['coprod'] ?? tech.coprod.value) : 0,
      overrides: inp.overrides,
    })
  } catch {
    econ = null
  }

  const assumptions: AssumptionRow[] = [
    // --- macro assumptions (technology parameters) ---
    ...params.map((p) => ({
      key: p.key,
      label: p.label,
      value: p.value,
      unit: p.unit,
      year: p.source.year,
      source: p.source.title,
      overridden: p.overridden,
    })),
    {
      key: 'yield',
      label: {
        ru: `Урожайность: ${feedMeta.label.ru}`,
        en: `Yield: ${feedMeta.label.en}`,
        zh: `单产: ${feedMeta.label.zh}`,
      },
      value: yieldT,
      unit: yieldDp.unit,
      year: yieldDp.year,
      source: yieldDp.source.title,
      overridden: inp.overrides['yield'] !== undefined,
    },
    {
      key: 'grid_ef',
      label: { ru: 'EF электросети провинции', en: 'Provincial grid EF', zh: '省电网排放因子' },
      value: geo.gridEF.value,
      unit: geo.gridEF.unit,
      year: geo.gridEF.year,
      source: geo.gridEF.source.title,
      overridden: inp.overrides['grid_ef'] !== undefined,
    },
    {
      key: 'transport_radius_km',
      label: { ru: 'Транспортное плечо (поле→завод)', en: 'Transport radius (farm→plant)', zh: '运输半径（农田→工厂）' },
      value: transportRadiusKm,
      unit: 'km',
      year: 2022,
      source: city?.transportRadiusKm?.source.title ?? geo.transportRadiusKm.source.title,
      overridden: inp.overrides['transport_radius_km'] !== undefined,
    },
  ]
  if (tech.coprod) {
    assumptions.push({
      key: 'coprod',
      label: tech.coprod.label,
      value: tech.coprod.value,
      unit: tech.coprod.unit,
      year: 2021,
      source: 'process template',
      overridden: inp.overrides['coprod'] !== undefined,
    })
  }

  return {
    psId: ps['@id'],
    psName: ps.name,
    resultId: st['@id'],
    methodName: method?.name ?? '—',
    impacts: (imps ?? []).map((i) => ({
      name: i.impactCategory?.name ?? '?',
      unit: i.impactCategory?.refUnit ?? '',
      annual: i.amount ?? 0,
      perT: (i.amount ?? 0) / div,
    })),
    warnings,
    assumptions,
    areaHaPerT,
    coprodModeUsed,
    econ,
  }
}
