// Uncertainty analysis: Monte Carlo + one-at-a-time sensitivity for climate change.
// Uses an analytic climate model mirroring plant.ts coefficients so thousands of
// samples run instantly without openLCA recalculation.
import { CONVERSION_CONSTANTS, CULT_NORMS, FEEDS, type TechDef } from './refdata'

export interface UncertInput {
  tech: TechDef
  yieldT: number
  gridEF: number // kg CO2/kWh
  transportKm: number
  overrides: Record<string, number>
  coprodMode: 'expansion' | 'alloc-mass' | 'alloc-economic' | 'none'
}

// Upstream emission coefficients (kg CO2-eq per unit) matching created background processes
const EF = {
  ureaPerKgN: 1.8,
  sspPerKgP: 0.4,
  kclPerKgK: 0.3,
  dieselPerMJ: 0.8 / 35.9 + 2.68 / 35.9, // production + combustion per MJ
  seedPerKg: 1.5,
  herbPerKg: 8.0,
  pestPerKg: 10.0,
  heatPerMJ: 0.066,
  transportPerTKm: 0.134,
  enzymePerKg: 3.0,
  yeastPerKg: 2.0,
  fieldN2OPerKg: 265, // GWP100 N2O
  fieldNH3PerKg: 0, // negligible CC
  expansionCreditPerKg: 1.5, // soybean meal avoided
}

// Deterministic climate model: returns { fossil, biogenic, net } kg CO2-eq per t ethanol
export function climateModel(inp: UncertInput, p: Record<string, number>): { fossil: number; biogenic: number; net: number } {
  const tech = inp.tech
  const feed = tech.feed
  const norms = CULT_NORMS[feed]
  const g = (k: string, d: number) => p[k] ?? d

  const yieldT = g('yield', inp.yieldT)
  const feedPerT = g('feed_per_t', tech.params.find((x) => x.key === 'feed_per_t')?.value ?? 15)
  const areaHaPerT = feedPerT / Math.max(yieldT, 1e-9)

  const n = g('cult_n', norms.nKgPerHa.value)
  const ph = g('cult_p', norms.pKgPerHa.value)
  const k = g('cult_k', norms.kKgPerHa.value)
  const dieselL = g('cult_diesel', norms.dieselLPerHa.value)
  const seed = g('cult_seed', norms.seedKgPerHa.value)
  const herb = g('cult_herbicide', norms.herbicideKgPerHa.value)
  const pest = g('cult_pesticide', norms.pesticideKgPerHa.value)
  const n2o = g('cult_n2o', norms.n2oKgPerHa.value)

  // cultivation fossil per ha, then per t ethanol
  const cultPerHa =
    n * EF.ureaPerKgN +
    ph * EF.sspPerKgP +
    k * EF.kclPerKgK +
    dieselL * 35.9 * EF.dieselPerMJ +
    seed * EF.seedPerKg +
    herb * EF.herbPerKg +
    pest * EF.pestPerKg +
    n2o * EF.fieldN2OPerKg +
    dieselL * 2.68 // direct combustion
  const cultPerT = cultPerHa * areaHaPerT

  // biogenic uptake per t ethanol
  const dmFrac = FEEDS[feed]?.dmFrac ?? 0.25
  const biogenicPerT = -(yieldT * 1000 * dmFrac * CONVERSION_CONSTANTS.cFraction.value * CONVERSION_CONSTANTS.co2PerC.value) * areaHaPerT

  // transport
  const trTKm = feedPerT * g('transport_radius_km', inp.transportKm)
  const transportPerT = trTKm * EF.transportPerTKm

  // plant
  const elec = g('elec_per_t', tech.params.find((x) => x.key === 'elec_per_t')?.value ?? 300)
  const steam = g('steam_per_t', tech.params.find((x) => x.key === 'steam_per_t')?.value ?? 4)
  const enzyme = g('enzyme_per_t', tech.params.find((x) => x.key === 'enzyme_per_t')?.value ?? 1)
  const yeast = g('yeast_per_t', tech.params.find((x) => x.key === 'yeast_per_t')?.value ?? 1.5)
  const plantPerT =
    elec * g('grid_ef', inp.gridEF) +
    steam * CONVERSION_CONSTANTS.mjPerTSteam.value * EF.heatPerMJ +
    enzyme * EF.enzymePerKg +
    yeast * EF.yeastPerKg +
    CONVERSION_CONSTANTS.fermCo2PerTEthanol.value * 0 // fermentation CO2 is biogenic, not fossil

  // expansion credit
  let credit = 0
  if (inp.coprodMode === 'expansion' && tech.coprod) {
    const coprodKg = g('coprod', tech.coprod.value) * 1000
    credit = coprodKg * CONVERSION_CONSTANTS.expansionFactor.value * EF.expansionCreditPerKg
  }

  const fossil = cultPerT + transportPerT + plantPerT - credit
  const biogenic = biogenicPerT + CONVERSION_CONSTANTS.fermCo2PerTEthanol.value // ferm CO2 biogenic positive? no: uptake negative + ferm positive
  const net = fossil + biogenic
  return { fossil, biogenic, net }
}

