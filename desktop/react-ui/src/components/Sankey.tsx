import { useEffect, useState } from 'react'
import { sankeyGraph } from '../api/ipc'
import type { SankeyGraph } from '../api/types'

const W = 900
const H = 420
const COLW = 150
const NODEW = 14

export function Sankey({ psId, impactCategoryId }: { psId: string; impactCategoryId: string }) {
  const [g, setG] = useState<SankeyGraph | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let on = true
    sankeyGraph(psId, impactCategoryId)
      .then((r) => on && setG(r))
      .catch((e) => on && setErr(String(e instanceof Error ? e.message : e)))
    return () => {
      on = false
    }
  }, [psId, impactCategoryId])

  if (err) return <div className="text-[12px] text-graphite-soft">sankey: {err}</div>
  if (!g) return <div className="skeleton" style={{ height: H }} />

  // depth via BFS from root following node->provider
  const depth = new Map<number, number>()
  depth.set(g.rootIndex, 0)
  let changed = true
  let guard = 0
  while (changed && guard++ < 20) {
    changed = false
    for (const e of g.edges) {
      const d = (depth.get(e.nodeIndex) ?? -1) + 1
      if (d > (depth.get(e.providerIndex) ?? -1)) {
        depth.set(e.providerIndex, d)
        changed = true
      }
    }
  }
  const maxDepth = Math.max(0, ...[...depth.values()])
  const cols: number[][] = Array.from({ length: maxDepth + 1 }, () => [])
  g.nodes.forEach((n) => cols[depth.get(n.index) ?? 0].push(n.index))

  const maxAbs = Math.max(1, ...g.nodes.map((n) => Math.abs(n.totalResult)))
  const pos = new Map<number, { x: number; y: number; h: number }>()
  cols.forEach((col, ci) => {
    const totalH = col.reduce((a, i) => a + 20 + (Math.abs(g.nodes[i].totalResult) / maxAbs) * (H - 80), 0)
    let y = Math.max(10, (H - totalH) / 2)
    for (const i of col) {
      const h = 20 + (Math.abs(g.nodes[i].totalResult) / maxAbs) * (H - 80)
      pos.set(i, { x: 20 + ci * COLW, y, h })
      y += h + 10
    }
  })

  const label = (i: number) => {
    const n = g.nodes[i]
    const p = n.techFlow.provider?.name ?? '?'
    return p.length > 26 ? p.slice(0, 25) + '…' : p
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Sankey diagram">
      {g.edges.map((e, k) => {
        const a = pos.get(e.nodeIndex)
        const b = pos.get(e.providerIndex)
        if (!a || !b) return null
        const w = Math.max(1, e.upstreamShare * 24)
        const x1 = a.x + NODEW
        const x2 = b.x
        const y1 = a.y + a.h / 2
        const y2 = b.y + b.h / 2
        return (
          <path
            key={k}
            d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke="var(--color-accent)"
            strokeOpacity={0.35}
            strokeWidth={w}
          />
        )
      })}
      {g.nodes.map((n) => {
        const p = pos.get(n.index)
        if (!p) return null
        const neg = n.totalResult < 0
        return (
          <g key={n.index}>
            <rect x={p.x} y={p.y} width={NODEW} height={p.h} fill={neg ? 'var(--color-pos)' : 'var(--color-neg)'} rx={2} />
            <text x={p.x + NODEW + 4} y={p.y + 10} fontSize={10} fill="var(--color-graphite-mid)">
              {label(n.index)}
            </text>
            <text x={p.x + NODEW + 4} y={p.y + 22} fontSize={9} fill="var(--color-graphite-soft)" className="num">
              {n.totalResult.toPrecision(3)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
