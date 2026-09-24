// Write AI-extracted literature inventory INTO the openLCA database as "| LIT" processes.
import { getDescriptors, rpc } from '../api/ipc'
import { CONVERSION_CONSTANTS, CULT_NORMS, FEEDS, TRANSPORT_PARAMS } from './refdata'

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

export interface LitApplySummary {
  created: string[]
  updated: string[]
}

const MJ_PER_L_DIESEL = CONVERSION_CONSTANTS.mjPerLDiesel.value
const KG_CO2_PER_L_DIESEL = CONVERSION_CONSTANTS.kgCo2PerLDiesel.value

export async function applyInventoryToDb(
  x: Record<string, any>,
  opts: { province: string; feed?: string; techLabel?: string },
): Promise<LitApplySummary> {
  const created: string[] = []
  const updated: string[] = []

  const procs = await getDescriptors('Process')
  const flowsD = await getDescriptors('Flow')
  const flowByName = new Map(flowsD.map((f) => [f.name.toLowerCase(), f]))
  const procByName = (re: RegExp) => procs.find((p) => re.test(p.name))

  const units = new Map<string, Ref>()
  const fps = new Map<string, Ref>()
  for (const ug of await rpc<Array<{ units?: Array<{ '@id': string; name: string }> }>>('data/get/all', { '@type': 'UnitGroup' })) {
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
    flowByName.set(name.toLowerCase(), { '@id': id, name })
    created.push(`flow: ${name}`)
    return { '@type': 'Flow', '@id': id, name }
  }
  const ex = (flow: Ref, amount: number, isInput: boolean, unit?: Ref, fp?: Ref, ref = false): Exch => {
    const e: Exch = { flow, amount, isInput, unit: unit ?? U('kg'), flowProperty: fp ?? FP('mass') }
    if (ref) e.isQuantitativeReference = true
    return e
  }
  async function putProc(p: Proc) {
    const existing = procs.find((q) => q.name === p.name)
    if (existing) {
      p['@id'] = existing['@id']
      updated.push(p.name)
    } else {
      created.push(p.name)
    }
    await rpc('data/put', p)
    return p['@id']
  }
  const provider = (re: RegExp): Ref | undefined => {
    const h = procByName(re)
    return h ? { '@type': 'Process', '@id': h['@id'], name: h.name } : undefined
  }

  const feed = String(x.feed ?? opts.feed ?? 'sorghum')
  const meta = FEEDS[feed] ?? FEEDS.sorghum
  const norms = CULT_NORMS[feed] ?? CULT_NORMS.sorghum
  const prov = opts.province
  const c = x.cultivation ?? {}
  const t = x.tech ?? {}
  const num = (v: any, d: number) => (typeof v === 'number' && isFinite(v) ? v : d)

  const yieldT = num(c.yield_t_ha, meta.yieldTPerHa)
  const n = num(c.n_kg_ha, norms.nKgPerHa.value)
  const p = num(c.p_kg_ha, norms.pKgPerHa.value)
  const k = num(c.k_kg_ha, norms.kKgPerHa.value)
  const dieselL = num(c.diesel_l_ha, norms.dieselLPerHa.value)
  const seed = num(c.seed_kg_ha, norms.seedKgPerHa.value)
  const herb = num(c.herbicide_kg_ha, norms.herbicideKgPerHa.value)
  const pest = num(c.pesticide_kg_ha, norms.pesticideKgPerHa.value)
  const irrigW = num(c.irrig_water_m3_ha, norms.irrigWaterM3PerHa.value)
  const irrigE = num(c.irrig_elec_kwh_ha, norms.irrigElecKwhPerHa.value)
  const n2o = num(c.n2o_kg_ha, norms.n2oKgPerHa.value)
  const nh3 = num(c.nh3_kg_ha, norms.nh3KgPerHa.value)
  const no3 = num(c.no3_kg_ha, norms.no3KgPerHa.value)
  const po4 = num(c.po4_kg_ha, norms.po4KgPerHa.value)

  // flows
  const feedFlow = await ensureFlow(meta.flowName, 'PRODUCT_FLOW', meta.flowCategory)
  const productFlow = await ensureFlow('bioethanol, anhydrous (99.5%)', 'PRODUCT_FLOW', 'Energy carriers')
  const ureaFlow = await ensureFlow('urea, as N', 'PRODUCT_FLOW', 'Fertilizers')
  const sspFlow = await ensureFlow('single superphosphate, as P2O5', 'PRODUCT_FLOW', 'Fertilizers')
  const kclFlow = await ensureFlow('potassium chloride, as K2O', 'PRODUCT_FLOW', 'Fertilizers')
  const dieselFlow = await ensureFlow('diesel, burned in agricultural machinery', 'PRODUCT_FLOW', 'Energy carriers')
  const seedFlow = await ensureFlow(`${meta.label.en.toLowerCase()} seed, for sowing`, 'PRODUCT_FLOW', 'Agricultural products')
  const herbFlow = await ensureFlow('herbicide, unspecified, for crop protection', 'PRODUCT_FLOW', 'Chemicals')
  const pestFlow = await ensureFlow('pesticide, unspecified, for crop protection', 'PRODUCT_FLOW', 'Chemicals')
  const waterFlow = flowByName.get('water, river')
    ? { '@type': 'Flow', '@id': flowByName.get('water, river')!['@id'], name: 'water, river' }
    : await ensureFlow('water, river', 'ELEMENTARY_FLOW', 'Resources from water')
  const heatFlow = await ensureFlow('heat, district or industrial, natural gas, CN', 'PRODUCT_FLOW', 'Energy carriers')
  const enzymeFlow = await ensureFlow('glucoamylase enzyme', 'PRODUCT_FLOW', 'Chemicals')
  const yeastFlow = await ensureFlow('yeast, Saccharomyces cerevisiae', 'PRODUCT_FLOW', 'Chemicals')
  const wwFlow = await ensureFlow('wastewater, average, to treatment', 'WASTE_FLOW', 'Wastes')
  const co2b = await ensureFlow('Carbon dioxide, biogenic', 'ELEMENTARY_FLOW', 'Emissions to air')
  const co2f = await ensureFlow('Carbon dioxide, fossil', 'ELEMENTARY_FLOW', 'Emissions to air')
  const n2oF = await ensureFlow('Dinitrogen monoxide', 'ELEMENTARY_FLOW', 'Emissions to air')
  const nh3F = await ensureFlow('Ammonia', 'ELEMENTARY_FLOW', 'Emissions to air')
  const no3F = await ensureFlow('Nitrate', 'ELEMENTARY_FLOW', 'Emissions to water')
  const po4F = await ensureFlow('Phosphate', 'ELEMENTARY_FLOW', 'Emissions to water')
  const occF = await ensureFlow('Occupation, arable land', 'ELEMENTARY_FLOW', 'Land use')

  // providers
  const ureaP = provider(/Urea production/i)
  const sspP = provider(/superphosphate production/i)
  const kclP = provider(/potassium chloride production/i)
  const dieselP = provider(/Diesel production/i)
  const seedP = provider(/Seed production/i)
  const herbP = provider(/Herbicide production/i)
  const pestP = provider(/Pesticide production/i)
  const heatP = provider(/Heat production.*boiler/i)

  // regional grid (create/update with extracted EF if provided)
  const gridEF = num(x.grid_ef_kg_co2_kwh, 0)
  const gridName = `Electricity mix ; ${prov}`
  let gridProcRef: Ref | undefined = provider(new RegExp(gridName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
  if (gridEF > 0) {
    const gid = gridProcRef ? gridProcRef['@id'] : crypto.randomUUID()
    await rpc('data/put', {
      '@type': 'Process',
      '@id': gid,
      name: gridName,
      processType: 'UNIT_PROCESS',
      category: { name: 'Energy' },
      exchanges: [
        ex(await ensureFlow('electricity, medium voltage, CN', 'PRODUCT_FLOW', 'Energy carriers'), 1.0, false, U('kwh'), FP('energy'), true),
        ex(co2f, gridEF, false),
      ],
    } as Proc)
    gridProcRef = { '@type': 'Process', '@id': gid, name: gridName }
    if (!gridProcRef) created.push(gridName)
    else updated.push(gridName)
  }

  // cultivation | LIT
  const dmFrac = meta.dmFrac
  const uptake = yieldT * 1000 * dmFrac * CONVERSION_CONSTANTS.cFraction.value * CONVERSION_CONSTANTS.co2PerC.value
  const cultName = `${meta.label.en} cultivation, ${prov} | LIT`
  const cultId = await putProc({
    '@type': 'Process',
    '@id': crypto.randomUUID(),
    name: cultName,
    processType: 'UNIT_PROCESS',
    category: { name: 'Agriculture' },
    exchanges: [
      { ...ex(ureaFlow, n, true), defaultProvider: ureaP },
      { ...ex(sspFlow, p, true), defaultProvider: sspP },
      { ...ex(kclFlow, k, true), defaultProvider: kclP },
      { ...ex(dieselFlow, dieselL * MJ_PER_L_DIESEL, true, U('mj'), FP('energy')), defaultProvider: dieselP },
      { ...ex(seedFlow, seed, true), defaultProvider: seedP },
      { ...ex(herbFlow, herb, true), defaultProvider: herbP },
      { ...ex(pestFlow, pest, true), defaultProvider: pestP },
      ex(waterFlow, irrigW, true, U('m3'), FP('volume')),
      ex(occF, 10000, false, U('m2*a'), FP('land occupation')),
      ex(feedFlow, yieldT * 1000, false, U('kg'), FP('mass'), true),
      ex(co2b, -uptake, false),
      ex(co2f, dieselL * KG_CO2_PER_L_DIESEL, false),
      ex(n2oF, n2o, false),
      ex(nh3F, nh3, false),
      ex(no3F, no3, false),
      ex(po4F, po4, false),
    ],
  } as Proc)

  // irrigation electricity link
  if (gridProcRef && irrigE > 0) {
    const cp = await rpc<Proc>('data/get', { '@type': 'Process', '@id': cultId })
    cp.exchanges = [
      ...(cp.exchanges ?? []),
      {
        flow: await ensureFlow('electricity, medium voltage, CN', 'PRODUCT_FLOW', 'Energy carriers'),
        amount: irrigE,
        isInput: true,
        unit: U('kwh'),
        flowProperty: FP('energy'),
        defaultProvider: gridProcRef,
      },
    ]
    await rpc('data/put', cp)
  }

  // transport | LIT
  const radiusKm = num(x.transport_km, 60)
  const feedPerT = num(t.feed_per_t, 15)
  const trName = `Transport, farm to plant, ${prov} | LIT`
  const trDieselL = feedPerT * radiusKm * TRANSPORT_PARAMS.dieselLPerTkm.value
  const trId = await putProc({
    '@type': 'Process',
    '@id': crypto.randomUUID(),
    name: trName,
    processType: 'UNIT_PROCESS',
    category: { name: 'Transport' },
    exchanges: [
      { ...ex(feedFlow, feedPerT * 1000, true), defaultProvider: { '@type': 'Process', '@id': cultId, name: cultName } },
      { ...ex(dieselFlow, trDieselL * MJ_PER_L_DIESEL, true, U('mj'), FP('energy')), defaultProvider: dieselP },
      ex(feedFlow, feedPerT * 1000, false, U('kg'), FP('mass'), true),
      ex(co2f, trDieselL * TRANSPORT_PARAMS.co2KgPerLDiesel.value, false),
    ],
  } as Proc)

  // plant | LIT
  const plantName = `${opts.techLabel ?? 'Literature'} plant, ${prov} | LIT`
  const steam = num(t.steam_per_t, 4)
  const elec = num(t.elec_per_t, 300)
  const water = num(t.water_per_t, 8)
  const enzyme = num(t.enzyme_per_t, 1)
  const yeast = num(t.yeast_per_t, 1.5)
  const coprod = num(x.coprod_per_t, 0)
  const plantEx: Exch[] = [
    { ...ex(feedFlow, feedPerT * 1000, true), defaultProvider: { '@type': 'Process', '@id': trId, name: trName } },
  ]
  if (coprod > 0) {
    const coprodFlow = await ensureFlow(
      feed === 'corn' ? 'DDGS, feed, at plant' : 'sweet sorghum bagasse, wet (50% H2O), at mill',
      'PRODUCT_FLOW',
      'Feeds',
    )
    plantEx.push(ex(coprodFlow, coprod * 1000, false))
  }
  if (steam > 0) plantEx.push({ ...ex(heatFlow, steam * CONVERSION_CONSTANTS.mjPerTSteam.value, true, U('mj'), FP('energy')), defaultProvider: heatP })
  if (elec > 0 && gridProcRef) {
    plantEx.push({
      flow: await ensureFlow('electricity, medium voltage, CN', 'PRODUCT_FLOW', 'Energy carriers'),
      amount: elec,
      isInput: true,
      unit: U('kwh'),
      flowProperty: FP('energy'),
      defaultProvider: gridProcRef,
    })
  }
  if (water > 0) plantEx.push(ex(waterFlow, water, true, U('m3'), FP('volume')))
  if (enzyme > 0) plantEx.push(ex(enzymeFlow, enzyme, true))
  if (yeast > 0) plantEx.push(ex(yeastFlow, yeast, true))
  plantEx.push(ex(productFlow, 1000, false, U('kg'), FP('mass'), true))
  plantEx.push(ex(co2b, CONVERSION_CONSTANTS.fermCo2PerTEthanol.value, false))
  plantEx.push(ex(wwFlow, water * CONVERSION_CONSTANTS.kgWwPerM3Water.value, false))
  await putProc({
    '@type': 'Process',
    '@id': crypto.randomUUID(),
    name: plantName,
    processType: 'UNIT_PROCESS',
    category: { name: 'Bioethanol production' },
    exchanges: plantEx,
  } as Proc)

  return { created, updated }
}
