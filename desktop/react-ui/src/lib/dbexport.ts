import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { rpc } from '../api/ipc'
import type { DesktopApi } from '../types/desktop'

export const EXPORT_TYPES = [
  'UnitGroup',
  'FlowProperty',
  'Currency',
  'Location',
  'Actor',
  'Source',
  'DQSystem',
  'Parameter',
  'SocialIndicator',
  'Flow',
  'ImpactCategory',
  'ImpactMethod',
  'Process',
  'ProductSystem',
  'Result',
] as const

type Ent = Record<string, any>

const refId = (r: any): string | null => (r && typeof r === 'object' ? r['@id'] || r.id || null : null)
const refName = (r: any): string => (r && typeof r === 'object' ? r.name || r['@id'] || '' : typeof r === 'string' ? r : '')
const catPath = (c: any): string => (refName(c) ? String(refName(c)) : '')
const esc = (s: any): string => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function collectEntities(): Promise<Record<string, Ent[]>> {
  const entities: Record<string, Ent[]> = {}
  for (const type of EXPORT_TYPES) {
    try {
      const list = await rpc<any[]>('data/get/all', { '@type': type })
      const arr = Array.isArray(list) ? list : list ? [list] : []
      if (arr.length) entities[type] = arr
    } catch {
      // тип не поддерживается движком — пропускаем
    }
  }
  return entities
}

export function chooseCategory(entities: Record<string, Ent[]>): Ent | null {
  const cats = entities.ImpactCategory || []
  if (!cats.length) return null
  return cats.find((c) => /climate|global warming|co2|парник|климат/i.test(c.name || '')) || cats[0]
}

export interface ScreeningResult {
  stages: Array<{ name: string; co2eq: number; share_pct: number; sub_processes: Array<{ name: string; amount: number; unit: string; factor: number; factor_source: string; co2eq: number }> }>
  sum: number
  resultsTotal: number | null
}

export function screening(entities: Record<string, Ent[]>, cat: Ent, factorSourceLabel: string): ScreeningResult {
  const factors = new Map<string, number>()
  for (const f of cat.impactFactors || []) {
    const id = refId(f.flow)
    if (id) factors.set(id, parseFloat(f.value) || 0)
  }
  const flows = new Map<string, Ent>()
  for (const fl of entities.Flow || []) flows.set(fl['@id'], fl)
  const groups = new Map<string, ScreeningResult['stages'][number]>()
  for (const p of entities.Process || []) {
    let v = 0
    for (const x of p.exchanges || []) {
      const fid = refId(x.flow)
      if (!fid || !factors.has(fid)) continue
      const fl = flows.get(fid)
      if (!fl || String(fl.flowType || '') !== 'ELEMENTARY_FLOW') continue
      const amt = parseFloat(x.amount)
      if (!isNaN(amt)) v += amt * factors.get(fid)!
    }
    const root = String(catPath(p.category) || '').split('/')[0].trim() || '—'
    const g = groups.get(root) || { name: root, co2eq: 0, share_pct: 0, sub_processes: [] as ScreeningResult['stages'][number]['sub_processes'] }
    const rq = parseFloat(p.refQuantity) || 0
    g.co2eq += v
    g.sub_processes.push({
      name: p.name || '',
      amount: rq,
      unit: refName(p.unit),
      factor: rq ? v / rq : v,
      factor_source: factorSourceLabel,
      co2eq: v,
    })
    groups.set(root, g)
  }
  const stages = [...groups.values()].filter((g) => Math.abs(g.co2eq) > 1e-12)
  const sum = stages.reduce((a, g) => a + g.co2eq, 0)
  for (const g of stages) g.share_pct = sum ? Math.round((g.co2eq / sum) * 1000) / 10 : 0
  stages.sort((a, b) => b.co2eq - a.co2eq)
  let resultsTotal: number | null = null
  for (const r of entities.Result || []) {
    const ir = r.impactResults || r.impacts || []
    for (const row of ir) {
      const c = row.impactCategory || row.category || {}
      if ((refId(c) === cat['@id'] || refName(c) === (cat.name || '')) && row.amount != null) {
        resultsTotal = parseFloat(row.amount) || 0
      }
    }
  }
  return { stages, sum, resultsTotal }
}

export function functionalUnit(entities: Record<string, Ent[]>): string {
  const ps = (entities.ProductSystem || [])[0]
  if (ps && ps.targetAmount != null) return `${ps.targetAmount} ${refName(ps.targetUnit)}`
  const p = (entities.Process || [])[0]
  if (p && p.refQuantity != null) return `${p.refQuantity} ${refName(p.unit)} (${refName(p.refFlow)})`
  return '—'
}

