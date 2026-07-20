'use client'

import { useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { useLocation } from '@/lib/location'
import LocationPicker from '@/components/LocationPicker'

export function LocationFallbackBanner() {
  const { isFallback, gpsState, location } = useLocation()
  const [dismissed, setDismissed] = useState(false)

  if (!isFallback || dismissed) return null

  const reason =
    gpsState === 'denied'
      ? 'Location access blocked'
      : gpsState === 'unsupported'
        ? 'Your browser doesn’t support geolocation'
        : 'Couldn’t detect your location'

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        margin: '0 0 16px',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.28)',
        borderRadius: 12,
        fontSize: 13,
        color: 'rgba(var(--ink), 0.92)',
      }}
    >
      <MapPin size={16} color="var(--accent-text)" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.45 }}>
        <strong style={{ fontWeight: 600 }}>{reason}.</strong>{' '}
        <span style={{ color: 'rgba(var(--ink), 0.7)' }}>
          Showing default data for {location.city}. Pick your city for accurate sky conditions.
        </span>
      </div>
      <LocationPicker compact />
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 4,
          cursor: 'pointer',
          color: 'rgba(var(--ink), 0.5)',
          flexShrink: 0,
          display: 'flex',
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
