'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AstronomerProfile } from '@/lib/types'

const STORAGE_KEY = 'stellar-astronomer-profile'

export function useAstronomerProfile() {
  const [profile, setProfileState] = useState<AstronomerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setProfileState(JSON.parse(raw))
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const saveProfile = useCallback((p: AstronomerProfile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    setProfileState(p)
  }, [])

  const resetProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setProfileState(null)
  }, [])

  return {
    profile,
    loading,
    saveProfile,
    resetProfile,
    hasCompletedOnboarding: !loading && !!profile,
  }
}
