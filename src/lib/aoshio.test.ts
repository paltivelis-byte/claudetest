import { describe, expect, it } from 'vitest'
import { aoshioForDay, confidenceOf, hypoxiaFactor, levelOf, offshoreComponent, offshoreWindSum, seasonFactor } from './aoshio'
import { fromJst } from './dates'
import type { HourlyWind } from './types'

/** 評価日の朝 6 時までの直近 n 時間に、同じ風を吹かせる */
function steadyWind(date: string, hours: number, speedMs: number, dirDeg: number): HourlyWind[] {
  const end = fromJst(date, 6).getTime()
  return Array.from({ length: hours }, (_, i) => ({ time: new Date(end - (i + 1) * 3600_000).toISOString(), speedMs, dirDeg }))
}

describe('沖向きの風', () => {
  it('北東から吹く風は、南西が沖のポイントでは全部が沖向き', () => {
    expect(offshoreComponent({ time: '', speedMs: 8, dirDeg: 45 }, 225)).toBeCloseTo(8)
  })
  it('沖から吹く風（向岸風）は負', () => {
    expect(offshoreComponent({ time: '', speedMs: 8, dirDeg: 225 }, 225)).toBeCloseTo(-8)
  })
  it('8 m/s が 12 時間で積算 60（SPEC の例）', () => {
    const winds = steadyWind('2026-08-20', 12, 8, 45)
    expect(offshoreWindSum(winds, '2026-08-20', 225).sum).toBeCloseTo(60)
  })
  it('36 時間より前と朝 6 時以降の風は数えない', () => {
    const winds = [
      { time: fromJst('2026-08-20', 6).toISOString(), speedMs: 20, dirDeg: 45 },
      { time: fromJst('2026-08-18', 17).toISOString(), speedMs: 20, dirDeg: 45 },
    ]
    expect(offshoreWindSum(winds, '2026-08-20', 225).sum).toBe(0)
  })
})

describe('各指標', () => {
  it('季節', () => {
    expect(seasonFactor(8)).toBe(1)
    expect(seasonFactor(10)).toBe(0.6)
    expect(seasonFactor(1)).toBe(0.05)
  })
  it('底層DO', () => {
    expect(hypoxiaFactor(0.3)).toBe(1)
    expect(hypoxiaFactor(1.25)).toBeCloseTo(0.5)
    expect(hypoxiaFactor(3)).toBe(0)
  })
  it('レベルの境目', () => {
    expect([19, 20, 49, 50, 74, 75].map(levelOf)).toEqual([0, 1, 1, 2, 2, 3])
  })
  it('信頼度', () => {
    expect(confidenceOf(0, 'observed', 1)).toBe('high')
    expect(confidenceOf(2, 'observed', 1)).toBe('mid')
    expect(confidenceOf(0, 'climatology', 1)).toBe('mid')
    expect(confidenceOf(5, 'observed', 1)).toBe('low')
    expect(confidenceOf(0, 'observed', 0.5)).toBe('mid')
  })
})

describe('スコア', () => {
  const base = { date: '2026-08-20', today: '2026-08-20', offshoreBearingDeg: 225 }
  it('夏・貧酸素・強い北東風がそろうと「高い」', () => {
    const d = aoshioForDay({ ...base, winds: steadyWind(base.date, 36, 9, 45), hypoxia: { bottomDoMgL: 0.4, source: 'observed' } })
    expect(d.score).toBe(100)
    expect(d.level).toBe(3)
    expect(d.confidence).toBe('high')
  })
  it('風が弱ければ下地がそろっていても低い', () => {
    const d = aoshioForDay({ ...base, winds: steadyWind(base.date, 36, 3, 45), hypoxia: { bottomDoMgL: 0.4, source: 'observed' } })
    expect(d.score).toBe(0)
  })
  it('酸素が十分なら強風でも低い', () => {
    const d = aoshioForDay({ ...base, winds: steadyWind(base.date, 36, 12, 45), hypoxia: { bottomDoMgL: 5, source: 'observed' } })
    expect(d.score).toBe(0)
  })
})
