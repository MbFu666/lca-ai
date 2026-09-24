import { getDescriptors, rpc } from '../api/ipc'

export type L10n = { ru: string; en: string; zh: string }

export interface Province {
  id: string
  label: L10n
}

export const PROVINCES: Province[] = [
  { id: 'Heilongjiang', label: { ru: 'Хэйлунцзян', en: 'Heilongjiang', zh: '黑龙江' } },
  { id: 'Jilin', label: { ru: 'Цзилинь', en: 'Jilin', zh: '吉林' } },
  { id: 'Liaoning', label: { ru: 'Ляонин', en: 'Liaoning', zh: '辽宁' } },
  { id: 'Inner Mongolia', label: { ru: 'Внутренняя Монголия', en: 'Inner Mongolia', zh: '内蒙古' } },
  { id: 'Beijing', label: { ru: 'Пекин', en: 'Beijing', zh: '北京' } },
  { id: 'Tianjin', label: { ru: 'Тяньцзинь', en: 'Tianjin', zh: '天津' } },
  { id: 'Hebei', label: { ru: 'Хэбэй', en: 'Hebei', zh: '河北' } },
  { id: 'Shandong', label: { ru: 'Шаньдун', en: 'Shandong', zh: '山东' } },
  { id: 'Shanxi', label: { ru: 'Шаньси', en: 'Shanxi', zh: '山西' } },
  { id: 'Shaanxi', label: { ru: 'Шэньси', en: 'Shaanxi', zh: '陕西' } },
  { id: 'Henan', label: { ru: 'Хэнань', en: 'Henan', zh: '河南' } },
  { id: 'Anhui', label: { ru: 'Аньхой', en: 'Anhui', zh: '安徽' } },
  { id: 'Jiangsu', label: { ru: 'Цзянсу', en: 'Jiangsu', zh: '江苏' } },
  { id: 'Shanghai', label: { ru: 'Шанхай', en: 'Shanghai', zh: '上海' } },
  { id: 'Zhejiang', label: { ru: 'Чжэцзян', en: 'Zhejiang', zh: '浙江' } },
  { id: 'Hubei', label: { ru: 'Хубэй', en: 'Hubei', zh: '湖北' } },
  { id: 'Hunan', label: { ru: 'Хунань', en: 'Hunan', zh: '湖南' } },
  { id: 'Jiangxi', label: { ru: 'Цзянси', en: 'Jiangxi', zh: '江西' } },
  { id: 'Fujian', label: { ru: 'Фуцзянь', en: 'Fujian', zh: '福建' } },
  { id: 'Guangdong', label: { ru: 'Гуандун', en: 'Guangdong', zh: '广东' } },
  { id: 'Guangxi', label: { ru: 'Гуанси', en: 'Guangxi', zh: '广西' } },
  { id: 'Hainan', label: { ru: 'Хайнань', en: 'Hainan', zh: '海南' } },
  { id: 'Chongqing', label: { ru: 'Чунцин', en: 'Chongqing', zh: '重庆' } },
  { id: 'Sichuan', label: { ru: 'Сычуань', en: 'Sichuan', zh: '四川' } },
  { id: 'Guizhou', label: { ru: 'Гуйчжоу', en: 'Guizhou', zh: '贵州' } },
  { id: 'Yunnan', label: { ru: 'Юньнань', en: 'Yunnan', zh: '云南' } },
  { id: 'Gansu', label: { ru: 'Ганьсу', en: 'Gansu', zh: '甘肃' } },
  { id: 'Ningxia', label: { ru: 'Нинся', en: 'Ningxia', zh: '宁夏' } },
  { id: 'Qinghai', label: { ru: 'Цинхай', en: 'Qinghai', zh: '青海' } },
  { id: 'Xinjiang', label: { ru: 'Синьцзян', en: 'Xinjiang', zh: '新疆' } },
  { id: 'Tibet', label: { ru: 'Тибет', en: 'Tibet', zh: '西藏' } },
]

export interface RouteDef {
  id: string
  label: L10n
  desc: L10n
  chain: RegExp[]
  refPattern?: RegExp
  custom?: boolean
}

