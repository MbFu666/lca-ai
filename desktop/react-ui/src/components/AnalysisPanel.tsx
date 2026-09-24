import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Contribution, FlowResult, ImpactResult } from '../api/types'
import { flowContributions, normalizedImpacts, weightedImpacts } from '../api/ipc'
import { fmt } from '../lib/export'
import { useI18n } from '../i18n'
import { Spinner } from './ui/primitives'

const COLORS = ['#2f5d43', '#4a90d9', '#9b59b6', '#e67e22', '#e74c3c', '#16a085', '#f1c40f', '#5b8dd9']

function ImpactBarChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="h-[260px] border border-line bg-paper">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmt(v)} width={70} />
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Bar dataKey="value">
            {data.map((_e, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AnalysisPanel({
  resultId,
  impacts,
  flows,
  onClose,
}: {
  resultId: string
  impacts: ImpactResult[]
  flows: FlowResult[]
  onClose: () => void
}) {
  const t = useI18n((s) => s.t)
  const [normalized, setNormalized] = useState<ImpactResult[] | null>(null)
  const [weighted, setWeighted] = useState<ImpactResult[] | null>(null)
  const [flowId, setFlowId] = useState('')
  const [contribs, setContribs] = useState<Contribution[] | null>(null)

  const chartData = useMemo(
    () =>
      [...impacts]
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, 12)
        .map((i) => ({ name: i.impactCategory.name, value: i.amount })),
    [impacts],
  )

  const topFlows = useMemo(
    () => [...flows].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 30),
    [flows],
  )

  useEffect(() => {
    let on = true
    normalizedImpacts(resultId)
      .then((r) => on && setNormalized(r))
      .catch(() => on && setNormalized([]))
    weightedImpacts(resultId)
      .then((r) => on && setWeighted(r))
      .catch(() => on && setWeighted([]))
    return () => {
      on = false
    }
  }, [resultId])

  useEffect(() => {
    if (!flowId) {
      setContribs(null)
      return
    }
    let on = true
    flowContributions(resultId, flowId)
      .then((r) => on && setContribs([...r].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))))
      .catch(() => on && setContribs([]))
    return () => {
      on = false
    }
  }, [flowId, resultId])

  const table = (rows: ImpactResult[] | null, title: string) => (
    <div className="mb-4">
      <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-soft mb-1">{title}</div>
      {rows === null ? (
        <Spinner label={t('loading')} />
      ) : rows.length === 0 ? (
        <div className="text-[12px] text-graphite-soft">—</div>
      ) : (
        <table className="w-full text-[12px] border-collapse">
          <tbody>
            {rows.map((i) => (
              <tr key={i.impactCategory['@id']} className="border-t border-line">
                <td className="py-1 pr-3 truncate max-w-[380px]">{i.impactCategory.name}</td>
                <td className="py-1 pr-3 text-right font-mono whitespace-nowrap">{fmt(i.amount)}</td>
                <td className="py-1 text-graphite-soft">{i.impactCategory.refUnit?.trim() ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[65] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-paper border border-line w-[860px] max-h-[88vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">{t('analysis')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-soft mb-1">
              {t('total_impact')} · LCIA
            </div>
            <ImpactBarChart data={chartData} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {table(normalized, t('normalized'))}
            {table(weighted, t('weighted'))}
          </div>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
                {t('flow_contributions')}
              </div>
              <select
                value={flowId}
                onChange={(e) => setFlowId(e.target.value)}
                className="px-2 py-1 bg-paper border border-line text-[12px] outline-none max-w-[420px]"
              >
                <option value="">—</option>
                {topFlows.map((f) => (
                  <option key={f.enviFlow.flow['@id']} value={f.enviFlow.flow['@id']}>
                    {f.enviFlow.flow.name}
                  </option>
                ))}
              </select>
            </div>
            {contribs === null && flowId ? (
              <Spinner label={t('loading')} />
            ) : contribs && contribs.length > 0 ? (
              <table className="w-full text-[12px] border-collapse">
                <tbody>
                  {contribs.slice(0, 50).map((c, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="py-1 pr-3 truncate max-w-[480px]">{c.techFlow.provider?.name ?? '—'}</td>
                      <td className="py-1 pr-3 text-graphite-mid">{c.techFlow.provider?.location ?? ''}</td>
                      <td className="py-1 text-right font-mono whitespace-nowrap">{fmt(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : flowId ? (
              <div className="text-[12px] text-graphite-soft">—</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
