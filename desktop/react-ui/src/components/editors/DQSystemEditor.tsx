import { useCallback, useEffect, useState } from 'react'
import type { DQIndicatorDetail, DQScoreDetail, DQSystemDetail } from '../../api/types'
import { deleteEntity, getEntity, updateEntity } from '../../api/ipc'
import { invalidateDescriptors } from '../../api/entityCache'
import { useI18n } from '../../i18n'
import { useTabs, tabKey } from '../../stores/tabs'
import { Button, ErrorBox, Field, Spinner } from '../ui/primitives'

const INPUT_CLASS =
  'w-full px-2 py-1 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid'

export function DQSystemEditor({ id }: { id: string }) {
  const t = useI18n((s) => s.t)
  const closeTab = useTabs((s) => s.close)
  const [draft, setDraft] = useState<DQSystemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setDraft(await getEntity<DQSystemDetail>('DQSystem', id))
      setDirty(false)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const indicators = draft?.indicators ?? []
  const scoreCount = indicators.length > 0 ? Math.max(...indicators.map((i) => i.scores.length)) : 0

  const patchIndicator = (idx: number, p: Partial<DQIndicatorDetail>) => {
    if (!draft) return
    setDraft({ ...draft, indicators: indicators.map((ind, i) => (i === idx ? { ...ind, ...p } : ind)) })
    setDirty(true)
  }

  const addIndicator = () => {
    if (!draft) return
    const pos = indicators.length + 1
    const scores: DQScoreDetail[] = Array.from({ length: Math.max(scoreCount, 1) }, (_, i) => ({
      position: i + 1,
      label: `${i + 1}`,
      description: '',
    }))
    setDraft({ ...draft, indicators: [...indicators, { name: '', position: pos, scores }] })
    setDirty(true)
  }

  const removeIndicator = (idx: number) => {
    if (!draft) return
    setDraft({
      ...draft,
      indicators: indicators.filter((_, i) => i !== idx).map((ind, i) => ({ ...ind, position: i + 1 })),
    })
    setDirty(true)
  }

  const patchScore = (indIdx: number, scoreIdx: number, p: Partial<DQScoreDetail>) => {
    if (!draft) return
    setDraft({
      ...draft,
      indicators: indicators.map((ind, i) =>
        i === indIdx
          ? { ...ind, scores: ind.scores.map((s, j) => (j === scoreIdx ? { ...s, ...p } : s)) }
          : ind,
      ),
    })
    setDirty(true)
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      await updateEntity('DQSystem', draft)
      invalidateDescriptors('DQSystem')
      setDirty(false)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setError('')
    try {
      await deleteEntity('DQSystem', id)
      invalidateDescriptors('DQSystem')
      closeTab(tabKey('DQSystem', id))
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setConfirmDelete(false)
    }
  }

  if (loading) return <div className="p-6"><Spinner label={t('loading')} /></div>
  if (!draft) return <div className="p-6"><ErrorBox message={error || 'Not found'} onRetry={load} /></div>

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-[1100px]">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-sans uppercase tracking-widest text-graphite-soft mb-1">
              {t('nav_dq_systems')}
            </div>
            <h2 className="text-[22px] leading-tight">{draft.name}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {savedFlash && <span className="text-[12px] text-ok">{t('saved')}</span>}
            {confirmDelete ? (
              <span className="flex items-center gap-2">
                <Button variant="danger" onClick={remove}>{t('db_confirm')}</Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>{t('db_cancel')}</Button>
              </span>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)}>{t('delete')}</Button>
            )}
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? t('loading') : t('save')}
            </Button>
          </div>
        </div>

        {error && <div className="mb-4"><ErrorBox message={error} /></div>}

        <section className="mb-8">
          <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid border-b border-line pb-1.5 mb-3">
            {t('general_info')}
          </h3>
          <Field label={t('name')}>
            <input
              value={draft.name}
              onChange={(e) => {
                setDraft({ ...draft, name: e.target.value })
                setDirty(true)
              }}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label={t('description')}>
            <textarea
              value={draft.description ?? ''}
              onChange={(e) => {
                setDraft({ ...draft, description: e.target.value })
                setDirty(true)
              }}
              rows={3}
              className={INPUT_CLASS}
            />
          </Field>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between border-b border-line pb-1.5 mb-3">
            <h3 className="text-[13px] font-sans uppercase tracking-widest text-graphite-mid">
              {t('dq_indicators')} ({indicators.length})
            </h3>
            <button onClick={addIndicator} className="text-[12px] font-sans text-graphite-mid hover:text-graphite cursor-pointer">
              + {t('dq_add_indicator')}
            </button>
          </div>
          {indicators.length === 0 ? (
            <div className="text-[13px] text-graphite-soft py-2">{t('dq_empty')}</div>
          ) : (
            <div className="space-y-4">
              {indicators.map((ind, indIdx) => (
                <div key={indIdx} className="border border-line p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[11px] font-mono text-graphite-soft w-[20px]">{indIdx + 1}</span>
                    <input
                      value={ind.name}
                      onChange={(e) => patchIndicator(indIdx, { name: e.target.value })}
                      placeholder={t('dq_indicator_name')}
                      className={INPUT_CLASS}
                    />
                    <button
                      onClick={() => removeIndicator(indIdx)}
                      className="text-graphite-soft hover:text-e-4 cursor-pointer text-[14px] shrink-0"
                    >
                      ×
                    </button>
                  </div>
                  <table className="w-full text-[12px] border-collapse">
                    <thead>
                      <tr className="text-left text-[10px] font-sans uppercase tracking-wide text-graphite-soft">
                        <th className="py-1 pr-2 font-medium w-[50px] text-center">{t('dq_pos')}</th>
                        <th className="py-1 pr-2 font-medium w-[200px]">{t('dq_label')}</th>
                        <th className="py-1 font-medium">{t('description')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ind.scores.map((s, sIdx) => (
                        <tr key={sIdx} className="border-t border-line">
                          <td className="py-1 pr-2 text-center font-mono text-graphite-soft">{s.position}</td>
                          <td className="py-1 pr-2">
                            <input
                              value={s.label}
                              onChange={(e) => patchScore(indIdx, sIdx, { label: e.target.value })}
                              className={INPUT_CLASS}
                            />
                          </td>
                          <td className="py-1">
                            <input
                              value={s.description ?? ''}
                              onChange={(e) => patchScore(indIdx, sIdx, { description: e.target.value })}
                              className={INPUT_CLASS}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