export const ROUTES: RouteDef[] = [
  {
    id: 'ethanol-sorghum',
    label: { ru: 'Биоэтанол из сладкого сорго', en: 'Sweet sorghum bioethanol', zh: '甜高粱生物乙醇' },
    desc: {
      ru: 'Культивация → транспорт → экстракция сока → ферментация → дистилляция → обработка винной',
      en: 'Cultivation → transport → juice extraction → fermentation → distillation → vinasse treatment',
      zh: '种植 → 运输 → 榨汁 → 发酵 → 蒸馏 → 酒糟处理',
    },
    chain: [
      /sweet sorghum cultivation/i,
      /transport, sorghum stalks/i,
      /juice extraction/i,
      /fermentation to ethanol/i,
      /distillation and dehydration/i,
      /vinasse anaerobic treatment/i,
    ],
    refPattern: /distillation and dehydration/i,
  },
  {
    id: 'cnc',
    label: { ru: 'Наноцеллюлоза CNC (гидролиз H2SO4)', en: 'Cellulose nanocrystals (H2SO4 hydrolysis)', zh: '纳米纤维素 CNC（硫酸水解）' },
    desc: {
      ru: 'Щелочная предобработка багассы → отбеливание → гидролиз H2SO4 → очистка/сушка',
      en: 'Bagasse alkaline pretreatment → bleaching → H2SO4 hydrolysis → purification/drying',
      zh: '蔗渣碱预处理 → 漂白 → 硫酸水解 → 纯化/干燥',
    },
    chain: [
      /bagasse alkaline pretreatment/i,
      /bleaching of delignified/i,
      /sulfuric acid hydrolysis/i,
      /CNC purification/i,
    ],
    refPattern: /CNC purification/i,
  },
  {
    id: 'cnf',
    label: { ru: 'CNF (TEMPO / мех. гомогенизация)', en: 'CNF (TEMPO / mechanical homogenization)', zh: 'CNF（TEMPO/机械均质）' },
    desc: {
      ru: 'Предобработка → отбеливание → TEMPO-окисление → мех. гомогенизация → очистка',
      en: 'Pretreatment → bleaching → TEMPO oxidation → mechanical homogenization → purification',
      zh: '预处理 → 漂白 → TEMPO 氧化 → 机械均质 → 纯化',
    },
    chain: [
      /bagasse alkaline pretreatment/i,
      /bleaching of delignified/i,
      /TEMPO-mediated oxidation/i,
      /CNF mechanical homogenization/i,
      /CNF purification/i,
    ],
    refPattern: /CNF purification/i,
  },
  {
    id: 'custom',
    label: { ru: 'Свой маршрут', en: 'Custom route', zh: '自定义路线' },
    desc: {
      ru: 'Выберите процессы из активной БД и опорный процесс',
      en: 'Pick processes from the active database and a reference process',
      zh: '从当前数据库选择工艺和参考过程',
    },
    chain: [],
    custom: true,
  },
]

export interface ScenarioInput {
  province: string | null
  routeId: string
  customIds: string[]
  customRefId: string | null
  annualT: number
}

export interface ScenarioImpact {
  name: string
  unit: string
  perT: number
  annual: number
}

