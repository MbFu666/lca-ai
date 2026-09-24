import { useCallback, useEffect, useState } from 'react'
import type { EntityType } from '../../api/types'
import { getEntity } from '../../api/ipc'
import { useI18n } from '../../i18n'
import { ErrorBox, Field, Spinner } from '../ui/primitives'

export function GenericEditor({ type, id }: { type: EntityType; id: string }) {
  const t = useI18n((s) => s.t)
  const [entity, setEntity] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const e = await getEntity<Record<string, unknown>>(type, id)
      setEntity(e)
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err))
    } finally {
      setLoading(false)
    }
  }, [type, id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <div className="p-6"><Spinner label={t('loading')} /></div>
  if (error || !entity) return <div className="p-6"><ErrorBox message={error || 'Not found'} onRetry={load} /></div>

  const name = String(entity.name ?? id)
  const category = (entity.category as { name?: string } | string | undefined)
  const categoryName = typeof category === 'string' ? category : category?.name
  const description = entity.description ? String(entity.description) : null
  const version = entity.version ? String(entity.version) : null
  const lastChange = entity.lastChange ? String(entity.lastChange).slice(0, 10) : null

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-[900px]">
        <div className="text-[11px] font-sans uppercase tracking-widest text-graphite-soft mb-1">{type}</div>
        <h2 className="text-[22px] leading-tight mb-6">{name}</h2>
        {categoryName && <Field label={t('category')}>{categoryName}</Field>}
        {version && <Field label={t('version')}>{version}</Field>}
        {lastChange && <Field label={t('last_change')}>{lastChange}</Field>}
        {description && (
          <Field label={t('description')}>
            <span className="text-graphite-mid whitespace-pre-wrap">{description}</span>
          </Field>
        )}
        <details className="mt-6">
          <summary className="text-[12px] font-sans uppercase tracking-wide text-graphite-soft cursor-pointer">
            JSON-LD
          </summary>
          <pre className="mt-2 p-3 bg-paper-2 border border-line text-[11px] font-mono overflow-x-auto">
            {JSON.stringify(entity, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
