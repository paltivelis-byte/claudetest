import { describe, expect, it } from 'vitest'
import { lunarDay, moonAge, previousNewMoon, sunTimes, tideName } from './astro'

describe('新月の時刻', () => {
  // 日食の日（新月）で確認：2026-02-17 12:01 UTC（金環日食）、2026-08-12 17:37 UTC（皆既日食）
  it.each([
    ['2026-02-17T12:01:00Z', '2026-02-18T00:00:00Z'],
    ['2026-08-12T17:37:00Z', '2026-08-13T00:00:00Z'],
  ])('%s', (expected, after) => {
    const nm = previousNewMoon(new Date(after))
    expect(Math.abs(nm.getTime() - new Date(expected).getTime())).toBeLessThan(10 * 60_000)
  })
})

describe('旧暦の日・潮名', () => {
  it('新月を含む日（日本時間）が 1 日', () => {
    // 新月は 2026-08-13 02:37 JST
    expect(lunarDay('2026-08-13')).toBe(1)
    expect(lunarDay('2026-08-12')).toBeGreaterThanOrEqual(29)
    expect(tideName('2026-08-13')).toBe('大潮')
  })
  it('10 日は長潮、11 日は若潮', () => {
    expect(tideName('2026-08-22')).toBe('長潮')
    expect(tideName('2026-08-23')).toBe('若潮')
    expect(tideName('2026-08-19')).toBe('小潮')
    expect(tideName('2026-08-28')).toBe('大潮')
  })
  it('月齢は正午の値', () => {
    expect(moonAge('2026-08-13')).toBeCloseTo((12 - 2 - 37 / 60) / 24 + 0, 1)
  })
})

describe('日の出・日の入り', () => {
  it('東京の夏至', () => {
    const { sunrise, sunset } = sunTimes('2026-06-21', 35.68, 139.77)
    const min = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3))
    expect(Math.abs(min(sunrise) - min('04:25'))).toBeLessThanOrEqual(3)
    expect(Math.abs(min(sunset) - min('19:00'))).toBeLessThanOrEqual(3)
  })
})
