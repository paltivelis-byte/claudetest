// アプリ内の日付はすべて日本時間（JST, UTC+9）の 'YYYY-MM-DD' 文字列で扱う

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** 日本時間での日付 'YYYY-MM-DD' */
export function jstDate(d: Date): string {
  return new Date(d.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10)
}

/** 日本時間の 'YYYY-MM-DD' と時刻（時）から Date を作る */
export function fromJst(date: string, hour = 0, minute = 0): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, hour, minute) - JST_OFFSET_MS)
}

export function addDays(date: string, n: number): string {
  return jstDate(new Date(fromJst(date).getTime() + n * DAY_MS))
}

/** b - a の日数 */
export function diffDays(a: string, b: string): number {
  return Math.round((fromJst(b).getTime() - fromJst(a).getTime()) / DAY_MS)
}

export function monthOf(date: string): number {
  return Number(date.slice(5, 7))
}

/** その月のカレンダー表示用の日付（日曜始まり、前後の月の日を含む 6 週 or 5 週） */
export function monthGrid(year: number, month: number): string[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const weekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const start = addDays(first, -weekday)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const weeks = Math.ceil((weekday + daysInMonth) / 7)
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i))
}

export function weekdayJa(date: string): string {
  return '日月火水木金土'[fromJst(date, 12).getUTCDay()]
}
