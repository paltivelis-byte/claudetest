// Open-Meteo（JMA モデル）の毎時の風。青潮スコアの計算にだけ使い、画面には出さない（docs/SPEC.md §7）

import type { HourlyWind } from './types'

export function openMeteoUrl(lat: number, lon: number): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    hourly: 'wind_speed_10m,wind_direction_10m',
    wind_speed_unit: 'ms',
    models: 'jma_seamless',
    past_days: '2',
    forecast_days: '8',
    timezone: 'GMT',
  })
  return `https://api.open-meteo.com/v1/forecast?${q}`
}

type OpenMeteoResponse = {
  hourly: { time: string[]; wind_speed_10m: (number | null)[]; wind_direction_10m: (number | null)[] }
}

export function parseOpenMeteo(json: OpenMeteoResponse): HourlyWind[] {
  const h = json.hourly
  const out: HourlyWind[] = []
  h.time.forEach((t, i) => {
    const s = h.wind_speed_10m[i]
    const d = h.wind_direction_10m[i]
    if (s == null || d == null) return
    // timezone=GMT のとき時刻は 'YYYY-MM-DDTHH:mm'（UTC）
    out.push({ time: new Date(`${t}:00Z`).toISOString(), speedMs: s, dirDeg: d })
  })
  return out
}
