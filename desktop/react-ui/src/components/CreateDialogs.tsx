import { useEffect, useState } from 'react'
import type { Descriptor, FlowDetail } from '../api/types'
import { getEntity, updateEntity } from '../api/ipc'
import { getDescriptorsCached, invalidateDescriptors, resolveUnit } from '../api/entityCache'
import { useI18n } from '../i18n'
import { Button, ErrorBox, Spinner } from './ui/primitives'
import { FlowPicker } from './FlowPicker'

const INPUT_CLASS =
  'w-full px-2.5 py-1.5 bg-paper border border-line text-[13px] outline-none focus:border-graphite-mid'

export function FlowCreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (flow: { id: string; name: string }) => void
}) {
  const t = useI18n((s) => s.t)
  const [name, setName] = useState('')
  const [flowType, setFlowType] = useState('PRODUCT_FLOW')
  const [category, setCategory] = useState('')
  const [props, setProps] = useState<Descriptor[]>([])
  const [propId, setPropId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getDescriptorsCached('FlowProperty')
      .then((list) => {
        setProps(list)
        const mass = list.find((p) => p.name.toLowerCase() === 'mass') ?? list[0]
        if (mass) setPropId(mass['@id'])
      })
      .catch((e) => setError(String(e instanceof Error ? e.message : e)))
  }, [])

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      const fp = props.find((p) => p['@id'] === propId)
      if (!fp) throw new Error('flow property not selected')
      const id = crypto.randomUUID()
      await updateEntity('Flow', {
        '@type': 'Flow',
        '@id': id,
        name: name.trim(),
        version: '01.00.000',
        lastChange: new Date().toISOString(),
        flowType,
        ...(category.trim() ? { category: category.trim() } : {}),
        flowProperties: [
          {
            '@type': 'FlowPropertyFactor',
            isRefFlowProperty: true,
            conversionFactor: 1,
            flowProperty: { '@type': 'FlowProperty', '@id': fp['@id'], name: fp.name },
          },
        ],
      })
      invalidateDescriptors('Flow')
      onCreated({ id, name: name.trim() })
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-paper border border-line w-[520px] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">{t('new_flow')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">×</button>
        </div>
        <div className="p-4 space-y-3">
          {error && <ErrorBox message={error} />}
          <label className="block">
            <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">{t('name')}</div>
            <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} autoFocus />
          </label>
          <label className="block">
            <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">{t('flow_type')}</div>
            <select value={flowType} onChange={(e) => setFlowType(e.target.value)} className={INPUT_CLASS}>
              <option value="PRODUCT_FLOW">{t('ft_product')}</option>
              <option value="ELEMENTARY_FLOW">{t('ft_elementary')}</option>
              <option value="WASTE_FLOW">{t('ft_waste')}</option>
            </select>
          </label>
          <label className="block">
            <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">
              {t('nav_flow_properties')}
            </div>
            <select value={propId} onChange={(e) => setPropId(e.target.value)} className={INPUT_CLASS}>
              {props.map((p) => (
                <option key={p['@id']} value={p['@id']}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">
              {t('category')}
            </div>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Materials production/..."
              className={INPUT_CLASS}
            />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>{t('db_cancel')}</Button>
            <Button onClick={create} disabled={busy || !name.trim() || !propId}>
              {busy ? t('loading') : t('db_create')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProcessCreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: string, name: string) => void
}) {
  const t = useI18n((s) => s.t)
  const [name, setName] = useState('')
  const [locations, setLocations] = useState<Descriptor[]>([])
  const [locationId, setLocationId] = useState('')
  const [amount, setAmount] = useState(1)
  const [flow, setFlow] = useState<Descriptor | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [showNewFlow, setShowNewFlow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getDescriptorsCached('Location')
      .then(setLocations)
      .catch(() => setLocations([]))
  }, [])

  const create = async () => {
    if (!flow) return
    setBusy(true)
    setError('')
    try {
      const full = await getEntity<FlowDetail>('Flow', flow['@id'])
      if (!full) throw new Error('flow not found')
      const refFp = (full.flowProperties ?? []).find((f) => f.isRefFlowProperty) ?? full.flowProperties?.[0]
      const unit = await resolveUnit(refFp?.flowProperty?.refUnit)
      const loc = locations.find((l) => l['@id'] === locationId)
      const id = crypto.randomUUID()
      await updateEntity('Process', {
        '@type': 'Process',
        '@id': id,
        name: name.trim(),
        version: '01.00.000',
        lastChange: new Date().toISOString(),
        processType: 'UNIT_PROCESS',
        ...(loc ? { location: { '@type': 'Location', '@id': loc['@id'], name: loc.name } } : {}),
        exchanges: [
          {
            '@type': 'Exchange',
            internalId: 0,
            input: false,
            isQuantitativeReference: true,
            amount,
            flow: { '@type': 'Flow', '@id': flow['@id'], name: flow.name },
            ...(refFp?.flowProperty
              ? {
                  flowProperty: {
                    '@type': 'FlowProperty',
                    '@id': refFp.flowProperty['@id'],
                    name: refFp.flowProperty.name,
                  },
                }
              : {}),
            ...(unit ? { unit } : {}),
          },
        ],
      })
      invalidateDescriptors('Process')
      onCreated(id, name.trim())
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setBusy(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-black/40 flex items-center justify-center" onClick={onClose}>
        <div className="bg-paper border border-line w-[560px] shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
            <h3 className="text-[14px] font-sans uppercase tracking-widest">{t('new_process')}</h3>
            <button onClick={onClose} className="text-graphite-soft hover:text-e-4 text-[18px] cursor-pointer">×</button>
          </div>
          <div className="p-4 space-y-3">
            {error && <ErrorBox message={error} />}
            <label className="block">
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">{t('name')}</div>
              <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} autoFocus />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">
                  {t('location')}
                </div>
                <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={INPUT_CLASS}>
                  <option value="">—</option>
                  {locations.map((l) => (
                    <option key={l['@id']} value={l['@id']}>{l.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">
                  {t('quantitative_ref')}
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className={INPUT_CLASS}
                />
              </label>
            </div>
            <div>
              <div className="text-[11px] font-sans uppercase tracking-wide text-graphite-mid mb-1">
                {t('ref_flow')}
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex-1 px-2.5 py-1.5 bg-paper-2 border border-line text-[13px] truncate">
                  {flow ? flow.name : <span className="text-graphite-soft">—</span>}
                </div>
                <Button variant="ghost" onClick={() => setShowPicker(true)}>{t('pick_flow')}</Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={onClose}>{t('db_cancel')}</Button>
              <Button onClick={create} disabled={busy || !name.trim() || !flow}>
                {busy ? <Spinner label={t('loading')} /> : t('db_create')}
              </Button>
            </div>
          </div>
        </div>
      </div>
      {showPicker && (
        <FlowPicker
          onClose={() => setShowPicker(false)}
          onPick={(d) => {
            setFlow(d)
            setShowPicker(false)
          }}
          allowCreate
          onCreateRequest={() => {
            setShowPicker(false)
            setShowNewFlow(true)
          }}
        />
      )}
      {showNewFlow && (
        <FlowCreateDialog
          onClose={() => setShowNewFlow(false)}
          onCreated={(f) => {
            setFlow({ '@id': f.id, name: f.name })
            setShowNewFlow(false)
          }}
        />
      )}
    </>
  )
}
