'use client'

import { useAstronomerProfile } from '@/hooks/useAstronomerProfile'
import LoadingRing from '@/components/ui/LoadingRing'
import OnboardingQuiz from './OnboardingQuiz'

interface Props {
  children: React.ReactNode
}

export default function OnboardingGate({ children }: Props) {
  const { loading, hasCompletedOnboarding, saveProfile } = useAstronomerProfile()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingRing />
      </div>
    )
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingQuiz onComplete={saveProfile} />
  }

  return <>{children}</>
}
