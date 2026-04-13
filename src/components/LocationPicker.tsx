'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, ChevronDown, Navigation, Check } from 'lucide-react'
import { useLocation, getRegionForCountry, type UserLocation, type Region } from '@/lib/location'

const REGION_LABELS: Record<Region, string> = {
  caucasus: 'Caucasus',
  north_america: 'Americas',
  south_america: 'Americas',
  europe: 'Europe',
  asia: 'Asia',
  global: 'Global',
}

type PresetCity = UserLocation & { flag: string; nameEn: string }

const CITY_PRESETS: { region: Region; label: string; cities: PresetCity[] }[] = [
  {
    region: 'caucasus',
    label: 'Caucasus',
    cities: [
      { region: 'caucasus', country: 'GE', city: 'Tbilisi',  lat: 41.7151, lon: 44.8271,  source: 'manual', flag: '🇬🇪', nameEn: 'Tbilisi' },
      { region: 'caucasus', country: 'AM', city: 'Yerevan',  lat: 40.1872, lon: 44.5152,  source: 'manual', flag: '🇦🇲', nameEn: 'Yerevan' },
      { region: 'caucasus', country: 'AZ', city: 'Baku',     lat: 40.4093, lon: 49.8671,  source: 'manual', flag: '🇦🇿', nameEn: 'Baku' },
      { region: 'caucasus', country: 'TR', city: 'Istanbul', lat: 41.0082, lon: 28.9784,  source: 'manual', flag: '🇹🇷', nameEn: 'Istanbul' },
    ],
  },
  {
    region: 'north_america',
    label: 'Americas',
    cities: [
      { region: 'north_america', country: 'US', city: 'New York',     lat: 40.7128,  lon: -74.006,   source: 'manual', flag: '🇺🇸', nameEn: 'New York' },
      { region: 'north_america', country: 'US', city: 'Los Angeles',  lat: 34.0522,  lon: -118.2437, source: 'manual', flag: '🇺🇸', nameEn: 'Los Angeles' },
      { region: 'north_america', country: 'US', city: 'Chicago',      lat: 41.8781,  lon: -87.6298,  source: 'manual', flag: '🇺🇸', nameEn: 'Chicago' },
      { region: 'north_america', country: 'US', city: 'Houston',      lat: 29.7604,  lon: -95.3698,  source: 'manual', flag: '🇺🇸', nameEn: 'Houston' },
      { region: 'north_america', country: 'CA', city: 'Toronto',      lat: 43.6532,  lon: -79.3832,  source: 'manual', flag: '🇨🇦', nameEn: 'Toronto' },
      { region: 'north_america', country: 'CA', city: 'Vancouver',    lat: 49.2827,  lon: -123.1207, source: 'manual', flag: '🇨🇦', nameEn: 'Vancouver' },
      { region: 'south_america', country: 'BR', city: 'São Paulo',    lat: -23.5505, lon: -46.6333,  source: 'manual', flag: '🇧🇷', nameEn: 'São Paulo' },
      { region: 'south_america', country: 'AR', city: 'Buenos Aires', lat: -34.6037, lon: -58.3816,  source: 'manual', flag: '🇦🇷', nameEn: 'Buenos Aires' },
    ],
  },
  {
    region: 'europe',
    label: 'Europe',
    cities: [
      { region: 'europe', country: 'DE', city: 'Berlin',    lat: 52.52,   lon: 13.405,  source: 'manual', flag: '🇩🇪', nameEn: 'Berlin' },
      { region: 'europe', country: 'FR', city: 'Paris',     lat: 48.8566, lon: 2.3522,  source: 'manual', flag: '🇫🇷', nameEn: 'Paris' },
      { region: 'europe', country: 'GB', city: 'London',    lat: 51.5074, lon: -0.1278, source: 'manual', flag: '🇬🇧', nameEn: 'London' },
      { region: 'europe', country: 'IT', city: 'Rome',      lat: 41.9028, lon: 12.4964, source: 'manual', flag: '🇮🇹', nameEn: 'Rome' },
      { region: 'europe', country: 'ES', city: 'Madrid',    lat: 40.4168, lon: -3.7038, source: 'manual', flag: '🇪🇸', nameEn: 'Madrid' },
      { region: 'europe', country: 'NL', city: 'Amsterdam', lat: 52.3676, lon: 4.9041,  source: 'manual', flag: '🇳🇱', nameEn: 'Amsterdam' },
      { region: 'europe', country: 'PL', city: 'Warsaw',    lat: 52.2297, lon: 21.0122, source: 'manual', flag: '🇵🇱', nameEn: 'Warsaw' },
      { region: 'europe', country: 'SE', city: 'Stockholm', lat: 59.3293, lon: 18.0686, source: 'manual', flag: '🇸🇪', nameEn: 'Stockholm' },
      { region: 'europe', country: 'UA', city: 'Kyiv',      lat: 50.4501, lon: 30.5234, source: 'manual', flag: '🇺🇦', nameEn: 'Kyiv' },
    ],
  },
  {
    region: 'asia',
    label: 'Asia',
    cities: [
      { region: 'asia', country: 'JP', city: 'Tokyo',     lat: 35.6762, lon: 139.6503, source: 'manual', flag: '🇯🇵', nameEn: 'Tokyo' },
      { region: 'asia', country: 'KR', city: 'Seoul',     lat: 37.5665, lon: 126.9780, source: 'manual', flag: '🇰🇷', nameEn: 'Seoul' },
      { region: 'asia', country: 'CN', city: 'Beijing',   lat: 39.9042, lon: 116.4074, source: 'manual', flag: '🇨🇳', nameEn: 'Beijing' },
      { region: 'asia', country: 'IN', city: 'Mumbai',    lat: 19.0760, lon: 72.8777,  source: 'manual', flag: '🇮🇳', nameEn: 'Mumbai' },
      { region: 'asia', country: 'IN', city: 'Delhi',     lat: 28.6139, lon: 77.2090,  source: 'manual', flag: '🇮🇳', nameEn: 'Delhi' },
      { region: 'asia', country: 'SG', city: 'Singapore', lat: 1.3521,  lon: 103.8198, source: 'manual', flag: '🇸🇬', nameEn: 'Singapore' },
      { region: 'asia', country: 'TH', city: 'Bangkok',   lat: 13.7563, lon: 100.5018, source: 'manual', flag: '🇹🇭', nameEn: 'Bangkok' },
      { region: 'asia', country: 'ID', city: 'Jakarta',   lat: -6.2088, lon: 106.8456, source: 'manual', flag: '🇮🇩', nameEn: 'Jakarta' },
      { region: 'asia', country: 'PH', city: 'Manila',    lat: 14.5995, lon: 120.9842, source: 'manual', flag: '🇵🇭', nameEn: 'Manila' },
    ],
  },
]

