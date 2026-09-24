import { useEffect, useMemo, useState } from 'react'
import type { Contribution, FlowResult, ImpactResult } from '../api/types'
import { impactContributions } from '../api/ipc'
import { fmt, saveCsv, saveText, toCsv } from '../lib/export'
import { useI18n } from '../i18n'
import { Button, Spinner } from './ui/primitives'

export interface ReportData {
  flows: FlowResult[]
  impacts: ImpactResult[]
}

export function ReportBuilder({
  results,
  resultId,
  processName,
  methodName,
  onClose,
}: {
  results: ReportData
  resultId: string
  processName: string
  methodName: string
  onClose: () => void
}) {
  const t = useI18n((s) => s.t)
  const [withMeta, setWithMeta] = useState(true)
  const [withLcia, setWithLcia] = useState(true)
  const [withInventory, setWithInventory] = useState(true)
  const [withContrib, setWithContrib] = useState(false)
  const [topN, setTopN] = useState(50)
  const [catId, setCatId] = useState('')
  const [contrib, setContrib] = useState<Contribution[] | null>(null)
  const [loadingContrib, setLoadingContrib] = useState(false)

  const impacts = useMemo(
    () => [...results.impacts].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
    [results.impacts],
  )
  const flows = useMemo(
    () => [...results.flows].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
    [results.flows],
  )

  useEffect(() => {
    if (!catId && impacts.length > 0) {
      const nz = impacts.find((i) => i.amount !== 0) ?? impacts[0]
      setCatId(nz.impactCategory['@id'])
    }
  }, [impacts, catId])

  useEffect(() => {
    if (!withContrib || !catId || !resultId) {
      setContrib(null)
      return
    }
    let on = true
    setLoadingContrib(true)
    impactContributions(resultId, catId)
      .then((r) => on && setContrib([...r].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))))
      .catch(() => on && setContrib([]))
      .finally(() => on && setLoadingContrib(false))
    return () => {
      on = false
    }
  }, [withContrib, catId, resultId])

  const selectedCat = impacts.find((i) => i.impactCategory['@id'] === catId)

  const metaRows = () => [
    [t('name'), processName],
    [t('method'), methodName],
    ['Date', new Date().toISOString().slice(0, 10)],
  ]

  const buildCsv = () => {
    const parts: Array<Array<string | number>> = []
    if (withMeta) parts.push(...metaRows(), [])
    if (withLcia) {
      parts.push([t('total_impact') + ' · LCIA'], [t('impact_categories'), t('amount'), t('unit')])
      for (const i of impacts) parts.push([i.impactCategory.name, i.amount, i.impactCategory.refUnit?.trim() ?? ''])
      parts.push([])
    }
    if (withInventory) {
      parts.push([`${t('inventory')} — top ${topN}`], [t('flow'), t('flow_type'), t('category'), t('amount'), t('unit')])
      for (const f of flows.slice(0, topN)) {
        parts.push([
          f.enviFlow.flow.name,
          f.enviFlow.flow.flowType ?? '',
          f.enviFlow.flow.category ?? '',
          f.amount,
          f.enviFlow.flow.refUnit ?? '',
        ])
      }
      parts.push([])
    }
    if (withContrib && contrib && selectedCat) {
      parts.push([`${t('contributions')}: ${selectedCat.impactCategory.name}`], [t('name'), t('location'), t('amount')])
      for (const c of contrib.slice(0, topN)) {
        parts.push([c.techFlow.provider?.name ?? '', c.techFlow.provider?.location ?? '', c.amount])
      }
    }
    return toCsv(parts)
  }

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const buildHtml = () => {
    const css = `body{font-family:'Segoe UI',Arial,sans-serif;margin:40px;color:#26292c;background:#fdfdfb}
h1{font-size:22px;border-bottom:2px solid #26292c;padding-bottom:8px}
h2{font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#5a574e;margin-top:28px;border-bottom:1px solid #d8d4c8;padding-bottom:4px}
table{border-collapse:collapse;width:100%;font-size:12px;margin-top:8px}
td,th{border:1px solid #d8d4c8;padding:4px 8px;text-align:left}
th{background:#f0eee7;text-transform:uppercase;font-size:10px;letter-spacing:0.5px}
td.num{text-align:right;font-family:Consolas,monospace}
.meta td:first-child{width:220px;color:#5a574e}`
    const sections: string[] = []
    if (withMeta) {
      sections.push(`<h2>${esc(t('general_info'))}</h2><table class="meta">${metaRows()
        .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
        .join('')}</table>`)
    }
    if (withLcia) {
      sections.push(`<h2>${esc(t('total_impact'))} · LCIA</h2><table><tr><th>${esc(t('impact_categories'))}</th><th>${esc(t('amount'))}</th><th>${esc(t('unit'))}</th></tr>${impacts
        .map(
          (i) =>
            `<tr><td>${esc(i.impactCategory.name)}</td><td class="num">${fmt(i.amount)}</td><td>${esc(i.impactCategory.refUnit?.trim() ?? '')}</td></tr>`,
        )
        .join('')}</table>`)
    }
    if (withInventory) {
      sections.push(`<h2>${esc(t('inventory'))} — top ${topN}</h2><table><tr><th>${esc(t('flow'))}</th><th>${esc(t('category'))}</th><th>${esc(t('amount'))}</th><th>${esc(t('unit'))}</th></tr>${flows
        .slice(0, topN)
        .map(
          (f) =>
            `<tr><td>${esc(f.enviFlow.flow.name)}</td><td>${esc(f.enviFlow.flow.category ?? '')}</td><td class="num">${fmt(f.amount)}</td><td>${esc(f.enviFlow.flow.refUnit ?? '')}</td></tr>`,
        )
        .join('')}</table>`)
    }
    if (withContrib && contrib && selectedCat) {
      sections.push(`<h2>${esc(t('contributions'))}: ${esc(selectedCat.impactCategory.name)}</h2><table><tr><th>${esc(t('name'))}</th><th>${esc(t('location'))}</th><th>${esc(t('amount'))}</th></tr>${contrib
        .slice(0, topN)
        .map(
          (c) =>
            `<tr><td>${esc(c.techFlow.provider?.name ?? '')}</td><td>${esc(c.techFlow.provider?.location ?? '')}</td><td class="num">${fmt(c.amount)}</td></tr>`,
        )
        .join('')}</table>`)
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(processName)} — LCA Report</title><style>${css}</style></head><body><h1>${esc(processName)}</h1>${sections.join('')}<p style="margin-top:32px;font-size:11px;color:#8a8577">LCA·AI Studio · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</p></body></html>`
  }

  const checkbox = (label: string, checked: boolean, set: (v: boolean) => void) => (
    <label className="flex items-center gap-2 text-[13px] cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  )

  return (
    <div className="fixed inset-0 z-[65] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-paper border border-line w-[760px] max-h-[85vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">{t('report_builder')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">×</button>
        </div>

        <div className="p-4 border-b border-line space-y-2">
          <div className="flex items-center gap-5 flex-wrap">
            {checkbox(t('general_info'), withMeta, setWithMeta)}
            {checkbox('LCIA', withLcia, setWithLcia)}
            {checkbox(t('inventory'), withInventory, setWithInventory)}
            {checkbox(t('contributions'), withContrib, setWithContrib)}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-[12px] text-graphite-mid flex items-center gap-2">
              {t('top_n')}
              <input
                type="number"
                value={topN}
                min={5}
                max={1000}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="w-[90px] px-2 py-1 bg-paper border border-line text-[12px] outline-none"
              />
            </label>
            {withContrib && (
              <select
                value={catId}
                onChange={(e) => setCatId(e.target.value)}
                className="px-2 py-1 bg-paper border border-line text-[12px] outline-none max-w-[380px]"
              >
                {impacts.map((i) => (
                  <option key={i.impactCategory['@id']} value={i.impactCategory['@id']}>
                    {i.impactCategory.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {withContrib && loadingContrib && <Spinner label={t('loading')} />}
          {withMeta && (
            <div className="mb-4">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-soft mb-1">{t('general_info')}</div>
              <table className="text-[12px] border-collapse w-full">
                <tbody>
                  {metaRows().map(([k, v]) => (
                    <tr key={k} className="border-t border-line">
                      <td className="py-1 pr-4 text-graphite-mid w-[200px]">{k}</td>
                      <td className="py-1">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {withLcia && (
            <div className="mb-4">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-soft mb-1">LCIA · {impacts.length}</div>
              <table className="text-[12px] border-collapse w-full">
                <tbody>
                  {impacts.slice(0, 10).map((i) => (
                    <tr key={i.impactCategory['@id']} className="border-t border-line">
                      <td className="py-1 pr-3 truncate max-w-[420px]">{i.impactCategory.name}</td>
                      <td className="py-1 pr-3 text-right font-mono whitespace-nowrap">{fmt(i.amount)}</td>
                      <td className="py-1 text-graphite-soft">{i.impactCategory.refUnit?.trim()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {impacts.length > 10 && <div className="text-[11px] text-graphite-soft mt-1">… +{impacts.length - 10}</div>}
            </div>
          )}
          {withInventory && (
            <div className="mb-4">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-soft mb-1">
                {t('inventory')} · top {Math.min(topN, flows.length)} / {flows.length}
              </div>
            </div>
          )}
          {withContrib && contrib && contrib.length > 0 && (
            <div className="mb-4">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-soft mb-1">
                {t('contributions')} · {contrib.length}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-line">
          <Button variant="ghost" onClick={() => saveCsv('report.csv', buildCsv())}>⇓ CSV</Button>
          <Button onClick={() => saveText('report.html', buildHtml(), 'text/html;charset=utf-8')}>
            ⇓ {t('export_html')}
          </Button>
        </div>
      </div>
    </div>
  )
}
