import { useToasts } from '../../lib/toast'

export function KpiCard({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className={`kpi-card ${tone ?? ''}`}>
      <b className="num">
        {value}
        {unit ? <span style={{ fontSize: 12, marginLeft: 4 }}>{unit}</span> : null}
      </b>
      <span>{label}</span>
    </div>
  )
}

export function BarList({ items }: { items: Array<{ label: string; value: number; display: string; neg?: boolean }> }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)))
  return (
    <div className="barlist">
      {items.map((it, k) => (
        <div className="row" key={k}>
          <div>{it.label}</div>
          <div className="num">{it.display}</div>
          <div className="track">
            <div className={`fill ${it.neg ? 'neg' : ''}`} style={{ width: `${(Math.abs(it.value) / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Tornado({ rows }: { rows: Array<{ label: string; low: number; high: number }> }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(Math.abs(r.low), Math.abs(r.high))))
  return (
    <div className="barlist">
      {rows.map((r, k) => (
        <div className="row" key={k}>
          <div>{r.label}</div>
          <div className="num">
            Δ{Math.abs(r.high - r.low).toFixed(0)}
          </div>
          <div className="track" style={{ position: 'relative' }}>
            <div
              className="fill"
              style={{
                position: 'absolute',
                left: `${((Math.min(r.low, r.high) + max) / (2 * max)) * 100}%`,
                width: `${(Math.abs(r.high - r.low) / (2 * max)) * 100}%`,
              }}
            />
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--color-graphite-soft)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Histogram({ buckets, unit }: { buckets: Array<{ x0: number; x1: number; count: number }>; unit?: string }) {
  const max = Math.max(1, ...buckets.map((b) => b.count))
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 90 }}>
        {buckets.map((b, k) => (
          <div
            key={k}
            title={`${b.x0.toFixed(0)}…${b.x1.toFixed(0)}: ${b.count}`}
            style={{ flex: 1, height: `${(b.count / max) * 100}%`, background: 'var(--color-accent)', borderRadius: 2, minHeight: 2 }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-graphite-soft)' }} className="num">
        <span>{buckets[0]?.x0.toFixed(0)}</span>
        <span>{unit}</span>
        <span>{buckets[buckets.length - 1]?.x1.toFixed(0)}</span>
      </div>
    </div>
  )
}

export function Toasts() {
  const { toasts, dismiss } = useToasts()
  return (
    <div className="toast-wrap" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'ok' ? '' : t.kind}`} onClick={() => dismiss(t.id)} role="status">
          {t.text}
        </div>
      ))}
    </div>
  )
}
