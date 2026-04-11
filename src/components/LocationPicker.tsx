'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, ChevronDown, Navigation, Check } from 'lucide-react'
import { useLocation, type UserLocation } from '@/lib/location'

const REGION_LABELS = {
  caucasus: 'Caucasus',
  north_america: 'Americas',
  global: 'Global',
}

const PRESETS: (UserLocation & { flag: string })[] = [
  { region: 'caucasus',      country: 'GE', city: 'Tbilisi',     lat: 41.7151,  lon: 44.8271,   source: 'manual', flag: '🇬🇪' },
  { region: 'north_america', country: 'US', city: 'New York',    lat: 40.7128,  lon: -74.006,   source: 'manual', flag: '🇺🇸' },
  { region: 'north_america', country: 'US', city: 'Los Angeles', lat: 34.0522,  lon: -118.2437, source: 'manual', flag: '🇺🇸' },
  { region: 'global',        country: 'DE', city: 'Berlin',      lat: 52.52,    lon: 13.405,    source: 'manual', flag: '🇩🇪' },
]

export default function LocationPicker({ compact = false }: { compact?: boolean }) {
  const { location, setLocation } = useLocation()
  const [open, setOpen]           = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleGPS() {
    if (!navigator.geolocation || gpsLoading) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`)
          const data = await res.json()
          const countryCode = (data.address?.country_code ?? '').toUpperCase()
          const city = data.address?.city || data.address?.town || data.address?.state || ''
          const regionMap: Record<string, 'caucasus' | 'north_america' | 'global'> = {
            GE: 'caucasus', AM: 'caucasus', AZ: 'caucasus', TR: 'caucasus',
            US: 'north_america', CA: 'north_america', MX: 'north_america',
          }
          setLocation({ region: regionMap[countryCode] ?? 'global', country: countryCode, city, lat, lon, source: 'gps' })
        } catch { /* ignore */ }
        setGpsLoading(false)
        setOpen(false)
      },
      () => { setGpsLoading(false); setOpen(false) },
      { timeout: 8000 }
    )
  }

  function handlePreset(p: UserLocation) {
    setLocation(p)
    setOpen(false)
  }

  const label = location.city || REGION_LABELS[location.region]
  const isActive = (p: UserLocation) => p.city === location.city && p.country === location.country

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger pill */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          borderRadius: 9999,
          padding: compact ? '5px 10px' : '5px 12px',
          background: open ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.1)'}`,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <MapPin size={13} color={location.source === 'gps' ? '#34d399' : 'rgba(255,255,255,0.45)'} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{label}</span>
        <ChevronDown size={11} color="rgba(255,255,255,0.3)"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          minWidth: 240,
          background: 'rgba(10,14,28,0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 14,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(52,211,153,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          {/* Header */}
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>
            Sky location
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '0 0 12px' }}>
            Affects sky data and marketplace
          </p>

          {/* Presets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {PRESETS.map(p => {
              const active = isActive(p)
              return (
                <button
                  key={`${p.city}-${p.country}`}
                  onClick={() => handlePreset(p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px',
                    background: active ? 'rgba(52,211,153,0.08)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(52,211,153,0.25)' : 'transparent'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{p.flag}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: active ? '#34d399' : 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>
                      {p.city}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginLeft: 6 }}>
                      {REGION_LABELS[p.region]}
                    </span>
                  </div>
                  {active && <Check size={13} color="#34d399" />}
                </button>
              )
            })}
          </div>

          {/* GPS button */}
          <button
            onClick={handleGPS}
            disabled={gpsLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              width: '100%', padding: '8px 12px',
              background: 'rgba(52,211,153,0.08)',
              border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: 10,
              color: gpsLoading ? 'rgba(52,211,153,0.5)' : '#34d399',
              fontSize: 12, fontWeight: 600,
              cursor: gpsLoading ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              if (!gpsLoading) (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.14)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.08)'
            }}
          >
            <Navigation size={13} style={{ animation: gpsLoading ? 'spin 1s linear infinite' : 'none' }} />
            {gpsLoading ? 'Detecting…' : 'Use my location'}
          </button>
        </div>
      )}
    </div>
  )
}
