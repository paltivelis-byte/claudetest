import type { TideDay } from '../lib/types'

const W = 340
const H = 150
const PAD = { l: 34, r: 8, t: 12, b: 22 }

/** 24 時間の潮位グラフ（nowHour があれば現在時刻の線を引く） */
export function TideChart({ tide, nowHour }: { tide: TideDay; nowHour?: number }) {
  const values = tide.hourly
  const min = Math.floor(Math.min(...values) / 20) * 20
  const max = Math.ceil(Math.max(...values) / 20) * 20
  const x = (h: number) => PAD.l + (h / 23) * (W - PAD.l - PAD.r)
  const y = (cm: number) => PAD.t + (1 - (cm - min) / (max - min || 1)) * (H - PAD.t - PAD.b)
  const line = values.map((v, h) => `${h ? 'L' : 'M'}${x(h).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(23)},${H - PAD.b} L${x(0)},${H - PAD.b} Z`
  const toH = (t: string) => Number(t.slice(0, 2)) + Number(t.slice(3)) / 60
  const ticks = [min, (min + max) / 2, max]

  return (
    <svg className="tide-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="潮位グラフ">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="grid" />
          <text x={PAD.l - 4} y={y(t) + 4} textAnchor="end" className="axis">{t}</text>
        </g>
      ))}
      {[0, 6, 12, 18].map((h) => (
        <text key={h} x={x(h)} y={H - 6} textAnchor="middle" className="axis">{h}時</text>
      ))}
      <path d={area} className="tide-area" />
      <path d={line} className="tide-line" />
      {tide.highs.map((e) => (
        <circle key={'h' + e.time} cx={x(Math.min(23, toH(e.time)))} cy={y(e.cm)} r={3.5} className="pt-high" />
      ))}
      {tide.lows.map((e) => (
        <circle key={'l' + e.time} cx={x(Math.min(23, toH(e.time)))} cy={y(e.cm)} r={3.5} className="pt-low" />
      ))}
      {nowHour !== undefined && <line x1={x(nowHour)} x2={x(nowHour)} y1={PAD.t} y2={H - PAD.b} className="now" />}
    </svg>
  )
}