/* ── openLCA-style: workbook per entity, packed into zip ── */
function entityWorkbook(type: string, e: Ent, labels: { io: string; flow: string; amount: string; unit: string; provider: string; dq: string; factor: string; conv: string; ref: string; pos: string; label: string; category: string; process: string }): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'LCA AI Studio'
  const meta = wb.addWorksheet(type.slice(0, 31))
  meta.columns = [{ width: 22 }, { width: 70 }]
  meta.addRows([
    ['Name', e.name || ''],
    ['Category', catPath(e.category)],
    ['Location', refName(e.location)],
    ['Type', e.processType || e.flowType || e.flowPropertyType || type],
    ['CAS', e.cas || ''],
    ['Version', e.version || ''],
    ['Last change', e.lastChange ? String(e.lastChange).slice(0, 10) : ''],
    ['Reference unit', e.refUnit || ''],
    ['Reference flow', refName(e.refFlow)],
    ['Reference quantity', e.refQuantity ?? ''],
    ['Unit', refName(e.unit)],
    ['Description', e.description || ''],
    ['ID', e['@id'] || ''],
  ])
  const exSheet = (name: string, rows: Ent[]) => {
    const ws = wb.addWorksheet(name)
    ws.columns = [
      { header: labels.flow, key: 'flow', width: 42 },
      { header: labels.category, key: 'cat', width: 26 },
      { header: 'Flow type', key: 'ft', width: 18 },
      { header: labels.unit, key: 'unit', width: 12 },
      { header: labels.amount, key: 'amt', width: 14 },
      { header: 'Formula', key: 'f', width: 14 },
      { header: 'Uncertainty', key: 'u', width: 22 },
      { header: labels.provider, key: 'pr', width: 34 },
      { header: labels.dq, key: 'dq', width: 22 },
    ]
    for (const x of rows) {
      ws.addRow({
        flow: refName(x.flow),
        cat: String(x.flow?.category || ''),
        ft: String(x.flow?.flowType || ''),
        unit: refName(x.unit),
        amt: typeof x.amount === 'number' ? x.amount : x.amount || '',
        f: x.amountFormula || '',
        u: x.uncertainty ? JSON.stringify(x.uncertainty) : '',
        pr: refName(x.defaultProvider),
        dq: x.dqEntry || '',
      })
    }
  }
  switch (type) {
    case 'Process': {
      const ex = e.exchanges || []
      exSheet('Inputs', ex.filter((x: Ent) => x.input === true || x.isInput === true))
      exSheet('Outputs', ex.filter((x: Ent) => !(x.input === true || x.isInput === true)))
      break
    }
    case 'Flow': {
      const ws = wb.addWorksheet('Flow properties')
      ws.columns = [
        { header: 'Flow property', key: 'p', width: 34 },
        { header: labels.ref, key: 'r', width: 10 },
        { header: labels.conv, key: 'c', width: 18 },
      ]
      for (const fp of e.flowProperties || []) ws.addRow({ p: refName(fp.flowProperty), r: fp.isRefFlowProperty ? 'yes' : '', c: fp.conversionFactor ?? '' })
      break
    }
    case 'ImpactCategory': {
      const ws = wb.addWorksheet('Factors')
      ws.columns = [
        { header: labels.flow, key: 'flow', width: 42 },
        { header: labels.category, key: 'cat', width: 26 },
        { header: 'Flow type', key: 'ft', width: 18 },
        { header: labels.unit, key: 'unit', width: 12 },
        { header: labels.factor, key: 'v', width: 16 },
        { header: 'Formula', key: 'f', width: 16 },
      ]
      for (const f of e.impactFactors || []) {
        ws.addRow({ flow: refName(f.flow), cat: String(f.flow?.category || ''), ft: String(f.flow?.flowType || ''), unit: refName(f.unit) || e.refUnit || '', v: f.value ?? '', f: f.formula || '' })
      }
      break
    }
    case 'ImpactMethod': {
      const ws = wb.addWorksheet('Categories')
      ws.columns = [{ header: 'Impact category', key: 'n', width: 50 }]
      for (const c of e.impactCategories || []) ws.addRow({ n: refName(c) })
      break
    }
    case 'UnitGroup': {
      const ws = wb.addWorksheet('Units')
      ws.columns = [
        { header: 'Unit', key: 'n', width: 20 },
        { header: labels.conv, key: 'c', width: 18 },
        { header: 'Reference unit', key: 'r', width: 14 },
      ]
      for (const u of e.units || []) ws.addRow({ n: u.name || '', c: u.conversionFactor ?? '', r: u.isRefUnit ? 'yes' : '' })
      break
    }
    case 'ProductSystem': {
      const ws = wb.addWorksheet('Processes')
      ws.columns = [
        { header: labels.process, key: 'n', width: 46 },
        { header: labels.category, key: 'c', width: 26 },
        { header: 'Location', key: 'l', width: 10 },
        { header: 'Type', key: 't', width: 16 },
      ]
      for (const p of e.processes || []) ws.addRow({ n: refName(p), c: String(p.category || ''), l: String(p.location || ''), t: String(p.processType || '') })
      const ls = wb.addWorksheet('Process links')
      ls.columns = [
        { header: labels.provider, key: 'pr', width: 40 },
        { header: labels.process, key: 'p', width: 40 },
        { header: labels.amount, key: 'a', width: 14 },
        { header: labels.unit, key: 'u', width: 10 },
      ]
      for (const l of e.processLinks || []) ls.addRow({ pr: refName(l.provider), p: refName(l.process), a: l.amount ?? '', u: refName(l.unit) })
      break
    }
    case 'DQSystem': {
      const ws = wb.addWorksheet('Indicators')
      ws.columns = [
        { header: 'Indicator', key: 'i', width: 34 },
        { header: labels.pos, key: 'ip', width: 10 },
        { header: 'Score #', key: 'sp', width: 8 },
        { header: labels.label, key: 'l', width: 50 },
      ]
      for (const ind of e.indicators || []) for (const s of ind.scores || []) ws.addRow({ i: ind.name || '', ip: ind.position ?? '', sp: s.position ?? '', l: s.label || '' })
      break
    }
    default:
      break
  }
  return wb
}

