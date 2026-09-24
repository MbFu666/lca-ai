import { useState } from 'react'
import { useI18n, type Lang } from '../i18n'
import { FEEDS, GEO } from '../lib/refdata'
import { applyInventoryToDb } from '../lib/litfill'
import { toast } from '../lib/toast'
import { Button, ErrorBox, Spinner } from './ui/primitives'

const FIELDS: Array<{ path: string; overrideKey: string; label: { ru: string; en: string; zh: string } }> = [
  { path: 'cultivation.yield_t_ha', overrideKey: 'yield', label: { ru: 'Урожайность, т/га', en: 'Yield, t/ha', zh: '单产 t/ha' } },
  { path: 'cultivation.n_kg_ha', overrideKey: 'cult_n', label: { ru: 'Азот N, кг/га', en: 'Nitrogen N, kg/ha', zh: '氮 kg/ha' } },
  { path: 'cultivation.p_kg_ha', overrideKey: 'cult_p', label: { ru: 'Фосфор P2O5, кг/га', en: 'Phosphorus P2O5, kg/ha', zh: '磷 kg/ha' } },
  { path: 'cultivation.k_kg_ha', overrideKey: 'cult_k', label: { ru: 'Калий K2O, кг/га', en: 'Potassium K2O, kg/ha', zh: '钾 kg/ha' } },
  { path: 'cultivation.diesel_l_ha', overrideKey: 'cult_diesel', label: { ru: 'Дизель, л/га', en: 'Diesel, L/ha', zh: '柴油 L/ha' } },
  { path: 'cultivation.seed_kg_ha', overrideKey: 'cult_seed', label: { ru: 'Семена, кг/га', en: 'Seed, kg/ha', zh: '种子 kg/ha' } },
  { path: 'cultivation.herbicide_kg_ha', overrideKey: 'cult_herbicide', label: { ru: 'Гербициды, кг/га', en: 'Herbicide, kg/ha', zh: '除草剂 kg/ha' } },
  { path: 'cultivation.pesticide_kg_ha', overrideKey: 'cult_pesticide', label: { ru: 'Пестициды, кг/га', en: 'Pesticide, kg/ha', zh: '杀虫剂 kg/ha' } },
  { path: 'cultivation.irrig_water_m3_ha', overrideKey: 'cult_irrig_water', label: { ru: 'Ирригация, м³/га', en: 'Irrigation, m3/ha', zh: '灌溉 m3/ha' } },
  { path: 'cultivation.irrig_elec_kwh_ha', overrideKey: 'cult_irrig_elec', label: { ru: 'Эл-во ирригации, кВт·ч/га', en: 'Irrigation elec, kWh/ha', zh: '灌溉电 kWh/ha' } },
  { path: 'tech.feed_per_t', overrideKey: 'feed_per_t', label: { ru: 'Сырьё на 1 т этанола, т', en: 'Feed per t ethanol, t', zh: '原料 t/t' } },
  { path: 'tech.steam_per_t', overrideKey: 'steam_per_t', label: { ru: 'Пар на 1 т, т', en: 'Steam per t, t', zh: '蒸汽 t/t' } },
  { path: 'tech.elec_per_t', overrideKey: 'elec_per_t', label: { ru: 'Эл-во на 1 т, кВт·ч', en: 'Electricity per t, kWh', zh: '电 kWh/t' } },
  { path: 'tech.water_per_t', overrideKey: 'water_per_t', label: { ru: 'Вода на 1 т, м³', en: 'Water per t, m3', zh: '水 m3/t' } },
  { path: 'tech.enzyme_per_t', overrideKey: 'enzyme_per_t', label: { ru: 'Ферменты на 1 т, кг', en: 'Enzyme per t, kg', zh: '酶 kg/t' } },
  { path: 'tech.yeast_per_t', overrideKey: 'yeast_per_t', label: { ru: 'Дрожжи на 1 т, кг', en: 'Yeast per t, kg', zh: '酵母 kg/t' } },
  { path: 'transport_km', overrideKey: 'transport_radius_km', label: { ru: 'Транспорт, км', en: 'Transport, km', zh: '运输 km' } },
  { path: 'grid_ef_kg_co2_kwh', overrideKey: 'grid_ef', label: { ru: 'Сетевой EF, кг CO2/кВт·ч', en: 'Grid EF, kg CO2/kWh', zh: '电网因子' } },
  { path: 'coprod_per_t', overrideKey: 'coprod', label: { ru: 'Побочный продукт, т/т', en: 'Co-product, t/t', zh: '副产品 t/t' } },
  { path: 'ethanol_price_yuan_t', overrideKey: 'ethanol_price', label: { ru: 'Цена этанола, ¥/т', en: 'Ethanol price, ¥/t', zh: '乙醇价 ¥/t' } },
]

function getPath(obj: any, path: string): number | undefined {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj) as number | undefined
}

