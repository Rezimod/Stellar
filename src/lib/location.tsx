'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Region = 'caucasus' | 'north_america' | 'europe' | 'asia' | 'south_america' | 'global'

export interface UserLocation {
  region: Region
  country: string
  city: string
  lat: number
  lon: number
  source: 'gps' | 'manual' | 'default'
}

const COUNTRY_TO_REGION: Record<string, Region> = {
  // Caucasus + Middle East
  GE: 'caucasus', AM: 'caucasus', AZ: 'caucasus', TR: 'caucasus',
  IL: 'caucasus', JO: 'caucasus', LB: 'caucasus', IQ: 'caucasus',
  // North America
  US: 'north_america', CA: 'north_america', MX: 'north_america',
  // South America
  BR: 'south_america', AR: 'south_america', CL: 'south_america',
  CO: 'south_america', PE: 'south_america', VE: 'south_america',
  // Europe
  DE: 'europe', AT: 'europe', CH: 'europe', FR: 'europe',
  IT: 'europe', NL: 'europe', BE: 'europe', PL: 'europe',
  ES: 'europe', PT: 'europe', SE: 'europe', NO: 'europe',
  DK: 'europe', FI: 'europe', CZ: 'europe', HU: 'europe',
  RO: 'europe', GR: 'europe', BG: 'europe', HR: 'europe',
  SK: 'europe', SI: 'europe', IE: 'europe', GB: 'europe',
  UK: 'europe', UA: 'europe', RS: 'europe', LT: 'europe',
  LV: 'europe', EE: 'europe',
  // Asia
  JP: 'asia', KR: 'asia', CN: 'asia', IN: 'asia',
  TH: 'asia', SG: 'asia', MY: 'asia', ID: 'asia',
  PH: 'asia', VN: 'asia', PK: 'asia', BD: 'asia',
  LK: 'asia', MM: 'asia', KZ: 'asia', UZ: 'asia',
  TW: 'asia', HK: 'asia', MN: 'asia',
  // Australia/Oceania
  AU: 'global', NZ: 'global',
}

export function getRegionForCountry(countryCode: string): Region {
  return COUNTRY_TO_REGION[countryCode.toUpperCase()] ?? 'global'
}

const DEFAULT_LOCATION: UserLocation = {
  region: 'caucasus',
  country: 'GE',
  city: 'Tbilisi',
  lat: 41.6941,
  lon: 44.8337,
  source: 'default',
}

interface LocationContextValue {
  location: UserLocation
  setLocation: (loc: UserLocation) => void
  loading: boolean
}

const LocationContext = createContext<LocationContextValue | null>(null)

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<UserLocation>(DEFAULT_LOCATION)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load stored preference immediately — default (Tbilisi) is valid, no need to block
    const stored = localStorage.getItem('stellar_location')
    if (stored) {
      try { setLocationState(JSON.parse(stored)) } catch {}
      return  // User has a preference; skip GPS
    }

    // No stored preference — silently improve to GPS, Tbilisi stays visible meanwhile
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
            data.address?.city ||
            data.address?.town ||
            data.address?.state ||
            ''
          const loc: UserLocation = {
            region: getRegionForCountry(countryCode),
            country: countryCode,
            city,
            lat,
            lon,
            source: 'gps',
          }
          localStorage.setItem('stellar_location', JSON.stringify(loc))
          setLocationState(loc)
        } catch {
          // GPS resolved but reverse geocode failed — keep Tbilisi default
        }
      },
      () => {
        // GPS denied — Tbilisi default is already showing, nothing to do
      },
      { timeout: 3000, maximumAge: 600000 }
    )
  }, [])

  const setLocation = useCallback((loc: UserLocation) => {
    localStorage.setItem('stellar_location', JSON.stringify(loc))
    setLocationState(loc)
  }, [])

  const value = useMemo(
    () => ({ location, setLocation, loading }),
    [location, setLocation, loading],
  )

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used inside LocationProvider')
  return ctx
}
