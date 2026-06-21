'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { AstronomerProfile } from '@/lib/types'
import LoadingRing from '@/components/ui/LoadingRing'

interface Props {
  onComplete: (profile: AstronomerProfile) => void
}

type Step = 1 | 2 | 3 | 'loading'

const EQUIPMENT = [
  { id: 'naked-eye',       emoji: '👁️' },
  { id: 'binoculars',      emoji: '🔭' },
  { id: 'small-telescope', emoji: '🌌' },
  { id: 'large-telescope', emoji: '⭐' },
] as const

const ENVIRONMENT = [
  { id: 'city',   emoji: '🏙️' },
  { id: 'suburb', emoji: '🏘️' },
  { id: 'rural',  emoji: '🌾' },
  { id: 'remote', emoji: '⛰️' },
] as const

const INTERESTS = [
  { id: 'planets',          emoji: '🪐' },
  { id: 'moon',             emoji: '🌙' },
  { id: 'deep-sky',         emoji: '🌌' },
  { id: 'astrophotography', emoji: '📷' },
  { id: 'learning',         emoji: '📚' },
] as const

export default function OnboardingQuiz({ onComplete }: Props) {
  const t = useTranslations('onboarding')
  const [step, setStep] = useState<Step>(1)
  const [equipment, setEquipment] = useState<AstronomerProfile['equipment'] | null>(null)
  const [environment, setEnvironment] = useState<AstronomerProfile['environment'] | null>(null)
  const [interests, setInterests] = useState<AstronomerProfile['interests']>([])
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [locating, setLocating] = useState(false)

  // Explicit, user-triggered location request (with on-screen reason) — no silent prompt.
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setLocating(false)
      },
      () => { setLocating(false) },
      { timeout: 10000 }
    )
  }, [])

  // Lock background scroll while the onboarding overlay is mounted
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [])

  const handleContinue = useCallback(() => {
    if (step === 1 && equipment) setStep(2)
    else if (step === 2 && environment) setStep(3)
    else if (step === 3 && interests.length > 0) {
      setStep('loading')
      setTimeout(() => {
        const profile: AstronomerProfile = {
          equipment: equipment!,
          environment: environment!,
          interests,
          location: geoLocation,
          completedAt: new Date().toISOString(),
        }
        onComplete(profile)
      }, 2800)
    }
  }, [step, equipment, environment, interests, geoLocation, onComplete])

  const toggleInterest = (id: AstronomerProfile['interests'][number]) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const canContinue =
    (step === 1 && !!equipment) ||
    (step === 2 && !!environment) ||
    (step === 3 && interests.length > 0)

  const dotSteps = [1, 2, 3] as const

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-deep)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Step dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, paddingTop: 24 }}>
        {dotSteps.map((s) => {
          const isActive = step === s || (step === 'loading' && s === 3)
          const isDone = typeof step === 'number' && step > s
          return (
            <div
              key={s}
              style={{
                width: isActive ? 24 : 16,
                height: 6,
                borderRadius: 3,
                background: isActive || isDone ? 'var(--accent)' : 'var(--border-strong)',
                transition: 'width 200ms ease, background 200ms ease',
              }}
            />
          )
        })}
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          maxWidth: 448,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {step === 'loading' ? (
          <div
            key="loading"
            className="animate-fade-in"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
          >
            <LoadingRing size={80} message={t('building')} />
          </div>
        ) : (
          <div key={step} className="animate-fade-in" style={{ width: '100%' }}>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--text-primary)',
                textAlign: 'center',
                margin: 0,
              }}
            >
              {step === 1 && t('step1Title')}
              {step === 2 && t('step2Title')}
              {step === 3 && t('step3Title')}
            </h1>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
                textAlign: 'center',
                marginTop: 6,
                marginBottom: 24,
              }}
            >
              {step === 3 ? t('pickMultiple') : t('chooseOne')}
            </p>

            {/* Step 1 — Equipment */}
            {step === 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {EQUIPMENT.map((opt) => {
                  const selected = equipment === opt.id
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setEquipment(opt.id)}
                      className="card-base"
                      style={{
                        padding: 16,
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: selected ? 'var(--accent-dim)' : 'var(--bg-card)',
                        borderColor: selected ? 'var(--accent-border)' : 'var(--border-default)',
                        boxShadow: selected ? 'var(--shadow-glow-accent)' : 'var(--shadow-card)',
                        border: `1px solid ${selected ? 'var(--accent-border)' : 'var(--border-default)'}`,
                        borderRadius: 'var(--radius-lg)',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <div style={{ fontSize: 28 }}>{opt.emoji}</div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          fontFamily: 'var(--font-display)',
                          color: 'var(--text-primary)',
                          marginTop: 8,
                        }}
                      >
                        {t(`equipment.${opt.id}.label`)}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          marginTop: 2,
                        }}
                      >
                        {t(`equipment.${opt.id}.desc`)}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Step 2 — Environment */}
            {step === 2 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {ENVIRONMENT.map((opt) => {
                    const selected = environment === opt.id
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setEnvironment(opt.id)}
                        className="card-base"
                        style={{
                          padding: 16,
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: selected ? 'var(--accent-dim)' : 'var(--bg-card)',
                          borderColor: selected ? 'var(--accent-border)' : 'var(--border-default)',
                          boxShadow: selected ? 'var(--shadow-glow-accent)' : 'var(--shadow-card)',
                          border: `1px solid ${selected ? 'var(--accent-border)' : 'var(--border-default)'}`,
                          borderRadius: 'var(--radius-lg)',
                          transition: 'all 150ms ease',
                        }}
                      >
                        <div style={{ fontSize: 28 }}>{opt.emoji}</div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: 'var(--font-display)',
                            color: 'var(--text-primary)',
                            marginTop: 8,
                          }}
                        >
                          {t(`environment.${opt.id}.label`)}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            marginTop: 2,
                          }}
                        >
                          {t(`environment.${opt.id}.desc`)}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {/* Explicit location opt-in with a reason */}
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  {geoLocation ? (
                    <div className="badge-pill badge-success" style={{ display: 'inline-block' }}>
                      📍 {t('locationDetected')}
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={requestLocation}
                        disabled={locating}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 16px',
                          minHeight: 44,
                          borderRadius: 9999,
                          fontSize: 13,
                          fontFamily: 'var(--font-display)',
                          fontWeight: 600,
                          cursor: locating ? 'default' : 'pointer',
                          border: '1px solid var(--border-strong)',
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          opacity: locating ? 0.6 : 1,
                        }}
                      >
                        📍 {locating ? t('locating') : t('useLocation')}
                      </button>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.4 }}>
                        {t('locationReason')}
                      </p>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Step 3 — Interests */}
            {step === 3 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {INTERESTS.map((opt) => {
                  const selected = interests.includes(opt.id)
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleInterest(opt.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 9999,
                        fontSize: 13,
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: `1px solid ${selected ? 'var(--accent-border)' : 'var(--border-strong)'}`,
                        background: selected ? 'var(--accent-dim)' : 'transparent',
                        color: selected ? 'var(--accent)' : 'var(--text-secondary)',
                        transition: 'all 150ms ease',
                        minHeight: 44,
                      }}
                    >
                      <span>{opt.emoji}</span>
                      <span>{t(`interests.${opt.id}`)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Continue button */}
      {step !== 'loading' && (
        <div style={{ padding: '16px 24px 32px', maxWidth: 448, margin: '0 auto', width: '100%' }}>
          <button
            className="btn-primary"
            onClick={handleContinue}
            disabled={!canContinue}
            style={{ width: '100%', borderRadius: 'var(--radius-lg)' }}
          >
            {step === 3 ? t('startExploring') : t('continue')}
          </button>
        </div>
      )}
    </div>
  )
}
