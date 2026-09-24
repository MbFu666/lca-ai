export type EntityType =
  | 'Process'
  | 'Flow'
  | 'FlowProperty'
  | 'UnitGroup'
  | 'ImpactMethod'
  | 'ImpactCategory'
  | 'ProductSystem'
  | 'Actor'
  | 'Source'
  | 'Location'
  | 'Parameter'
  | 'DQSystem'
  | 'Currency'
  | 'Project'
  | 'EPD'
  | 'Result'
  | 'SocialIndicator'

export interface Ref {
  '@type'?: string
  '@id'?: string
  name?: string
  description?: string
}

export interface Descriptor {
  '@id': string
  name: string
  description?: string
}

export interface Uncertainty {
  distributionType?: string
  minimum?: number
  maximum?: number
  mostLikely?: number
  mean?: number
  sd?: number
  geoMean?: number
  geoSd?: number
  [key: string]: unknown
}

export interface Exchange {
  '@type'?: string
  '@id'?: string
  internalId?: number
  flow?: Ref
  flowProperty?: Ref
  unit?: Ref
  amount?: number | string
  amountFormula?: string
  baseUncertainty?: number
  input?: boolean
  isInput?: boolean
  quantitativeReference?: boolean
  isQuantitativeReference?: boolean
  defaultProvider?: Ref
  uncertainty?: Uncertainty
  costValue?: number
  costFormula?: string
  description?: string
}

export interface Process {
  '@type'?: string
  '@id': string
  name: string
  version?: string
  lastChange?: string
  description?: string
  category?: Ref | string
  location?: Ref | string
  processType?: string
  refFlow?: Ref
  refQuantity?: number
  unit?: Ref
  exchanges?: Exchange[]
  parameters?: unknown[]
  allocations?: unknown[]
  [key: string]: unknown
}

export interface Flow {
  '@type'?: string
  '@id': string
  name: string
  description?: string
  category?: Ref
  flowType?: string
  location?: Ref
  unit?: Ref
  flowProperties?: unknown[]
  [key: string]: unknown
}

export interface FlowPropertyFactor {
  '@type'?: string
  isRefFlowProperty?: boolean
  conversionFactor?: number
  flowProperty?: Ref & { refUnit?: string }
}

export interface FlowDetail {
  '@type'?: string
  '@id': string
  name: string
  description?: string
  category?: Ref | string
  flowType?: string
  cas?: string
  version?: string
  lastChange?: string
  location?: Ref | string
  flowProperties?: FlowPropertyFactor[]
  [key: string]: unknown
}

export interface ImpactFactor {
  value?: number
  formula?: string
  flow?: Ref & { category?: string; flowType?: string; refUnit?: string }
  unit?: Ref
  flowProperty?: Ref
}

export interface ImpactCategoryDetail {
  '@type'?: string
  '@id': string
  name: string
  description?: string
  version?: string
  lastChange?: string
  refUnit?: string
  impactFactors?: ImpactFactor[]
  [key: string]: unknown
}

export interface UnitDetail {
  '@type'?: string
  '@id'?: string
  name: string
  description?: string
  conversionFactor?: number
  isRefUnit?: boolean
}

export interface UnitGroupDetail {
  '@type'?: string
  '@id': string
  name: string
  description?: string
  category?: Ref | string
  version?: string
  lastChange?: string
  units?: UnitDetail[]
  [key: string]: unknown
}

export interface DQScoreDetail {
  position: number
  label: string
  description?: string
  uncertainty?: number
}

export interface DQIndicatorDetail {
  name: string
  position: number
  scores: DQScoreDetail[]
}

export interface DQSystemDetail {
  '@type'?: string
  '@id': string
  name: string
  description?: string
  version?: string
  lastChange?: string
  hasUncertainties?: boolean
  source?: Ref
  indicators?: DQIndicatorDetail[]
  [key: string]: unknown
}

export interface ProcessLink {
  provider?: Ref
  process?: Ref
  exchange?: number
  amount?: number
  unit?: Ref
}

export interface ProductSystemDetail {
  '@type'?: string
  '@id': string
  name: string
  description?: string
  version?: string
  lastChange?: string
  refProcess?: Ref & { category?: string; location?: string }
  refExchange?: { internalId?: number; flow?: Ref & { refUnit?: string } }
  targetFlowProperty?: Ref & { refUnit?: string }
  targetUnit?: Ref
  targetAmount?: number
  processes?: Array<Ref & { category?: string; location?: string; processType?: string }>
  processLinks?: ProcessLink[]
  [key: string]: unknown
}

export interface ImpactMethod {
  '@type'?: string
  '@id': string
  name: string
  description?: string
  impactCategories?: Ref[]
  [key: string]: unknown
}

export interface CalculationSetup {
  productSystem: Ref
  impactMethod?: Ref
  nwSet?: Ref
  allocation?: string
  amount?: number
  withCosts?: boolean
  withRegionalization?: boolean
  [key: string]: unknown
}

export interface CalcState {
  '@id': string
  isReady: boolean
  isScheduled?: boolean
  time?: number
  [key: string]: unknown
}

export interface EnviFlow {
  flow: Descriptor & { category?: string; refUnit?: string; flowType?: string }
  isInput?: boolean
}

export interface FlowResult {
  enviFlow: EnviFlow
  amount: number
}

export interface ImpactResult {
  impactCategory: Descriptor & { refUnit?: string }
  amount: number
}

export interface ProductSystemRef {
  '@type'?: string
  '@id': string
  name?: string
}

export interface RpcError {
  code: number
  message: string
  data?: unknown
}

export interface TechFlow {
  provider?: Ref & { location?: string; category?: string }
  flow?: Ref & { refUnit?: string }
}

export interface Contribution {
  techFlow: TechFlow
  amount: number
}

export interface SankeyNode {
  index: number
  techFlow: TechFlow
  directResult: number
  totalResult: number
}

export interface SankeyEdge {
  nodeIndex: number
  providerIndex: number
  upstreamShare: number
}

export interface SankeyGraph {
  rootIndex: number
  nodes: SankeyNode[]
  edges: SankeyEdge[]
}

export interface ProcessParameter {
  '@id'?: string
  name?: string
  description?: string
  formula?: string
  value?: number
  isInputParameter?: boolean
  [key: string]: unknown
}
