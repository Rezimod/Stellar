'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, ChevronDown, Navigation, Check, Search } from 'lucide-react'
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
    label: 'Caucasus & Middle East',
    cities: [
      { region: 'caucasus', country: 'GE', city: 'Tbilisi',  lat: 41.7151, lon: 44.8271, source: 'manual', flag: '🇬🇪', nameEn: 'Tbilisi' },
      { region: 'caucasus', country: 'GE', city: 'Batumi',   lat: 41.6168, lon: 41.6367, source: 'manual', flag: '🇬🇪', nameEn: 'Batumi' },
      { region: 'caucasus', country: 'AM', city: 'Yerevan',  lat: 40.1872, lon: 44.5152, source: 'manual', flag: '🇦🇲', nameEn: 'Yerevan' },
      { region: 'caucasus', country: 'AZ', city: 'Baku',     lat: 40.4093, lon: 49.8671, source: 'manual', flag: '🇦🇿', nameEn: 'Baku' },
      { region: 'caucasus', country: 'TR', city: 'Istanbul', lat: 41.0082, lon: 28.9784, source: 'manual', flag: '🇹🇷', nameEn: 'Istanbul' },
      { region: 'caucasus', country: 'TR', city: 'Ankara',   lat: 39.9334, lon: 32.8597, source: 'manual', flag: '🇹🇷', nameEn: 'Ankara' },
      { region: 'caucasus', country: 'IL', city: 'Tel Aviv', lat: 32.0853, lon: 34.7818, source: 'manual', flag: '🇮🇱', nameEn: 'Tel Aviv' },
      { region: 'caucasus', country: 'JO', city: 'Amman',    lat: 31.9454, lon: 35.9284, source: 'manual', flag: '🇯🇴', nameEn: 'Amman' },
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
      { region: 'north_america', country: 'US', city: 'San Francisco',lat: 37.7749,  lon: -122.4194, source: 'manual', flag: '🇺🇸', nameEn: 'San Francisco' },
      { region: 'north_america', country: 'US', city: 'Seattle',      lat: 47.6062,  lon: -122.3321, source: 'manual', flag: '🇺🇸', nameEn: 'Seattle' },
      { region: 'north_america', country: 'US', city: 'Miami',        lat: 25.7617,  lon: -80.1918,  source: 'manual', flag: '🇺🇸', nameEn: 'Miami' },
      { region: 'north_america', country: 'US', city: 'Denver',       lat: 39.7392,  lon: -104.9903, source: 'manual', flag: '🇺🇸', nameEn: 'Denver' },
      { region: 'north_america', country: 'US', city: 'Phoenix',      lat: 33.4484,  lon: -112.074,  source: 'manual', flag: '🇺🇸', nameEn: 'Phoenix' },
      { region: 'north_america', country: 'CA', city: 'Toronto',      lat: 43.6532,  lon: -79.3832,  source: 'manual', flag: '🇨🇦', nameEn: 'Toronto' },
      { region: 'north_america', country: 'CA', city: 'Vancouver',    lat: 49.2827,  lon: -123.1207, source: 'manual', flag: '🇨🇦', nameEn: 'Vancouver' },
      { region: 'north_america', country: 'CA', city: 'Montréal',     lat: 45.5019,  lon: -73.5674,  source: 'manual', flag: '🇨🇦', nameEn: 'Montréal' },
      { region: 'north_america', country: 'MX', city: 'Mexico City',  lat: 19.4326,  lon: -99.1332,  source: 'manual', flag: '🇲🇽', nameEn: 'Mexico City' },
      { region: 'south_america', country: 'BR', city: 'São Paulo',    lat: -23.5505, lon: -46.6333,  source: 'manual', flag: '🇧🇷', nameEn: 'São Paulo' },
      { region: 'south_america', country: 'BR', city: 'Rio de Janeiro',lat: -22.9068,lon: -43.1729,  source: 'manual', flag: '🇧🇷', nameEn: 'Rio de Janeiro' },
      { region: 'south_america', country: 'AR', city: 'Buenos Aires', lat: -34.6037, lon: -58.3816,  source: 'manual', flag: '🇦🇷', nameEn: 'Buenos Aires' },
      { region: 'south_america', country: 'CL', city: 'Santiago',     lat: -33.4489, lon: -70.6693,  source: 'manual', flag: '🇨🇱', nameEn: 'Santiago' },
      { region: 'south_america', country: 'CO', city: 'Bogotá',       lat: 4.711,    lon: -74.0721,  source: 'manual', flag: '🇨🇴', nameEn: 'Bogotá' },
    ],
  },
  {
    region: 'europe',
    label: 'Europe',
    cities: [
      { region: 'europe', country: 'DE', city: 'Berlin',    lat: 52.52,   lon: 13.405,  source: 'manual', flag: '🇩🇪', nameEn: 'Berlin' },
      { region: 'europe', country: 'DE', city: 'Munich',    lat: 48.1351, lon: 11.582,  source: 'manual', flag: '🇩🇪', nameEn: 'Munich' },
      { region: 'europe', country: 'FR', city: 'Paris',     lat: 48.8566, lon: 2.3522,  source: 'manual', flag: '🇫🇷', nameEn: 'Paris' },
      { region: 'europe', country: 'GB', city: 'London',    lat: 51.5074, lon: -0.1278, source: 'manual', flag: '🇬🇧', nameEn: 'London' },
      { region: 'europe', country: 'GB', city: 'Manchester',lat: 53.4808, lon: -2.2426, source: 'manual', flag: '🇬🇧', nameEn: 'Manchester' },
      { region: 'europe', country: 'IE', city: 'Dublin',    lat: 53.3498, lon: -6.2603, source: 'manual', flag: '🇮🇪', nameEn: 'Dublin' },
      { region: 'europe', country: 'IT', city: 'Rome',      lat: 41.9028, lon: 12.4964, source: 'manual', flag: '🇮🇹', nameEn: 'Rome' },
      { region: 'europe', country: 'IT', city: 'Milan',     lat: 45.4642, lon: 9.19,    source: 'manual', flag: '🇮🇹', nameEn: 'Milan' },
      { region: 'europe', country: 'ES', city: 'Madrid',    lat: 40.4168, lon: -3.7038, source: 'manual', flag: '🇪🇸', nameEn: 'Madrid' },
      { region: 'europe', country: 'ES', city: 'Barcelona', lat: 41.3851, lon: 2.1734,  source: 'manual', flag: '🇪🇸', nameEn: 'Barcelona' },
      { region: 'europe', country: 'PT', city: 'Lisbon',    lat: 38.7223, lon: -9.1393, source: 'manual', flag: '🇵🇹', nameEn: 'Lisbon' },
      { region: 'europe', country: 'NL', city: 'Amsterdam', lat: 52.3676, lon: 4.9041,  source: 'manual', flag: '🇳🇱', nameEn: 'Amsterdam' },
      { region: 'europe', country: 'BE', city: 'Brussels',  lat: 50.8503, lon: 4.3517,  source: 'manual', flag: '🇧🇪', nameEn: 'Brussels' },
      { region: 'europe', country: 'CH', city: 'Zürich',    lat: 47.3769, lon: 8.5417,  source: 'manual', flag: '🇨🇭', nameEn: 'Zürich' },
      { region: 'europe', country: 'AT', city: 'Vienna',    lat: 48.2082, lon: 16.3738, source: 'manual', flag: '🇦🇹', nameEn: 'Vienna' },
      { region: 'europe', country: 'PL', city: 'Warsaw',    lat: 52.2297, lon: 21.0122, source: 'manual', flag: '🇵🇱', nameEn: 'Warsaw' },
      { region: 'europe', country: 'CZ', city: 'Prague',    lat: 50.0755, lon: 14.4378, source: 'manual', flag: '🇨🇿', nameEn: 'Prague' },
      { region: 'europe', country: 'HU', city: 'Budapest',  lat: 47.4979, lon: 19.0402, source: 'manual', flag: '🇭🇺', nameEn: 'Budapest' },
      { region: 'europe', country: 'GR', city: 'Athens',    lat: 37.9838, lon: 23.7275, source: 'manual', flag: '🇬🇷', nameEn: 'Athens' },
      { region: 'europe', country: 'SE', city: 'Stockholm', lat: 59.3293, lon: 18.0686, source: 'manual', flag: '🇸🇪', nameEn: 'Stockholm' },
      { region: 'europe', country: 'NO', city: 'Oslo',      lat: 59.9139, lon: 10.7522, source: 'manual', flag: '🇳🇴', nameEn: 'Oslo' },
      { region: 'europe', country: 'DK', city: 'Copenhagen',lat: 55.6761, lon: 12.5683, source: 'manual', flag: '🇩🇰', nameEn: 'Copenhagen' },
      { region: 'europe', country: 'FI', city: 'Helsinki',  lat: 60.1699, lon: 24.9384, source: 'manual', flag: '🇫🇮', nameEn: 'Helsinki' },
      { region: 'europe', country: 'UA', city: 'Kyiv',      lat: 50.4501, lon: 30.5234, source: 'manual', flag: '🇺🇦', nameEn: 'Kyiv' },
    ],
  },
  {
    region: 'asia',
    label: 'Asia & Pacific',
    cities: [
      { region: 'asia', country: 'JP', city: 'Tokyo',     lat: 35.6762, lon: 139.6503, source: 'manual', flag: '🇯🇵', nameEn: 'Tokyo' },
      { region: 'asia', country: 'JP', city: 'Osaka',     lat: 34.6937, lon: 135.5023, source: 'manual', flag: '🇯🇵', nameEn: 'Osaka' },
      { region: 'asia', country: 'KR', city: 'Seoul',     lat: 37.5665, lon: 126.978,  source: 'manual', flag: '🇰🇷', nameEn: 'Seoul' },
      { region: 'asia', country: 'CN', city: 'Beijing',   lat: 39.9042, lon: 116.4074, source: 'manual', flag: '🇨🇳', nameEn: 'Beijing' },
      { region: 'asia', country: 'CN', city: 'Shanghai',  lat: 31.2304, lon: 121.4737, source: 'manual', flag: '🇨🇳', nameEn: 'Shanghai' },
      { region: 'asia', country: 'HK', city: 'Hong Kong', lat: 22.3193, lon: 114.1694, source: 'manual', flag: '🇭🇰', nameEn: 'Hong Kong' },
      { region: 'asia', country: 'TW', city: 'Taipei',    lat: 25.033,  lon: 121.5654, source: 'manual', flag: '🇹🇼', nameEn: 'Taipei' },
      { region: 'asia', country: 'IN', city: 'Mumbai',    lat: 19.076,  lon: 72.8777,  source: 'manual', flag: '🇮🇳', nameEn: 'Mumbai' },
      { region: 'asia', country: 'IN', city: 'Delhi',     lat: 28.6139, lon: 77.209,   source: 'manual', flag: '🇮🇳', nameEn: 'Delhi' },
      { region: 'asia', country: 'IN', city: 'Bangalore', lat: 12.9716, lon: 77.5946,  source: 'manual', flag: '🇮🇳', nameEn: 'Bangalore' },
      { region: 'asia', country: 'PK', city: 'Karachi',   lat: 24.8607, lon: 67.0011,  source: 'manual', flag: '🇵🇰', nameEn: 'Karachi' },
      { region: 'asia', country: 'BD', city: 'Dhaka',     lat: 23.8103, lon: 90.4125,  source: 'manual', flag: '🇧🇩', nameEn: 'Dhaka' },
      { region: 'asia', country: 'SG', city: 'Singapore', lat: 1.3521,  lon: 103.8198, source: 'manual', flag: '🇸🇬', nameEn: 'Singapore' },
      { region: 'asia', country: 'MY', city: 'Kuala Lumpur', lat: 3.139,lon: 101.6869, source: 'manual', flag: '🇲🇾', nameEn: 'Kuala Lumpur' },
      { region: 'asia', country: 'TH', city: 'Bangkok',   lat: 13.7563, lon: 100.5018, source: 'manual', flag: '🇹🇭', nameEn: 'Bangkok' },
      { region: 'asia', country: 'VN', city: 'Hanoi',     lat: 21.0285, lon: 105.8542, source: 'manual', flag: '🇻🇳', nameEn: 'Hanoi' },
      { region: 'asia', country: 'ID', city: 'Jakarta',   lat: -6.2088, lon: 106.8456, source: 'manual', flag: '🇮🇩', nameEn: 'Jakarta' },
      { region: 'asia', country: 'PH', city: 'Manila',    lat: 14.5995, lon: 120.9842, source: 'manual', flag: '🇵🇭', nameEn: 'Manila' },
      { region: 'global', country: 'AU', city: 'Sydney',    lat: -33.8688, lon: 151.2093, source: 'manual', flag: '🇦🇺', nameEn: 'Sydney' },
      { region: 'global', country: 'AU', city: 'Melbourne', lat: -37.8136, lon: 144.9631, source: 'manual', flag: '🇦🇺', nameEn: 'Melbourne' },
      { region: 'global', country: 'NZ', city: 'Auckland',  lat: -36.8485, lon: 174.7633, source: 'manual', flag: '🇳🇿', nameEn: 'Auckland' },
    ],
  },
]