// One-at-a-time sensitivity: ±10% on each key param, returns tornado rows
export function sensitivity(inp: UncertInput): Array<{ key: string; label: string; low: number; high: number; swing: number }> {
  const keys: Array<{ key: string; label: string; def: number }> = [
    { key: 'yield', label: 'Yield', def: inp.yieldT },
    { key: 'feed_per_t', label: 'Feed per t', def: inp.tech.params.find((x) => x.key === 'feed_per_t')?.value ?? 15 },
    { key: 'cult_n', label: 'N fertilizer', def: CULT_NORMS[inp.tech.feed].nKgPerHa.value },
    { key: 'cult_diesel', label: 'Diesel', def: CULT_NORMS[inp.tech.feed].dieselLPerHa.value },
    { key: 'grid_ef', label: 'Grid EF', def: inp.gridEF },
    { key: 'steam_per_t', label: 'Steam', def: inp.tech.params.find((x) => x.key === 'steam_per_t')?.value ?? 4 },
    { key: 'transport_radius_km', label: 'Transport', def: inp.transportKm },
  ]
  return keys
    .map((k) => {
      const lo = climateModel(inp, { [k.key]: k.def * 0.9 }).net
      const hi = climateModel(inp, { [k.key]: k.def * 1.1 }).net
      return { key: k.key, label: k.label, low: lo, high: hi, swing: Math.abs(hi - lo) }
    })
    .sort((a, b) => b.swing - a.swing)
}

// Monte Carlo: sample each param uniform ±cv, return percentiles of net & fossil
export function monteCarlo(inp: UncertInput, n = 1000, cv = 0.2): {
  net: { mean: number; p5: number; p50: number; p95: number }
  fossil: { mean: number; p5: number; p50: number; p95: number }
  histogram: Array<{ x0: number; x1: number; count: number }>
  samples: number
} {
  const defs: Record<string, number> = {
    yield: inp.yieldT,
    feed_per_t: inp.tech.params.find((x) => x.key === 'feed_per_t')?.value ?? 15,
    cult_n: CULT_NORMS[inp.tech.feed].nKgPerHa.value,
    cult_p: CULT_NORMS[inp.tech.feed].pKgPerHa.value,
    cult_k: CULT_NORMS[inp.tech.feed].kKgPerHa.value,
    cult_diesel: CULT_NORMS[inp.tech.feed].dieselLPerHa.value,
    cult_seed: CULT_NORMS[inp.tech.feed].seedKgPerHa.value,
    cult_herbicide: CULT_NORMS[inp.tech.feed].herbicideKgPerHa.value,
    cult_pesticide: CULT_NORMS[inp.tech.feed].pesticideKgPerHa.value,
    grid_ef: inp.gridEF,
    steam_per_t: inp.tech.params.find((x) => x.key === 'steam_per_t')?.value ?? 4,
    elec_per_t: inp.tech.params.find((x) => x.key === 'elec_per_t')?.value ?? 300,
    transport_radius_km: inp.transportKm,
  }
  const nets: number[] = []
  const fossils: number[] = []
  for (let i = 0; i < n; i++) {
    const p: Record<string, number> = {}
    for (const k of Object.keys(defs)) {
      const u = Math.random() * 2 - 1 // -1..1
      p[k] = defs[k] * (1 + u * cv)
    }
    const r = climateModel(inp, p)
    nets.push(r.net)
    fossils.push(r.fossil)
  }
  const q = (arr: number[], f: number) => {
    const s = [...arr].sort((a, b) => a - b)
    return s[Math.min(s.length - 1, Math.floor(f * (s.length - 1)))]
  }
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  // histogram of net (12 buckets)
  const lo = Math.min(...nets), hi = Math.max(...nets)
  const buckets: Array<{ x0: number; x1: number; count: number }> = []
  const B = 12
  const w = (hi - lo) / B || 1
  for (let b = 0; b < B; b++) buckets.push({ x0: lo + b * w, x1: lo + (b + 1) * w, count: 0 })
  for (const v of nets) {
    const idx = Math.min(B - 1, Math.max(0, Math.floor((v - lo) / w)))
    buckets[idx].count++
  }
  return {
    net: { mean: mean(nets), p5: q(nets, 0.05), p50: q(nets, 0.5), p95: q(nets, 0.95) },
    fossil: { mean: mean(fossils), p5: q(fossils, 0.05), p50: q(fossils, 0.5), p95: q(fossils, 0.95) },
    histogram: buckets,
    samples: n,
  }
}
