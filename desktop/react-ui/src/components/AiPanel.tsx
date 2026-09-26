import { useEffect, useState } from 'react'
import { useCloud } from '../stores/cloud'
import { useI18n } from '../i18n'
import { Button, ErrorBox, Spinner } from './ui/primitives'
import { StepGroup } from './StepGroup'
import { Markdown } from './Markdown'

interface AiReport {
  error?: string
  message?: string
  product_title?: string
  functional_unit?: string
  system_boundary?: string
  method?: string
  region?: string
  total_co2eq?: number
  stages?: Array<{
    name: string
    co2eq: number
    share_pct: number
    description?: string
    key_inputs?: string[]
    sub_processes?: Array<{ name: string; amount: number; unit: string; factor: number; factor_unit: string; co2eq: number }>
  }>
}

export function AiPanel({ open, onClose, seed }: { open: boolean; onClose: () => void; seed?: string }) {
  const t = useI18n((s) => s.t)
  const lang = useI18n((s) => s.lang)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<AiReport | null>(null)

  useEffect(() => {
    if (open && seed) setText(seed)
  }, [open, seed])

  if (!open) return null

  const run = async () => {
    setBusy(true)
    setError('')
    setReport(null)
    try {
      const r = await window.desktop!.aiCalculate(text.trim(), lang)
      setReport(r)
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e)
      setError(msg === 'LOGIN_REQUIRED' ? t('ai_need_login') : msg)
      if (msg === 'LOGIN_REQUIRED') useCloud.getState().setOpen(true)
    } finally {
      setBusy(false)
    }
  }

  const saveToCloud = () => {
    if (!report || report.error) return
    useCloud.getState().setPendingReport({
      product_title: report.product_title ?? '',
      functional_unit: report.functional_unit ?? '',
      total_co2eq: report.total_co2eq ?? 0,
      report_data: report as unknown as Record<string, unknown>,
    })
    useCloud.getState().setOpen(true)
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-paper border border-line w-[720px] max-h-[85vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">✦ {t('ai_title')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('ai_placeholder')}
            rows={3}
            className="w-full px-3 py-2 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid"
          />
          <div className="flex items-center gap-3">
            <Button onClick={run} disabled={busy || !text.trim()}>
              {busy ? t('calculating') : t('ai_run')}
            </Button>
            {busy && <Spinner label={t('loading')} />}
            {report && !report.error && (
              <button onClick={saveToCloud} className="text-[12px] text-graphite-mid hover:text-graphite cursor-pointer">
                ☁ {t('cloud_save')}
              </button>
            )}
          </div>
          {error && <ErrorBox message={error} />}

          {report?.error === 'not_lca' && <ErrorBox message={report.message ?? 'not_lca'} />}

          {report && !report.error && (
            <div>
              <h4 className="text-[16px] mb-1">{report.product_title}</h4>
              <div className="text-[12px] text-graphite-soft mb-3">
                {report.functional_unit} · {report.method} · {report.region} ·{' '}
                <b>{report.total_co2eq} kg CO2-eq</b>
              </div>
              {(report.stages ?? []).map((s, i) => (
                <StepGroup key={i} label={s.name} count={Number(s.share_pct)} defaultOpen={i === 0}>
                  {s.description && <Markdown text={s.description} />}
                  {(s.key_inputs ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(s.key_inputs ?? []).map((k, j) => (
                        <span key={j} className="text-[10px] font-mono bg-paper-3 border border-line rounded px-1.5 py-0.5">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                  <table className="w-full text-[12px] border-collapse">
                    <tbody>
                      {(s.sub_processes ?? []).map((sp, j) => (
                        <tr key={j} className="border-t border-line">
                          <td className="py-1 px-3">{sp.name}</td>
                          <td className="py-1 px-3 text-graphite-mid">
                            {sp.amount} {sp.unit} × {sp.factor} {sp.factor_unit}
                          </td>
                          <td className="py-1 px-3 text-right font-mono">{sp.co2eq}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-right text-[11px] font-mono text-graphite-mid mt-1">
                    {s.co2eq} kg CO2-eq · {s.share_pct}%
                  </div>
                </StepGroup>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
