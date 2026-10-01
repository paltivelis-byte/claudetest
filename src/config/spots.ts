// 釣りポイントのプリセット（docs/SPEC.md §4 F-4）
// 沖の方角・観測地点の割り当ては仮の値。地図で確認して調整する

export type Spot = {
  id: string
  name: string
  lat: number
  lon: number
  /** 岸から沖へ向かう方角（度、北=0、時計回り）。青潮スコアの風の評価に使う */
  offshoreBearingDeg: number
  /** 潮汐の基準地点（気象庁 潮位表の地点記号） */
  tideStation: string
  /** 気象庁 天気予報の一次細分区域コード */
  forecastArea: string
  /** 風の観測値を表示するアメダス地点 */
  amedas: string
  /** 底層DO を使う国交省モニタリングポスト（docs/SPEC.md §7） */
  monitoringPosts: string[]
  favorite: boolean
  note?: string
}

export const SPOTS: Spot[] = [
  {
    id: 'funabashi',
    name: '船橋（三番瀬・船橋港）',
    lat: 35.676,
    lon: 139.975,
    offshoreBearingDeg: 200,
    tideStation: 'TK',
    forecastArea: '120010',
    amedas: '45401',
    monitoringPosts: ['urayasu', 'kemigawa'],
    favorite: true,
    note: '青潮の常発域',
  },
  {
    id: 'kemigawa',
    name: '検見川の浜',
    lat: 35.637,
    lon: 140.058,
    offshoreBearingDeg: 225,
    tideStation: 'TK',
    forecastArea: '120010',
    amedas: '45212',
    monitoringPosts: ['kemigawa'],
    favorite: true,
    note: '青潮の常発域',
  },
  {
    id: 'edogawa',
    name: '江戸川放水路（行徳・妙典）',
    lat: 35.68,
    lon: 139.912,
    offshoreBearingDeg: 180,
    tideStation: 'TK',
    forecastArea: '120010',
    amedas: '44136',
    monitoringPosts: ['urayasu'],
    favorite: true,
    note: '河口から青潮が入り込む。ハゼ釣りへの影響が大きい',
  },
  {
    id: 'wakasu',
    name: '若洲海浜公園',
    lat: 35.618,
    lon: 139.836,
    offshoreBearingDeg: 160,
    tideStation: 'TK',
    forecastArea: '130010',
    amedas: '44136',
    monitoringPosts: ['urayasu'],
    favorite: true,
    note: '東京側。千葉側より発生は少ない',
  },
  {
    id: 'makuhari',
    name: '幕張の浜',
    lat: 35.643,
    lon: 140.033,
    offshoreBearingDeg: 225,
    tideStation: 'TK',
    forecastArea: '120010',
    amedas: '45212',
    monitoringPosts: ['kemigawa'],
    favorite: false,
  },
  {
    id: 'urayasu',
    name: '浦安（日の出・高洲）',
    lat: 35.63,
    lon: 139.915,
    offshoreBearingDeg: 200,
    tideStation: 'TK',
    forecastArea: '120010',
    amedas: '44136',
    monitoringPosts: ['urayasu'],
    favorite: false,
  },
]

/** 気象庁 潮位表の地点（地点記号は潮位表のページで要確認） */
export const TIDE_STATIONS: Record<string, string> = { TK: '東京' }

/** 天気予報の区域。県コードは予報 JSON のファイル名 */
export const FORECAST_AREAS: Record<string, { name: string; prefCode: string }> = {
  '120010': { name: '千葉県北西部', prefCode: '120000' },
  '130010': { name: '東京地方', prefCode: '130000' },
}

/** アメダス地点（地点番号は気象庁サイトで要確認） */
export const AMEDAS_STATIONS: Record<string, string> = {
  '45401': '船橋',
  '45212': '千葉',
  '44136': '江戸川臨海',
}

export function spotById(id: string): Spot | undefined {
  return SPOTS.find((s) => s.id === id)
}
