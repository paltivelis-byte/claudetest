// バッチ（scripts/build-data.ts）が書き出し、画面が読み込む JSON の型

export type HourlyWind = {
  /** ISO 8601 */
  time: string
  speedMs: number
  /** 風が吹いてくる方角（度、北=0、時計回り） */
  dirDeg: number
}

export type TideExtreme = { time: string; cm: number }

export type TideDay = {
  /** 毎時（0〜23 時）の潮位 cm */
  hourly: number[]
  highs: TideExtreme[]
  lows: TideExtreme[]
}

export type TideFile = {
  station: string
  stationName: string
  year: number
  days: Record<string, TideDay>
}

export type AoshioLevel = 0 | 1 | 2 | 3
export type Confidence = 'high' | 'mid' | 'low'
export type HypoxiaSource = 'observed' | 'climatology'

export type AoshioDay = {
  date: string
  score: number
  level: AoshioLevel
  confidence: Confidence
  factors: { season: number; hypoxia: number; wind: number }
  hypoxiaSource: HypoxiaSource
  bottomDoMgL: number
  /** 直近36時間の沖向き風の積算（m/s・h） */
  offshoreWindSum: number
}

export type WeatherDay = {
  date: string
  weatherCode: string
  /** 気象庁の天気予報文（3日先まで。週間予報の日は空） */
  weatherText?: string
  windText?: string
  pops: (number | null)[]
  tempMin?: number | null
  tempMax?: number | null
}

export type AreaForecast = {
  areaCode: string
  areaName: string
  reportDatetime: string
  days: WeatherDay[]
}

export type AmedasObs = { time: string; windMs: number | null; windDirDeg: number | null }

export type ForecastFile = {
  generatedAt: string
  /** サンプルデータのとき true（画面に注意を出す） */
  sample: boolean
  aoshio: Record<string, AoshioDay[]>
  weather: Record<string, AreaForecast>
  amedas: Record<string, AmedasObs[]>
  errors: string[]
}
