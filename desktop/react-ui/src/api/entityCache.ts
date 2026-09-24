import type { Descriptor, EntityType, Ref, UnitGroupDetail } from './types'
import { getDescriptors, getEntity, rpc } from './ipc'

const cache = new Map<EntityType, Descriptor[]>()

export async function getDescriptorsCached(type: EntityType): Promise<Descriptor[]> {
  const hit = cache.get(type)
  if (hit) return hit
  const list = await getDescriptors(type)
  cache.set(type, list)
  return list
}

export function invalidateDescriptors(type?: EntityType) {
  if (type) cache.delete(type)
  else cache.clear()
}

let unitGroups: UnitGroupDetail[] | null = null
let unitGroupsPromise: Promise<UnitGroupDetail[]> | null = null

export async function getAllUnitGroups(): Promise<UnitGroupDetail[]> {
  if (unitGroups) return unitGroups
  if (unitGroupsPromise) return unitGroupsPromise
  // Single batched fetch (review: was N+1 getEntity per group).
  unitGroupsPromise = rpc<UnitGroupDetail[]>('data/get/all', { '@type': 'UnitGroup' })
    .then((all) => {
      unitGroups = (all ?? []).filter((g): g is UnitGroupDetail => !!g)
      return unitGroups
    })
    .catch(async () => {
      // fallback to per-group if batch unsupported
      const descriptors = await getDescriptorsCached('UnitGroup')
      const groups = await Promise.all(descriptors.map((d) => getEntity<UnitGroupDetail>('UnitGroup', d['@id'])))
      unitGroups = groups.filter((g): g is UnitGroupDetail => !!g)
      return unitGroups
    })
  return unitGroupsPromise
}

export function invalidateUnitGroups() {
  unitGroups = null
  unitGroupsPromise = null
}

export async function resolveUnit(unitName?: string): Promise<Ref | undefined> {
  if (!unitName) return undefined
  const groups = await getAllUnitGroups()
  for (const g of groups) {
    for (const u of g.units ?? []) {
      if (u.name === unitName) return { '@type': 'Unit', '@id': u['@id'], name: u.name }
    }
  }
  return undefined
}