const REGION_TABS: { key: Region; label: string; emoji: string }[] = [
  { key: 'caucasus',      label: 'Caucasus', emoji: '🛰' },
  { key: 'north_america', label: 'Americas', emoji: '🌎' },
  { key: 'europe',        label: 'Europe',   emoji: '🌍' },
  { key: 'asia',          label: 'Asia',     emoji: '🌏' },
]

const PANEL_WIDTH = 340

export default function LocationPicker({ compact = false }: { compact?: boolean }) {
  const { location, setLocation } = useLocation()
  const [open, setOpen] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Region | 'all'>('all')
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const updateAnchor = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const panelWidth = Math.min(PANEL_WIDTH, window.innerWidth - 32)
    const pad = 16
    let left = r.left
    if (left + panelWidth > window.innerWidth - pad) left = window.innerWidth - pad - panelWidth
    if (left < pad) left = pad
    setAnchor({ top: r.bottom + 6, left })
  }, [])

  useEffect(() => {
    if (!open) { setSearch(''); setActiveTab('all'); return }
    updateAnchor()
    setTimeout(() => searchRef.current?.focus(), 60)
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('scroll', updateAnchor, true)
    window.addEventListener('resize', updateAnchor)
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', updateAnchor, true)
      window.removeEventListener('resize', updateAnchor)
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, updateAnchor])

  const handleGPS = useCallback(() => {
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
  }, [gpsLoading, setLocation])

  function handlePreset(p: UserLocation) {
    setLocation(p)
    setOpen(false)
  }

  const q = search.trim().toLowerCase()
  const filtered = CITY_PRESETS
    .filter(g => activeTab === 'all' || g.region === activeTab)
    .map(group => ({
      ...group,
      cities: q
        ? group.cities.filter(c =>
            c.nameEn.toLowerCase().includes(q) || c.country.toLowerCase().includes(q),
          )
        : group.cities,
    }))
    .filter(g => g.cities.length > 0)

  const totalShown = filtered.reduce((sum, g) => sum + g.cities.length, 0)
  const label = location.city || REGION_LABELS[location.region]
  const isActive = (p: UserLocation) => p.city === location.city && p.country === location.country

  return (
    <div style={{ display: 'inline-block' }}>
      <style>{`
        @keyframes loc-dropdown-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .loc-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 8px;
          height: 30px;
          padding: 0 ${compact ? '11px' : '14px'};
          background: rgba(15, 18, 28, 0.55);
          border: 1px solid rgba(255, 209, 102, 0.32);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .loc-pill:hover {
          background: rgba(15, 18, 28, 0.75);
          border-color: rgba(255, 209, 102, 0.55);
        }
        .loc-city-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: background 0.12s, border-color 0.12s;
        }
        .loc-city-btn:hover { background: rgba(255,255,255,0.05); }
        .loc-city-btn.active {
          background: rgba(255, 209, 102, 0.14);
          border-color: rgba(255, 209, 102, 0.32);
        }
        .loc-gps-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 9px 12px;
          background: rgba(255, 209, 102, 0.10);
          border: 1px solid rgba(255, 209, 102, 0.32);
          border-radius: 10px;
          color: var(--terracotta);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .loc-gps-btn:hover:not(:disabled) {
          background: rgba(255, 209, 102, 0.20);
          border-color: rgba(255, 209, 102, 0.55);
        }
        .loc-gps-btn:disabled { opacity: 0.5; cursor: default; }
        .loc-search-input {
          width: 100%;
          padding: 8px 12px 8px 32px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(232,230,221,0.14);
          border-radius: 10px;
          color: #F8F4EC;
          font-size: 13px;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .loc-search-input:focus {
          border-color: rgba(255, 209, 102, 0.55);
          background: rgba(255,255,255,0.07);
        }
        .loc-search-input::placeholder { color: rgba(232,230,221,0.45); }
        .loc-city-list::-webkit-scrollbar { width: 4px; }
        .loc-city-list::-webkit-scrollbar-track { background: transparent; }
        .loc-city-list::-webkit-scrollbar-thumb { background: rgba(255, 209, 102,0.30); border-radius: 2px; }
        @keyframes loc-spin { to { transform: rotate(360deg); } }
        .loc-spinning { animation: loc-spin 0.8s linear infinite; }
      `}</style>

      <button ref={btnRef} className="loc-pill" onClick={() => setOpen(v => !v)}>
        <MapPin size={13} color={location.source === 'gps' ? 'var(--terracotta)' : 'rgba(255, 209, 102,0.85)'} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.92)', fontWeight: 500, letterSpacing: '0.01em' }}>
          {label}
        </span>
        <ChevronDown size={11} color="rgba(255, 209, 102,0.7)"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && anchor && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: anchor.top,
            left: anchor.left,
            zIndex: 9999,
            width: PANEL_WIDTH,
            maxWidth: 'calc(100vw - 32px)',
            background: 'linear-gradient(160deg, rgba(18,22,38,0.98) 0%, rgba(12,16,28,0.99) 100%)',
            border: '1px solid rgba(255, 209, 102,0.32)',
            borderRadius: 14,
            boxShadow: '0 18px 44px rgba(0,0,0,0.65)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'loc-dropdown-in 0.15s ease-out',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <MapPin size={13} color="var(--terracotta)" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{
                  color: 'rgba(232,230,221,0.55)', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.16em', textTransform: 'uppercase', margin: 0,
                }}>
                  Current
                </p>
                <p style={{
                  color: '#F8F4EC', fontSize: 13, fontWeight: 600, margin: 0,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {label}
                </p>
              </div>
            </div>
            {location.source === 'gps' && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
                color: 'var(--seafoam)',
                padding: '3px 7px', borderRadius: 999,
                background: 'rgba(94,234,212,0.10)', border: '1px solid rgba(94,234,212,0.32)',
              }}>
                GPS
              </span>
            )}
          </div>

          <div style={{ padding: '10px 10px 4px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} color="rgba(232,230,221,0.55)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                ref={searchRef}
                className="loc-search-input"
                type="text"
                placeholder="Search city or country…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{
            display: 'flex', gap: 4, padding: '8px 10px',
            overflowX: 'auto', flexShrink: 0,
          }}>
            {[{ key: 'all' as const, label: 'All', emoji: '✦' }, ...REGION_TABS].map(tab => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '5px 10px', borderRadius: 999,
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: active ? 'rgba(255, 209, 102,0.14)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(255, 209, 102,0.45)' : 'rgba(232,230,221,0.12)'}`,
                    color: active ? 'var(--terracotta)' : 'rgba(232,230,221,0.7)',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  }}
                >
                  <span style={{ fontSize: 11 }}>{tab.emoji}</span>
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="loc-city-list" style={{ maxHeight: 300, overflowY: 'auto', padding: '0 10px', minHeight: 120 }}>
            {totalShown === 0 ? (
              <p style={{ color: 'rgba(232,230,221,0.5)', fontSize: 12, textAlign: 'center', padding: '24px 0', margin: 0 }}>
                No cities found
              </p>
            ) : (
              filtered.map(group => (
                <div key={group.label} style={{ marginBottom: 8 }}>
                  <p style={{
                    color: 'var(--terracotta)', fontSize: 9, fontWeight: 700,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    margin: '10px 4px 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span>{group.label}</span>
                    <span style={{ color: 'rgba(232,230,221,0.45)', fontWeight: 500 }}>
                      {group.cities.length}
                    </span>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {group.cities.map(p => {
                      const active = isActive(p)
                      return (
                        <button
                          key={`${p.city}-${p.country}`}
                          className={`loc-city-btn${active ? ' active' : ''}`}
                          onClick={() => handlePreset(p)}
                        >
                          <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{p.flag}</span>
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ color: active ? 'var(--terracotta)' : '#F8F4EC', fontSize: 13, fontWeight: 500 }}>
                              {p.city}
                            </span>
                            <span style={{
                              color: 'rgba(232,230,221,0.55)', fontSize: 10, fontWeight: 600,
                              letterSpacing: '0.08em', textTransform: 'uppercase',
                            }}>
                              {p.country}
                            </span>
                          </div>
                          {active && <Check size={13} color="var(--terracotta)" style={{ flexShrink: 0 }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
            <div style={{ height: 6 }} />
          </div>

          <div style={{ padding: '8px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <button className="loc-gps-btn" onClick={handleGPS} disabled={gpsLoading}>
              <Navigation size={13} className={gpsLoading ? 'loc-spinning' : ''} />
              {gpsLoading ? 'Detecting…' : 'Use my GPS location'}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
