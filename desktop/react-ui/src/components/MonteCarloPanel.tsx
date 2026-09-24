import { useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CalculationSetup, FlowResult, ImpactResult } from '../api/types'
import { simulate, simulateNext, totalFlows, totalImpacts } from '../api/ipc'
import { fmt } from '../lib/export'
import { useI18n } from '../i18n'
import { Button, ErrorBox, Spinner } from './ui/primitives'

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export function MonteCarloPanel({
  setup,
  impacts,
  flows,
  onClose,
}: {
  setup: CalculationSetup
  impacts: ImpactResult[]
  flows: FlowResult[]
  onClose: () => void
}) {
  const t = useI18n((s) => s.t)
  const [iterations, setIterations] = useState(100)
  const [target, setTarget] = useState('')
  const [samples, setSamples] = useState<number[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const useImpacts = impacts.length > 0
  const options = useImpacts
    ? impacts.map((i) => ({ id: i.impactCategory['@id'], name: i.impactCategory.name }))
    : [...flows]
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, 30)
        .map((f) => ({ id: f.enviFlow.flow['@id'], name: f.enviFlow.flow.name }))

  const effectiveTarget = target || options[0]?.id || ''

  const run = async () => {
    if (!effectiveTarget) return
    setRunning(true)
    setError('')
    setSamples([])
    setProgress(0)
    try {
      const st = await simulate(setup)
      const arr: number[] = []
      for (let i = 0; i < iterations; i++) {
        await new Promise((r) => setTimeout(r, 250))
        await simulateNext(st['@id']).catch(() => undefined)
        const list = useImpacts ? await totalImpacts(st['@id']) : await totalFlows(st['@id'])
        const hit = useImpacts
          ? (list as ImpactResult[]).find((x) => x.impactCategory['@id'] === effectiveTarget)
          : (list as FlowResult[]).find((x) => x.enviFlow.flow['@id'] === effectiveTarget)
        if (hit) arr.push(hit.amount)
        if (i % 10 === 0) setProgress(i)
      }
      setSamples(arr)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setRunning(false)
      setProgress(iterations)
    }
  }

  const stats = useMemo(() => {
    if (samples.length === 0) return null
    const sorted = [...samples].sort((a, b) => a - b)
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length
    const sd = Math.sqrt(samples.reduce((s, v) => s + (v - mean) ** 2, 0) / samples.length)
    return {
      mean,
      sd,
      p5: quantile(sorted, 0.05),
      p50: quantile(sorted, 0.5),
      p95: quantile(sorted, 0.95),
      min: sorted[0],
      max: sorted[sorted.length - 1],
    }
  }, [samples])

  const histogram = useMemo(() => {
    if (samples.length === 0 || !stats) return []
    const bins = 12
    const { min, max } = stats
    const span = max - min || 1
    const counts = new Array(bins).fill(0)
    for (const v of samples) {
      const b = Math.min(bins - 1, Math.floor(((v - min) / span) * bins))
      counts[b]++
    }
    return counts.map((c, i) => ({
      name: fmt(min + ((i + 0.5) / bins) * span),
      count: c,
    }))
  }, [samples, stats])

  return (
    <div className="fixed inset-0 z-[65] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-paper border border-line w-[760px] max-h-[85vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">{t('monte_carlo')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">×</button>
        </div>

        <div className="p-4 space-y-3 border-b border-line">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-[12px] text-graphite-mid flex items-center gap-2">
              {t('iterations')}
              <input
                type="number"
                min={10}
                max={1000}
                value={iterations}
                onChange={(e) => setIterations(Number(e.target.value))}
                className="w-[90px] px-2 py-1 bg-paper border border-line text-[12px] outline-none"
              />
            </label>
            <select
              value={effectiveTarget}
              onChange={(e) => setTarget(e.target.value)}
              className="px-2 py-1 bg-paper border border-line text-[12px] outline-none max-w-[380px]"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <Button onClick={run} disabled={running || !effectiveTarget} variant="danger">
              {running ? `${progress}/${iterations}` : t('run')}
            </Button>
          </div>
          {error && <ErrorBox message={error} />}
          {running && <Spinner label={t('calculating')} />}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {stats && (
            <>
              <div className="grid grid-cols-6 gap-2 mb-4 text-center">
                {[
                  [t('mean'), stats.mean],
                  [t('sd'), stats.sd],
                  ['p5', stats.p5],
                  ['p50', stats.p50],
                  ['p95', stats.p95],
                  [t('maximum'), stats.max],
                ].map(([label, v]) => (
                  <div key={String(label)} className="border border-line p-2">
                    <div className="text-[10px] font-sans uppercase text-graphite-soft">{label}</div>
                    <div className="text-[12px] font-mono">{fmt(Number(v))}</div>
                  </div>
                ))}
              </div>
              <div className="h-[240px] border border-line bg-paper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogram} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={40} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2f5d43" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
