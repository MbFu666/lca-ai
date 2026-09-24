import { useCallback, useEffect, useMemo, useState } from 'react'
import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { ProductSystemDetail } from '../../api/types'
import { getEntity } from '../../api/ipc'
import { useI18n } from '../../i18n'
import { useTabs, tabKey } from '../../stores/tabs'
import { ErrorBox, Field, Spinner } from '../ui/primitives'

const GRAPH_NODE_LIMIT = 300

export function ProductSystemEditor({ id }: { id: string }) {
  const t = useI18n((s) => s.t)
  const openTab = useTabs((s) => s.open)
  const [system, setSystem] = useState<ProductSystemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSystem(await getEntity<ProductSystemDetail>('ProductSystem', id))
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const openProcess = useCallback(
    (pid: string, name: string) => {
      openTab({ key: tabKey('Process', pid), type: 'Process', id: pid, name })
    },
    [openTab],
  )

  const { nodes, edges } = useMemo(() => {
    const procs = system?.processes ?? []
    const links = system?.processLinks ?? []
    if (procs.length === 0 || procs.length > GRAPH_NODE_LIMIT) return { nodes: [] as Node[], edges: [] as Edge[] }

    const providers = new Map<string, string[]>()
    for (const l of links) {
      const from = l.provider?.['@id']
      const to = l.process?.['@id']
      if (!from || !to || from === to) continue
      if (!providers.has(to)) providers.set(to, [])
      providers.get(to)!.push(from)
    }

    const depth = new Map<string, number>()
    const root = (system?.refProcess?.['@id'] ?? procs[0]['@id'] ?? '') as string
    const queue = [root]
    depth.set(root, 0)
    while (queue.length > 0) {
      const cur = queue.shift()!
      const d = depth.get(cur)!
      for (const up of providers.get(cur) ?? []) {
        if (!depth.has(up)) {
          depth.set(up, d + 1)
          queue.push(up)
        }
      }
    }
    for (const p of procs) {
      if (p['@id'] && !depth.has(p['@id'])) depth.set(p['@id'], 0)
    }

    const maxDepth = Math.max(...depth.values(), 0)
    const byDepth = new Map<number, string[]>()
    for (const p of procs) {
      if (!p['@id']) continue
      const d = depth.get(p['@id']) ?? 0
      if (!byDepth.has(d)) byDepth.set(d, [])
      byDepth.get(d)!.push(p['@id'])
    }

    const pos = new Map<string, { x: number; y: number }>()
    for (const [d, ids] of byDepth) {
      ids.forEach((pid, i) => {
        pos.set(pid, { x: (maxDepth - d) * 300, y: i * 96 - ((ids.length - 1) * 96) / 2 })
      })
    }

    const nodes: Node[] = procs
      .filter((p) => p['@id'] && pos.has(p['@id']))
      .map((p) => ({
        id: p['@id'] as string,
        position: pos.get(p['@id'] as string)!,
        data: { label: `${p.name ?? ''}${p.location ? ` [${p.location}]` : ''}` },
        style: {
          background: p['@id'] === root ? '#2f5d43' : '#fdfdfb',
          color: p['@id'] === root ? '#fdfdfb' : '#26292c',
          border: '1px solid #b9b4a8',
          borderRadius: '2px',
          fontSize: '11px',
          padding: '8px 10px',
          width: 230,
        },
      }))

    const edges: Edge[] = links
      .filter((l) => l.provider?.['@id'] && l.process?.['@id'] && pos.has(l.provider['@id']) && pos.has(l.process['@id']))
      .map((l, i) => ({
        id: `e${i}`,
        source: l.provider!['@id'] as string,
        target: l.process!['@id'] as string,
        style: { stroke: '#8a8577', strokeWidth: 1.2 },
      }))

    return { nodes, edges }
  }, [system])

  if (loading) return <div className="p-6"><Spinner label={t('loading')} /></div>
  if (!system) return <div className="p-6"><ErrorBox message={error || 'Not found'} onRetry={load} /></div>

  const procs = system.processes ?? []
  const tooBig = procs.length > GRAPH_NODE_LIMIT

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-[1200px]">
        <div className="mb-6">
          <div className="text-[11px] font-sans uppercase tracking-widest text-graphite-soft mb-1">
            {t('nav_systems')}
          </div>
          <h2 className="text-[22px] leading-tight">{system.name}</h2>
        </div>

        <section className="mb-8">
          <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid border-b border-line pb-1.5 mb-3">
            {t('general_info')}
          </h3>
          {system.refProcess && (
            <Field label={t('ref_process')}>
              <button
                className="text-left hover:underline cursor-pointer"
                onClick={() => openProcess(system.refProcess!['@id'] as string, system.refProcess!.name ?? '')}
              >
                {system.refProcess.name ?? system.refProcess['@id']}
              </button>
            </Field>
          )}
          {system.refExchange?.flow && (
            <Field label={t('ref_flow')}>{system.refExchange.flow.name ?? '—'}</Field>
          )}
          {system.targetUnit && (
            <Field label={t('target_flow')}>
              {system.targetAmount ?? 1} {system.targetUnit.name}
            </Field>
          )}
          <Field label={t('process_list')}>{procs.length}</Field>
          {system.version && <Field label={t('version')}>{system.version}</Field>}
        </section>

        <section className="mb-8">
          <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid border-b border-line pb-1.5 mb-3">
            {t('graph')}
          </h3>
          {tooBig ? (
            <div className="text-[13px] text-graphite-soft py-2">
              {procs.length} &gt; {GRAPH_NODE_LIMIT}
            </div>
          ) : (
            <div className="h-[480px] border border-line bg-paper-2">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                nodesConnectable={false}
                nodesDraggable
                minZoom={0.1}
                onNodeClick={(_, node) => openProcess(node.id, (node.data as { label?: string }).label ?? node.id)}
              >
                <Background gap={24} size={1} color="#d8d4c8" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          )}
        </section>

        <section className="mb-8">
          <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid border-b border-line pb-1.5 mb-3">
            {t('process_list')} ({procs.length})
          </h3>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
                <th className="py-1.5 pr-3 font-medium">{t('name')}</th>
                <th className="py-1.5 pr-3 font-medium w-[120px]">{t('location')}</th>
                <th className="py-1.5 font-medium w-[160px]">{t('process_type')}</th>
              </tr>
            </thead>
            <tbody>
              {procs.slice(0, 500).map((p) => (
                <tr
                  key={p['@id']}
                  className="border-t border-line cursor-pointer hover:bg-paper-2"
                  onClick={() => openProcess(p['@id'] as string, p.name ?? '')}
                >
                  <td className="py-1 pr-3">
                    <div className="truncate max-w-[640px]" title={p.name}>{p.name ?? '—'}</div>
                    {p.category && <div className="text-[10px] text-graphite-soft truncate">{p.category}</div>}
                  </td>
                  <td className="py-1 pr-3 text-graphite-mid">{p.location ?? '—'}</td>
                  <td className="py-1 text-graphite-mid">{p.processType ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
