import { describe, expect, it } from 'vitest'
import { dirName, parseAmedasPoint, parseJmaForecast, weatherCategory } from './jma'
import { parseJmaTideText } from './jmaTide'
import { parseOpenMeteo } from './openMeteo'

describe('気象庁 潮位表テキスト', () => {
  const hourly = Array.from({ length: 24 }, (_, i) => String(100 + i - (i === 5 ? 110 : 0)).padStart(3, ' ')).join('')
  const ext = (items: [string, number][]) =>
    [...items.map(([t, h]) => t.padStart(4, ' ') + String(h).padStart(3, ' ')), ...Array(4 - items.length).fill('9999999')].join('')
  const line = hourly + '26 8 1' + 'TK' + ext([['513', 180], ['1842', 195]]) + ext([['1120', 42]])

  it('1 日分を読む', () => {
    const { station, days } = parseJmaTideText(line + '\n')
    expect(station).toBe('TK')
    const d = days['2026-08-01']
    expect(d.hourly).toHaveLength(24)
    expect(d.hourly[0]).toBe(100)
    expect(d.hourly[5]).toBe(-5)
    expect(d.highs).toEqual([{ time: '05:13', cm: 180 }, { time: '18:42', cm: 195 }])
    expect(d.lows).toEqual([{ time: '11:20', cm: 42 }])
  })
})

describe('気象庁 天気予報 JSON', () => {
  const json = [
    {
      reportDatetime: '2026-10-01T11:00:00+09:00',
      timeSeries: [
        {
          timeDefines: ['2026-10-01T11:00:00+09:00', '2026-10-02T00:00:00+09:00', '2026-10-03T00:00:00+09:00'],
          areas: [
            { area: { name: '北西部', code: '120010' }, weatherCodes: ['101', '200', '300'], weathers: ['晴れ　時々　くもり', 'くもり', '雨'], winds: ['北の風', '北東の風　やや強く', '南の風'] },
            { area: { name: '北東部', code: '120020' }, weatherCodes: ['100', '100', '100'], weathers: ['晴れ', '晴れ', '晴れ'], winds: ['', '', ''] },
          ],
        },
        {
          timeDefines: ['2026-10-01T12:00:00+09:00', '2026-10-01T18:00:00+09:00', '2026-10-02T00:00:00+09:00'],
          areas: [{ area: { name: '北西部', code: '120010' }, pops: ['10', '20', '30'] }],
        },
      ],
    },
    {
      reportDatetime: '2026-10-01T11:00:00+09:00',
      timeSeries: [
        {
          timeDefines: ['2026-10-02T00:00:00+09:00', '2026-10-03T00:00:00+09:00', '2026-10-04T00:00:00+09:00'],
          areas: [{ area: { name: '千葉県', code: '120000' }, weatherCodes: ['201', '300', '100'], pops: ['', '70', '10'] }],
        },
        {
          timeDefines: ['2026-10-02T00:00:00+09:00', '2026-10-03T00:00:00+09:00', '2026-10-04T00:00:00+09:00'],
          areas: [{ area: { name: '千葉', code: '45212' }, tempsMin: ['', '18', '17'], tempsMax: ['', '24', '26'] }],
        },
      ],
    },
  ]
  const f = parseJmaForecast(json, '120010', '千葉県北西部')

  it('短期予報の区域を選び、全角スペースを直す', () => {
    expect(f.days[0]).toMatchObject({ date: '2026-10-01', weatherCode: '101', weatherText: '晴れ 時々 くもり', windText: '北の風', pops: [10, 20] })
    expect(f.days[1].windText).toBe('北東の風 やや強く')
  })
  it('週間予報で 4 日目以降と気温を補う', () => {
    expect(f.days[1].weatherCode).toBe('200')
    expect(f.days[1].tempMax).toBeNull()
    expect(f.days[2]).toMatchObject({ weatherCode: '300', tempMin: 18, tempMax: 24 })
    expect(f.days[3]).toMatchObject({ date: '2026-10-04', weatherCode: '100', pops: [10] })
  })
  it('天気コードの分類と風向', () => {
    expect(weatherCategory('302').label).toBe('雨')
    expect(dirName(45)).toBe('北東')
    expect(dirName(350)).toBe('北')
  })
})

describe('アメダス', () => {
  it('16 方位を度にし、静穏は null', () => {
    const obs = parseAmedasPoint({
      '20261001091000': { wind: [3.1, 0], windDirection: [4, 0] },
      '20261001090000': { wind: [0.2, 0], windDirection: [0, 0] },
    })
    expect(obs[0]).toEqual({ time: '2026-10-01T00:00:00.000Z', windMs: 0.2, windDirDeg: null })
    expect(obs[1]).toEqual({ time: '2026-10-01T00:10:00.000Z', windMs: 3.1, windDirDeg: 90 })
  })
})

describe('Open-Meteo', () => {
  it('欠けた時間は飛ばす', () => {
    const w = parseOpenMeteo({ hourly: { time: ['2026-10-01T00:00', '2026-10-01T01:00'], wind_speed_10m: [5, null], wind_direction_10m: [30, 40] } })
    expect(w).toEqual([{ time: '2026-10-01T00:00:00.000Z', speedMs: 5, dirDeg: 30 }])
  })
})
