import { NextRequest, NextResponse } from 'next/server'
import { Body, Illumination } from 'astronomy-engine'
import { calculateSkyScore } from '@/lib/sky-score'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const latParam = searchParams.get('lat')
  const lonParam = searchParams.get('lon') ?? searchParams.get('lng')

  const lat = Number(latParam)
  const lon = Number(lonParam)

  if (!latParam || !lonParam || !isFinite(lat) || !isFinite(lon)) {
    return NextResponse.json({ error: 'lat and lon are required finite numbers' }, { status: 400 })
  }

  const fallback = NextResponse.json(
    {
      score: 50,
      grade: 'Fair',
      emoji: '🌤️',
      color: 'var(--warning)',
      factors: [],
      location: { lat, lon },
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  )

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloud_cover,visibility,relative_humidity_2m,wind_speed_10m&timezone=auto`
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return fallback

    const data = await res.json()
    const c = data.current

    const cloudCover: number = c.cloud_cover ?? 15
    const visibility: number = c.visibility ?? 20000
    const humidity: number = c.relative_humidity_2m ?? 50
    const windSpeed: number = c.wind_speed_10m ?? 5

    // Moon illumination via astronomy-engine
    let moonIllumination: number | undefined
    try {
      const ill = Illumination(Body.Moon, new Date())
      moonIllumination = Math.round(ill.phase_fraction * 100)
    } catch {
      // astronomy-engine unavailable — omit moon factor
    }

    const result = calculateSkyScore({ cloudCover, visibility, humidity, windSpeed, moonIllumination })

    return NextResponse.json(
      { ...result, location: { lat, lon }, timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, max-age=180, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch {
    return fallback
  }
}
