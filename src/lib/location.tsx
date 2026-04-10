'use client'

import { createContext, useContext, useState, useEffect } from 'react'

export type Region = 'caucasus' | 'north_america' | 'global'

export interface UserLocation {
  region: Region
  country: string
  city: string
  lat: number
  lon: number
  source: 'gps' | 'manual' | 'default'
}

const COUNTRY_TO_REGION: Record<string, Region> = {
  GE: 'caucasus', AM: 'caucasus', AZ: 'caucasus',
  TR: 'caucasus',
  US: 'north_america', CA: 'north_america', MX: 'north_america',
}

function getRegionForCountry(countryCode: string): Region {
  return COUNTRY_TO_REGION[countryCode.toUpperCase()] ?? 'global'
}

const DEFAULT_LOCATION: UserLocation = {
  region: 'global',
  country: '',
  city: '',
  lat: 0,
  lon: 0,
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('stellar_location')
    if (stored) {
      try {
        setLocationState(JSON.parse(stored))
        setLoading(false)
        return
      } catch {
        // fall through to GPS
      }
    }

    if (!navigator.geolocation) {
      setLoading(false)
      return
    }

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
          // leave as default
        }
        setLoading(false)
      },
      () => {
        setLoading(false)
      },
      { timeout: 8000 }
    )
  }, [])

  function setLocation(loc: UserLocation) {
    localStorage.setItem('stellar_location', JSON.stringify(loc))
    setLocationState(loc)
  }

  return (
    <LocationContext.Provider value={{ location, setLocation, loading }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used inside LocationProvider')
  return ctx
}
