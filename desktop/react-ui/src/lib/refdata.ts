export type L10n = { ru: string; en: string; zh: string }

export interface SourceRef {
  title: string
  publisher: string
  year: number
  url?: string
  doi?: string
}

export interface DataPoint {
  value: number
  unit: string
  year: number
  source: SourceRef
  note?: L10n
}

export interface CityEntry {
  id: string
  label: L10n
  cornYield?: DataPoint
  sorghumYield?: DataPoint
  transportRadiusKm?: DataPoint
}

export interface GeoEntry {
  province: string
  label: L10n
  gridProcessMatch: string
  gridEF: DataPoint
  cornYield: DataPoint
  sorghumYield: DataPoint
  transportRadiusKm: DataPoint
  cities: CityEntry[]
}

const NBSC: SourceRef = {
  title: 'China Statistical Yearbook 2023 (crop yields per province)',
  publisher: 'National Bureau of Statistics of China',
  year: 2023,
  url: 'https://www.stats.gov.cn/sj/ndsj/2023/indexch.htm',
}
const MEE_GRID: SourceRef = {
  title: '2022 provincial electricity grid CO2 emission factors of China',
  publisher: 'Ministry of Ecology and Environment of China',
  year: 2023,
  url: 'https://www.mee.gov.cn',
}
const SSF_LIT: SourceRef = {
  title: 'Solid-state fermentation for fuel ethanol: pilot-scale consumption ranges (literature default, editable)',
  publisher: 'Literature review default',
  year: 2021,
}
const LIQ_LIT: SourceRef = {
  title: 'Fuel ethanol industry consumption norms, NESPS2 templates (literature default, editable)',
  publisher: 'Literature review default',
  year: 2020,
}
const AGRO_NORM: SourceRef = {
  title: 'Fertilizer and fuel application norms for maize/sorghum in Northeast China (literature default, editable)',
  publisher: 'Literature review default',
  year: 2021,
}

export const GEO: GeoEntry[] = [
  {
    province: 'Heilongjiang',
    label: { ru: 'Хэйлунцзян', en: 'Heilongjiang', zh: '黑龙江' },
    gridProcessMatch: 'Electricity mix ; Heilongjiang',
    gridEF: { value: 0.581, unit: 'kg CO2/kWh', year: 2022, source: MEE_GRID },
    cornYield: { value: 6.3, unit: 't/ha', year: 2022, source: NBSC },
    sorghumYield: { value: 45, unit: 't/ha fresh', year: 2021, source: SSF_LIT },
    transportRadiusKm: { value: 80, unit: 'km', year: 2022, source: LIQ_LIT },
    cities: [
      {
        id: 'Harbin',
        label: { ru: 'Харбин', en: 'Harbin', zh: '哈尔滨' },
        cornYield: { value: 6.6, unit: 't/ha', year: 2022, source: { ...NBSC, title: 'Harbin Statistical Yearbook 2023 (maize yield, city estimate)' } },
        transportRadiusKm: { value: 60, unit: 'km', year: 2022, source: LIQ_LIT },
      },
      {
        id: 'Qiqihar',
        label: { ru: 'Цицикар', en: 'Qiqihar', zh: '齐齐哈尔' },
        cornYield: { value: 6.4, unit: 't/ha', year: 2022, source: { ...NBSC, title: 'Qiqihar Statistical Yearbook 2023 (maize yield, city estimate)' } },
        transportRadiusKm: { value: 70, unit: 'km', year: 2022, source: LIQ_LIT },
      },
    ],
  },
  {
    province: 'Jilin',
    label: { ru: 'Цзилинь', en: 'Jilin', zh: '吉林' },
    gridProcessMatch: 'Electricity mix ; Jilin',
    gridEF: { value: 0.6341, unit: 'kg CO2/kWh', year: 2022, source: MEE_GRID },
    cornYield: { value: 6.8, unit: 't/ha', year: 2022, source: NBSC },
    sorghumYield: { value: 40, unit: 't/ha fresh', year: 2021, source: SSF_LIT },
    transportRadiusKm: { value: 80, unit: 'km', year: 2022, source: LIQ_LIT },
    cities: [
      {
        id: 'Changchun',
        label: { ru: 'Чанчунь', en: 'Changchun', zh: '长春' },
        cornYield: { value: 7.0, unit: 't/ha', year: 2022, source: { ...NBSC, title: 'Changchun Statistical Yearbook 2023 (maize yield, city estimate)' } },
        sorghumYield: { value: 40, unit: 't/ha fresh', year: 2021, source: SSF_LIT },
        transportRadiusKm: { value: 70, unit: 'km', year: 2022, source: LIQ_LIT },
      },
    ],
  },
  {
    province: 'Henan',
    label: { ru: 'Хэнань', en: 'Henan', zh: '河南' },
    gridProcessMatch: 'Electricity mix ; Henan',
    gridEF: { value: 0.5512, unit: 'kg CO2/kWh', year: 2022, source: MEE_GRID },
    cornYield: { value: 6.0, unit: 't/ha', year: 2022, source: NBSC },
    sorghumYield: { value: 38, unit: 't/ha fresh', year: 2021, source: SSF_LIT },
    transportRadiusKm: { value: 70, unit: 'km', year: 2022, source: LIQ_LIT },
    cities: [
      {
        id: 'Zhengzhou',
        label: { ru: 'Чжэнчжоу', en: 'Zhengzhou', zh: '郑州' },
        cornYield: { value: 6.2, unit: 't/ha', year: 2022, source: { ...NBSC, title: 'Zhengzhou Statistical Yearbook 2023 (maize yield, city estimate)' } },
        sorghumYield: { value: 38, unit: 't/ha fresh', year: 2021, source: SSF_LIT },
        transportRadiusKm: { value: 60, unit: 'km', year: 2022, source: LIQ_LIT },
      },
    ],
  },
  {
    province: 'Shandong',
    label: { ru: 'Шаньдун', en: 'Shandong', zh: '山东' },
    gridProcessMatch: 'Electricity mix ; Shandong',
    gridEF: { value: 0.6212, unit: 'kg CO2/kWh', year: 2022, source: MEE_GRID },
    cornYield: { value: 6.4, unit: 't/ha', year: 2022, source: NBSC },
    sorghumYield: { value: 40, unit: 't/ha fresh', year: 2021, source: SSF_LIT },
    transportRadiusKm: { value: 60, unit: 'km', year: 2022, source: LIQ_LIT },
    cities: [
      {
        id: 'Jinan',
        label: { ru: 'Цзинань', en: 'Jinan', zh: '济南' },
        cornYield: { value: 6.6, unit: 't/ha', year: 2022, source: { ...NBSC, title: 'Jinan Statistical Yearbook 2023 (maize yield, city estimate)' } },
        sorghumYield: { value: 40, unit: 't/ha fresh', year: 2021, source: SSF_LIT },
        transportRadiusKm: { value: 55, unit: 'km', year: 2022, source: LIQ_LIT },
      },
    ],
  },
  {
    province: 'Inner Mongolia',
    label: { ru: 'Внутренняя Монголия', en: 'Inner Mongolia', zh: '内蒙古' },
    gridProcessMatch: 'Electricity mix ; Inner Mongolia',
    gridEF: { value: 0.6681, unit: 'kg CO2/kWh', year: 2022, source: MEE_GRID },
    cornYield: { value: 6.5, unit: 't/ha', year: 2022, source: NBSC },
    sorghumYield: { value: 35, unit: 't/ha fresh', year: 2021, source: SSF_LIT },
    transportRadiusKm: { value: 100, unit: 'km', year: 2022, source: LIQ_LIT },
    cities: [
      {
        id: 'Hohhot',
        label: { ru: 'Хух-Хото', en: 'Hohhot', zh: '呼和浩特' },
        cornYield: { value: 6.8, unit: 't/ha', year: 2022, source: { ...NBSC, title: 'Hohhot Statistical Yearbook 2023 (maize yield, city estimate)' } },
        sorghumYield: { value: 35, unit: 't/ha fresh', year: 2021, source: SSF_LIT },
        transportRadiusKm: { value: 90, unit: 'km', year: 2022, source: LIQ_LIT },
      },
    ],
  },
]

