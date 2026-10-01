import { monthGrid } from '../lib/dates'
import { tideName } from '../lib/astro'
import { LEVEL_LABELS } from '../lib/aoshio'
import type { AoshioDay, TideFile } from '../lib/types'

type Props = {
  year: number
  month: number
  today: string
  selected: string
  tides: TideFile | null | undefined
  aoshio: AoshioDay[]
  onSelect: (date: string) => void
  onMonthChange: (year: number, month: number) => void
}

export function MonthCalendar({ year, month, today, selected, aoshio, onSelect, onMonthChange }: Props) {
  const days = monthGrid(year, month)
  const byDate = new Map(aoshio.map((d) => [d.date, d]))
  const shift = (n: number) => {
    const m = month - 1 + n
    onMonthChange(year + Math.floor(m / 12), ((m % 12) + 12) % 12 + 1)
  }
  const ym = `${year}-${String(month).padStart(2, '0')}`

  return (
    <section className="calendar" aria-label={`${year}年${month}月`}>
      <div className="cal-head">
        <button onClick={() => shift(-1)} aria-label="前の月">‹</button>
        <h2>{year}年{month}月</h2>
        <button onClick={() => shift(1)} aria-label="次の月">›</button>
      </div>
      <div className="cal-grid" role="grid">
        {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => (
          <div key={w} className={`cal-wd wd-${i}`} role="columnheader">{w}</div>
        ))}
        {days.map((d, i) => {
          const a = byDate.get(d)
          const name = tideName(d)
          const cls = [
            'cal-day',
            `wd-${i % 7}`,
            d.slice(0, 7) !== ym && 'other',
            d === today && 'today',
            d === selected && 'selected',
            a && a.confidence === 'low' && 'low-conf',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={d}
              className={cls}
              onClick={() => onSelect(d)}
              aria-pressed={d === selected}
              aria-label={`${Number(d.slice(5, 7))}月${Number(d.slice(8))}日 ${name}${a ? ` 青潮リスク${LEVEL_LABELS[a.level].name}` : ''}`}
            >
              <span className="num">{Number(d.slice(8))}</span>
              <span className={`tide tide-${name}`}>{name}</span>
              {a && <span className={`badge lv${a.level}`}>{LEVEL_LABELS[a.level].name}</span>}
            </button>
          )
        })}
      </div>
      <Legend />
    </section>
  )
}

function Legend() {
  return (
    <div className="legend" aria-label="凡例">
      <span>青潮リスク：</span>
      {([0, 1, 2, 3] as const).map((lv) => (
        <span key={lv} className={`badge lv${lv}`}>{LEVEL_LABELS[lv].name}</span>
      ))}
      <span className="muted">薄い色＝4日先以降の参考値</span>
    </div>
  )
}
