import { useEffect, useState } from 'react'
import type { ForecastFile, TideFile } from './lib/types'

const base = import.meta.env.BASE_URL

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}data/${path}`)
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json() as Promise<T>
}

export function useForecast(): { data?: ForecastFile; error?: string } {
  const [state, setState] = useState<{ data?: ForecastFile; error?: string }>({})
  useEffect(() => {
    getJson<ForecastFile>('forecast.json')
      .then((data) => setState({ data }))
      .catch((e: Error) => setState({ error: e.message }))
  }, [])
  return state
}

const tideCache = new Map<string, Promise<TideFile | null>>()

/** 潮位表は年ごとのファイル。ない年（潮位表の公開前など）は null */
export function useTides(station: string, year: number): TideFile | null | undefined {
  const key = `${station}-${year}`
  const [file, setFile] = useState<{ key: string; value: TideFile | null }>()
  useEffect(() => {
    let p = tideCache.get(key)
    if (!p) {
      p = getJson<TideFile>(`tide-${key}.json`).catch(() => null)
      tideCache.set(key, p)
    }
    let alive = true
    p.then((value) => alive && setFile({ key, value }))
    return () => {
      alive = false
    }
  }, [key])
  return file?.key === key ? file.value : undefined
}
