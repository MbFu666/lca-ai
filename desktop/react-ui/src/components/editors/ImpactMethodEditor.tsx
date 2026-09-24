import { useCallback, useEffect, useState } from 'react'
import type { ImpactMethod, Ref } from '../../api/types'
import { deleteEntity, getEntity, updateEntity } from '../../api/ipc'
import { invalidateDescriptors } from '../../api/entityCache'
import { useI18n } from '../../i18n'
import { useTabs, tabKey } from '../../stores/tabs'
import { Button, ErrorBox, Field, Spinner } from '../ui/primitives'
import { CategoryPicker } from '../LciaDialogs'

const INPUT_CLASS =
  'w-full px-2 py-1 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid'

export function ImpactMethodEditor({ id }: { id: string }) {
  const t = useI18n((s) => s.t)
  const openTab = useTabs((s) => s.open)
  const closeTab = useTabs((s) => s.close)
  const [draft, setDraft] = useState<ImpactMethod | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setDraft(await getEntity<ImpactMethod>('ImpactMethod', id))
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

  const removeCategory = (catId: string) => {
    if (!draft) return
    setDraft({
      ...draft,
      impactCategories: (draft.impactCategories ?? []).filter((c) => c['@id'] !== catId),
    })
    setDirty(true)
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      await updateEntity('ImpactMethod', draft)
      invalidateDescriptors('ImpactMethod')
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
      await deleteEntity('ImpactMethod', id)
      invalidateDescriptors('ImpactMethod')
      closeTab(tabKey('ImpactMethod', id))
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setConfirmDelete(false)
    }
  }

  if (loading) return <div className="p-6"><Spinner label={t('loading')} /></div>
  if (!draft) return <div className="p-6"><ErrorBox message={error || 'Not found'} onRetry={load} /></div>

  const cats = (draft.impactCategories ?? []) as Array<Ref & { refUnit?: string }>

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-[1000px]">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-sans uppercase tracking-widest text-graphite-soft mb-1">
              {t('nav_methods')}
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
          {draft.version ? <Field label={t('version')}>{String(draft.version)}</Field> : null}
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
              {t('impact_categories')} ({cats.length})
            </h3>
            <Button variant="ghost" onClick={() => setShowPicker(true)}>+ {t('add_category')}</Button>
          </div>
          {cats.length === 0 ? (
            <div className="text-[13px] text-graphite-soft py-2">—</div>
          ) : (
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
                  <th className="py-1.5 pr-3 font-medium">{t('name')}</th>
                  <th className="py-1.5 pr-3 font-medium w-[220px]">{t('reference_unit')}</th>
                  <th className="py-1.5 font-medium w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {cats.map((c) => (
                  <tr key={c['@id']} className="border-t border-line hover:bg-paper-2">
                    <td
                      className="py-1.5 pr-3 truncate max-w-[520px] cursor-pointer"
                      title={c.name}
                      onClick={() =>
                        c['@id'] &&
                        openTab({
                          key: tabKey('ImpactCategory', c['@id']),
                          type: 'ImpactCategory',
                          id: c['@id'],
                          name: c.name ?? c['@id'],
                        })
                      }
                    >
                      {c.name ?? '—'}
                    </td>
                    <td className="py-1.5 pr-3 text-graphite-mid">{c.refUnit?.trim() || '—'}</td>
                    <td className="py-1.5 text-center">
                      <button
                        onClick={() => c['@id'] && removeCategory(c['@id'])}
                        className="text-graphite-soft hover:text-e-4 cursor-pointer text-[14px]"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {showPicker && (
        <CategoryPicker
          onClose={() => setShowPicker(false)}
          onPick={(d) => {
            setShowPicker(false)
            if (!draft) return
            if ((draft.impactCategories ?? []).some((c) => c['@id'] === d['@id'])) return
            setDraft({
              ...draft,
              impactCategories: [
                ...(draft.impactCategories ?? []),
                { '@type': 'ImpactCategory', '@id': d['@id'], name: d.name },
              ],
            })
            setDirty(true)
          }}
        />
      )}
    </div>
  )
}
