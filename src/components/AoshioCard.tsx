import { CONFIDENCE_LABELS, LEVEL_LABELS } from '../lib/aoshio'
import { dirName } from '../lib/jma'
import type { AoshioDay } from '../lib/types'

export function AoshioCard({ day, offshoreBearingDeg }: { day?: AoshioDay; offshoreBearingDeg: number }) {
  if (!day) {
    return (
      <section className="card">
        <h3>青潮リスク</h3>
        <p className="muted">この日の予測はありません（予測は当日から7日先まで）</p>
      </section>
    )
  }
  const lv = LEVEL_LABELS[day.level]
  // 沖へ吹く風 = 沖と反対側から吹いてくる風
  const fromDir = dirName((offshoreBearingDeg + 180) % 360)
  return (
    <section className="card">
      <h3>青潮リスク <span className="muted small">試験運用</span></h3>
      <div className="aoshio-head">
        <span className={`badge big lv${day.level}`}>{lv.name}</span>
        <div>
          <div className="score">{day.score}<span className="small"> / 100</span></div>
          <div className="muted small">{lv.text}・信頼度 {CONFIDENCE_LABELS[day.confidence]}</div>
        </div>
      </div>
      <ul className="factors">
        <Factor label="季節" value={day.factors.season} note="夏ほど海が上下に分かれやすい" />
        <Factor
          label="海底の酸素不足"
          value={day.factors.hypoxia}
          note={`底層DO ${day.bottomDoMgL.toFixed(1)} mg/L（${day.hypoxiaSource === 'observed' ? '観測値' : '月の平年値で代用'}）`}
        />
        <Factor label="沖へ吹く風" value={day.factors.wind} note={`${fromDir}寄りの風の積算 ${day.offshoreWindSum} m/s・h（直近36時間）`} />
      </ul>
      <p className="disclaimer">青潮リスクは独自の推定で、公的な予報・警報ではありません。現地の状況を必ず確認してください。</p>
    </section>
  )
}

function Factor({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <li>
      <div className="factor-row">
        <span>{label}</span>
        <span className="meter" aria-hidden><span style={{ width: `${value * 100}%` }} /></span>
        <span className="num">{value.toFixed(2)}</span>
      </div>
      <div className="muted small">{note}</div>
    </li>
  )
}
