import { NextRequest, NextResponse } from 'next/server'
import { Body, Illumination, Observer, Equator, Horizon, SearchRiseSet } from 'astronomy-engine'
import { calculateSkyScore } from '@/lib/sky-score'
import { fetchOpenMeteo } from '@/lib/open-meteo'
import { activeMeteorShower } from '@/lib/meteor-showers'
import { DEFAULT_LAT, DEFAULT_LON } from '@/lib/observer-location'

interface PlanetHighlight {
  type: 'planet' | 'moon'
  title: string
  subtitle: string
  icon: string
  name: string
  altitude: number
}

const PLANET_ICONS: Record<string, string> = {
  moon: '🌙',
  mercury: '☿',
  venus: '⭐',
  mars: '🔴',
  jupiter: '🪐',
  saturn: '🪐',
}

const PLANET_NAMES: Record<string, string> = {
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
}

const BODIES = [
  { body: Body.Moon, key: 'moon' },
  { body: Body.Mercury, key: 'mercury' },
  { body: Body.Venus, key: 'venus' },
  { body: Body.Mars, key: 'mars' },
  { body: Body.Jupiter, key: 'jupiter' },
  { body: Body.Saturn, key: 'saturn' },
]

function fmt12h(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = Number(searchParams.get('lat') ?? DEFAULT_LAT)
  const lon = Number(searchParams.get('lon') ?? searchParams.get('lng') ?? DEFAULT_LON)

  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)

  // ── Sky score ────────────────────────────────────────────────────────────────
  let skyScoreData = { score: 50, grade: 'Fair' as string, emoji: '🌤️', factors: [] as { label: string; value: number }[] }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloud_cover,visibility,relative_humidity_2m,wind_speed_10m&timezone=auto`
    const { data: d } = await fetchOpenMeteo<{ current: Record<string, number> }>(url, { revalidate: 300 })
    const c = d.current
    let moonIllumination: number | undefined
    try { moonIllumination = Math.round(Illumination(Body.Moon, now).phase_fraction * 100) } catch { /* ignore */ }
    const result = calculateSkyScore({
      cloudCover: c.cloud_cover ?? 15,
      visibility: c.visibility ?? 20000,
      humidity: c.relative_humidity_2m ?? 50,
      windSpeed: c.wind_speed_10m ?? 5,
      moonIllumination,
    })
    skyScoreData = result
  } catch { /* use fallback */ }

  // ── Sun times ────────────────────────────────────────────────────────────────
  let sunSet = '20:00'
  let sunRise = '06:00'
  try {
    const observer = new Observer(lat, lon, 0)
    const ss = SearchRiseSet(Body.Sun, observer, -1, midnight, 1)
    const sr = SearchRiseSet(Body.Sun, observer, +1, midnight, 1)
    if (ss?.date) sunSet = fmt12h(ss.date)
    if (sr?.date) sunRise = fmt12h(sr.date)
  } catch { /* ignore */ }

  // ── Planet highlights ────────────────────────────────────────────────────────
  const highlights: Array<{
    type: string; title: string; subtitle: string; icon: string; name?: string
  }> = []

  try {
    const observer = new Observer(lat, lon, 0)

    // Moon
    try {
      const moonEq = Equator(Body.Moon, now, observer, true, true)
      const moonHoriz = Horizon(now, observer, moonEq.ra, moonEq.dec, 'normal')
      const ill = Illumination(Body.Moon, now)
      const moonPct = Math.round(ill.phase_fraction * 100)
      const moonPhase = moonPct < 5 ? 'New Moon' : moonPct < 25 ? 'Crescent' : moonPct < 55 ? 'Quarter' : moonPct < 85 ? 'Gibbous' : 'Full Moon'
      const moonSet = SearchRiseSet(Body.Moon, observer, -1, midnight, 1)
      const moonIcon = moonPct < 10 ? '🌑' : moonPct < 40 ? '🌒' : moonPct < 60 ? '🌓' : moonPct < 85 ? '🌔' : '🌕'
      highlights.push({
        type: 'moon',
        title: `${moonPhase} (${moonPct}% illuminated)`,
        subtitle: moonSet?.date ? `Sets at ${fmt12h(moonSet.date)} · Alt ${Math.round(moonHoriz.altitude)}°` : `Alt ${Math.round(moonHoriz.altitude)}°`,
        icon: moonIcon,
        name: 'Moon',
      })
    } catch { /* ignore */ }

    // Planets
    const planetHighlights: PlanetHighlight[] = []
    for (const { body, key } of BODIES.filter(b => b.key !== 'moon')) {
      try {
        const eq = Equator(body, now, observer, true, true)
        const horiz = Horizon(now, observer, eq.ra, eq.dec, 'normal')
        const rise = SearchRiseSet(body, observer, +1, midnight, 1)
        if (horiz.altitude > -5) { // visible or nearly visible tonight
          planetHighlights.push({
            type: 'planet',
            title: `${PLANET_NAMES[key]} ${horiz.altitude > 10 ? 'Visible' : 'Rising'}`,
            subtitle: rise?.date
              ? `Rises at ${fmt12h(rise.date)} · Alt ${Math.round(horiz.altitude)}°`
              : `Alt ${Math.round(horiz.altitude)}°`,
            icon: PLANET_ICONS[key],
            name: PLANET_NAMES[key],
            altitude: horiz.altitude,
          })
        }
      } catch { /* ignore */ }
    }
    // Sort by altitude descending, take top 3
    planetHighlights.sort((a, b) => b.altitude - a.altitude)
    for (const p of planetHighlights.slice(0, 3)) {
      highlights.push(p)
    }
  } catch { /* ignore */ }

  // ── Meteor shower ────────────────────────────────────────────────────────────
  const shower = activeMeteorShower(now)
  if (shower) {
    const isPeak = Math.abs(shower.daysFromPeak) <= 1
    highlights.push({
      type: 'meteor',
      title: `${shower.name} Meteor Shower`,
      subtitle: isPeak
        ? `Peaking now · ZHR ~${shower.zhr} · best after midnight`
        : `Active · peak ${shower.peakLabel} · ZHR ~${shower.zhr}`,
      icon: '☄️',
    })
  }

  // ── Best window ──────────────────────────────────────────────────────────────
  const bestWindow = {
    start: '22:00',
    end: '02:00',
    reason: 'Moon low, minimal light interference',
  }

  return NextResponse.json(
    {
      skyScore: { score: skyScoreData.score, grade: skyScoreData.grade, emoji: skyScoreData.emoji },
      highlights: highlights.slice(0, 5),
      sunTimes: { rise: sunRise, set: sunSet },
      bestWindow,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  )
}
