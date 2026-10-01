// 月齢・潮名・日の出入りの計算
// 新月の時刻は Meeus "Astronomical Algorithms" 第49章（主要な補正項のみ。誤差は数分程度）

import { fromJst, jstDate, diffDays } from './dates'

const SYNODIC = 29.530588861
const RAD = Math.PI / 180

function toJd(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5
}

function fromJd(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000)
}

/** k 番目の新月（k=0 が 2000年1月6日）のユリウス日 */
function newMoonJd(k: number): number {
  const T = k / 1236.85
  const T2 = T * T
  const T3 = T2 * T
  const T4 = T3 * T
  let jde = 2451550.09766 + SYNODIC * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4
  const E = 1 - 0.002516 * T - 0.0000074 * T2
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3) * RAD
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * RAD
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * RAD
  const Om = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * RAD
  jde +=
    -0.4072 * Math.sin(Mp) +
    0.17241 * E * Math.sin(M) +
    0.01608 * Math.sin(2 * Mp) +
    0.01039 * Math.sin(2 * F) +
    0.00739 * E * Math.sin(Mp - M) -
    0.00514 * E * Math.sin(Mp + M) +
    0.00208 * E * E * Math.sin(2 * M) -
    0.00111 * Math.sin(Mp - 2 * F) -
    0.00057 * Math.sin(Mp + 2 * F) +
    0.00056 * E * Math.sin(2 * Mp + M) -
    0.00042 * Math.sin(3 * Mp) +
    0.00042 * E * Math.sin(M + 2 * F) +
    0.00038 * E * Math.sin(M - 2 * F) -
    0.00024 * E * Math.sin(2 * Mp - M) -
    0.00017 * Math.sin(Om)
  return jde
}

/** 指定時刻以前で最も近い新月の時刻 */
export function previousNewMoon(at: Date): Date {
  const jd = toJd(at)
  let k = Math.floor((jd - 2451550.09766) / SYNODIC)
  while (newMoonJd(k) > jd) k--
  while (newMoonJd(k + 1) <= jd) k++
  return fromJd(newMoonJd(k))
}

/** 正午（日本時間）の月齢 */
export function moonAge(date: string): number {
  const noon = fromJst(date, 12)
  const nm = previousNewMoon(noon)
  return (noon.getTime() - nm.getTime()) / 86400000
}

/** 旧暦の日（新月を含む日を 1 日とする） */
export function lunarDay(date: string): number {
  const endOfDay = fromJst(date, 23, 59)
  const nm = previousNewMoon(endOfDay)
  return diffDays(jstDate(nm), date) + 1
}

export type TideName = '大潮' | '中潮' | '小潮' | '長潮' | '若潮'

/** 旧暦の日から潮名を決める（一般的な釣り用の潮見表と同じ区分） */
export function tideName(date: string): TideName {
  const d = lunarDay(date)
  if (d <= 3 || d >= 30) return '大潮'
  if (d <= 6) return '中潮'
  if (d <= 9) return '小潮'
  if (d === 10) return '長潮'
  if (d === 11) return '若潮'
  if (d <= 13) return '中潮'
  if (d <= 18) return '大潮'
  if (d <= 21) return '中潮'
  if (d <= 24) return '小潮'
  if (d === 25) return '長潮'
  if (d === 26) return '若潮'
  return '中潮'
}

/** 日の出・日の入り（日本時間 'HH:MM'）。NOAA の簡易式、誤差 1〜2 分 */
export function sunTimes(date: string, lat: number, lon: number): { sunrise: string; sunset: string } {
  const noon = fromJst(date, 12)
  const start = Date.UTC(noon.getUTCFullYear(), 0, 1)
  const dayOfYear = Math.floor((noon.getTime() - start) / 86400000) + 1
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1)
  const eqTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g)
  const latR = lat * RAD
  const cosH = (Math.cos(90.833 * RAD) - Math.sin(latR) * Math.sin(decl)) / (Math.cos(latR) * Math.cos(decl))
  const ha = Math.acos(Math.min(1, Math.max(-1, cosH))) / RAD
  // UTC の分 → 日本時間の分
  const toJstHm = (utcMin: number) => {
    const m = (((Math.round(utcMin) + 9 * 60) % 1440) + 1440) % 1440
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  }
  return {
    sunrise: toJstHm(720 - 4 * (lon + ha) - eqTime),
    sunset: toJstHm(720 - 4 * (lon - ha) - eqTime),
  }
}
