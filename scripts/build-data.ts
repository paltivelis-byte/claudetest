// データ取得バッチ。1 日 4 回 CI で動かし、public/data/ に JSON を書き出す（docs/SPEC.md §11）
//   npm run data          … 気象庁・Open-Meteo から取得
//   npm run data:sample   … ネットに出ずにサンプルデータを作る（開発・表示確認用）

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { AMEDAS_STATIONS, FORECAST_AREAS, SPOTS, TIDE_STATIONS, type Spot } from '../src/config/spots'
import { aoshioForDay, climatologyHypoxia, type HypoxiaInput } from '../src/lib/aoshio'
import { addDays, diffDays, jstDate } from '../src/lib/dates'
import { parseAmedasPoint, parseJmaForecast } from '../src/lib/jma'
import { parseJmaTideText } from '../src/lib/jmaTide'
import { openMeteoUrl, parseOpenMeteo } from '../src/lib/openMeteo'
import type { AmedasObs, AoshioDay, AreaForecast, ForecastFile, HourlyWind, TideFile } from '../src/lib/types'
import { sampleAmedas, sampleTideFile, sampleWeather, sampleWinds } from './sample'

const OUT = 'public/data'
const FORECAST_DAYS = 8 // 当日 + 7 日
const USER_AGENT = 'aoshio-calendar (+https://github.com/paltivelis-byte/claudetest)'

const sample = process.argv.includes('--sample')
const errors: string[] = []

async function get(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res
}

async function tryStep<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn()
  } catch (e) {
    const msg = `${label}: ${e instanceof Error ? e.message : String(e)}`
    errors.push(msg)
    console.error(msg)
    return undefined
  }
}

async function buildTides(year: number): Promise<void> {
  for (const [code, name] of Object.entries(TIDE_STATIONS)) {
    const path = `${OUT}/tide-${code}-${year}.json`
    let file: TideFile | undefined
    if (sample) {
      file = sampleTideFile(code, name, year)
    } else {
      file = await tryStep(`潮位表 ${name} ${year}`, async () => {
        const text = await (await get(`https://www.data.jma.go.jp/kaiyou/data/db/tide/suisan/txt/${year}/${code}.txt`)).text()
        const { days } = parseJmaTideText(text)
        if (Object.keys(days).length === 0) throw new Error('潮位表を読み取れなかった')
        return { station: code, stationName: name, year, days }
      })
    }
    if (file) await writeFile(path, JSON.stringify(file))
  }
}

async function buildWeather(): Promise<Record<string, AreaForecast>> {
  const out: Record<string, AreaForecast> = {}
  for (const [areaCode, { name, prefCode }] of Object.entries(FORECAST_AREAS)) {
    const f = sample
      ? sampleWeather(areaCode, name, jstDate(new Date()))
      : await tryStep(`天気予報 ${name}`, async () =>
          parseJmaForecast(await (await get(`https://www.jma.go.jp/bosai/forecast/data/forecast/${prefCode}.json`)).json(), areaCode, name),
        )
    if (f) out[areaCode] = f
  }
  return out
}

async function buildAmedas(): Promise<Record<string, AmedasObs[]>> {
  const out: Record<string, AmedasObs[]> = {}
  if (sample) {
    for (const code of Object.keys(AMEDAS_STATIONS)) out[code] = sampleAmedas(new Date())
    return out
  }
  const latest = await tryStep('アメダス最新時刻', async () => new Date((await (await get('https://www.jma.go.jp/bosai/amedas/data/latest_time.txt')).text()).trim()))
  if (!latest) return out
  // 直近 48 時間 = 3 時間ごとのファイル 16 個
  const blocks: string[] = []
  for (let i = 0; i < 16; i++) {
    const t = new Date(latest.getTime() - i * 3 * 3600_000 + 9 * 3600_000)
    const hh = String(Math.floor(t.getUTCHours() / 3) * 3).padStart(2, '0')
    blocks.push(`${t.toISOString().slice(0, 10).replace(/-/g, '')}_${hh}`)
  }
  for (const [code, name] of Object.entries(AMEDAS_STATIONS)) {
    const obs: AmedasObs[] = []
    for (const b of blocks) {
      const part = await tryStep(`アメダス ${name} ${b}`, async () =>
        parseAmedasPoint(await (await get(`https://www.jma.go.jp/bosai/amedas/data/point/${code}/${b}.json`)).json()),
      )
      if (part) obs.push(...part)
    }
    out[code] = obs.sort((a, b) => a.time.localeCompare(b.time))
  }
  return out
}

type ManualHypoxia = { postId: string; observedAt: string; bottomDoMgL: number }

/** 底層DO。モニタリングポストの取り込みができるまでは data/hypoxia-manual.json（手入力）か平年値を使う */
async function loadHypoxia(): Promise<ManualHypoxia[]> {
  const path = 'data/hypoxia-manual.json'
  if (!existsSync(path)) return []
  return JSON.parse(await readFile(path, 'utf8')) as ManualHypoxia[]
}

function hypoxiaFor(spot: Spot, date: string, today: string, manual: ManualHypoxia[]): HypoxiaInput {
  // 7 日以内の観測があれば、ポイントに紐づくポストの最新値の平均を使う
  const values = spot.monitoringPosts
    .map((p) =>
      manual
        .filter((m) => m.postId === p && Math.abs(diffDays(jstDate(new Date(m.observedAt)), today)) <= 7)
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0],
    )
    .filter((m): m is ManualHypoxia => !!m)
  if (values.length === 0) return climatologyHypoxia(date)
  return { bottomDoMgL: values.reduce((s, m) => s + m.bottomDoMgL, 0) / values.length, source: 'observed' }
}

async function buildAoshio(today: string): Promise<Record<string, AoshioDay[]>> {
  const manual = await loadHypoxia()
  const out: Record<string, AoshioDay[]> = {}
  for (const spot of SPOTS) {
    const winds: HourlyWind[] | undefined = sample
      ? sampleWinds(today, spot.offshoreBearingDeg)
      : await tryStep(`風の予報 ${spot.name}`, async () => parseOpenMeteo(await (await get(openMeteoUrl(spot.lat, spot.lon))).json()))
    if (!winds) continue
    out[spot.id] = Array.from({ length: FORECAST_DAYS }, (_, i) => {
      const date = addDays(today, i)
      return aoshioForDay({ date, today, winds, offshoreBearingDeg: spot.offshoreBearingDeg, hypoxia: hypoxiaFor(spot, date, today, manual) })
    })
  }
  return out
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const now = new Date()
  const today = jstDate(now)
  const year = Number(today.slice(0, 4))
  // カレンダーで年をまたいで見られるよう、今年と来年の潮位表を置く
  await buildTides(year)
  await buildTides(year + 1)

  const forecast: ForecastFile = {
    generatedAt: now.toISOString(),
    sample,
    aoshio: await buildAoshio(today),
    weather: await buildWeather(),
    amedas: await buildAmedas(),
    errors,
  }
  await writeFile(`${OUT}/forecast.json`, JSON.stringify(forecast))
  console.log(`wrote ${OUT}/forecast.json (${sample ? 'sample' : 'live'}, errors: ${errors.length})`)
  // 全部失敗したときは CI を落として、古いデータのまま配信し続ける
  if (!sample && Object.keys(forecast.aoshio).length === 0 && Object.keys(forecast.weather).length === 0) process.exit(1)
}

main()