export async function buildEntitiesZipBase64(entities: Record<string, Ent[]>, labels: Parameters<typeof entityWorkbook>[2]): Promise<string> {
  const zip = new JSZip()
  for (const [type, arr] of Object.entries(entities)) {
    for (const e of arr) {
      const wb = entityWorkbook(type, e, labels)
      const buf = await wb.xlsx.writeBuffer()
      const name = String(e.name || e['@id'] || 'entity').replace(/[^\w\-А-Яа-яЁё一-鿿]+/g, '_').slice(0, 50)
      zip.file(`${type}/${name}.xlsx`, buf as ArrayBuffer)
    }
  }
  return await zip.generateAsync({ type: 'base64' })
}

/* ── report document (Word / PDF) ── */
export const REPORT_CSS = [
  'body{font-family:Arial,Helvetica,sans-serif;color:#1C1B19;margin:0;padding:32px;font-size:13px;line-height:1.55}',
  'h1{font-size:24px;margin:0 0 4px}',
  'h2{font-size:16px;border-bottom:1px solid #D6D2CB;padding-bottom:6px;margin:26px 0 10px}',
  'h3{font-size:13px;margin:16px 0 6px}',
  'p{margin:8px 0}',
  'ul{margin:8px 0;padding-left:20px}',
  'table{border-collapse:collapse;width:100%;margin:10px 0;font-size:11px}',
  'th,td{border:1px solid #C9C5BE;padding:5px 8px;text-align:left;vertical-align:top}',
  'th{background:#F0EEE9;text-transform:uppercase;font-size:9.5px;letter-spacing:.04em}',
  '.value{font-family:"Courier New",monospace;text-align:right}',
  '.meta{color:#6B6862;font-size:12px;margin:6px 0 18px}',
  '.footer{color:#9B978F;font-size:10px;margin-top:28px;border-top:1px solid #D6D2CB;padding-top:8px}',
].join('')

export function prose(v: any): string {
  if (!v) return ''
  let html = ''
  let ul = false
  const closeUl = () => {
    if (ul) {
      html += '</ul>'
      ul = false
    }
  }
  for (const ln of String(v).split(/\n/)) {
    const s = ln.trim()
    if (!s) {
      closeUl()
      continue
    }
    if (s.startsWith('- ') || s.startsWith('• ')) {
      if (!ul) {
        html += '<ul>'
        ul = true
      }
      html += '<li>' + esc(s.replace(/^[-•]\s*/, '')) + '</li>'
    } else {
      closeUl()
      html += '<p>' + esc(s) + '</p>'
    }
  }
  closeUl()
  return html
}

export interface ReportDocInput {
  title: string
  savedAt: string
  dbName: string
  entitiesTotal: number
  rep: { analysis?: string; assumptions?: string[]; limitations?: string[]; recommendations?: string[] }
  sections: Array<{ key: string; label: string }>
  entities: Record<string, Ent[]>
  labels: { saved: string; db: string; entities: string; inventory: string; lcia: string; io: string; flow: string; amount: string; unit: string; provider: string; dq: string; factor: string; in: string; out: string }
}

