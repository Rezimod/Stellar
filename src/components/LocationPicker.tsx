'use client'

import { useState, useEffect, useRef } from 'react'
import { useLocation, type UserLocation } from '@/lib/location'

const REGION_LABELS = {
  caucasus: 'Caucasus & Turkey',
  north_america: 'North America',
  global: 'Global',
}

const PRESETS: UserLocation[] = [
  { region: 'caucasus', country: 'GE', city: 'Tbilisi', lat: 41.7151, lon: 44.8271, source: 'manual' },
  { region: 'north_america', country: 'US', city: 'New York', lat: 40.7128, lon: -74.006, source: 'manual' },
  { region: 'north_america', country: 'US', city: 'Los Angeles', lat: 34.0522, lon: -118.2437, source: 'manual' },
  { region: 'global', country: 'DE', city: 'Berlin', lat: 52.52, lon: 13.405, source: 'manual' },
]

export default function LocationPicker({ compact = false }: { compact?: boolean }) {
  const { location, setLocation } = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleGPS() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`
          )
          const data = await res.json()
          const countryCode = (data.address?.country_code ?? '').toUpperCase()
          const city =
            data.address?.city || data.address?.town || data.address?.state || ''
          const regionMap: Record<string, 'caucasus' | 'north_america' | 'global'> = {
            GE: 'caucasus', AM: 'caucasus', AZ: 'caucasus', TR: 'caucasus',
            US: 'north_america', CA: 'north_america', MX: 'north_america',
          }
          setLocation({
            region: regionMap[countryCode] ?? 'global',
            country: countryCode,
            city,
            lat,
            lon,
            source: 'gps',
          })
        } catch { /* ignore */ }
        setOpen(false)
      },
      () => setOpen(false),
      { timeout: 8000 }
    )
  }

  const label = location.city || REGION_LABELS[location.region]

  const dropdown = (
    <div
      style={{
        background: '#0F1729',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '1rem',
        padding: '1rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        minWidth: '260px',
        zIndex: 50,
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: '8px',
      }}
    >
      <p style={{ color: 'white', fontSize: '0.875rem', fontWeight: 600, marginBottom: '2px' }}>
        Your Location
      </p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: '12px' }}>
        This determines your marketplace and sky data
      </p>

      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '12px' }}>
        📍 {location.city}{location.city && location.country ? ', ' : ''}{location.country}
        {(location.city || location.country) ? ' — ' : ''}{REGION_LABELS[location.region]}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        {PRESETS.map((p) => (
          <button
            key={`${p.city}-${p.country}`}
            onClick={() => { setLocation(p); setOpen(false) }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.75rem',
              padding: '8px 12px',
              fontSize: '0.75rem',
              color: 'white',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            📍 {p.city}, {p.country}
          </button>
        ))}
      </div>

      <button
        onClick={handleGPS}
        style={{
          background: 'rgba(52,211,153,0.1)',
          border: '1px solid rgba(52,211,153,0.2)',
          color: '#34d399',
          fontSize: '0.75rem',
          borderRadius: '0.75rem',
          padding: '8px',
          width: '100%',
          cursor: 'pointer',
        }}
      >
        Use GPS
      </button>
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.4)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: compact ? '2px 6px' : '4px 8px',
        }}
        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}
        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.4)')}
      >
        📍 {label} ▾
      </button>
      {open && dropdown}
    </div>
  )
}
