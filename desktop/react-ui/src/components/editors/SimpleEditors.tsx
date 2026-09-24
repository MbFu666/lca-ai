import { useCallback, useEffect, useState } from 'react'
import type { EntityType } from '../../api/types'
import { deleteEntity, getEntity, updateEntity } from '../../api/ipc'
import { invalidateDescriptors } from '../../api/entityCache'
import { useI18n } from '../../i18n'
import { useTabs, tabKey } from '../../stores/tabs'
import { Button, ErrorBox, Spinner } from '../ui/primitives'

const INPUT_CLASS =
  'w-full px-2 py-1 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid'

interface FieldDef {
  key: string
  labelKey: string
  kind: 'text' | 'textarea' | 'number'
}

const FIELDS: Partial<Record<EntityType, FieldDef[]>> = {
  Location: [
    { key: 'name', labelKey: 'name', kind: 'text' },
    { key: 'code', labelKey: 'loc_code', kind: 'text' },
    { key: 'latitude', labelKey: 'latitude', kind: 'number' },
    { key: 'longitude', labelKey: 'longitude', kind: 'number' },
  ],
  Source: [
    { key: 'name', labelKey: 'name', kind: 'text' },
    { key: 'url', labelKey: 'url', kind: 'text' },
    { key: 'description', labelKey: 'description', kind: 'textarea' },
  ],
  Actor: [
    { key: 'name', labelKey: 'name', kind: 'text' },
    { key: 'email', labelKey: 'email', kind: 'text' },
    { key: 'description', labelKey: 'description', kind: 'textarea' },
  ],
  FlowProperty: [
    { key: 'name', labelKey: 'name', kind: 'text' },
    { key: 'description', labelKey: 'description', kind: 'textarea' },
  ],
}

export function SimpleEntityEditor({ type, id }: { type: EntityType; id: string }) {
  const t = useI18n((s) => s.t)
  const closeTab = useTabs((s) => s.close)
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null)
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
      setDraft(await getEntity<Record<string, unknown>>(type, id))
      setDirty(false)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setLoading(false)
    }
  }, [type, id])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      await updateEntity(type, draft)
      invalidateDescriptors(type)
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
      await deleteEntity(type, id)
      invalidateDescriptors(type)
      closeTab(tabKey(type, id))
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setConfirmDelete(false)
    }
  }

  if (loading) return <div className="p-6"><Spinner label={t('loading')} /></div>
  if (!draft) return <div className="p-6"><ErrorBox message={error || 'Not found'} onRetry={load} /></div>

  const defs = FIELDS[type] ?? []

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-[800px]">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-sans uppercase tracking-widest text-graphite-soft mb-1">{type}</div>
            <h2 className="text-[22px] leading-tight">{String(draft.name ?? '')}</h2>
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

        <div className="space-y-3">
          {defs.map((f) => (
            <label key={f.key} className="block">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">
                {t(f.labelKey)}
              </div>
              {f.kind === 'textarea' ? (
                <textarea
                  rows={3}
                  value={String(draft[f.key] ?? '')}
                  onChange={(e) => {
                    setDraft({ ...draft, [f.key]: e.target.value })
                    setDirty(true)
                  }}
                  className={INPUT_CLASS}
                />
              ) : f.kind === 'number' ? (
                <input
                  type="number"
                  step="any"
                  value={typeof draft[f.key] === 'number' ? (draft[f.key] as number) : 0}
                  onChange={(e) => {
                    setDraft({ ...draft, [f.key]: Number(e.target.value) })
                    setDirty(true)
                  }}
                  className={INPUT_CLASS}
                />
              ) : (
                <input
                  value={String(draft[f.key] ?? '')}
                  onChange={(e) => {
                    setDraft({ ...draft, [f.key]: e.target.value })
                    setDirty(true)
                  }}
                  className={INPUT_CLASS}
                />
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