export interface TechParamDef {
  key: string
  label: L10n
  unit: string
  value: number
  source: SourceRef
}

export interface TechDef {
  id: string
  label: L10n
  desc: L10n
  feed: string
  params: TechParamDef[]
  coprod: { key: string; label: L10n; unit: string; value: number; priceCnyPerT: number } | null
  ethanolPriceCnyPerT: number
}

export const TECHS: TechDef[] = [
  {
    id: 'corn-ssf',
    label: { ru: 'Твёрдофазная ферментация, кукуруза', en: 'Solid-state fermentation, corn', zh: '固态发酵，玉米' },
    desc: {
      ru: 'Зерно → измельчение → твёрдофазная ферментация → дистилляция; побочно DDGS',
      en: 'Grain → milling → solid-state fermentation → distillation; co-product DDGS',
      zh: '谷物 → 粉碎 → 固态发酵 → 蒸馏；副产 DDGS',
    },
    feed: 'corn',
    ethanolPriceCnyPerT: 7000,
    coprod: {
      key: 'ddgs',
      label: { ru: 'DDGS (кормовой)', en: 'DDGS (feed)', zh: 'DDGS（饲料）' },
      unit: 't/t EtOH',
      value: 1.05,
      priceCnyPerT: 2200,
    },
    params: [
      { key: 'feed_per_t', label: { ru: 'Кукуруза на 1 т этанола', en: 'Corn per 1 t ethanol', zh: '每吨乙醇耗玉米' }, unit: 't/t', value: 3.6, source: SSF_LIT },
      { key: 'steam_per_t', label: { ru: 'Пар на 1 т этанола', en: 'Steam per 1 t ethanol', zh: '每吨乙醇耗蒸汽' }, unit: 't/t', value: 6.0, source: SSF_LIT },
      { key: 'elec_per_t', label: { ru: 'Электричество на 1 т этанола', en: 'Electricity per 1 t ethanol', zh: '每吨乙醇耗电' }, unit: 'kWh/t', value: 350, source: SSF_LIT },
      { key: 'water_per_t', label: { ru: 'Вода на 1 т этанола', en: 'Water per 1 t ethanol', zh: '每吨乙醇耗水' }, unit: 'm3/t', value: 8, source: SSF_LIT },
      { key: 'enzyme_per_t', label: { ru: 'Ферменты (глюкоамилаза) на 1 т', en: 'Enzymes (glucoamylase) per 1 t', zh: '每吨酶制剂' }, unit: 'kg/t', value: 1.5, source: SSF_LIT },
      { key: 'yeast_per_t', label: { ru: 'Дрожжи на 1 т', en: 'Yeast per 1 t', zh: '每吨酵母' }, unit: 'kg/t', value: 2.0, source: SSF_LIT },
    ],
  },
  {
    id: 'sorghum-ssf',
    label: { ru: 'Твёрдофазная ферментация, сладкое сорго', en: 'Solid-state fermentation, sweet sorghum', zh: '固态发酵，甜高粱' },
    desc: {
      ru: 'Стебли → измельчение → твёрдофазная ферментация → дистилляция; побочно багасса',
      en: 'Stalks → crushing → solid-state fermentation → distillation; co-product bagasse',
      zh: '茎秆 → 粉碎 → 固态发酵 → 蒸馏；副产蔗渣',
    },
    feed: 'sorghum',
    ethanolPriceCnyPerT: 7000,
    coprod: {
      key: 'bagasse',
      label: { ru: 'Багасса (топливо/корм)', en: 'Bagasse (fuel/feed)', zh: '蔗渣（燃料/饲料）' },
      unit: 't/t EtOH',
      value: 9.0,
      priceCnyPerT: 300,
    },
    params: [
      { key: 'feed_per_t', label: { ru: 'Стебли сорго на 1 т этанола', en: 'Sorghum stalks per 1 t ethanol', zh: '每吨乙醇耗茎秆' }, unit: 't/t', value: 15, source: SSF_LIT },
      { key: 'steam_per_t', label: { ru: 'Пар на 1 т этанола', en: 'Steam per 1 t ethanol', zh: '每吨乙醇耗蒸汽' }, unit: 't/t', value: 4.0, source: SSF_LIT },
      { key: 'elec_per_t', label: { ru: 'Электричество на 1 т этанола', en: 'Electricity per 1 t ethanol', zh: '每吨乙醇耗电' }, unit: 'kWh/t', value: 300, source: SSF_LIT },
      { key: 'water_per_t', label: { ru: 'Вода на 1 т этанола', en: 'Water per 1 t ethanol', zh: '每吨乙醇耗水' }, unit: 'm3/t', value: 6, source: SSF_LIT },
      { key: 'enzyme_per_t', label: { ru: 'Ферменты на 1 т', en: 'Enzymes per 1 t', zh: '每吨酶制剂' }, unit: 'kg/t', value: 1.0, source: SSF_LIT },
      { key: 'yeast_per_t', label: { ru: 'Дрожжи на 1 т', en: 'Yeast per 1 t', zh: '每吨酵母' }, unit: 'kg/t', value: 2.0, source: SSF_LIT },
    ],
  },
  {
    id: 'sorghum-liquid',
    label: { ru: 'Жидкая ферментация, сладкое сорго', en: 'Liquid fermentation, sweet sorghum', zh: '液态发酵，甜高粱' },
    desc: {
      ru: 'Стебли → сок → жидкая ферментация → дистилляция; побочно багасса и винная',
      en: 'Stalks → juice → liquid fermentation → distillation; co-products bagasse, vinasse',
      zh: '茎秆 → 榨汁 → 液态发酵 → 蒸馏；副产蔗渣、酒糟',
    },
    feed: 'sorghum',
    ethanolPriceCnyPerT: 7000,
    coprod: {
      key: 'bagasse',
      label: { ru: 'Багасса (топливо/корм)', en: 'Bagasse (fuel/feed)', zh: '蔗渣（燃料/饲料）' },
      unit: 't/t EtOH',
      value: 7.2,
      priceCnyPerT: 300,
    },
    params: [
      { key: 'feed_per_t', label: { ru: 'Стебли сорго на 1 т этанола', en: 'Sorghum stalks per 1 t ethanol', zh: '每吨乙醇耗茎秆' }, unit: 't/t', value: 17.9, source: LIQ_LIT },
      { key: 'steam_per_t', label: { ru: 'Пар на 1 т этанола', en: 'Steam per 1 t ethanol', zh: '每吨乙醇耗蒸汽' }, unit: 't/t', value: 4.3, source: LIQ_LIT },
      { key: 'elec_per_t', label: { ru: 'Электричество на 1 т этанола', en: 'Electricity per 1 t ethanol', zh: '每吨乙醇耗电' }, unit: 'kWh/t', value: 815, source: LIQ_LIT },
      { key: 'water_per_t', label: { ru: 'Вода на 1 т этанола', en: 'Water per 1 t ethanol', zh: '每吨乙醇耗水' }, unit: 'm3/t', value: 18, source: LIQ_LIT },
      { key: 'enzyme_per_t', label: { ru: 'Ферменты на 1 т', en: 'Enzymes per 1 t', zh: '每吨酶制剂' }, unit: 'kg/t', value: 0, source: LIQ_LIT },
      { key: 'yeast_per_t', label: { ru: 'Дрожжи на 1 т', en: 'Yeast per 1 t', zh: '每吨酵母' }, unit: 'kg/t', value: 0.5, source: LIQ_LIT },
    ],
  },
  {
    id: 'corn-liquid',
    label: { ru: 'Жидкая ферментация, кукуруза', en: 'Liquid fermentation, corn', zh: '液态发酵，玉米' },
    desc: {
      ru: 'Зерно → развар → жидкая ферментация → дистилляция; побочно DDGS',
      en: 'Grain → cooking → liquid fermentation → distillation; co-product DDGS',
      zh: '谷物 → 蒸煮 → 液态发酵 → 蒸馏；副产 DDGS',
    },
    feed: 'corn',
    ethanolPriceCnyPerT: 7000,
    coprod: {
      key: 'ddgs',
      label: { ru: 'DDGS (кормовой)', en: 'DDGS (feed)', zh: 'DDGS（饲料）' },
      unit: 't/t EtOH',
      value: 1.0,
      priceCnyPerT: 2200,
    },
    params: [
      { key: 'feed_per_t', label: { ru: 'Кукуруза на 1 т этанола', en: 'Corn per 1 t ethanol', zh: '每吨乙醇耗玉米' }, unit: 't/t', value: 3.1, source: LIQ_LIT },
      { key: 'steam_per_t', label: { ru: 'Пар на 1 т этанола', en: 'Steam per 1 t ethanol', zh: '每吨乙醇耗蒸汽' }, unit: 't/t', value: 4.5, source: LIQ_LIT },
      { key: 'elec_per_t', label: { ru: 'Электричество на 1 т этанола', en: 'Electricity per 1 t ethanol', zh: '每吨乙醇耗电' }, unit: 'kWh/t', value: 300, source: LIQ_LIT },
      { key: 'water_per_t', label: { ru: 'Вода на 1 т этанола', en: 'Water per 1 t ethanol', zh: '每吨乙醇耗水' }, unit: 'm3/t', value: 10, source: LIQ_LIT },
      { key: 'enzyme_per_t', label: { ru: 'Ферменты на 1 т', en: 'Enzymes per 1 t', zh: '每吨酶制剂' }, unit: 'kg/t', value: 1.2, source: LIQ_LIT },
      { key: 'yeast_per_t', label: { ru: 'Дрожжи на 1 т', en: 'Yeast per 1 t', zh: '每吨酵母' }, unit: 'kg/t', value: 1.5, source: LIQ_LIT },
    ],
  },
  {
    id: 'cassava-liquid',
    label: { ru: 'Жидкая ферментация, кассава', en: 'Liquid fermentation, cassava', zh: '液态发酵，木薯' },
    desc: { ru: 'Клубни → развар → жидкая ферментация → дистилляция', en: 'Tubers → cooking → liquid fermentation → distillation', zh: '块茎 → 蒸煮 → 液态发酵 → 蒸馏' },
    feed: 'cassava',
    ethanolPriceCnyPerT: 7000,
    coprod: null,
    params: [
      { key: 'feed_per_t', label: { ru: 'Кассава на 1 т этанола', en: 'Cassava per 1 t ethanol', zh: '每吨乙醇耗木薯' }, unit: 't/t', value: 4.5, source: LIQ_LIT },
      { key: 'steam_per_t', label: { ru: 'Пар на 1 т', en: 'Steam per 1 t', zh: '每吨蒸汽' }, unit: 't/t', value: 4.0, source: LIQ_LIT },
      { key: 'elec_per_t', label: { ru: 'Электричество на 1 т', en: 'Electricity per 1 t', zh: '每吨耗电' }, unit: 'kWh/t', value: 350, source: LIQ_LIT },
      { key: 'water_per_t', label: { ru: 'Вода на 1 т', en: 'Water per 1 t', zh: '每吨耗水' }, unit: 'm3/t', value: 12, source: LIQ_LIT },
      { key: 'enzyme_per_t', label: { ru: 'Ферменты на 1 т', en: 'Enzymes per 1 t', zh: '每吨酶制剂' }, unit: 'kg/t', value: 1.5, source: LIQ_LIT },
      { key: 'yeast_per_t', label: { ru: 'Дрожжи на 1 т', en: 'Yeast per 1 t', zh: '每吨酵母' }, unit: 'kg/t', value: 1.5, source: LIQ_LIT },
    ],
  },
  {
    id: 'sugarcane-liquid',
    label: { ru: 'Жидкая ферментация, сахарный тростник', en: 'Liquid fermentation, sugar cane', zh: '液态发酵，甘蔗' },
    desc: { ru: 'Сок → жидкая ферментация → дистилляция', en: 'Juice → liquid fermentation → distillation', zh: '蔗汁 → 液态发酵 → 蒸馏' },
    feed: 'sugarcane',
    ethanolPriceCnyPerT: 7000,
    coprod: { key: 'bagasse', label: { ru: 'Багасса', en: 'Bagasse', zh: '蔗渣' }, unit: 't/t EtOH', value: 1.0, priceCnyPerT: 300 },
    params: [
      { key: 'feed_per_t', label: { ru: 'Тростник на 1 т этанола', en: 'Cane per 1 t ethanol', zh: '每吨乙醇耗甘蔗' }, unit: 't/t', value: 12.5, source: LIQ_LIT },
      { key: 'steam_per_t', label: { ru: 'Пар на 1 т', en: 'Steam per 1 t', zh: '每吨蒸汽' }, unit: 't/t', value: 2.0, source: LIQ_LIT },
      { key: 'elec_per_t', label: { ru: 'Электричество на 1 т', en: 'Electricity per 1 t', zh: '每吨耗电' }, unit: 'kWh/t', value: 120, source: LIQ_LIT },
      { key: 'water_per_t', label: { ru: 'Вода на 1 т', en: 'Water per 1 t', zh: '每吨耗水' }, unit: 'm3/t', value: 6, source: LIQ_LIT },
      { key: 'enzyme_per_t', label: { ru: 'Ферменты на 1 т', en: 'Enzymes per 1 t', zh: '每吨酶制剂' }, unit: 'kg/t', value: 0, source: LIQ_LIT },
      { key: 'yeast_per_t', label: { ru: 'Дрожжи на 1 т', en: 'Yeast per 1 t', zh: '每吨酵母' }, unit: 'kg/t', value: 0.5, source: LIQ_LIT },
    ],
  },
  {
    id: 'miscanthus-ssf',
    label: { ru: 'Твёрдофазная ферментация, мискантус', en: 'Solid-state fermentation, miscanthus', zh: '固态发酵，芒草' },
    desc: { ru: 'Сухая биомасса → предобработка → SSF → дистилляция', en: 'Dry biomass → pretreatment → SSF → distillation', zh: '干生物质 → 预处理 → 固态发酵 → 蒸馏' },
    feed: 'miscanthus',
    ethanolPriceCnyPerT: 7000,
    coprod: null,
    params: [
      { key: 'feed_per_t', label: { ru: 'Мискантус на 1 т', en: 'Miscanthus per 1 t', zh: '每吨耗芒草' }, unit: 't/t', value: 6.0, source: SSF_LIT },
      { key: 'steam_per_t', label: { ru: 'Пар на 1 т', en: 'Steam per 1 t', zh: '每吨蒸汽' }, unit: 't/t', value: 5.0, source: SSF_LIT },
      { key: 'elec_per_t', label: { ru: 'Электричество на 1 т', en: 'Electricity per 1 t', zh: '每吨耗电' }, unit: 'kWh/t', value: 500, source: SSF_LIT },
      { key: 'water_per_t', label: { ru: 'Вода на 1 т', en: 'Water per 1 t', zh: '每吨耗水' }, unit: 'm3/t', value: 10, source: SSF_LIT },
      { key: 'enzyme_per_t', label: { ru: 'Ферменты на 1 т', en: 'Enzymes per 1 t', zh: '每吨酶制剂' }, unit: 'kg/t', value: 8.0, source: SSF_LIT },
      { key: 'yeast_per_t', label: { ru: 'Дрожжи на 1 т', en: 'Yeast per 1 t', zh: '每吨酵母' }, unit: 'kg/t', value: 2.0, source: SSF_LIT },
    ],
  },
  {
    id: 'switchgrass-ssf',
    label: { ru: 'Твёрдофазная ферментация, switchgrass', en: 'Solid-state fermentation, switchgrass', zh: '固态发酵，柳枝稷' },
    desc: { ru: 'Сухая биомасса → предобработка → SSF → дистилляция', en: 'Dry biomass → pretreatment → SSF → distillation', zh: '干生物质 → 预处理 → 固态发酵 → 蒸馏' },
    feed: 'switchgrass',
    ethanolPriceCnyPerT: 7000,
    coprod: null,
    params: [
      { key: 'feed_per_t', label: { ru: 'Switchgrass на 1 т', en: 'Switchgrass per 1 t', zh: '每吨耗柳枝稷' }, unit: 't/t', value: 6.5, source: SSF_LIT },
      { key: 'steam_per_t', label: { ru: 'Пар на 1 т', en: 'Steam per 1 t', zh: '每吨蒸汽' }, unit: 't/t', value: 5.0, source: SSF_LIT },
      { key: 'elec_per_t', label: { ru: 'Электричество на 1 т', en: 'Electricity per 1 t', zh: '每吨耗电' }, unit: 'kWh/t', value: 520, source: SSF_LIT },
      { key: 'water_per_t', label: { ru: 'Вода на 1 т', en: 'Water per 1 t', zh: '每吨耗水' }, unit: 'm3/t', value: 10, source: SSF_LIT },
      { key: 'enzyme_per_t', label: { ru: 'Ферменты на 1 т', en: 'Enzymes per 1 t', zh: '每吨酶制剂' }, unit: 'kg/t', value: 9.0, source: SSF_LIT },
      { key: 'yeast_per_t', label: { ru: 'Дрожжи на 1 т', en: 'Yeast per 1 t', zh: '每吨酵母' }, unit: 'kg/t', value: 2.0, source: SSF_LIT },
    ],
  },
]

