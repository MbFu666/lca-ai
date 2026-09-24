import { useEffect, useState } from 'react'
import type { Descriptor, Exchange, Uncertainty } from '../api/types'
import { getProvidersOfFlow } from '../api/ipc'
import { useI18n } from '../i18n'
import { Button, Spinner } from './ui/primitives'

const INPUT_CLASS =
  'w-full px-2 py-1 bg-paper border border-line text-[12px] outline-none focus:border-graphite-mid'

export function ExchangeDetails({
  exchange,
  onPatch,
  onClose,
}: {
  exchange: Exchange
  onPatch: (patch: Partial<Exchange>) => void
  onClose: () => void
}) {
  const t = useI18n((s) => s.t)
  const isInput = !!(exchange.isInput ?? exchange.input)
  const [providers, setProviders] = useState<Descriptor[] | null>(null)

  useEffect(() => {
    if (!isInput || !exchange.flow?.['@id']) return
    getProvidersOfFlow(exchange.flow['@id'])
      .then(setProviders)
      .catch(() => setProviders([]))
  }, [isInput, exchange.flow])

  const u = exchange.uncertainty ?? {}
  const dist = u.distributionType ?? ''

  const patchUnc = (patch: Partial<Uncertainty>) => {
    onPatch({ uncertainty: { ...u, ...patch } })
  }

  const setDist = (d: string) => {
    if (!d) {
      onPatch({ uncertainty: undefined })
      return
    }
    onPatch({ uncertainty: { distributionType: d } })
  }

  const numField = (label: string, key: keyof Uncertainty) => (
    <label className="block">
      <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">{label}</div>
      <input
        type="number"
        step="any"
        value={typeof u[key] === 'number' ? (u[key] as number) : 0}
        onChange={(e) => patchUnc({ [key]: Number(e.target.value) })}
        className={INPUT_CLASS}
      />
    </label>
  )

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-paper border border-line w-[560px] max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[13px] font-sans uppercase tracking-widest truncate pr-3">
            {exchange.flow?.name ?? '—'}
          </h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">×</button>
        </div>

        <div className="p-4 space-y-4">
          {isInput && (
            <section>
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">
                {t('default_provider')}
              </div>
              {providers === null ? (
                <Spinner label={t('loading')} />
              ) : (
                <select
                  value={exchange.defaultProvider?.['@id'] ?? ''}
                  onChange={(e) => {
                    const p = providers.find((x) => x['@id'] === e.target.value)
                    onPatch(
                      p
                        ? { defaultProvider: { '@type': 'Process', '@id': p['@id'], name: p.name } }
                        : { defaultProvider: undefined },
                    )
                  }}
                  className={INPUT_CLASS}
                >
                  <option value="">—</option>
                  {providers.map((p) => (
                    <option key={p['@id']} value={p['@id']}>{p.name}</option>
                  ))}
                </select>
              )}
            </section>
          )}

          <section className="space-y-2">
            <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid">{t('uncertainty')}</div>
            <select value={dist} onChange={(e) => setDist(e.target.value)} className={INPUT_CLASS}>
              <option value="">—</option>
              <option value="UNIFORM">{t('dist_uniform')}</option>
              <option value="TRIANGLE">{t('dist_triangle')}</option>
              <option value="NORMAL">{t('dist_normal')}</option>
              <option value="LOG_NORMAL">{t('dist_lognormal')}</option>
            </select>
            {dist === 'UNIFORM' && (
              <div className="grid grid-cols-2 gap-3">
                {numField(t('minimum'), 'minimum')}
                {numField(t('maximum'), 'maximum')}
              </div>
            )}
            {dist === 'TRIANGLE' && (
              <div className="grid grid-cols-3 gap-3">
                {numField(t('minimum'), 'minimum')}
                {numField(t('most_likely'), 'mostLikely')}
                {numField(t('maximum'), 'maximum')}
              </div>
            )}
            {dist === 'NORMAL' && (
              <div className="grid grid-cols-2 gap-3">
                {numField(t('mean'), 'mean')}
                {numField(t('sd'), 'sd')}
              </div>
            )}
            {dist === 'LOG_NORMAL' && (
              <div className="grid grid-cols-2 gap-3">
                {numField(t('geo_mean'), 'geoMean')}
                {numField(t('geo_sd'), 'geoSd')}
              </div>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">
                {t('cost_value')}
              </div>
              <input
                type="number"
                step="any"
                value={exchange.costValue ?? 0}
                onChange={(e) => onPatch({ costValue: Number(e.target.value) })}
                className={INPUT_CLASS}
              />
            </label>
            <label className="block">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">
                {t('cost_formula')}
              </div>
              <input
                value={exchange.costFormula ?? ''}
                onChange={(e) => onPatch({ costFormula: e.target.value })}
                className={INPUT_CLASS}
              />
            </label>
          </section>

          <div className="flex justify-end">
            <Button onClick={onClose}>OK</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
