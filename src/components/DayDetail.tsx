import type { Spot } from '../config/spots'
import { AMEDAS_STATIONS, TIDE_STATIONS } from '../config/spots'
import { lunarDay, moonAge, sunTimes, tideName } from '../lib/astro'
import { weekdayJa } from '../lib/dates'
import { dirName, weatherCategory } from '../lib/jma'
import type { AmedasObs, AoshioDay, AreaForecast, TideDay } from '../lib/types'
import { AoshioCard } from './AoshioCard'
import { TideChart } from './TideChart'

type Props = {
  date: string
  today: string
  spot: Spot
  tide?: TideDay
  tidesLoading: boolean
  aoshio?: AoshioDay
  weather?: AreaForecast
  amedas?: AmedasObs[]
}

export function DayDetail({ date, today, spot, tide, tidesLoading, aoshio, weather, amedas }: Props) {
  const sun = sunTimes(date, spot.lat, spot.lon)
  const now = new Date()
  const nowHour = date === today ? ((now.getUTCHours() + 9) % 24) + now.getUTCMinutes() / 60 : undefined
  const w = weather?.days.find((d) => d.date === date)

  return (
    <section className="detail" aria-label="日の詳細">
      <h2>
        {Number(date.slice(5, 7))}月{Number(date.slice(8))}日（{weekdayJa(date)}）
        <span className={`tide tide-${tideName(date)}`}>{tideName(date)}</span>
      </h2>
      <p className="muted small">
        {spot.name}・月齢 {moonAge(date).toFixed(1)}（旧暦{lunarDay(date)}日）・日の出 {sun.sunrise}・日の入り {sun.sunset}
      </p>

      <section className="card">
        <h3>潮汐 <span className="muted small">{TIDE_STATIONS[spot.tideStation]}</span></h3>
        {tide ? (
          <>
            <TideChart tide={tide} nowHour={nowHour} />
            <div className="extremes">
              <div><span className="dot high" />満潮 {tide.highs.map((e) => `${e.time}（${e.cm}cm）`).join('・') || 'なし'}</div>
              <div><span className="dot low" />干潮 {tide.lows.map((e) => `${e.time}（${e.cm}cm）`).join('・') || 'なし'}</div>
            </div>
          </>
        ) : (
          <p className="muted">{tidesLoading ? '読み込み中…' : 'この日の潮位表はまだありません'}</p>
        )}
      </section>

      <AoshioCard day={aoshio} offshoreBearingDeg={spot.offshoreBearingDeg} />

      <section className="card">
        <h3>天気 <span className="muted small">気象庁 {weather?.areaName}</span></h3>
        {w ? (
          <dl className="weather">
            <dt>天気</dt>
            <dd>{weatherCategory(w.weatherCode).icon} {w.weatherText ?? weatherCategory(w.weatherCode).label}</dd>
            {w.windText && (<><dt>風</dt><dd>{w.windText}</dd></>)}
            {w.pops.some((p) => p != null) && (<><dt>降水確率</dt><dd>{w.pops.map((p) => (p == null ? '－' : `${p}%`)).join(' / ')}</dd></>)}
            {(w.tempMin != null || w.tempMax != null) && (<><dt>気温</dt><dd>{w.tempMin ?? '－'}℃ / {w.tempMax ?? '－'}℃</dd></>)}
          </dl>
        ) : (
          <p className="muted">この日の天気予報はありません（予報は7日先まで）</p>
        )}
      </section>

      {date === today && amedas && amedas.length > 0 && <WindObs obs={amedas} station={AMEDAS_STATIONS[spot.amedas]} />}
    </section>
  )
}

/** 直近 12 時間の風の観測値（3 時間おき） */
function WindObs({ obs, station }: { obs: AmedasObs[]; station: string }) {
  const hourly = obs.filter((o) => new Date(o.time).getUTCMinutes() === 0)
  const recent = hourly.slice(-13).filter((_, i, a) => (a.length - 1 - i) % 3 === 0)
  return (
    <section className="card">
      <h3>風の観測 <span className="muted small">アメダス {station}</span></h3>
      {recent.length === 0 ? <p className="muted">観測値を取得できませんでした</p> : (
      <table className="wind-table">
        <tbody>
          <tr>{recent.map((o) => <th key={o.time}>{(new Date(o.time).getUTCHours() + 9) % 24}時</th>)}</tr>
          <tr>
            {recent.map((o) => (
              <td key={o.time}>
                {o.windDirDeg == null ? '静穏' : (
                  <>
                    <span className="arrow" style={{ transform: `rotate(${o.windDirDeg + 180}deg)` }} aria-hidden>↑</span>
                    <div className="small">{dirName(o.windDirDeg)}</div>
                  </>
                )}
                <div>{o.windMs ?? '－'}<span className="small">m/s</span></div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      )}
    </section>
  )
}
