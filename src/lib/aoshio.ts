// 青潮リスクのスコア計算（docs/SPEC.md §6）。パラメータは仮の値で、過去の発生記録で調整する

import type { AoshioDay, AoshioLevel, Confidence, HourlyWind, HypoxiaSource } from './types'
import { diffDays, fromJst, monthOf } from './dates'

export const PARAMS = {
  /** 沖向きの風のうち、これ未満の分は数えない（m/s） */
  windThresholdMs: 3,
  /** 評価する時間幅（評価日の朝 6 時までの直近 N 時間） */
  windWindowHours: 36,
  evalHour: 6,
  /** この積算値（m/s・h）で W=1 */
  windSumForMax: 60,
  /** 底層DO がこれ以下で H=1、doZero 以上で H=0 */
  doFull: 0.5,
  doZero: 2.0,
  windExponent: 0.7,
  /** 風のデータがこの割合より欠けていたら信頼度を下げる */
  minWindCoverage: 0.75,
}

/** 東京湾奥の底層DO の月平均（mg/L）。観測値が取れないときの代わり。仮の値 */
export const BOTTOM_DO_CLIMATOLOGY: Record<number, number> = {
  1: 7, 2: 7.5, 3: 7, 4: 5.5, 5: 3.5, 6: 1.6, 7: 1.0, 8: 0.6, 9: 0.8, 10: 1.5, 11: 4.5, 12: 6.5,
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export function seasonFactor(month: number): number {
  if (month >= 6 && month <= 9) return 1
  if (month === 5 || month === 10) return 0.6
  if (month === 11) return 0.3
  return 0.05
}

export function hypoxiaFactor(bottomDoMgL: number): number {
  return clamp01((PARAMS.doZero - bottomDoMgL) / (PARAMS.doZero - PARAMS.doFull))
}

/** 沖向きの風の成分（m/s）。風向は「吹いてくる方角」なので、吹いていく方角は +180° */
export function offshoreComponent(w: HourlyWind, offshoreBearingDeg: number): number {
  const toward = (w.dirDeg + 180) * (Math.PI / 180)
  return w.speedMs * Math.cos(toward - offshoreBearingDeg * (Math.PI / 180))
}

/** 評価日の朝 6 時までの直近 36 時間の、沖向きの風の積算と、データのそろい具合 */
export function offshoreWindSum(
  winds: HourlyWind[],
  date: string,
  offshoreBearingDeg: number,
): { sum: number; coverage: number } {
  const end = fromJst(date, PARAMS.evalHour).getTime()
  const start = end - PARAMS.windWindowHours * 3600_000
  let sum = 0
  let n = 0
  for (const w of winds) {
    const t = new Date(w.time).getTime()
    if (t < start || t >= end) continue
    n++
    sum += Math.max(0, offshoreComponent(w, offshoreBearingDeg) - PARAMS.windThresholdMs)
  }
  return { sum, coverage: n / PARAMS.windWindowHours }
}

export function windFactor(sum: number): number {
  return clamp01(sum / PARAMS.windSumForMax)
}

export function levelOf(score: number): AoshioLevel {
  if (score >= 75) return 3
  if (score >= 50) return 2
  if (score >= 20) return 1
  return 0
}

const CONFIDENCE_ORDER: Confidence[] = ['high', 'mid', 'low']

export function confidenceOf(daysAhead: number, hypoxiaSource: HypoxiaSource, windCoverage: number): Confidence {
  let i = daysAhead <= 1 ? 0 : daysAhead <= 3 ? 1 : 2
  if (hypoxiaSource === 'climatology') i++
  if (windCoverage < PARAMS.minWindCoverage) i++
  return CONFIDENCE_ORDER[Math.min(i, 2)]
}

export type HypoxiaInput = { bottomDoMgL: number; source: HypoxiaSource }

export function climatologyHypoxia(date: string): HypoxiaInput {
  return { bottomDoMgL: BOTTOM_DO_CLIMATOLOGY[monthOf(date)], source: 'climatology' }
}

export function aoshioForDay(args: {
  date: string
  today: string
  winds: HourlyWind[]
  offshoreBearingDeg: number
  hypoxia: HypoxiaInput
}): AoshioDay {
  const { date, today, winds, offshoreBearingDeg, hypoxia } = args
  const S = seasonFactor(monthOf(date))
  const H = hypoxiaFactor(hypoxia.bottomDoMgL)
  const { sum, coverage } = offshoreWindSum(winds, date, offshoreBearingDeg)
  const W = windFactor(sum)
  const score = Math.round(100 * S * H * Math.pow(W, PARAMS.windExponent))
  return {
    date,
    score,
    level: levelOf(score),
    confidence: confidenceOf(diffDays(today, date), hypoxia.source, coverage),
    factors: { season: S, hypoxia: round2(H), wind: round2(W) },
    hypoxiaSource: hypoxia.source,
    bottomDoMgL: hypoxia.bottomDoMgL,
    offshoreWindSum: Math.round(sum),
  }
}

const round2 = (x: number) => Math.round(x * 100) / 100

export const LEVEL_LABELS: Record<AoshioLevel, { name: string; text: string }> = {
  0: { name: '低い', text: '青潮の心配は少ない' },
  1: { name: '注意', text: '条件が一部そろっている' },
  2: { name: '警戒', text: '発生の可能性あり' },
  3: { name: '高い', text: '発生の可能性が高い' },
}

export const CONFIDENCE_LABELS: Record<Confidence, string> = { high: '高', mid: '中', low: '低' }
