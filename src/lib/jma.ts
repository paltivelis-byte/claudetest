// 気象庁の天気予報 JSON・アメダス JSON の読み込み
// 形式は https://www.jma.go.jp/bosai/ で使われているもの（公式の API 仕様書はない）

import type { AmedasObs, AreaForecast, WeatherDay } from './types'
import { jstDate } from './dates'

type Area = { area: { name: string; code: string } } & Record<string, unknown>
type TimeSeries = { timeDefines: string[]; areas: Area[] }
type ForecastReport = { reportDatetime: string; timeSeries: TimeSeries[] }

function pickArea(ts: TimeSeries | undefined, code: string): Area | undefined {
  if (!ts) return undefined
  return ts.areas.find((a) => a.area.code === code) ?? ts.areas[0]
}

const toNum = (v: unknown): number | null => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v))

/** 県の予報 JSON（[短期予報, 週間予報]）から、指定した区域の日ごとの天気をまとめる */
export function parseJmaForecast(json: ForecastReport[], areaCode: string, areaName: string): AreaForecast {
  const [short, weekly] = json
  const days = new Map<string, WeatherDay>()
  const day = (date: string) => {
    let d = days.get(date)
    if (!d) {
      d = { date, weatherCode: '', pops: [] }
      days.set(date, d)
    }
    return d
  }

  // 短期予報：天気・風（3日分）
  const ts0 = short?.timeSeries[0]
  const a0 = pickArea(ts0, areaCode)
  ts0?.timeDefines.forEach((t, i) => {
    const d = day(jstDate(new Date(t)))
    d.weatherCode = String((a0?.weatherCodes as string[] | undefined)?.[i] ?? '')
    d.weatherText = (a0?.weathers as string[] | undefined)?.[i]?.replace(/　/g, ' ')
    d.windText = (a0?.winds as string[] | undefined)?.[i]?.replace(/　/g, ' ')
  })
  // 短期予報：6 時間ごとの降水確率
  const ts1 = short?.timeSeries[1]
  const a1 = pickArea(ts1, areaCode)
  ts1?.timeDefines.forEach((t, i) => {
    day(jstDate(new Date(t))).pops.push(toNum((a1?.pops as string[] | undefined)?.[i]))
  })

  // 週間予報：天気コード・降水確率・最低/最高気温
  const w0 = weekly?.timeSeries[0]
  const wa0 = w0?.areas[0]
  w0?.timeDefines.forEach((t, i) => {
    const d = day(jstDate(new Date(t)))
    if (!d.weatherCode) d.weatherCode = String((wa0?.weatherCodes as string[] | undefined)?.[i] ?? '')
    if (d.pops.length === 0) {
      const p = toNum((wa0?.pops as string[] | undefined)?.[i])
      if (p != null) d.pops.push(p)
    }
  })
  const w1 = weekly?.timeSeries[1]
  const wa1 = w1?.areas[0]
  w1?.timeDefines.forEach((t, i) => {
    const d = day(jstDate(new Date(t)))
    d.tempMin = toNum((wa1?.tempsMin as string[] | undefined)?.[i])
    d.tempMax = toNum((wa1?.tempsMax as string[] | undefined)?.[i])
  })

  return {
    areaCode,
    areaName,
    reportDatetime: short?.reportDatetime ?? '',
    days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
  }
}

/** 天気コードの大まかな分類（1xx 晴れ, 2xx くもり, 3xx 雨, 4xx 雪） */
export function weatherCategory(code: string): { icon: string; label: string } {
  switch (code.charAt(0)) {
    case '1':
      return { icon: '☀️', label: '晴れ' }
    case '2':
      return { icon: '☁️', label: 'くもり' }
    case '3':
      return { icon: '☔', label: '雨' }
    case '4':
      return { icon: '❄️', label: '雪' }
    default:
      return { icon: '－', label: '不明' }
  }
}

/** アメダスの 3 時間分のファイル（キーは 'YYYYMMDDHHmmss'、日本時間）を観測値の配列にする */
export function parseAmedasPoint(json: Record<string, { wind?: [number | null, number]; windDirection?: [number | null, number] }>): AmedasObs[] {
  return Object.entries(json)
    .map(([k, v]) => {
      const iso = `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}T${k.slice(8, 10)}:${k.slice(10, 12)}:00+09:00`
      const dir = v.windDirection?.[0]
      return {
        time: new Date(iso).toISOString(),
        windMs: v.wind?.[0] ?? null,
        // 16 方位のコード（1=北北東 … 16=北、0=静穏）を度にする
        windDirDeg: dir == null || dir === 0 ? null : (dir * 22.5) % 360,
      }
    })
    .sort((a, b) => a.time.localeCompare(b.time))
}

const DIRS16 = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西']

export function dirName(deg: number): string {
  return DIRS16[Math.round(deg / 22.5) % 16]
}