export default function LocationPicker({ compact = false }: { compact?: boolean }) {
  const { location, setLocation } = useLocation()
  const [open, setOpen]           = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [search, setSearch]         = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (!open) setSearch('')
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
          setLocation({ region: getRegionForCountry(countryCode), country: countryCode, city, lat, lon, source: 'gps' })
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

  const filtered = search.trim()
    ? CITY_PRESETS.map(group => ({
        ...group,
        cities: group.cities.filter(c =>
          c.nameEn.toLowerCase().includes(search.toLowerCase()) ||
          c.country.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(g => g.cities.length > 0)
    : CITY_PRESETS

  const label = location.city || REGION_LABELS[location.region]
  const isActive = (p: UserLocation) => p.city === location.city && p.country === location.country

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <style>{`
        @keyframes locationGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
          50% { box-shadow: 0 0 10px 2px rgba(52,211,153,0.12), 0 0 0 1px rgba(52,211,153,0.2); }
        }
        @keyframes pingRing {
          0% { transform: scale(0.6); opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes dropdownEnter {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        .location-pill {
          animation: locationGlow 3s ease-in-out infinite;
        }
        .location-pill:hover {
          background: rgba(52,211,153,0.1) !important;
          border-color: rgba(52,211,153,0.4) !important;
          transform: translateY(-1px);
        }
        .location-search:focus {
          outline: none;
          border-color: rgba(20,184,166,0.5) !important;
        }
        .city-list::-webkit-scrollbar { width: 4px; }
        .city-list::-webkit-scrollbar-track { background: transparent; }
        .city-list::-webkit-scrollbar-thumb { background: rgba(52,211,153,0.2); border-radius: 2px; }
      `}</style>

      {/* Trigger pill */}
      <button
        onClick={() => setOpen(v => !v)}
        className="location-pill"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          borderRadius: 9999,
          padding: compact ? '6px 12px' : '7px 14px',
          background: open ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(52,211,153,0.4)' : 'rgba(52,211,153,0.18)'}`,
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          animation: open ? 'none' : undefined,
        }}
      >
        {/* MapPin with ping ring */}
        <div style={{ position: 'relative', width: 14, height: 14, flexShrink: 0 }}>
          {!open && (
            <div style={{
              position: 'absolute', inset: -3, borderRadius: '50%',
              background: 'rgba(52,211,153,0.3)',
              animation: 'pingRing 2.5s ease-out infinite',
              pointerEvents: 'none',
            }} />
          )}
          <MapPin size={14} color={location.source === 'gps' ? '#34d399' : 'rgba(52,211,153,0.7)'} style={{ position: 'relative', zIndex: 1 }} />
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600, letterSpacing: '0.02em' }}>{label}</span>
        <ChevronDown size={11} color="rgba(52,211,153,0.5)"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          left: '50%',
          zIndex: 100,
          minWidth: 280,
          background: 'rgba(8,12,24,0.98)',
          border: '1px solid rgba(52,211,153,0.2)',
          borderRadius: 18,
          padding: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(52,211,153,0.06), inset 0 1px 0 rgba(52,211,153,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          animation: 'dropdownEnter 0.2s ease-out forwards',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={13} color="#34d399" />
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600, margin: 0 }}>Sky location</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: 0 }}>Affects sky data and marketplace</p>
            </div>
          </div>

          {/* Search input */}
          <input
            className="location-search"
            type="text"
            placeholder="Search city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              marginBottom: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(52,211,153,0.18)',
              borderRadius: 9,
              color: 'rgba(255,255,255,0.85)',
              fontSize: 12,
              boxSizing: 'border-box',
            }}
          />

          {/* City list — scrollable */}
          <div
            className="city-list"
            style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 10 }}
          >
            {filtered.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: '12px 0', margin: 0 }}>No cities found</p>
            )}
            {filtered.map(group => (
              <div key={group.label}>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '8px 2px 4px' }}>
                  {group.label}
                </p>
                {group.cities.map(p => {
                  const active = isActive(p)
                  return (
                    <button
                      key={`${p.city}-${p.country}`}
                      onClick={() => handlePreset(p)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 10px',
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
                      <span style={{ fontSize: 15, lineHeight: 1 }}>{p.flag}</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ color: active ? '#34d399' : 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>
                          {p.city}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginLeft: 6 }}>
                          {p.country}
                        </span>
                      </div>
                      {active && <Check size={13} color="#34d399" />}
                    </button>
                  )
                })}
              </div>
            ))}
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