export interface ScenarioResult {
  psId: string
  psName: string
  resultId: string
  methodName: string
  refFlowName: string
  impacts: ScenarioImpact[]
  warnings: string[]
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

function refOutput(p: Proc): Exch | undefined {
  const ex = p.exchanges ?? []
  return ex.find((e) => e.isQuantitativeReference && !e.isInput) ?? ex.find((e) => !e.isInput)
}

export async function buildScenario(
  inp: ScenarioInput,
  onProgress?: (note: string) => void,
): Promise<ScenarioResult> {
  const warnings: string[] = []
  const route = ROUTES.find((r) => r.id === inp.routeId)
  if (!route) throw new Error('ROUTE_NOT_FOUND')
  const procs = await getDescriptors('Process')

  let chainIds: string[] = []
  let refId: string | null = null
  if (route.custom) {
    chainIds = [...inp.customIds]
    refId = inp.customRefId
    if (!chainIds.length || !refId) throw new Error('CUSTOM_INCOMPLETE')
  } else {
    for (const re of route.chain) {
      const hit = procs.find((p) => re.test(p.name))
      if (!hit) {
        warnings.push(`CHAIN_MISSING:${re.source}`)
        continue
      }
      chainIds.push(hit['@id'])
    }
    if (!chainIds.length) throw new Error('CHAIN_NOT_FOUND')
    refId = chainIds[chainIds.length - 1]
    if (route.refPattern) {
      const rp = procs.find((p) => chainIds.includes(p['@id']) && route.refPattern?.test(p.name))
      if (rp) refId = rp['@id']
    }
  }

  let regional: { procId: string; procName: string; flow: Ref; unit?: Ref; fp?: Ref } | null = null
  if (inp.province) {
    const cand = procs.find(
      (p) => p.name.includes(inp.province as string) && /electricity|thermal power/i.test(p.name),
    )
    if (cand) {
      const full = await rpc<Proc>('data/get', { '@type': 'Process', '@id': cand['@id'] })
      const ro = refOutput(full)
      if (ro?.flow)
        regional = { procId: full['@id'], procName: full.name, flow: ro.flow, unit: ro.unit, fp: ro.flowProperty }
    } else {
      warnings.push('NO_REGIONAL_PROVIDER')
    }
  }

  onProgress?.('clone')
  const idMap = new Map<string, { id: string; name: string }>()
  const clones: Proc[] = []
  for (const id of chainIds) {
    const src = await rpc<Proc>('data/get', { '@type': 'Process', '@id': id })
    const nid = crypto.randomUUID()
    const nname = `${src.name} | SC${inp.province ? ' ' + inp.province : ''}`
    idMap.set(id, { id: nid, name: nname })
    const clone: Proc = {
      ...src,
      '@id': nid,
      name: nname,
      exchanges: (src.exchanges ?? []).map((e) => ({ ...e })),
    }
    if (regional) {
      for (const e of clone.exchanges ?? []) {
        if (e.isInput && e.flow?.name && /electricity/i.test(e.flow.name)) {
          e.flow = regional.flow
          if (regional.unit) e.unit = regional.unit
          if (regional.fp) e.flowProperty = regional.fp
          e.defaultProvider = { '@type': 'Process', '@id': regional.procId, name: regional.procName }
        }
      }
    }
    clones.push(clone)
  }
  const outMap = new Map<string, { id: string; name: string }>()
  for (const c of clones) {
    for (const e of c.exchanges ?? []) {
      if (!e.isInput && e.flow?.['@id']) outMap.set(e.flow['@id'], { id: c['@id'], name: c.name })
    }
  }
  for (const c of clones) {
    for (const e of c.exchanges ?? []) {
      const dp = e.defaultProvider?.['@id']
      const mapped = dp ? idMap.get(dp) : undefined
      if (dp && mapped) {
        e.defaultProvider = { '@type': 'Process', '@id': mapped.id, name: mapped.name }
        continue
      }
      const fid = e.flow?.['@id']
      const prov = fid ? outMap.get(fid) : undefined
      if (e.isInput && prov) e.defaultProvider = { '@type': 'Process', '@id': prov.id, name: prov.name }
    }
  }

  onProgress?.('put')
  for (const c of clones) await rpc('data/put', c)
  const refCloneId = idMap.get(refId as string)?.id as string

  onProgress?.('system')
  const ps = await rpc<{ '@id': string; name: string }>('data/create/system', {
    process: { '@id': refCloneId },
  })

  const methods = await rpc<Array<{ '@id': string; name: string }>>('data/get/all', {
    '@type': 'ImpactMethod',
  })
  const method =
    methods.find((m) => /environmental footprint/i.test(m.name)) ??
    methods.find((m) => /impact|ef |cipe|cml/i.test(m.name)) ??
    methods[0]
  if (!method) warnings.push('NO_METHOD')

  onProgress?.('calc')
  const refProc = await rpc<Proc>('data/get', { '@type': 'Process', '@id': refCloneId })
  const ro = refOutput(refProc)
  const refUnitName = ro?.unit?.name ?? 'kg'
  const amount = /t\b|ton/i.test(refUnitName) ? inp.annualT : inp.annualT * 1000
  const setup: Record<string, unknown> = { productSystem: { '@id': ps['@id'] }, amount }
  if (ro?.unit) setup.unit = ro.unit
  if (ro?.flowProperty) setup.flowProperty = ro.flowProperty
  if (method) setup.impactMethod = { '@id': method['@id'] }
  const st = await rpc<{ '@id': string }>('result/calculate', setup)
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const s = await rpc<{ isReady?: boolean }>('result/state', { '@id': st['@id'] })
    if (s.isReady) break
  }

  const imps = method
    ? await rpc<
        Array<{ impactCategory?: { name?: string; refUnit?: string }; amount?: number }>
      >('result/total-impacts', { '@id': st['@id'] })
    : []
  const div = Math.max(inp.annualT, 1e-9)
  return {
    psId: ps['@id'],
    psName: ps.name,
    resultId: st['@id'],
    methodName: method?.name ?? '—',
    refFlowName: ro?.flow?.name ?? '',
    impacts: (imps ?? []).map((i) => ({
      name: i.impactCategory?.name ?? '?',
      unit: i.impactCategory?.refUnit ?? '',
      annual: i.amount ?? 0,
      perT: (i.amount ?? 0) / div,
    })),
    warnings,
  }
}
