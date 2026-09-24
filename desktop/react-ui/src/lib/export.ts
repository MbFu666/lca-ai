export function fmt(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs < 1e-3 || abs >= 1e6) return n.toExponential(3)
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

export function toCsv(rows: Array<Array<string | number>>): string {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? '')
          return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(';'),
    )
    .join('\r\n')
}

export async function saveText(defaultName: string, content: string, mime: string): Promise<void> {
  if (!window.desktop) {
    const blob = new Blob([content], { type: mime })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = defaultName
    a.click()
    URL.revokeObjectURL(a.href)
    return
  }
  const p = await window.desktop.dialogSave({ defaultName })
  if (!p) return
  await window.desktop.fileWrite(p, content)
}

export async function saveCsv(defaultName: string, csv: string): Promise<void> {
  await saveText(defaultName, '\ufeff' + csv, 'text/csv;charset=utf-8')
}
