// 気象庁「潮位表」テキスト形式の読み込み
// 1 行 = 1 日。1〜72 桁: 毎時潮位（3 桁×24）、73〜78: 年月日（2 桁×3）、79〜80: 地点記号、
// 81〜108: 満潮の時刻（4 桁）と潮位（3 桁）×4、109〜136: 干潮 ×4。欠けは 9999 / 999

import type { TideDay, TideExtreme } from './types'

function num(s: string): number {
  return Number(s.trim())
}

function extremes(block: string): TideExtreme[] {
  const out: TideExtreme[] = []
  for (let i = 0; i < 4; i++) {
    const t = block.slice(i * 7, i * 7 + 4)
    const h = block.slice(i * 7 + 4, i * 7 + 7)
    if (t.trim() === '' || num(t) === 9999 || num(h) === 999) continue
    const hhmm = t.trim().padStart(4, '0')
    out.push({ time: `${hhmm.slice(0, 2)}:${hhmm.slice(2)}`, cm: num(h) })
  }
  return out
}

export function parseJmaTideText(text: string): { station: string; days: Record<string, TideDay> } {
  const days: Record<string, TideDay> = {}
  let station = ''
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.padEnd(136, ' ')
    if (raw.trim().length < 80) continue
    const hourly = Array.from({ length: 24 }, (_, i) => num(line.slice(i * 3, i * 3 + 3)))
    const yy = num(line.slice(72, 74))
    const mm = num(line.slice(74, 76))
    const dd = num(line.slice(76, 78))
    if (!yy && yy !== 0) continue
    const date = `${2000 + yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    station = line.slice(78, 80).trim()
    days[date] = { hourly, highs: extremes(line.slice(80, 108)), lows: extremes(line.slice(108, 136)) }
  }
  return { station, days }
}
