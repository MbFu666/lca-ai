import type {
  CalcState,
  CalculationSetup,
  Contribution,
  Descriptor,
  EntityType,
  FlowResult,
  ImpactResult,
  ProductSystemRef,
  RpcError,
  SankeyGraph,
} from './types'

const OLCA_BASE = import.meta.env.VITE_OLCA_URL ?? '/olca'

let requestId = 0

export class OlcaRpcError extends Error {
  code: number
  constructor(err: RpcError) {
    super(err.message || `RPC error ${err.code}`)
    this.code = err.code
  }
}

export async function rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
  requestId += 1
  const payload: Record<string, unknown> = {
    jsonrpc: '2.0',
    id: requestId,
    method,
  }
  if (params !== undefined) payload.params = params

  const resp = await fetch(OLCA_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) throw new Error(`openLCA HTTP ${resp.status}`)
  const data = await resp.json()
  if (data.error) throw new OlcaRpcError(data.error)
  return data.result as T
}

export async function ping(): Promise<boolean> {
  try {
    await rpc('data/get/descriptors', { '@type': 'UnitGroup' })
    return true
  } catch {
    return false
  }
}

export interface EngineSummary {
  processes: number
  flows: number
  impactCategories: number
}

export async function engineSummary(): Promise<EngineSummary> {
  const [processes, flows, impactCategories] = await Promise.all([
    getDescriptors('Process'),
    getDescriptors('Flow'),
    getDescriptors('ImpactCategory'),
  ])
  return { processes: processes.length, flows: flows.length, impactCategories: impactCategories.length }
}

export async function getDescriptors(type: EntityType): Promise<Descriptor[]> {
  const result = await rpc<Descriptor[] | Descriptor>('data/get/descriptors', { '@type': type })
  if (!result) return []
  return Array.isArray(result) ? result : [result]
}

export async function getEntity<T>(type: EntityType, id: string): Promise<T | null> {
  return rpc<T>('data/get', { '@type': type, '@id': id })
}

export async function updateEntity<T extends object>(type: EntityType, entity: T): Promise<void> {
  await rpc('data/put', { '@type': type, ...entity })
}

export async function deleteEntity(type: EntityType, id: string): Promise<void> {
  await rpc('data/delete', { '@type': type, '@id': id })
}

export async function createProductSystem(processId: string): Promise<ProductSystemRef> {
  return rpc<ProductSystemRef>('data/create/system', { process: { '@id': processId } })
}

export async function calculate(setup: CalculationSetup): Promise<CalcState> {
  return rpc<CalcState>('result/calculate', setup)
}

export async function calcState(id: string): Promise<CalcState> {
  return rpc<CalcState>('result/state', { '@id': id })
}

export async function totalFlows(id: string): Promise<FlowResult[]> {
  const r = await rpc<FlowResult[] | null>('result/total-flows', { '@id': id })
  return r ?? []
}

export async function totalImpacts(id: string): Promise<ImpactResult[]> {
  const r = await rpc<ImpactResult[] | null>('result/total-impacts', { '@id': id })
  return r ?? []
}

export async function disposeResult(id: string): Promise<void> {
  await rpc('result/dispose', { '@id': id })
}

export async function impactContributions(id: string, impactCategoryId: string): Promise<Contribution[]> {
  const r = await rpc<Contribution[] | null>('result/impact-contributions-of', {
    '@id': id,
    impactCategory: { '@id': impactCategoryId },
  })
  return r ?? []
}

export async function simulate(setup: CalculationSetup): Promise<CalcState> {
  return rpc<CalcState>('result/simulate', setup)
}

export async function simulateNext(id: string): Promise<CalcState> {
  return rpc<CalcState>('result/simulate/next', { '@id': id })
}

export async function normalizedImpacts(id: string): Promise<ImpactResult[]> {
  const r = await rpc<ImpactResult[] | null>('result/total-impacts/normalized', { '@id': id })
  return r ?? []
}

export async function weightedImpacts(id: string): Promise<ImpactResult[]> {
  const r = await rpc<ImpactResult[] | null>('result/total-impacts/weighted', { '@id': id })
  return r ?? []
}

export async function flowContributions(id: string, flowId: string): Promise<Contribution[]> {
  const r = await rpc<Contribution[] | null>('result/flow-contributions-of', {
    '@id': id,
    enviFlow: { flow: { '@id': flowId } },
  })
  return r ?? []
}

export async function getProvidersOfFlow(flowId: string): Promise<Descriptor[]> {
  const r = await rpc<Descriptor[] | Descriptor | null>('data/get/providers', { '@id': flowId })
  if (!r) return []
  return Array.isArray(r) ? r : [r]
}

export async function getGlobalParameters(): Promise<Descriptor[]> {
  const r = await rpc<Array<Record<string, unknown>> | null>('data/get/all', { '@type': 'Parameter' })
  const all = r ?? []
  const globals = all.filter((p) => String(p.scope ?? 'GLOBAL').toUpperCase() === 'GLOBAL')
  const list = globals.length > 0 || all.length === 0 ? globals : all
  return list.map((p) => ({ '@id': String(p['@id'] ?? ''), name: String(p.name ?? '') }))
}

export async function sankeyGraph(id: string, impactCategoryId: string, maxNodes = 60): Promise<SankeyGraph> {
  return rpc<SankeyGraph>('result/sankey', {
    '@id': id,
    config: { impactCategory: { '@id': impactCategoryId }, minShare: 0.01, maxNodes },
  })
}