export function reportBody(inp: ReportDocInput): string {
  let h = '<h1>' + esc(inp.title) + '</h1>'
  h += '<div class="meta"><p><strong>' + esc(inp.labels.saved) + ':</strong> ' + esc(inp.savedAt) + ' · <strong>' + esc(inp.labels.db) + ':</strong> ' + esc(inp.dbName) + ' · <strong>' + esc(inp.labels.entities) + ':</strong> ' + esc(inp.entitiesTotal) + '</p></div>'
  for (const s of inp.sections) {
    const val = (inp.rep as any)[s.key]
    if (!val) continue
    h += '<h2>' + esc(s.label) + '</h2>'
    if (Array.isArray(val)) h += '<ul>' + val.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>'
    else h += prose(val)
  }
  const L = inp.labels
  h += '<h2>' + esc(L.inventory) + '</h2>'
  for (const p of inp.entities.Process || []) {
    const ex = p.exchanges || []
    if (!ex.length) continue
    h += '<h3>' + esc(p.name) + '</h3><table><tr><th>' + esc(L.io) + '</th><th>' + esc(L.flow) + '</th><th>' + esc(L.amount) + '</th><th>' + esc(L.unit) + '</th><th>' + esc(L.provider) + '</th><th>' + esc(L.dq) + '</th></tr>'
    for (const x of ex) {
      const isIn = x.input === true || x.isInput === true
      h += '<tr><td>' + esc(isIn ? L.in : L.out) + '</td><td>' + esc(refName(x.flow)) + '</td><td class="value">' + esc(x.amountFormula || x.amount) + '</td><td>' + esc(refName(x.unit)) + '</td><td>' + esc(refName(x.defaultProvider) || '-') + '</td><td>' + esc(x.dqEntry || '') + '</td></tr>'
    }
    h += '</table>'
  }
  h += '<h2>' + esc(L.lcia) + '</h2>'
  for (const c of inp.entities.ImpactCategory || []) {
    const fs = c.impactFactors || []
    h += '<h3>' + esc(c.name) + (c.refUnit ? ' [' + esc(c.refUnit) + ']' : '') + ' — ' + fs.length + '</h3>'
    if (!fs.length) continue
    h += '<table><tr><th>' + esc(L.flow) + '</th><th>' + esc(L.factor) + '</th><th>' + esc(L.unit) + '</th></tr>'
    for (const f of fs.slice(0, 60)) {
      h += '<tr><td>' + esc(refName(f.flow)) + '</td><td class="value">' + esc(f.value) + '</td><td>' + esc(refName(f.unit) || c.refUnit || '') + '</td></tr>'
    }
    if (fs.length > 60) h += '<tr><td colspan="3">… ' + (fs.length - 60) + '</td></tr>'
    h += '</table>'
  }
  h += '<div class="footer">LCA·AI Studio — ' + esc(new Date().toLocaleDateString()) + '</div>'
  return h
}

export const reportDoc = (inp: ReportDocInput): string =>
  '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>' +
  REPORT_CSS +
  '</style></head><body>' +
  reportBody(inp) +
  '</body></html>'

export async function renderPdfBase64(htmlBody: string): Promise<string> {
  const { default: html2canvas } = await import('html2canvas')
  const { jsPDF } = await import('jspdf')
  const holder = document.createElement('div')
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:920px;background:#ffffff;z-index:-1'
  holder.innerHTML = '<style>' + REPORT_CSS + '</style>' + htmlBody
  document.body.appendChild(holder)
  try {
    const canvas = await html2canvas(holder, { scale: 1.5, backgroundColor: '#ffffff', useCORS: true })
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgW = 210
    const pageH = 297
    const imgH = (canvas.height * imgW) / canvas.width
    const img = canvas.toDataURL('image/jpeg', 0.78)
    let heightLeft = imgH
    let position = 0
    pdf.addImage(img, 'JPEG', 0, position, imgW, imgH)
    heightLeft -= pageH
    while (heightLeft > 0) {
      position = heightLeft - imgH
      pdf.addPage()
      pdf.addImage(img, 'JPEG', 0, position, imgW, imgH)
      heightLeft -= pageH
    }
    const buf = pdf.output('arraybuffer')
    let bin = ''
    const bytes = new Uint8Array(buf)
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
    return btoa(bin)
  } finally {
    holder.remove()
  }
}

export async function saveViaDialog(desktop: DesktopApi, defaultName: string, filters: Array<{ name: string; extensions: string[] }>, content: string, base64: boolean): Promise<string | null> {
  const path = await desktop.dialogSave({ defaultName, filters })
  if (!path) return null
  if (base64) await desktop.fileWriteBase64(path, content)
  else await desktop.fileWrite(path, content)
  return path
}
