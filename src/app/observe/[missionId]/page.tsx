'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import BackButton from '@/components/shared/BackButton';
import Button from '@/components/shared/Button';
import { MISSIONS } from '@/lib/constants';
import { getMissionImage } from '@/lib/mission-icons';
import { useObserveFlow } from './ObserveFlowContext';
import PageContainer from '@/components/layout/PageContainer';

export default function ObserveBriefPage() {
  const router = useRouter();
  const params = useParams<{ missionId: string }>();
  const missionId = params?.missionId ?? '';
  const mission = MISSIONS.find(m => m.id === missionId);
  const { reset } = useObserveFlow();

  useEffect(() => {
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mission) {
    return (
      <PageContainer variant="content" className="py-6 flex flex-col gap-4">
        <BackButton />
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-text-primary font-semibold text-base mb-2">Mission not found</p>
          <p className="text-text-muted text-sm mb-4">The mission you're looking for doesn't exist.</p>
          <Link
            href="/missions"
            className="inline-block px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(255, 179, 71,0.12)', border: '1px solid rgba(255, 179, 71,0.25)', color: 'var(--terracotta)' }}
          >
            Back to missions
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="fullscreen" className="py-3 flex flex-col gap-4 items-stretch">
      <div className="w-full max-w-xl mx-auto flex flex-col gap-4">
      <BackButton />

      <div className="relative flex flex-col items-center px-2 py-6 text-center gap-3">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              'radial-gradient(ellipse 360px 260px at 50% 38%, rgba(255, 179, 71,0.10) 0%, transparent 60%)',
              'radial-gradient(ellipse 320px 240px at 20% 70%, rgba(255, 179, 71,0.10) 0%, transparent 65%)',
              'radial-gradient(ellipse 320px 240px at 80% 75%, rgba(56,155,240,0.08) 0%, transparent 65%)',
            ].join(', '),
          }}
        />

        <div className="relative flex items-center justify-center gap-2 flex-shrink-0">
          <span className="w-1 h-1 rounded-full stl-tw" style={{ background: 'var(--stl-gold)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--stl-gold)' }}>
            Tonight's Target
          </span>
          <span className="w-1 h-1 rounded-full stl-tw" style={{ background: 'var(--stl-gold)' }} />
        </div>

        <div className="relative flex-shrink-0" style={{ width: 'min(30vw, 120px)', aspectRatio: '1 / 1' }}>
          <div
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255, 179, 71,0.28) 0%, rgba(255, 179, 71,0.06) 45%, transparent 70%)',
              filter: 'blur(18px)',
              transform: 'scale(1.55)',
            }}
          />
          <div aria-hidden className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.04)', transform: 'scale(1.18)' }} />
          <div aria-hidden className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.06)', transform: 'scale(1.08)' }} />
          <img
            src={getMissionImage(mission.id)}
            alt={mission.name}
            className="relative w-full h-full rounded-full object-cover stl-chart-in"
            style={{ boxShadow: '0 0 60px rgba(255, 179, 71,0.22), inset 0 0 0 1px rgba(255, 179, 71,0.15)' }}
          />
        </div>

        <h1
          className="stl-chart-in flex-shrink-0"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 'clamp(28px, 7vw, 40px)',
            lineHeight: 0.95,
            letterSpacing: '-0.015em',
            color: 'var(--stl-text-bright)',
            animationDelay: '120ms',
          }}
        >
          {mission.name}
        </h1>

        <p
          className="stl-chart-in flex-shrink-0"
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(12px, 3vw, 14px)',
            lineHeight: 1.35,
            color: 'var(--stl-text-muted)',
            maxWidth: 300,
            animationDelay: '220ms',
          }}
        >
          {mission.hint}
        </p>

        <div className="relative flex items-center justify-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em' }}>
            <span style={{ color: 'var(--stl-gold)', fontWeight: 600 }}>+{mission.stars}</span>
            <span style={{ color: 'var(--stl-gold)' }}>✦</span>
          </div>
          <span style={{ color: 'var(--stl-text-whisper)', fontSize: 10 }}>·</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--stl-text-muted)' }}>
            {mission.difficulty || 'Beginner'}
          </span>
          <span style={{ color: 'var(--stl-text-whisper)', fontSize: 10 }}>·</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--stl-text-muted)' }}>
            {mission.target || mission.name}
          </span>
        </div>

        <Button
          variant="brass"
          onClick={() => router.push(`/observe/${missionId}/capture`)}
          className="relative w-full flex-shrink-0 max-w-sm mt-2"
        >
          Begin Observation →
        </Button>

        {mission.demo && (
          <p className="relative text-[11px] mt-2 opacity-70 text-center flex-shrink-0" style={{ color: 'var(--terracotta)' }}>
            Demo mode — upload any photo; mints a real NFT on Solana
          </p>
        )}
      </div>
      </div>
    </PageContainer>
  );
}