export interface CultNorms {
  nKgPerHa: DataPoint
  pKgPerHa: DataPoint
  kKgPerHa: DataPoint
  dieselLPerHa: DataPoint
  n2oKgPerHa: DataPoint
  nh3KgPerHa: DataPoint
  no3KgPerHa: DataPoint
  po4KgPerHa: DataPoint
  // --- added per professor feedback 2026-09-18 ---
  seedKgPerHa: DataPoint
  herbicideKgPerHa: DataPoint
  pesticideKgPerHa: DataPoint
  irrigWaterM3PerHa: DataPoint
  irrigElecKwhPerHa: DataPoint
  machineryUnitPerHa: DataPoint
}

export const CULT_NORMS: Record<string, CultNorms> = {
  corn: {
    nKgPerHa: { value: 180, unit: 'kg N/ha', year: 2021, source: AGRO_NORM },
    pKgPerHa: { value: 75, unit: 'kg P2O5/ha', year: 2021, source: AGRO_NORM },
    kKgPerHa: { value: 60, unit: 'kg K2O/ha', year: 2021, source: AGRO_NORM },
    dieselLPerHa: { value: 120, unit: 'L/ha', year: 2021, source: AGRO_NORM },
    n2oKgPerHa: { value: 1.2, unit: 'kg N2O/ha', year: 2021, source: AGRO_NORM },
    nh3KgPerHa: { value: 15, unit: 'kg NH3/ha', year: 2021, source: AGRO_NORM },
    no3KgPerHa: { value: 25, unit: 'kg NO3/ha', year: 2021, source: AGRO_NORM },
    po4KgPerHa: { value: 0.6, unit: 'kg PO4/ha', year: 2021, source: AGRO_NORM },
    seedKgPerHa: { value: 25, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    herbicideKgPerHa: { value: 2.5, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    pesticideKgPerHa: { value: 1.5, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    irrigWaterM3PerHa: { value: 300, unit: 'm3/ha', year: 2021, source: AGRO_NORM },
    irrigElecKwhPerHa: { value: 150, unit: 'kWh/ha', year: 2021, source: AGRO_NORM },
    machineryUnitPerHa: { value: 0.01, unit: 'unit/ha', year: 2021, source: AGRO_NORM },
  },
  sorghum: {
    nKgPerHa: { value: 180, unit: 'kg N/ha', year: 2021, source: AGRO_NORM },
    pKgPerHa: { value: 70, unit: 'kg P2O5/ha', year: 2021, source: AGRO_NORM },
    kKgPerHa: { value: 100, unit: 'kg K2O/ha', year: 2021, source: AGRO_NORM },
    dieselLPerHa: { value: 150, unit: 'L/ha', year: 2021, source: AGRO_NORM },
    n2oKgPerHa: { value: 1.5, unit: 'kg N2O/ha', year: 2021, source: AGRO_NORM },
    nh3KgPerHa: { value: 18, unit: 'kg NH3/ha', year: 2021, source: AGRO_NORM },
    no3KgPerHa: { value: 27, unit: 'kg NO3/ha', year: 2021, source: AGRO_NORM },
    po4KgPerHa: { value: 0.7, unit: 'kg PO4/ha', year: 2021, source: AGRO_NORM },
    seedKgPerHa: { value: 15, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    herbicideKgPerHa: { value: 2.0, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    pesticideKgPerHa: { value: 1.0, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    irrigWaterM3PerHa: { value: 450, unit: 'm3/ha', year: 2021, source: AGRO_NORM },
    irrigElecKwhPerHa: { value: 200, unit: 'kWh/ha', year: 2021, source: AGRO_NORM },
    machineryUnitPerHa: { value: 0.01, unit: 'unit/ha', year: 2021, source: AGRO_NORM },
  },
  cassava: {
    nKgPerHa: { value: 150, unit: 'kg N/ha', year: 2021, source: AGRO_NORM },
    pKgPerHa: { value: 60, unit: 'kg P2O5/ha', year: 2021, source: AGRO_NORM },
    kKgPerHa: { value: 120, unit: 'kg K2O/ha', year: 2021, source: AGRO_NORM },
    dieselLPerHa: { value: 140, unit: 'L/ha', year: 2021, source: AGRO_NORM },
    n2oKgPerHa: { value: 1.3, unit: 'kg N2O/ha', year: 2021, source: AGRO_NORM },
    nh3KgPerHa: { value: 14, unit: 'kg NH3/ha', year: 2021, source: AGRO_NORM },
    no3KgPerHa: { value: 24, unit: 'kg NO3/ha', year: 2021, source: AGRO_NORM },
    po4KgPerHa: { value: 0.6, unit: 'kg PO4/ha', year: 2021, source: AGRO_NORM },
    seedKgPerHa: { value: 800, unit: 'kg/ha (stem cuttings)', year: 2021, source: AGRO_NORM },
    herbicideKgPerHa: { value: 2.0, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    pesticideKgPerHa: { value: 1.0, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    irrigWaterM3PerHa: { value: 400, unit: 'm3/ha', year: 2021, source: AGRO_NORM },
    irrigElecKwhPerHa: { value: 180, unit: 'kWh/ha', year: 2021, source: AGRO_NORM },
    machineryUnitPerHa: { value: 0.01, unit: 'unit/ha', year: 2021, source: AGRO_NORM },
  },
  sugarcane: {
    nKgPerHa: { value: 200, unit: 'kg N/ha', year: 2021, source: AGRO_NORM },
    pKgPerHa: { value: 80, unit: 'kg P2O5/ha', year: 2021, source: AGRO_NORM },
    kKgPerHa: { value: 150, unit: 'kg K2O/ha', year: 2021, source: AGRO_NORM },
    dieselLPerHa: { value: 160, unit: 'L/ha', year: 2021, source: AGRO_NORM },
    n2oKgPerHa: { value: 1.8, unit: 'kg N2O/ha', year: 2021, source: AGRO_NORM },
    nh3KgPerHa: { value: 20, unit: 'kg NH3/ha', year: 2021, source: AGRO_NORM },
    no3KgPerHa: { value: 30, unit: 'kg NO3/ha', year: 2021, source: AGRO_NORM },
    po4KgPerHa: { value: 0.8, unit: 'kg PO4/ha', year: 2021, source: AGRO_NORM },
    seedKgPerHa: { value: 1500, unit: 'kg/ha (setts)', year: 2021, source: AGRO_NORM },
    herbicideKgPerHa: { value: 3.0, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    pesticideKgPerHa: { value: 1.5, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    irrigWaterM3PerHa: { value: 600, unit: 'm3/ha', year: 2021, source: AGRO_NORM },
    irrigElecKwhPerHa: { value: 250, unit: 'kWh/ha', year: 2021, source: AGRO_NORM },
    machineryUnitPerHa: { value: 0.01, unit: 'unit/ha', year: 2021, source: AGRO_NORM },
  },
  miscanthus: {
    nKgPerHa: { value: 60, unit: 'kg N/ha', year: 2021, source: AGRO_NORM },
    pKgPerHa: { value: 30, unit: 'kg P2O5/ha', year: 2021, source: AGRO_NORM },
    kKgPerHa: { value: 60, unit: 'kg K2O/ha', year: 2021, source: AGRO_NORM },
    dieselLPerHa: { value: 80, unit: 'L/ha', year: 2021, source: AGRO_NORM },
    n2oKgPerHa: { value: 0.6, unit: 'kg N2O/ha', year: 2021, source: AGRO_NORM },
    nh3KgPerHa: { value: 6, unit: 'kg NH3/ha', year: 2021, source: AGRO_NORM },
    no3KgPerHa: { value: 10, unit: 'kg NO3/ha', year: 2021, source: AGRO_NORM },
    po4KgPerHa: { value: 0.2, unit: 'kg PO4/ha', year: 2021, source: AGRO_NORM },
    seedKgPerHa: { value: 1000, unit: 'kg/ha (rhizomes, yr1)', year: 2021, source: AGRO_NORM },
    herbicideKgPerHa: { value: 1.5, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    pesticideKgPerHa: { value: 0.5, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    irrigWaterM3PerHa: { value: 100, unit: 'm3/ha', year: 2021, source: AGRO_NORM },
    irrigElecKwhPerHa: { value: 50, unit: 'kWh/ha', year: 2021, source: AGRO_NORM },
    machineryUnitPerHa: { value: 0.01, unit: 'unit/ha', year: 2021, source: AGRO_NORM },
  },
  switchgrass: {
    nKgPerHa: { value: 80, unit: 'kg N/ha', year: 2021, source: AGRO_NORM },
    pKgPerHa: { value: 35, unit: 'kg P2O5/ha', year: 2021, source: AGRO_NORM },
    kKgPerHa: { value: 70, unit: 'kg K2O/ha', year: 2021, source: AGRO_NORM },
    dieselLPerHa: { value: 90, unit: 'L/ha', year: 2021, source: AGRO_NORM },
    n2oKgPerHa: { value: 0.8, unit: 'kg N2O/ha', year: 2021, source: AGRO_NORM },
    nh3KgPerHa: { value: 8, unit: 'kg NH3/ha', year: 2021, source: AGRO_NORM },
    no3KgPerHa: { value: 12, unit: 'kg NO3/ha', year: 2021, source: AGRO_NORM },
    po4KgPerHa: { value: 0.3, unit: 'kg PO4/ha', year: 2021, source: AGRO_NORM },
    seedKgPerHa: { value: 10, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    herbicideKgPerHa: { value: 1.5, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    pesticideKgPerHa: { value: 0.5, unit: 'kg/ha', year: 2021, source: AGRO_NORM },
    irrigWaterM3PerHa: { value: 120, unit: 'm3/ha', year: 2021, source: AGRO_NORM },
    irrigElecKwhPerHa: { value: 60, unit: 'kWh/ha', year: 2021, source: AGRO_NORM },
    machineryUnitPerHa: { value: 0.01, unit: 'unit/ha', year: 2021, source: AGRO_NORM },
  },
}

// --- Feed metadata (dry-matter fraction, default yield, product flow) ---
export interface FeedMeta {
  dmFrac: number
  yieldTPerHa: number
  yieldUnit: string
  flowName: string
  flowCategory: string
  label: L10n
}
export const FEEDS: Record<string, FeedMeta> = {
  corn: { dmFrac: 0.86, yieldTPerHa: 6.3, yieldUnit: 't/ha', flowName: 'corn, grain, at farm', flowCategory: 'Agricultural products', label: { ru: 'Кукуруза', en: 'Corn', zh: '玉米' } },
  sorghum: { dmFrac: 0.25, yieldTPerHa: 45, yieldUnit: 't/ha fresh', flowName: 'sweet sorghum stalks, fresh, at farm', flowCategory: 'Agricultural products', label: { ru: 'Сладкое сорго', en: 'Sweet sorghum', zh: '甜高粱' } },
  cassava: { dmFrac: 0.35, yieldTPerHa: 25, yieldUnit: 't/ha fresh', flowName: 'cassava tuber, fresh, at farm', flowCategory: 'Agricultural products', label: { ru: 'Кассава', en: 'Cassava', zh: '木薯' } },
  sugarcane: { dmFrac: 0.3, yieldTPerHa: 80, yieldUnit: 't/ha fresh', flowName: 'sugar cane, fresh, at farm', flowCategory: 'Agricultural products', label: { ru: 'Сахарный тростник', en: 'Sugar cane', zh: '甘蔗' } },
  miscanthus: { dmFrac: 0.85, yieldTPerHa: 25, yieldUnit: 't/ha dry', flowName: 'miscanthus, dry, at farm', flowCategory: 'Agricultural products', label: { ru: 'Мискантус', en: 'Miscanthus', zh: '芒草' } },
  switchgrass: { dmFrac: 0.85, yieldTPerHa: 12, yieldUnit: 't/ha dry', flowName: 'switchgrass, dry, at farm', flowCategory: 'Agricultural products', label: { ru: 'Просо прутьевидное', en: 'Switchgrass', zh: '柳枝稷' } },
}

export function feedYield(geo: GeoEntry, city: CityEntry | null, feed: string): DataPoint {
  if (feed === 'corn') return city?.cornYield ?? geo.cornYield
  if (feed === 'sorghum') return city?.sorghumYield ?? geo.sorghumYield
  const m = FEEDS[feed]
  return { value: m?.yieldTPerHa ?? 45, unit: m?.yieldUnit ?? 't/ha', year: 2021, source: AGRO_NORM }
}

// --- Transport & conversion constants (previously hardcoded in plant.ts) ---
const TRANSPORT_NORM: SourceRef = {
  title: 'Truck transport fuel consumption norms, Northeast China (literature default, editable)',
  publisher: 'Literature review default',
  year: 2021,
}

export const TRANSPORT_PARAMS = {
  dieselLPerTkm: { value: 0.05, unit: 'L/(t·km)', year: 2021, source: TRANSPORT_NORM },
  co2KgPerLDiesel: { value: 2.68, unit: 'kg CO2/L', year: 2021, source: TRANSPORT_NORM },
}

export const CONVERSION_CONSTANTS = {
  mjPerTSteam: { value: 2800, unit: 'MJ/t steam', year: 2021, source: SSF_LIT },
  mjPerLDiesel: { value: 35.9, unit: 'MJ/L', year: 2021, source: AGRO_NORM },
  kgCo2PerLDiesel: { value: 2.68, unit: 'kg CO2/L', year: 2021, source: AGRO_NORM },
  kgWwPerM3Water: { value: 800, unit: 'kg/m3', year: 2021, source: SSF_LIT },
  expansionFactor: { value: 0.9, unit: '-', year: 2021, source: SSF_LIT },
  // Agronomic constants for biogenic CO2 uptake
  dmFracCorn: { value: 0.86, unit: '-', year: 2021, source: AGRO_NORM },
  dmFracSorghum: { value: 0.25, unit: '-', year: 2021, source: AGRO_NORM },
  cFraction: { value: 0.45, unit: '-', year: 2021, source: AGRO_NORM },
  co2PerC: { value: 3.667, unit: '-', year: 2021, source: AGRO_NORM },
  // Fermentation CO2 (biogenic) per tonne ethanol: C6H12O6 → 2 C2H5OH + 2 CO2
  // 1 t ethanol → 0.956 t CO2 (stoichiometric)
  fermCo2PerTEthanol: { value: 956, unit: 'kg/t EtOH', year: 2021, source: SSF_LIT },
}

export interface ResolvedParam extends TechParamDef {
  overridden: boolean
}

// --- Economic parameters (from Jiang et al. 2024, Tables S13/S15/S16/S17) ---
const ECON_SRC: SourceRef = {
  title: 'Optimization and benefit analysis of the supply chain for sweet sorghum bioenergy production in China (Jiang et al. 2024), Tables S13-S17',
  publisher: 'The Innovation Energy 1(3):100038',
  year: 2024,
  doi: '10.59717/j.xinn-energy.2024.100038',
}

export interface EconCapexLevel {
  level: 'small' | 'medium' | 'large'
  capLowerT: number
  capUpperT: number
  variableYuanPerT: number
  fixedYuan: number
}

export const ECON = {
  // Ethanol plant investment by capacity level (Table S17)
  plantCapex: [
    { level: 'small', capLowerT: 500000, capUpperT: 6600000, variableYuanPerT: 68.026, fixedYuan: 75144000 },
    { level: 'medium', capLowerT: 6600000, capUpperT: 13400000, variableYuanPerT: 47.264, fixedYuan: 204550000 },
    { level: 'large', capLowerT: 13400000, capUpperT: 20000000, variableYuanPerT: 40.564, fixedYuan: 294710000 },
  ] as EconCapexLevel[],
  // Feedstock collection station investment (Table S15)
  stationCapex: [
    { level: 'small', capLowerT: 100000, capUpperT: 6300000, variableYuanPerT: 1.6352, fixedYuan: 1334200 },
    { level: 'medium', capLowerT: 6300000, capUpperT: 13100000, variableYuanPerT: 1.0821, fixedYuan: 4521900 },
    { level: 'large', capLowerT: 13100000, capUpperT: 20000000, variableYuanPerT: 0.9227, fixedYuan: 6620100 },
  ] as EconCapexLevel[],
  // Planting cost per tonne ethanol (Table S13), by feed
  plantingCostYuanPerTEtOH: { corn: 213, sorghum: 213, cassava: 380, sugarcane: 187, miscanthus: 270, switchgrass: 270 } as Record<string, number>,
  // Ethanol production cost per tonne (Table S16), by feed
  productionCostYuanPerTEtOH: { corn: 2383, sorghum: 2383, cassava: 2538, sugarcane: 1996, miscanthus: 4283, switchgrass: 4283 } as Record<string, number>,
  // Financial assumptions
  discountRate: 0.08,
  plantLifetimeYr: 20,
  source: ECON_SRC,
}

export interface EconResult {
  capexYuan: number
  stationCapexYuan: number
  annualOpexYuan: number
  annualRevenueYuan: number
  annualNetYuan: number
  costPerTEtOH: number
  paybackYr: number
  npvYuan: number
  capexLevel: string
  breakEvenPriceYuanPerT: number
}

function pickCapexLevel(levels: EconCapexLevel[], annualT: number): EconCapexLevel {
  // scale: capacity levels in tables are for national-scale; map our t/y by ratio
  // small <100k t/y, medium 100k-500k, large >500k  (adapted for plant-scale)
  if (annualT < 100000) return { ...levels[0], level: 'small' }
  if (annualT < 500000) return { ...levels[1], level: 'medium' }
  return { ...levels[2], level: 'large' }
}

export function computeEconomics(opts: {
  capacityT: number
  feed: string
  ethanolPriceYuanPerT: number
  coprodPriceYuanPerT: number
  coprodTPerTEtOH: number
  overrides?: Record<string, number>
}): EconResult {
  const capT = opts.capacityT
  const plantLvl = pickCapexLevel(ECON.plantCapex, capT)
  const stationLvl = pickCapexLevel(ECON.stationCapex, capT)
  // CAPEX = variable(yuan/t)*cap + fixed, scaled down for plant-scale via ratio of fixed to table cap
  const capexYuan = plantLvl.variableYuanPerT * capT + plantLvl.fixedYuan * (capT / plantLvl.capUpperT)
  const stationCapexYuan = stationLvl.variableYuanPerT * capT + stationLvl.fixedYuan * (capT / stationLvl.capUpperT)

  const planting = ECON.plantingCostYuanPerTEtOH[opts.feed]
  const production = ECON.productionCostYuanPerTEtOH[opts.feed]
  const annualOpexYuan = (planting + production) * capT

  const coprodT = opts.coprodTPerTEtOH * capT
  const annualRevenueYuan = opts.ethanolPriceYuanPerT * capT + opts.coprodPriceYuanPerT * coprodT
  const annualNetYuan = annualRevenueYuan - annualOpexYuan

  const totalCapex = capexYuan + stationCapexYuan
  const costPerTEtOH = (annualOpexYuan + totalCapex / ECON.plantLifetimeYr) / capT
  const paybackYr = annualNetYuan > 0 ? totalCapex / annualNetYuan : Infinity

  // NPV over lifetime at discount rate
  let npv = -totalCapex
  for (let y = 1; y <= ECON.plantLifetimeYr; y++) {
    npv += annualNetYuan / Math.pow(1 + ECON.discountRate, y)
  }

  const breakEvenPriceYuanPerT = (annualOpexYuan + totalCapex / ECON.plantLifetimeYr - opts.coprodPriceYuanPerT * coprodT) / capT

  return {
    capexYuan,
    stationCapexYuan,
    annualOpexYuan,
    annualRevenueYuan,
    annualNetYuan,
    costPerTEtOH,
    paybackYr,
    npvYuan: npv,
    capexLevel: plantLvl.level,
    breakEvenPriceYuanPerT,
  }
}

export function resolveParams(tech: TechDef, overrides: Record<string, number>): ResolvedParam[] {
  return tech.params.map((p) => ({
    ...p,
    value: overrides[p.key] ?? p.value,
    overridden: overrides[p.key] !== undefined,
  }))
}
