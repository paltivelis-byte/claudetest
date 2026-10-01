import { useMemo, useState } from 'react'
import { SPOTS, spotById } from './config/spots'
import { addDays, jstDate } from './lib/dates'
import { LEVEL_LABELS } from './lib/aoshio'
import { MonthCalendar } from './components/MonthCalendar'
import { DayDetail } from './components/DayDetail'
import { Footer, formatJst } from './components/Footer'
import { useForecast, useTides } from './useData'

const SPOT_KEY = 'aoshio.spot'

function loadSpot(): string {
  try {
    const id = localStorage.getItem(SPOT_KEY)
    if (id && spotById(id)) return id
  } catch {
    // 保存できない環境では既定値を使う
  }
  return SPOTS.find((s) => s.favorite)!.id
}

export default function App() {
  const today = jstDate(new Date())
  const [spotId, setSpotId] = useState(loadSpot)
  const [selected, setSelected] = useState(today)
  const [view, setView] = useState({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) })
  const spot = spotById(spotId)!
  const { data, error } = useForecast()
  const tides = useTides(spot.tideStation, view.year)
  const selectedTides = useTides(spot.tideStation, Number(selected.slice(0, 4)))

  const changeSpot = (id: string) => {
    setSpotId(id)
    try {
      localStorage.setItem(SPOT_KEY, id)
    } catch {
      // 無視
    }
  }

  // お気に入りのポイントで 7 日以内に「警戒」以上の日（docs/SPEC.md §4）
  const alerts = useMemo(() => {
    if (!data) return []
    const until = addDays(today, 7)
    return SPOTS.filter((s) => s.favorite).flatMap((s) =>
      (data.aoshio[s.id] ?? [])
        .filter((d) => d.level >= 2 && d.date >= today && d.date <= until)
        .map((d) => ({ spot: s, day: d })),
    )
  }, [data, today])

  const stale = data && Date.now() - new Date(data.generatedAt).getTime() > 12 * 3600_000

  return (
    <div className="app">
      <header className="top">
        <h1>青潮カレンダー</h1>
        <select aria-label="釣りポイント" value={spotId} onChange={(e) => changeSpot(e.target.value)}>
          <optgroup label="お気に入り">
            {SPOTS.filter((s) => s.favorite).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </optgroup>
          <optgroup label="その他">
            {SPOTS.filter((s) => !s.favorite).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </optgroup>
        </select>
      </header>

      <main>
        {data?.sample && <p className="notice notice-sample">サンプルデータを表示しています（本物の予報ではありません）</p>}
        {error && <p className="notice notice-error">予報データを読み込めませんでした（{error}）</p>}
        {stale && <p className="notice">{formatJst(data!.generatedAt)} 時点のデータです</p>}
        {alerts.length > 0 && (
          <div className="notice notice-alert" role="status">
            <strong>青潮に注意</strong>
            <ul>
              {alerts.map(({ spot: s, day }) => (
                <li key={s.id + day.date}>
                  <button className="link" onClick={() => { changeSpot(s.id); setSelected(day.date) }}>
                    {Number(day.date.slice(5, 7))}/{Number(day.date.slice(8))} {s.name}：{LEVEL_LABELS[day.level].name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <MonthCalendar
          year={view.year}
          month={view.month}
          today={today}
          selected={selected}
          tides={tides}
          aoshio={data?.aoshio[spot.id] ?? []}
          onSelect={setSelected}
          onMonthChange={(year, month) => setView({ year, month })}
        />

        <DayDetail
          date={selected}
          today={today}
          spot={spot}
          tide={selectedTides?.days[selected]}
          tidesLoading={selectedTides === undefined}
          aoshio={data?.aoshio[spot.id]?.find((d) => d.date === selected)}
          weather={data?.weather[spot.forecastArea]}
          amedas={data?.amedas[spot.amedas]}
        />
      </main>

      <Footer generatedAt={data?.generatedAt} />
    </div>
  )
}
