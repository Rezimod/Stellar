'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Telescope, Clock } from 'lucide-react'
import { getTonightDarkWindow, type TonightDarkWindow } from '@/lib/dark-window'

const SSR_DARK: TonightDarkWindow = {
  duskStart: null,
  dawnEnd: null,
  midpoint: null,
  evalTime: new Date(0),
  isCurrentlyDark: false,
}

type Forecast = Array<{ date: string; hours: Array<{ cloudCover: number }> }>
type SunMoon = {
  sunSet: string | null
  sunRise: string | null
  illuminationPct: number
  astronomicalDuskStart: string | null
  astronomicalDawnEnd: string | null
}
type Planet = {
  key?: string
  name: string
  altitude: number
  azimuth?: number
  azimuthDir?: string
  rise?: string | null
  transit?: string | null
  set?: string | null
  magnitude?: number
  visible: boolean
}

interface Props { lat: number; lon: number; cityLabel: string }

const PLANET_IMG: Record<string, string> = {
  mercury: '/hero/planets/mercury.jpg',
  venus: '/hero/planets/venus.jpg',
  mars: '/hero/planets/mars.jpg',
  jupiter: '/hero/planets/jupiter.jpg',
  saturn: '/hero/planets/saturn.jpg',
}
const PLANET_GLYPH: Record<string, string> = {
  moon: '🌙',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
}

function fmtTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function avgCloud(hours: Array<{ cloudCover: number }>): number {
  if (!hours.length) return 100
  const sum = hours.reduce((s, h) => s + h.cloudCover, 0)
  return Math.round(sum / hours.length)
}

function badgeClass(cloud: number): 'go' | 'maybe' | 'skip' {
  if (cloud < 30) return 'go'
  if (cloud <= 60) return 'maybe'
  return 'skip'
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function SkyWidget({ lat, lon, cityLabel }: Props) {
  const [forecast, setForecast] = useState<Forecast>([])
  const [sunMoon, setSunMoon] = useState<SunMoon | null>(null)
  const [planets, setPlanets] = useState<Planet[]>([])
  const [dark, setDark] = useState<TonightDarkWindow>(SSR_DARK)

  // Recompute dark window every 5 min so the LIVE/tonight gate flips at the
  // actual dusk/dawn boundary instead of staying frozen on the value computed
  // when the page first loaded.
  useEffect(() => {
    const recompute = () => setDark(getTonightDarkWindow(lat, lon))
    recompute()
    const id = window.setInterval(recompute, 5 * 60_000)
    return () => window.clearInterval(id)
  }, [lat, lon])

  useEffect(() => {
    const q = `lat=${lat}&lng=${lon}`
    const planetQ = dark.isCurrentlyDark ? q : `${q}&tonight=1`
    const fetchAll = () => {
      Promise.allSettled([
        fetch(`/api/sky/forecast?${q}`).then(r => r.json()).then((d: Forecast) => setForecast(Array.isArray(d) ? d : [])),
        fetch(`/api/sky/sun-moon?${q}`).then(r => r.json()).then(setSunMoon).catch(() => {}),
        fetch(`/api/sky/planets?${planetQ}`).then(r => r.json()).then((d: Planet[]) => setPlanets(Array.isArray(d) ? d : [])),
      ])
    }
    fetchAll()
    const id = window.setInterval(fetchAll, 5 * 60_000)
    return () => window.clearInterval(id)
  }, [lat, lon, dark.isCurrentlyDark])

  const visible = planets
    .filter(p => p.altitude > 5)
    .sort((a, b) => b.altitude - a.altitude)

  const tonightHours = forecast[0]?.hours.slice(18, 24) ?? []
  const tonightCloud = avgCloud(tonightHours)
  const cloudBadge = badgeClass(tonightCloud)

  const darkWindow = dark.duskStart && dark.dawnEnd
    ? `${fmtTime(dark.duskStart)} → ${fmtTime(dark.dawnEnd)}`
    : sunMoon?.astronomicalDuskStart && sunMoon?.astronomicalDawnEnd
      ? `${sunMoon.astronomicalDuskStart} → ${sunMoon.astronomicalDawnEnd}`
      : sunMoon?.sunSet
        ? `${fmtTime(sunMoon.sunSet)} → ${fmtTime(sunMoon.sunRise)}`
        : null

  const visibleVerb = dark.isCurrentlyDark ? 'visible now' : 'visible tonight'
  const emptyMsg = dark.isCurrentlyDark
    ? 'No planets above the horizon'
    : 'No planets up after dark tonight'

  const next7 = forecast.slice(0, 7).map((day, i) => {
    const d = new Date(day.date)
    const eveningHours = day.hours.slice(18, 24)
    const cloud = avgCloud(eveningHours.length ? eveningHours : day.hours)
    return { name: DAY_LABELS[d.getDay()] ?? `D${i}`, badge: badgeClass(cloud) }
  })

  return (
    <div className="side-section">
      <div className="side-label">
        Visible tonight · {cityLabel}
        <Link href="/sky" className="side-label-link">Full sky →</Link>
      </div>
      <div className="sky-card">
        <div className="planet-summary">
          <Telescope size={13} className="planet-summary-icon" />
          <span className="planet-summary-text">
            {visible.length > 0
              ? <><strong>{visible.length}</strong> {visibleVerb}</>
              : emptyMsg}
          </span>
          <span className={`planet-cloud-pill ${cloudBadge}`}>
            {tonightCloud}% cloud
          </span>
        </div>

        {darkWindow && (
          <div className="planet-dark">
            <Clock size={11} />
            <span>Dark sky · {darkWindow}</span>
          </div>
        )}

        {visible.length > 0 ? (
          <ul className="planet-list">
            {visible.slice(0, 6).map(p => {
              const k = (p.key ?? p.name).toLowerCase()
              const img = PLANET_IMG[k]
              const glyph = PLANET_GLYPH[k] ?? '✦'
              const dir = p.azimuthDir ?? ''
              const transit = fmtTime(p.transit)
              const setT = fmtTime(p.set)
              return (
                <li key={k} className="planet-row">
                  <span className="planet-thumb" aria-hidden>
                    {img ? (
                      <Image
                        src={img}
                        alt=""
                        width={28}
                        height={28}
                        sizes="28px"
                        loading="lazy"
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    ) : (
                      <span className="planet-glyph">{glyph}</span>
                    )}
                  </span>
                  <span className="planet-name">{p.name}</span>
                  <span className="planet-alt">{Math.round(p.altitude)}°{dir ? ` ${dir}` : ''}</span>
                  <span className="planet-time">
                    {transit !== '—' ? `peak ${transit}` : setT !== '—' ? `set ${setT}` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="planet-empty">Check back after sunset, or open the full sky page for a 7-day outlook.</p>
        )}

        {next7.length > 0 && (
          <div className="sky-mini-forecast">
            {next7.map((d, i) => (
              <div className="forecast-day" key={`${d.name}-${i}`}>
                <div className="forecast-day-name">{d.name}</div>
                <div className={`forecast-day-badge ${d.badge}`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
