import { useCallback, useEffect, useState } from 'react'
import type { ProcessParameter } from '../api/types'
import { deleteEntity, getEntity, updateEntity } from '../api/ipc'
import { getGlobalParameters } from '../api/ipc'
import { useI18n } from '../i18n'
import { Button, ErrorBox, Spinner } from './ui/primitives'

const INPUT_CLASS =
  'w-full px-2 py-1 bg-paper border border-line font-mono text-[12px] outline-none focus:border-graphite-mid'

export function GlobalParameters({ onClose }: { onClose: () => void }) {
  const t = useI18n((s) => s.t)
  const [params, setParams] = useState<ProcessParameter[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    setParams(null)
    try {
      const descriptors = await getGlobalParameters()
      const full = await Promise.all(
        descriptors.map((d) => getEntity<ProcessParameter>('Parameter', d['@id'])),
      )
      setParams(full.filter((p): p is ProcessParameter => !!p))
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setParams([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const patch = (idx: number, p: Partial<ProcessParameter>) => {
    setParams((list) => (list ?? []).map((x, i) => (i === idx ? { ...x, ...p } : x)))
  }

  const saveRow = async (p: ProcessParameter) => {
    setError('')
    try {
      if (!p['@id']) {
        await updateEntity('Parameter', { ...p, '@id': crypto.randomUUID(), '@type': 'Parameter' })
      } else {
        await updateEntity('Parameter', p)
      }
      await load()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    }
  }

  const removeRow = async (p: ProcessParameter) => {
    setError('')
    try {
      if (p['@id']) await deleteEntity('Parameter', p['@id'])
      await load()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    }
  }

  const addRow = () => {
    setParams((list) => [...(list ?? []), { name: '', value: 0, formula: '', description: '' }])
  }

  return (
    <div className="fixed inset-0 z-[65] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-paper border border-line w-[820px] max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">{t('nav_global_params')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {error && <div className="mb-3"><ErrorBox message={error} /></div>}
          {params === null ? (
            <Spinner label={t('loading')} />
          ) : (
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] font-sans uppercase tracking-wide text-graphite-soft">
                  <th className="py-1.5 pr-2 font-medium w-[180px]">{t('name')}</th>
                  <th className="py-1.5 pr-2 font-medium w-[120px] text-right">{t('value')}</th>
                  <th className="py-1.5 pr-2 font-medium w-[180px]">{t('formula')}</th>
                  <th className="py-1.5 pr-2 font-medium">{t('description')}</th>
                  <th className="py-1.5 font-medium w-[90px]"></th>
                </tr>
              </thead>
              <tbody>
                {params.map((p, i) => (
                  <tr key={p['@id'] ?? i} className="border-t border-line">
                    <td className="py-1.5 pr-2">
                      <input value={p.name ?? ''} onChange={(e) => patch(i, { name: e.target.value })} className={INPUT_CLASS} />
                    </td>
                    <td className="py-1.5 pr-2 text-right">
                      <input
                        type="number"
                        step="any"
                        value={typeof p.value === 'number' ? p.value : 0}
                        onChange={(e) => patch(i, { value: Number(e.target.value) })}
                        className={INPUT_CLASS}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input value={p.formula ?? ''} onChange={(e) => patch(i, { formula: e.target.value })} className={INPUT_CLASS} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input value={p.description ?? ''} onChange={(e) => patch(i, { description: e.target.value })} className={INPUT_CLASS} />
                    </td>
                    <td className="py-1.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => saveRow(p)}
                        className="text-[11px] text-ok hover:text-graphite cursor-pointer mr-2"
                      >
                        {t('save')}
                      </button>
                      <button
                        onClick={() => removeRow(p)}
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
        </div>
        <div className="flex justify-between px-4 py-3 border-t border-line">
          <Button variant="ghost" onClick={addRow}>+ {t('add_parameter')}</Button>
          <Button variant="ghost" onClick={onClose}>OK</Button>
        </div>
      </div>
    </div>
  )
}
