import { useCallback, useEffect, useState } from 'react'
import type { CloudFolder, CloudProject, DbInfo, DbProgress } from '../types/desktop'
import {
  collectEntities,
  chooseCategory,
  screening,
  functionalUnit,
  buildEntitiesZipBase64,
  reportDoc,
  reportBody,
  renderPdfBase64,
  saveViaDialog,
} from '../lib/dbexport'
import { useI18n } from '../i18n'
import { useEngine } from '../stores/engine'
import { rpc } from '../api/ipc'
import { invalidateDescriptors } from '../api/entityCache'
import { Button, Spinner } from './ui/primitives'

interface ImportSummary {
  imported: number
  updated: number
  skipped: number
  errors: number
  warnings: number
  error_messages?: string[]
}

export function DatabaseManager({ onClose }: { onClose: () => void }) {
  const t = useI18n((s) => s.t)
  const bumpDbVersion = useEngine((s) => s.bumpDbVersion)
  const check = useEngine((s) => s.check)
  const [databases, setDatabases] = useState<DbInfo[]>([])
  const [current, setCurrent] = useState('')
  const [error, setError] = useState('')
  const [busyMsg, setBusyMsg] = useState('')
  const [progress, setProgress] = useState<DbProgress | null>(null)
  const [newName, setNewName] = useState('')
  const [copyName, setCopyName] = useState('')
  const [importName, setImportName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [cloudProjects, setCloudProjects] = useState<CloudProject[] | null>(null)
  const [cloudName, setCloudName] = useState('')
  const [cloudBusy, setCloudBusy] = useState('')
  const [confirmCloudDelete, setConfirmCloudDelete] = useState('')
  const [folders, setFolders] = useState<CloudFolder[] | null>(null)
  const [folderFilter, setFolderFilter] = useState('')
  const [folderEditor, setFolderEditor] = useState<{ id: string | null; name: string } | null>(null)
  const [confirmFolderDelete, setConfirmFolderDelete] = useState(false)
  const [exportBusy, setExportBusy] = useState('')

  const desktop = window.desktop!

  const refresh = useCallback(async () => {
    try {
      const r = await desktop.dbList()
      setDatabases(r.databases)
      setCurrent(r.current)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    }
  }, [])

  const loadCloud = useCallback(async () => {
    try {
      const [ps, fs] = await Promise.all([desktop.cloudProjectsList(), desktop.cloudFoldersList()])
      setCloudProjects(ps)
      setFolders(fs)
    } catch {
      setCloudProjects([])
      setFolders([])
    }
  }, [])

  useEffect(() => {
    refresh()
    loadCloud()
    const offProg = desktop.onDbProgress(setProgress)
    const offChanged = desktop.onDbChanged(() => {
      bumpDbVersion()
      check()
      refresh()
    })
    return () => {
      offProg()
      offChanged()
    }
  }, [refresh, bumpDbVersion, check, loadCloud])

  const saveCloud = async () => {
    const name = cloudName.trim() || current
    if (!name) return
    setCloudBusy('save')
    setError('')
    setImportMsg('')
    try {
      const r = await desktop.cloudProjectsSave(name)
      setImportMsg(`${t('cp_saved')}: ${r.name} (${r.sizeMb} MB, ${r.total})`)
      await loadCloud()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setCloudBusy('')
    }
  }

  const openCloud = async (p: CloudProject) => {
    const dbName = `${p.name.replace(/[^A-Za-z0-9_-]/g, '_')}_${Date.now().toString(36)}`.slice(0, 40)
    setCloudBusy('open:' + p.id)
    setError('')
    setImportMsg('')
    try {
      const r = await desktop.cloudProjectsOpen(p.id, dbName)
      setImportMsg(
        r.failed > 0
          ? `${t('cp_opened')}: ${r.db} (${r.total - r.failed}/${r.total})`
          : `${t('cp_opened')}: ${r.db} (${r.total})`,
      )
      await refresh()
      bumpDbVersion()
      check()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setCloudBusy('')
    }
  }

  const deleteCloud = async (id: string) => {
    setCloudBusy('del:' + id)
    setError('')
    try {
      await desktop.cloudProjectsDelete(id)
      setConfirmCloudDelete('')
      await loadCloud()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setCloudBusy('')
    }
  }

  const saveFolder = async () => {
    const ed = folderEditor
    if (!ed || !ed.name.trim()) return
    setCloudBusy('folder')
    setError('')
    try {
      if (ed.id) await desktop.cloudFoldersRename(ed.id, ed.name.trim())
      else await desktop.cloudFoldersCreate(ed.name.trim())
      setFolderEditor(null)
      await loadCloud()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setCloudBusy('')
    }
  }

  const deleteFolder = async (id: string) => {
    setCloudBusy('folder')
    setError('')
    try {
      await desktop.cloudFoldersDelete(id)
      setConfirmFolderDelete(false)
      if (folderFilter === id) setFolderFilter('')
      await loadCloud()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setCloudBusy('')
    }
  }

  const moveCloud = async (projectId: string, folderId: string | null) => {
    setCloudBusy('move:' + projectId)
    setError('')
    try {
      await desktop.cloudProjectsMove(projectId, folderId)
      await loadCloud()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setCloudBusy('')
    }
  }

  /* ── exports (openLCA-style Excel zip, JSON, Word/PDF + AI, cloud report) ── */
  const lang = useI18n((s) => s.lang)
  const exLabels = () => ({
    io: t('ex_l_io'), flow: t('ex_l_flow'), amount: t('ex_l_amount'), unit: t('ex_l_unit'),
    provider: t('ex_l_provider'), dq: t('ex_l_dq'), factor: t('ex_l_factor'), conv: t('ex_l_conv'),
    ref: t('ex_l_ref'), pos: t('ex_l_pos'), label: t('ex_l_label'), category: t('ex_l_category'), process: t('ex_l_process'),
  })
  const docLabels = () => ({
    saved: t('ex_l_saved'), db: t('ex_l_db'), entities: t('ex_l_entities'), inventory: t('ex_inventory'), lcia: t('ex_lcia'),
    io: t('ex_l_io'), flow: t('ex_l_flow'), amount: t('ex_l_amount'), unit: t('ex_l_unit'), provider: t('ex_l_provider'),
    dq: t('ex_l_dq'), factor: t('ex_l_factor'), in: t('ex_l_in'), out: t('ex_l_out'),
  })
  const repSections = () => [
    { key: 'analysis', label: t('ex_sec_analysis') },
    { key: 'assumptions', label: t('ex_sec_assumptions') },
    { key: 'limitations', label: t('ex_sec_limitations') },
    { key: 'recommendations', label: t('ex_sec_recommendations') },
  ]

  const prepareReport = async () => {
    const entities = await collectEntities()
    const cat = chooseCategory(entities)
    if (!cat) throw new Error(t('ex_no_cat'))
    const scr = screening(entities, cat, t('ex_factor_source'))
    const method = (entities.ImpactMethod || [])[0]?.name || '—'
    const locs: Record<string, number> = {}
    for (const p of entities.Process || []) {
      const l = typeof p.location === 'string' ? p.location : p.location?.name
      if (l) locs[l] = (locs[l] || 0) + 1
    }
    const region = Object.keys(locs).sort((a, b) => locs[b] - locs[a])[0] || '—'
    const limits = [t('ex_note_screening').replace('{cat}', cat.name || '').replace('{method}', method)]
    if (scr.resultsTotal !== null) limits.push(t('ex_note_results').replace('{v}', String(scr.resultsTotal)))
    let ai: { analysis?: string; assumptions?: string[]; limitations?: string[]; recommendations?: string[] } = {}
    try {
      ai = await desktop.aiReportNarrative({
        lang,
        method,
        impact_category: cat.name,
        ref_unit: cat.refUnit || '',
        functional_unit: functionalUnit(entities),
        region,
        total_screening: scr.sum,
        saved_result: scr.resultsTotal,
        stages: scr.stages.map((g) => ({ name: g.name, value: g.co2eq, share_pct: g.share_pct, processes: g.sub_processes.map((x) => x.name) })),
        db: current,
        entities: Object.values(entities).reduce((a, x) => a + x.length, 0),
      })
    } catch {
      ai = {}
    }
    const rd = {
      source: 'db',
      product_title: `${current} — ${t('ex_report_suffix')}`,
      functional_unit: functionalUnit(entities),
      system_boundary: t('ex_boundary'),
      method: `${method} / ${cat.name || ''}`,
      region,
      total_co2eq: scr.resultsTotal !== null ? scr.resultsTotal : scr.sum,
      total_description: ai.analysis || '',
      stages: scr.stages,
      assumptions: ai.assumptions || [],
      limitations: (ai.limitations || []).concat(limits),
      recommendations: ai.recommendations || [],
      db_name: current,
    }
    const inp = {
      title: rd.product_title,
      savedAt: new Date().toLocaleString(),
      dbName: current,
      entitiesTotal: Object.values(entities).reduce((a, x) => a + x.length, 0),
      rep: ai,
      sections: repSections(),
      entities,
      labels: docLabels(),
    }
    return { rd, inp }
  }

  const doExportExcel = async () => {
    setExportBusy('excel')
    setError('')
    try {
      const entities = await collectEntities()
      const b64 = await buildEntitiesZipBase64(entities, exLabels())
      const p = await saveViaDialog(desktop, `${current}_excel.zip`, [{ name: 'ZIP', extensions: ['zip'] }], b64, true)
      if (p) setImportMsg(`${t('ex_done')}: ${p}`)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setExportBusy('')
    }
  }

  const doExportJson = async () => {
    setExportBusy('json')
    setError('')
    try {
      const entities = await collectEntities()
      const text = JSON.stringify({ db: current, generated: new Date().toISOString(), entities }, null, 2)
      const p = await saveViaDialog(desktop, `${current}.json`, [{ name: 'JSON', extensions: ['json'] }], text, false)
      if (p) setImportMsg(`${t('ex_done')}: ${p}`)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setExportBusy('')
    }
  }

  const doExportWord = async () => {
    setExportBusy('word')
    setError('')
    try {
      const { inp } = await prepareReport()
      const p = await saveViaDialog(desktop, `${current}_report.doc`, [{ name: 'Word', extensions: ['doc'] }], '\ufeff' + reportDoc(inp), false)
      if (p) setImportMsg(`${t('ex_done')}: ${p}`)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setExportBusy('')
    }
  }

  const doExportPdf = async () => {
    setExportBusy('pdf')
    setError('')
    try {
      const { inp } = await prepareReport()
      const b64 = await renderPdfBase64(reportBody(inp))
      const p = await saveViaDialog(desktop, `${current}_report.pdf`, [{ name: 'PDF', extensions: ['pdf'] }], b64, true)
      if (p) setImportMsg(`${t('ex_done')}: ${p}`)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setExportBusy('')
    }
  }

  const doGenReport = async () => {
    setExportBusy('gen')
    setError('')
    try {
      const { rd } = await prepareReport()
      const r = await desktop.cloudReportSave(rd)
      setImportMsg(`${t('ex_saved_report')}${r.projectId ? ' (+ ' + t('ex_linked_project') + ')' : ''}`)
      await loadCloud()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setExportBusy('')
    }
  }

  const run = async (msg: string, fn: () => Promise<unknown>) => {
    setError('')
    setImportMsg('')
    setBusyMsg(msg)
    try {
      await fn()
      await refresh()
      bumpDbVersion()
      check()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusyMsg('')
      setProgress(null)
    }
  }

  const switchTo = (name: string) => run(t('db_switching'), () => desktop.dbSwitch(name))
  const createEmpty = () => {
    const name = newName.trim()
    if (!name) return
    run(t('db_creating'), async () => {
      await desktop.dbCreate(name)
      setNewName('')
    })
  }
  const createCopy = () => {
    const name = copyName.trim()
    if (!name) return
    run(t('db_copying'), async () => {
      const base = databases.find((d) => d.isBase)?.name ?? 'tiangong'
      await desktop.dbCreateCopy(name, base)
      setCopyName('')
    })
  }
  const doExport = async () => {
    const path = await desktop.dialogSave({ defaultName: `${current}.zip` })
    if (!path) return
    run(t('db_exporting'), () => desktop.dbExport(path))
  }
  const doImport = async () => {
    const zip = await desktop.dialogOpen()
    if (!zip) return
    const name = importName.trim()
    if (!name) {
      setError(t('db_name_required'))
      return
    }
    run(t('db_importing'), async () => {
      const r = await desktop.dbImport(zip, name)
      if (r.failed > 0) setError(`${t('db_import_failed')}: ${r.failed} / ${r.total}`)
      setImportName('')
    })
  }
  const doDelete = (name: string) =>
    run(t('db_deleting'), async () => {
      await desktop.dbDelete(name)
      setConfirmDelete('')
    })

  const finishImport = (r: ImportSummary) => {
    invalidateDescriptors()
    bumpDbVersion()
    check()
    const msg = `${t('db_import_done')}: ${r.imported}${r.updated ? ` +${r.updated} upd` : ''}${r.errors ? `, ${r.errors} err` : ''}`
    setImportMsg(msg)
    if (r.errors > 0 && r.error_messages?.length) {
      setError(`${r.error_messages.slice(0, 3).join(' | ')}`)
    }
  }

  const importIlcd = async () => {
    const zip = await desktop.dialogOpen({ filters: [{ name: 'ILCD', extensions: ['zip'] }] })
    if (!zip) return
    run(t('db_importing'), async () => {
      const r = await rpc<ImportSummary>('import/ilcd', { path: zip })
      finishImport(r)
    })
  }

  const importSimapro = async () => {
    const files = await desktop.dialogOpenMulti({ filters: [{ name: 'SimaPro CSV', extensions: ['csv'] }] })
    if (!files || files.length === 0) return
    run(t('db_importing'), async () => {
      const r = await rpc<ImportSummary>('import/simapro', { paths: files })
      finishImport(r)
    })
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-paper border border-line w-[720px] max-h-[80vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <h2 className="text-[16px] font-sans uppercase tracking-widest">{t('db_manager')}</h2>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="border border-e-4/40 bg-e-4/5 p-2.5 text-[12px] text-e-ink font-mono break-all">
              {error}
            </div>
          )}
          {importMsg && (
            <div className="border border-ok/40 bg-ok/5 p-2.5 text-[12px] font-mono">{importMsg}</div>
          )}
          {busyMsg && (
            <div className="space-y-2">
              <Spinner label={busyMsg} />
              {progress && progress.total > 0 && (
                <div>
                  <div className="h-[10px] bg-paper-2 border border-line">
                    <div className="h-full bg-e-3 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[11px] text-graphite-soft font-mono mt-1">
                    {progress.done} / {progress.total} ({pct}%) {progress.note ?? ''}
                  </div>
                </div>
              )}
            </div>
          )}

          <section>
            <h3 className="text-[12px] font-sans uppercase tracking-widest text-graphite-mid border-b border-line pb-1.5 mb-2">
              {t('db_list')}
            </h3>
            <table className="w-full text-[13px] border-collapse">
              <tbody>
                {databases.map((db) => (
                  <tr key={db.name} className="border-t border-line">
                    <td className="py-2 pr-3">
                      <span className="font-mono">{db.name}</span>
                      {db.isBase && (
                        <span className="ml-2 text-[10px] font-sans uppercase tracking-wide text-ok border border-ok/40 px-1.5 py-0.5">
                          {t('db_base')}
                        </span>
                      )}
                      {db.active && (
                        <span className="ml-2 text-[10px] font-sans uppercase tracking-wide text-graphite border border-line px-1.5 py-0.5">
                          {t('db_active')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right text-[12px] text-graphite-soft font-mono w-[100px]">
                      {db.sizeMb.toLocaleString()} MB
                    </td>
                    <td className="py-2 text-right whitespace-nowrap w-[300px]">
                      {!db.active && (
                        <button
                          onClick={() => switchTo(db.name)}
                          disabled={!!busyMsg}
                          className="text-[12px] text-graphite hover:text-e-4 cursor-pointer mr-3 disabled:opacity-40"
                        >
                          {t('db_switch')}
                        </button>
                      )}
                      {db.active && (
                        <button
                          onClick={doExport}
                          disabled={!!busyMsg}
                          className="text-[12px] text-graphite hover:text-e-4 cursor-pointer mr-3 disabled:opacity-40"
                        >
                          {t('db_export')}
                        </button>
                      )}
                      {!db.active && !db.isBase && (
                        confirmDelete === db.name ? (
                          <span className="text-[12px]">
                            <button
                              onClick={() => doDelete(db.name)}
                              disabled={!!busyMsg}
                              className="text-e-4 cursor-pointer mr-2 disabled:opacity-40"
                            >
                              {t('db_confirm')}
                            </button>
                            <button onClick={() => setConfirmDelete('')} className="text-graphite-soft cursor-pointer">
                              {t('db_cancel')}
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(db.name)}
                            disabled={!!busyMsg}
                            className="text-[12px] text-graphite-soft hover:text-e-4 cursor-pointer disabled:opacity-40"
                          >
                            {t('db_delete')}
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="space-y-3">
            <h3 className="text-[12px] font-sans uppercase tracking-widest text-graphite-mid border-b border-line pb-1.5">
              ⬇ {t('ex_title')} <span className="font-mono normal-case text-graphite-soft">{current}</span>
            </h3>
            <div className="flex gap-2 flex-wrap">
              <Button variant="ghost" onClick={doExportExcel} disabled={!!busyMsg || !!exportBusy || !current}>
                {exportBusy === 'excel' ? t('loading') : t('ex_excel')}
              </Button>
              <Button variant="ghost" onClick={doExportJson} disabled={!!busyMsg || !!exportBusy || !current}>
                {exportBusy === 'json' ? t('loading') : t('ex_json')}
              </Button>
              <Button variant="ghost" onClick={doExportWord} disabled={!!busyMsg || !!exportBusy || !current}>
                {exportBusy === 'word' ? t('loading') : t('ex_word')}
              </Button>
              <Button variant="ghost" onClick={doExportPdf} disabled={!!busyMsg || !!exportBusy || !current}>
                {exportBusy === 'pdf' ? t('loading') : t('ex_pdf')}
              </Button>
              <Button variant="ghost" onClick={doGenReport} disabled={!!busyMsg || !!exportBusy || !current}>
                {exportBusy === 'gen' ? t('loading') : t('ex_gen')}
              </Button>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div className="border border-line p-3 space-y-2">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid">{t('db_create_empty')}</div>
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="my_db"
                  className="flex-1 px-2 py-1.5 bg-paper border border-line text-[13px] font-mono outline-none focus:border-graphite-mid"
                />
                <Button variant="ghost" onClick={createEmpty} disabled={!!busyMsg || !newName.trim()}>
                  {t('db_create')}
                </Button>
              </div>
            </div>

            <div className="border border-line p-3 space-y-2">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid">{t('db_create_copy')}</div>
              <div className="flex gap-2">
                <input
                  value={copyName}
                  onChange={(e) => setCopyName(e.target.value)}
                  placeholder="tiangong_copy"
                  className="flex-1 px-2 py-1.5 bg-paper border border-line text-[13px] font-mono outline-none focus:border-graphite-mid"
                />
                <Button variant="ghost" onClick={createCopy} disabled={!!busyMsg || !copyName.trim()}>
                  {t('db_create')}
                </Button>
              </div>
            </div>

            <div className="border border-line p-3 space-y-2 col-span-2">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid">{t('db_import')}</div>
              <div className="flex gap-2">
                <input
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder={t('db_name_placeholder')}
                  className="flex-1 px-2 py-1.5 bg-paper border border-line text-[13px] font-mono outline-none focus:border-graphite-mid"
                />
                <Button variant="ghost" onClick={doImport} disabled={!!busyMsg || !importName.trim()}>
                  {t('db_import_pick')}
                </Button>
              </div>
            </div>

            <div className="border border-line p-3 space-y-2 col-span-2">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid">
                {t('db_import_into')} <span className="font-mono normal-case">{current}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={importIlcd} disabled={!!busyMsg || !current}>
                  {t('db_import_ilcd')}
                </Button>
                <Button variant="ghost" onClick={importSimapro} disabled={!!busyMsg || !current}>
                  {t('db_import_simapro')}
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[12px] font-sans uppercase tracking-widest text-graphite-mid border-b border-line pb-1.5">
              ☁ {t('cp_title')}
            </h3>

            <div className="border border-line p-3 space-y-2">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid">
                {t('cp_save_current')} <span className="font-mono normal-case">{current}</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={cloudName}
                  onChange={(e) => setCloudName(e.target.value)}
                  placeholder={current}
                  className="flex-1 px-2 py-1.5 bg-paper border border-line text-[13px] font-mono outline-none focus:border-graphite-mid"
                />
                <Button variant="ghost" onClick={saveCloud} disabled={!!busyMsg || !!cloudBusy || !current}>
                  {cloudBusy === 'save' ? t('loading') : t('cp_save')}
                </Button>
              </div>
            </div>

            {cloudProjects === null ? (
              <Spinner label={t('loading')} />
            ) : (
              <>
                <div className="flex gap-2 items-center flex-wrap">
                  <select
                    value={folderFilter}
                    onChange={(e) => setFolderFilter(e.target.value)}
                    className="px-2 py-1.5 bg-paper border border-line text-[12px] font-mono outline-none"
                  >
                    <option value="">{t('fld_all')}</option>
                    {(folders || []).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  {folderFilter && !confirmFolderDelete && (
                    <>
                      <Button
                        variant="ghost"
                        disabled={!!cloudBusy}
                        onClick={() => {
                          const f = (folders || []).find((x) => x.id === folderFilter)
                          if (f) setFolderEditor({ id: f.id, name: f.name })
                        }}
                      >
                        ✎
                      </Button>
                      <Button variant="ghost" disabled={!!cloudBusy} onClick={() => setConfirmFolderDelete(true)}>
                        ×
                      </Button>
                    </>
                  )}
                  {confirmFolderDelete && (
                    <span className="text-[12px]">
                      <button
                        onClick={() => deleteFolder(folderFilter)}
                        disabled={!!cloudBusy}
                        className="text-e-4 cursor-pointer mr-2 disabled:opacity-40"
                      >
                        {t('fld_confirm_delete')}
                      </button>
                      <button onClick={() => setConfirmFolderDelete(false)} className="text-graphite-soft cursor-pointer">
                        {t('db_cancel')}
                      </button>
                    </span>
                  )}
                  {folderEditor ? (
                    <span className="flex gap-2">
                      <input
                        value={folderEditor.name}
                        onChange={(e) => setFolderEditor({ ...folderEditor, name: e.target.value })}
                        placeholder={t('fld_title_prompt')}
                        className="px-2 py-1 bg-paper border border-line text-[12px] font-mono outline-none focus:border-graphite-mid"
                      />
                      <Button variant="ghost" onClick={saveFolder} disabled={!!cloudBusy || !folderEditor.name.trim()}>
                        {t('fld_create')}
                      </Button>
                      <Button variant="ghost" onClick={() => setFolderEditor(null)}>
                        {t('db_cancel')}
                      </Button>
                    </span>
                  ) : (
                    <Button variant="ghost" disabled={!!cloudBusy} onClick={() => setFolderEditor({ id: null, name: '' })}>
                      + {t('fld_create')}
                    </Button>
                  )}
                </div>
                {cloudProjects.length === 0 ? (
                  <div className="text-[12px] text-graphite-soft">—</div>
                ) : (
              <table className="w-full text-[13px] border-collapse">
                <tbody>
                  {cloudProjects
                    .filter((p) => !folderFilter || p.folder_id === folderFilter)
                    .map((p) => {
                    const snap = p.snapshot
                    return (
                      <tr key={p.id} className="border-t border-line">
                        <td className="py-2 pr-3">
                          <div className="font-mono truncate max-w-[220px]" title={p.name}>{p.name}</div>
                          <div className="text-[11px] text-graphite-soft">
                            {snap?.stats?.sizeMb ? `${snap.stats.sizeMb} MB` : '—'}
                            {snap?.stats?.total ? ` · ${snap.stats.total}` : ''}
                            {snap ? ` · ${String(snap.saved_at).slice(0, 10)}` : ''}
                          </div>
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <select
                            value={p.folder_id || ''}
                            onChange={(e) => moveCloud(p.id, e.target.value || null)}
                            disabled={!!cloudBusy}
                            title={t('fld_move')}
                            className="bg-paper border border-line text-[11px] font-mono px-1 py-0.5 outline-none"
                          >
                            <option value="">{t('fld_none')}</option>
                            {(folders || []).map((f) => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          {confirmCloudDelete === p.id ? (
                            <span className="text-[12px]">
                              <button
                                onClick={() => deleteCloud(p.id)}
                                disabled={!!cloudBusy}
                                className="text-e-4 cursor-pointer mr-2 disabled:opacity-40"
                              >
                                {t('db_confirm')}
                              </button>
                              <button
                                onClick={() => setConfirmCloudDelete('')}
                                className="text-graphite-soft cursor-pointer"
                              >
                                {t('db_cancel')}
                              </button>
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => openCloud(p)}
                                disabled={!!busyMsg || !!cloudBusy}
                                className="text-[12px] text-graphite hover:text-e-4 cursor-pointer mr-3 disabled:opacity-40"
                              >
                                {cloudBusy === 'open:' + p.id ? t('loading') : t('cp_open')}
                              </button>
                              <button
                                onClick={() => setConfirmCloudDelete(p.id)}
                                disabled={!!cloudBusy}
                                className="text-[12px] text-graphite-soft hover:text-e-4 cursor-pointer disabled:opacity-40"
                              >
                                {t('delete')}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