export function AutoFill({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useI18n((s) => s.t)
  const lang = useI18n((s) => s.lang) as Lang
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [busyFile, setBusyFile] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [extracted, setExtracted] = useState<Record<string, any> | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [feed, setFeed] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  const [province, setProvince] = useState('Heilongjiang')

  if (!open) return null

  const setPath = (obj: Record<string, any>, path: string, v: number) => {
    const parts = path.split('.')
    let cur = obj
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] ?? {}
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = v
  }

  const extract = async () => {
    setBusy(true)
    setError('')
    setApplied(false)
    try {
      const r = await window.desktop!.aiExtractInventory(text, lang)
      setExtracted(r)
      setFeed(typeof r?.feed === 'string' ? r.feed : null)
      const v: Record<string, string> = {}
      for (const f of FIELDS) {
        const val = getPath(r, f.path)
        if (typeof val === 'number' && isFinite(val)) v[f.overrideKey] = String(val)
      }
      setValues(v)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
    }
  }

  const apply = async () => {
    setBusy(true)
    setError('')
    try {
      const x: Record<string, any> = {}
      for (const f of FIELDS) {
        const s = values[f.overrideKey]
        if (s !== undefined && s !== '' && isFinite(Number(s))) setPath(x, f.path, Number(s))
      }
      if (feed) x.feed = feed
      const sum = await applyInventoryToDb(x, {
        province,
        feed: feed ?? undefined,
        techLabel: feed ? (FEEDS[feed]?.label.en ?? feed) : 'Literature',
      })
      setApplied(true)
      toast.ok(`${t('af_db_done')} +${sum.created.length} / ~${sum.updated.length}`)
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e)
      setError(msg)
      toast.err(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-paper border border-line w-[760px] max-h-[88vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
          <h3 className="text-[14px] font-sans uppercase tracking-widest">📥 {t('af_title')}</h3>
          <button onClick={onClose} className="text-graphite-soft hover:text-graphite cursor-pointer">
            ×
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          <div className="text-[12px] text-graphite-soft">{t('af_hint')}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                setBusyFile(true)
                setError('')
                try {
                  const p = await window.desktop!.dialogOpen({
                    filters: [
                      { name: 'Documents', extensions: ['docx', 'pdf', 'xlsx', 'xls', 'csv', 'txt', 'md'] },
                    ],
                  })
                  if (!p) return
                  const r = await window.desktop!.extractText(p)
                  setText(r.text)
                  setFileName(`${String(p).split(/[\\/]/).pop()} (${r.chars} chars)`)
                } catch (err) {
                  setError(String(err instanceof Error ? err.message : err))
                } finally {
                  setBusyFile(false)
                }
              }}
              className="px-2.5 py-1 text-[12px] border border-line hover:bg-paper-2 cursor-pointer"
            >
              📄 {t('af_file')}
            </button>
            {busyFile && <Spinner label={t('af_file_working')} />}
            {fileName && <span className="text-[11px] text-graphite-soft">{fileName}</span>}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={t('af_placeholder')}
            className="w-full px-2.5 py-1.5 bg-paper border border-line text-[12px] font-mono outline-none focus:border-graphite-mid"
          />
          <div className="flex items-center gap-3">
            <label className="text-[12px] text-graphite-mid">
              {t('af_province')}{' '}
              <select value={province} onChange={(e) => setProvince(e.target.value)} className="px-2 py-1 bg-paper border border-line text-[12px] outline-none cursor-pointer">
                {GEO.map((g) => (
                  <option key={g.province} value={g.province}>
                    {g.label[lang] ?? g.label.en}
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={() => void extract()} disabled={busy || !text.trim()}>
              {busy ? t('loading') : t('af_extract')}
            </Button>
            {busy && <Spinner label={t('af_working')} />}
          </div>
          {error && <ErrorBox message={error} />}
          {extracted && (
            <div className="space-y-2">
              <div className="text-[12px] font-semibold uppercase tracking-wide">
                {t('af_result')} {feed ? `· feed: ${feed}` : ''}
              </div>
              <table className="w-full text-[12px] border-collapse">
                <tbody>
                  {FIELDS.map((f) => (
                    <tr key={f.overrideKey}>
                      <td className="px-2 py-1 border border-line">{f.label[lang] ?? f.label.en}</td>
                      <td className="px-2 py-1 border border-line text-right w-[120px]">
                        <input
                          type="number"
                          step="any"
                          value={values[f.overrideKey] ?? ''}
                          placeholder="—"
                          onChange={(e) => setValues((v) => ({ ...v, [f.overrideKey]: e.target.value }))}
                          className="w-full px-1 py-0.5 bg-paper border border-line text-[12px] text-right outline-none focus:border-graphite-mid"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {extracted.source_note && (
                <div className="text-[11px] text-graphite-soft">{String(extracted.source_note)}</div>
              )}
              <div className="flex items-center gap-3">
                <Button onClick={() => void apply()} disabled={busy}>
                  {busy ? t('loading') : t('af_apply_db')}
                </Button>
                {applied && <span className="text-[12px] text-graphite-soft">{t('af_applied_db')}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
