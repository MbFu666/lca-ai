import ExcelJS from 'exceljs'
import type { FlowResult, ImpactResult } from '../api/types'

export async function buildResultsXlsxBase64(opts: {
  title: string
  method: string
  impacts: ImpactResult[]
  flows: FlowResult[]
}): Promise<string> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'LCA AI Studio'

  const meta = wb.addWorksheet('Meta')
  meta.columns = [{ width: 30 }, { width: 60 }]
  meta.addRows([
    ['Process', opts.title],
    ['Method', opts.method],
    ['Generated', new Date().toISOString()],
  ])

  const lcia = wb.addWorksheet('LCIA')
  lcia.columns = [
    { header: 'Impact category', key: 'name', width: 45 },
    { header: 'Amount', key: 'amount', width: 18 },
    { header: 'Unit', key: 'unit', width: 22 },
  ]
  for (const i of opts.impacts) {
    lcia.addRow({
      name: i.impactCategory.name,
      amount: i.amount,
      unit: i.impactCategory.refUnit?.trim() ?? '',
    })
  }

  const inv = wb.addWorksheet('Inventory')
  inv.columns = [
    { header: 'Flow', key: 'name', width: 50 },
    { header: 'Category', key: 'cat', width: 45 },
    { header: 'Amount', key: 'amount', width: 18 },
    { header: 'Unit', key: 'unit', width: 12 },
  ]
  for (const f of [...opts.flows].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))) {
    inv.addRow({
      name: f.enviFlow.flow.name,
      cat: f.enviFlow.flow.category ?? '',
      amount: f.amount,
      unit: f.enviFlow.flow.refUnit ?? '',
    })
  }

  const buf = await wb.xlsx.writeBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

export async function saveResultsXlsx(opts: {
  title: string
  method: string
  impacts: ImpactResult[]
  flows: FlowResult[]
}): Promise<void> {
  const base64 = await buildResultsXlsxBase64(opts)
  if (window.desktop) {
    const p = await window.desktop.dialogSave({ defaultName: 'lca_results.xlsx' })
    if (!p) return
    await window.desktop.fileWriteBase64(p, base64)
    return
  }
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'lca_results.xlsx'
  a.click()
  URL.revokeObjectURL(a.href)
}
