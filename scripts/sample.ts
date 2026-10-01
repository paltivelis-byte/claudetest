// 開発用のサンプルデータ（本物ではない）。潮位は東京の主要 4 分潮でおおまかに再現する

import { addDays, fromJst } from '../src/lib/dates'
import type { AmedasObs, AreaForecast, HourlyWind, TideDay, TideExtreme, TideFile } from '../src/lib/types'

// 振幅 cm, 角速度 度/時, 位相 度（だいたいの値）
const CONSTITUENTS = [
  { a: 51, w: 28.984, p: 150 }, // M2
  { a: 24, w: 30.0, p: 180 }, // S2
  { a: 25, w: 15.041, p: 180 }, // K1
  { a: 19, w: 13.943, p: 160 }, // O1
]
const MEAN_CM = 110

function tideAt(t: Date): number {
  const h = (t.getTime() - Date.UTC(2000, 0, 1)) / 3600_000
  return MEAN_CM + CONSTITUENTS.reduce((s, c) => s + c.a * Math.cos(((c.w * h - c.p) * Math.PI) / 180), 0)
}

function sampleTideDay(date: string): TideDay {
  const hourly = Array.from({ length: 24 }, (_, h) => Math.round(tideAt(fromJst(date, h))))
  const highs: TideExtreme[] = []
  const lows: TideExtreme[] = []
  for (let m = 0; m < 1440; m += 6) {
    const [a, b, c] = [m - 6, m, m + 6].map((x) => tideAt(new Date(fromJst(date).getTime() + x * 60_000)))
    const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    if (b > a && b >= c) highs.push({ time, cm: Math.round(b) })
    if (b < a && b <= c) lows.push({ time, cm: Math.round(b) })
  }
  return { hourly, highs, lows }
}

export function sampleTideFile(station: string, stationName: string, year: number): TideFile {
  const days: Record<string, TideDay> = {}
  for (let d = `${year}-01-01`; d.startsWith(String(year)); d = addDays(d, 1)) days[d] = sampleTideDay(d)
  return { station, stationName, year, days }
}

/** 2 日目の夜から北東の風が強まる想定 */
export function sampleWinds(today: string, _offshoreBearingDeg: number): HourlyWind[] {
  const out: HourlyWind[] = []
  const start = fromJst(addDays(today, -2)).getTime()
  for (let h = 0; h < 24 * 10; h++) {
    const strong = h >= 24 * 3 + 18 && h < 24 * 5
    out.push({ time: new Date(start + h * 3600_000).toISOString(), speedMs: strong ? 9 : 3 + (h % 5) * 0.5, dirDeg: strong ? 40 : 180 + (h % 7) * 10 })
  }
  return out
}

export function sampleWeather(areaCode: string, areaName: string, today: string): AreaForecast {
  const codes = ['100', '101', '200', '300', '201', '100', '110', '200']
  return {
    areaCode,
    areaName,
    reportDatetime: new Date().toISOString(),
    days: codes.map((code, i) => ({
      date: addDays(today, i),
      weatherCode: code,
      weatherText: i < 3 ? ['晴れ', '晴れ 時々 くもり', 'くもり'][i] : undefined,
      windText: i < 3 ? ['北の風 やや強く', '北東の風', '南の風'][i] : undefined,
      pops: i < 3 ? [10, 20, 10, 0] : [20 + i * 5],
      tempMin: 18 + (i % 3),
      tempMax: 25 + (i % 4),
    })),
  }
}

export function sampleAmedas(now: Date): AmedasObs[] {
  const end = Math.floor(now.getTime() / 3600_000) * 3600_000
  return Array.from({ length: 48 }, (_, i) => ({
    time: new Date(end - (47 - i) * 3600_000).toISOString(),
    windMs: 2 + (i % 6),
    windDirDeg: (i * 22.5) % 360,
  }))
}
