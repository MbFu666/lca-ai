import { useCallback, useEffect, useState } from 'react'
import { useCloud } from '../stores/cloud'
import { useI18n } from '../i18n'
import { Button, ErrorBox, Spinner } from './ui/primitives'

const SUPABASE = 'https://pbisngkepszwzzjivxus.supabase.co'
const APIKEY = 'sb_publishable_FzDhBqHiQfygA-L695gIPg_R1vnjhS2'

interface AuthInfo {
  email: string
  access_token: string
  user_id?: string
  expires_at?: number
}

interface HistoryRow {
  id: string
  product_title: string
  functional_unit: string | null
  total_co2eq: number | null
  report_data: Record<string, unknown> | null
  created_at: string
}

interface CloudDbRow {
  id: string
  name: string
  db_name?: string | null
  snapshot: { saved_at: string; stats?: { total?: number; sizeMb?: number; db?: string } | null } | null
}

export function CloudPanel() {
  const t = useI18n((s) => s.t)
  const { open, pendingReport, setOpen, setPendingReport } = useCloud()
  const [auth, setAuth] = useState<AuthInfo | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<HistoryRow[] | null>(null)
  const [view, setView] = useState<HistoryRow | null>(null)
  const [projects, setProjects] = useState<CloudDbRow[] | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; op: 'open' | 'save' | 'delete' } | null>(null)

  useEffect(() => {
    if (open) {
      setView(null)
      setError('')
      window.desktop?.authGet().then((a) => setAuth(a))
    }
  }, [open])

  const loadHistory = useCallback(async (token: string) => {
    setRows(null)
    try {
      const r = await fetch(`${SUPABASE}/rest/v1/user_history?select=*&order=created_at.desc&limit=50`, {
        headers: { apikey: APIKEY, Authorization: `Bearer ${token}` },
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setRows(await r.json())
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setRows([])
    }
  }, [])

  useEffect(() => {
    if (open && auth?.access_token) loadHistory(auth.access_token)
  }, [open, auth, loadHistory])

  const loadProjects = useCallback(async () => {
    setProjects(null)
    try {
      const r = await window.desktop?.cloudProjectsList()
      setProjects((r ?? []) as CloudDbRow[])
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setProjects([])
    }
  }, [])

  useEffect(() => {
    if (open && auth?.access_token) void loadProjects()
  }, [open, auth, loadProjects])

  const cloudDbAction = async (p: CloudDbRow, op: 'open' | 'save' | 'delete') => {
    setBusy(true)
    setError('')
    try {
      if (op === 'open') await window.desktop!.cloudProjectsOpen(p.id, p.db_name || p.name)
      else if (op === 'save') await window.desktop!.cloudProjectsSave(p.name)
      else await window.desktop!.cloudProjectsDelete(p.id)
      setConfirm(null)
      await loadProjects()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
    }
  }

  const saveCurrentDb = async () => {
    setBusy(true)
    setError('')
    try {
      const list = await window.desktop!.dbList()
      await window.desktop!.cloudProjectsSave(list.current)
      await loadProjects()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const login = async () => {
    setBusy(true)
    setError('')
    try {
      const a = await window.desktop!.authLogin(email.trim(), password)
      const full = await window.desktop!.authGet()
      setAuth(full)
      void a
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    await window.desktop!.authLogout()
    setAuth(null)
    setRows(null)
  }

  const savePending = async () => {
    if (!auth || !pendingReport) return
    setBusy(true)
    setError('')
    try {
      const r = await fetch(`${SUPABASE}/rest/v1/user_history`, {
        method: 'POST',
        headers: {
          apikey: APIKEY,
          Authorization: `Bearer ${auth.access_token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          user_id: auth.user_id,
          product_title: pendingReport.product_title,
          functional_unit: pendingReport.functional_unit,
          total_co2eq: pendingReport.total_co2eq,
          report_data: pendingReport.report_data,
          tags: ['desktop'],
        }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setPendingReport(null)
      await loadHistory(auth.access_token)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center" onClick={() => setOpen(false)}>
      <div
        className="bg-paper border border-line w-[640px] max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">
            {t('cloud')} {auth ? `· ${auth.email}` : ''}
          </h3>
          <div className="flex items-center gap-2">
            {auth && (
              <button onClick={logout} className="text-[11px] text-graphite-soft hover:text-e-4 cursor-pointer">
                {t('logout')}
              </button>
            )}
            <button onClick={() => setOpen(false)} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && <div className="mb-3"><ErrorBox message={error} /></div>}

          {!auth ? (
            <div className="space-y-3 max-w-[360px] mx-auto pt-6">
              <div className="text-[12px] text-graphite-soft text-center mb-4">{t('login_hint')}</div>
              <label className="block">
                <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">{t('email')}</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-2 py-1.5 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid"
                />
              </label>
              <label className="block">
                <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">{t('password')}</div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-2 py-1.5 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid"
                />
              </label>
              <Button onClick={login} disabled={busy || !email || !password} className="w-full">
                {busy ? t('loading') : t('login')}
              </Button>
            </div>
          ) : view ? (
            <div>
              <button onClick={() => setView(null)} className="text-[12px] text-graphite-mid hover:text-graphite cursor-pointer mb-3">
                ← {t('my_reports')}
              </button>
              <h4 className="text-[16px] mb-2">{view.product_title}</h4>
              <div className="text-[12px] text-graphite-soft mb-3">
                {view.functional_unit} · {view.total_co2eq} kg CO2-eq · {String(view.created_at).slice(0, 10)}
              </div>
              {(() => {
                const rd = (view.report_data ?? {}) as Record<string, unknown>
                const impacts = (rd.impacts ?? []) as Array<{ impactCategory?: { name?: string; refUnit?: string }; amount?: number }>
                const stages = (rd.stages ?? []) as Array<{ name?: string; co2eq?: number }>
                return (
                  <div className="space-y-4">
                    {impacts.length > 0 && (
                      <table className="w-full text-[12px] border-collapse">
                        <tbody>
                          {impacts.map((i, idx) => (
                            <tr key={idx} className="border-t border-line">
                              <td className="py-1 pr-3">{i.impactCategory?.name}</td>
                              <td className="py-1 text-right font-mono">{i.amount}</td>
                              <td className="py-1 pl-2 text-graphite-soft">{i.impactCategory?.refUnit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {stages.length > 0 && (
                      <table className="w-full text-[12px] border-collapse">
                        <tbody>
                          {stages.map((s, idx) => (
                            <tr key={idx} className="border-t border-line">
                              <td className="py-1 pr-3">{s.name}</td>
                              <td className="py-1 text-right font-mono">{s.co2eq}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })()}
            </div>
          ) : (
            <div>
              {pendingReport && (
                <div className="border border-line bg-paper-2 p-3 mb-4 flex items-center justify-between gap-3">
                  <div className="text-[12px] truncate">
                    {t('cloud_save')}: <b>{pendingReport.product_title}</b>
                  </div>
                  <Button onClick={savePending} disabled={busy}>
                    {busy ? t('loading') : t('save')}
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
                  {t('cloud_my_dbs')}
                </div>
                <Button onClick={saveCurrentDb} disabled={busy}>
                  {t('cloud_db_save_current')}
                </Button>
              </div>
              {projects === null ? (
                <Spinner label={t('loading')} />
              ) : projects.length === 0 ? (
                <div className="text-[12px] text-graphite-soft mb-4">{t('cloud_db_empty')}</div>
              ) : (
                <table className="w-full text-[12px] border-collapse mb-6">
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id} className="border-t border-line">
                        <td className="py-1.5 pr-3 truncate max-w-[200px] font-mono">{p.name}</td>
                        <td className="py-1.5 pr-3 text-graphite-soft whitespace-nowrap">
                          {p.snapshot?.stats?.total ?? 0} · {p.snapshot?.stats?.sizeMb ?? 0} MB ·{' '}
                          {String(p.snapshot?.saved_at ?? '').slice(0, 10)}
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          {confirm?.id === p.id ? (
                            <span className="flex items-center gap-2 justify-end">
                              <span className="text-[11px] text-e-ink">{t('cloud_db_confirm')}</span>
                              <button
                                className="text-[11px] text-ok hover:underline cursor-pointer"
                                onClick={() => cloudDbAction(p, confirm.op)}
                              >
                                {t('yes')}
                              </button>
                              <button className="text-[11px] text-graphite-soft hover:underline cursor-pointer" onClick={() => setConfirm(null)}>
                                {t('no')}
                              </button>
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 justify-end">
                              <button className="text-[11px] text-graphite-mid hover:text-graphite cursor-pointer" onClick={() => setConfirm({ id: p.id, op: 'open' })}>
                                {t('cloud_db_open')}
                              </button>
                              <button className="text-[11px] text-graphite-mid hover:text-graphite cursor-pointer" onClick={() => setConfirm({ id: p.id, op: 'save' })}>
                                {t('cloud_db_save')}
                              </button>
                              <button className="text-[11px] text-graphite-mid hover:text-e-4 cursor-pointer" onClick={() => setConfirm({ id: p.id, op: 'delete' })}>
                                {t('cloud_db_delete')}
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-soft mb-2">
                {t('my_reports')}
              </div>
              {rows === null ? (
                <Spinner label={t('loading')} />
              ) : rows.length === 0 ? (
                <div className="text-[12px] text-graphite-soft">—</div>
              ) : (
                <table className="w-full text-[12px] border-collapse">
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-line cursor-pointer hover:bg-paper-2"
                        onClick={() => setView(r)}
                      >
                        <td className="py-1.5 pr-3 truncate max-w-[320px]">{r.product_title}</td>
                        <td className="py-1.5 pr-3 text-right font-mono whitespace-nowrap">{r.total_co2eq}</td>
                        <td className="py-1.5 text-graphite-soft whitespace-nowrap">
                          {String(r.created_at).slice(0, 10)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
