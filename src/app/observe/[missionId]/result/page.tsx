'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useStellarUser } from '@/hooks/useStellarUser';
import { MISSIONS } from '@/lib/constants';
import { getActiveChallenge } from '@/lib/celestial-challenges';
import MoonPhase from '@/components/shared/MoonPhase';
import DiscoverySealed from '@/components/sky/DiscoverySealed';
import { useObserveFlow } from '../ObserveFlowContext';
import { useAppState } from '@/hooks/useAppState';
import PageContainer from '@/components/layout/PageContainer';

export default function ObserveResultPage() {
  const router = useRouter();
  const params = useParams<{ missionId: string }>();
  const missionId = params?.missionId ?? '';
  const mission = MISSIONS.find(m => m.id === missionId);

  const { address: stellarAddress } = useStellarUser();

  const { state } = useAppState();

  const {
    sky, skyScore, coords,
    mintTxId, mintTier, cosmicBonus,
    totalStarsEarned, challengeCompleted,
  } = useObserveFlow();

  useEffect(() => {
    if (mission && !mintTxId) {
      router.replace(`/observe/${mission.id}`);
    }
  }, [mission, mintTxId, router]);

  const [nearestStar, setNearestStar] = useState<{
    catalogId: string; ra: number; dec: number; mag: number;
    constellation: string | null; properName: string | null;
  } | null>(null);
  const [starName, setStarName] = useState('');
  const [starClaiming, setStarClaiming] = useState(false);
  const [starClaimed, setStarClaimed] = useState<{ chosenName: string; proofUrl: string } | null>(null);
  const [starError, setStarError] = useState('');
  const [starSkipped, setStarSkipped] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!mission || !mintTxId) return;
    if (mission.demo || mintTxId.startsWith('sim')) return;
    fetch(`/api/star/nearest-unclaimed?lat=${coords.lat}&lon=${coords.lon}&target=${encodeURIComponent(mission.name)}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setNearestStar(data); })
      .catch(() => {});
  }, [mission, mintTxId, coords.lat, coords.lon]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleStarClaim = async () => {
    if (!starName.trim() || !nearestStar || !mintTxId) return;
    setStarClaiming(true);
    setStarError('');
    try {
      const res = await fetch('/api/star/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogId: nearestStar.catalogId,
          chosenName: starName.trim(),
          walletAddress: stellarAddress ?? '',
          nftAddress: mintTxId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStarError(data.error ?? 'Could not claim star');
        return;
      }
      setStarClaimed({ chosenName: data.chosenName, proofUrl: data.proofUrl });
    } catch {
      setStarError('Could not claim star');
    } finally {
      setStarClaiming(false);
    }
  };

  if (!mission) {
    return (
      <PageContainer variant="content" className="py-6 flex flex-col gap-4">
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-text-primary font-semibold text-base mb-2">Mission not found</p>
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

  const isOnChain = !!mintTxId && !mintTxId.startsWith('sim');
  const starsBase = sky?.verified ? mission.stars : 0;
  const displayedTotal = totalStarsEarned || starsBase;
  const starsBonus = Math.max(0, displayedTotal - starsBase);
  const streakMultiplier = mintTier?.multiplier ?? 1;
  const skyScoreValue = skyScore?.score ?? 0;
  const completedCount = state.completedMissions.filter(m => m.status === 'completed').length;
  const nftNumber = isOnChain ? completedCount : 0;
  const solanaTxShort = mintTxId ? `${mintTxId.slice(0, 4)}...${mintTxId.slice(-4)}` : '';
  const solanaExplorerUrl = mintTxId
    ? `https://explorer.solana.com/tx/${mintTxId}?cluster=${process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'}`
    : '#';

  const handleShare = async () => {
    const shareText = `I just observed ${mission.name} on Stellar ✦ Sealed on Solana.`;
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://stellarrclub.vercel.app';
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `I sealed ${mission.name} on Stellar`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setToast('Copied to clipboard');
    } catch {
      setToast('Share unavailable');
    }
  };

  const handleSave = () => {
    setToast('Saved to your collection');
  };

  return (
    <PageContainer variant="fullscreen" className="relative z-10">
      {/* Cosmic bonus + weekly challenge inline banners (above seal) */}
      {(cosmicBonus?.triggered || challengeCompleted) && (
        <div className="relative z-[2] px-4 pt-4 flex flex-col gap-2 max-w-[420px] mx-auto">
          {cosmicBonus?.triggered && (
            <div
              className="flex items-center gap-3 px-4 py-2 rounded-xl animate-cosmic-reveal"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 179, 71,0.95) 0%, rgba(255, 179, 71,0.95) 100%)',
                border: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 12px 28px rgba(255, 179, 71,0.35)',
              }}
            >
              <span style={{ fontSize: 20, filter: 'drop-shadow(0 0 6px white)' }}>✦</span>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold tracking-[0.2em] text-text-primary/80 m-0 uppercase">Cosmic Bonus</p>
                <p className="text-sm font-black text-text-primary m-0 leading-tight">+{cosmicBonus.amount} ✦ <span className="text-[10px] font-normal text-text-primary/85 italic">{cosmicBonus.message}</span></p>
              </div>
            </div>
          )}
          {challengeCompleted && (
            <div
              className="flex items-center gap-3 px-4 py-2 rounded-xl animate-cosmic-reveal"
              style={{
                background: 'linear-gradient(135deg, rgba(94, 234, 212,0.95) 0%, rgba(94, 234, 212,0.95) 100%)',
                border: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 12px 28px rgba(94, 234, 212,0.3)',
              }}
            >
              <span style={{ fontSize: 16 }}>✓</span>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold tracking-[0.2em] text-text-primary/90 m-0 uppercase">Weekly Challenge</p>
                <p className="text-sm font-bold text-text-primary m-0">+{getActiveChallenge().bonusStars} ✦ Claimed</p>
              </div>
            </div>
          )}
          {streakMultiplier > 1 && mintTier && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full self-start"
              style={{ background: 'rgba(7,11,20,0.6)', border: '1px solid rgba(255, 179, 71,0.25)', fontSize: 10, fontWeight: 700, color: 'var(--stars)' }}
            >
              <MoonPhase phase={mintTier.phase} size={11} />
              <span>{mintTier.multiplier}× streak multiplier</span>
            </div>
          )}
        </div>
      )}

      <DiscoverySealed
        mission={mission}
        starsBase={starsBase}
        starsBonus={starsBonus}
        streakMultiplier={streakMultiplier}
        skyScore={skyScoreValue}
        nftNumber={nftNumber}
        solanaTxShort={solanaTxShort}
        solanaExplorerUrl={solanaExplorerUrl}
        onViewCollection={() => router.push('/nfts')}
        onShare={handleShare}
        onSave={handleSave}
        onContinue={() => router.push('/missions')}
      />

      {/* Name a star — preserved below the seal */}
      {!mission.demo && !mintTxId.startsWith('sim') && !starSkipped && (starClaimed || nearestStar) && (
        <div
          className="relative z-[1] mx-auto pb-8 px-5"
          style={{ maxWidth: 420 }}
        >
          <div
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18 }}
          >
            {!starClaimed ? (
              nearestStar && (
                <div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 14, color: 'var(--stars)', lineHeight: 1 }}>★</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Name a star
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    {nearestStar.catalogId}
                    {nearestStar.constellation ? ` in ${nearestStar.constellation}` : ''} · magnitude {nearestStar.mag.toFixed(1)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.7)' }}>
                    Your name will be inscribed on your NFT.
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. Nino's Star, Tbilisi"
                    maxLength={30}
                    value={starName}
                    onChange={e => setStarName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleStarClaim(); }}
                    className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleStarClaim}
                      disabled={!starName.trim() || starClaiming}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
                      style={{
                        background: !starName.trim() || starClaiming
                          ? 'rgba(255, 179, 71,0.15)'
                          : 'rgba(255, 179, 71,0.2)',
                        border: '1px solid rgba(255, 179, 71,0.35)',
                        color: 'var(--stars)',
                        opacity: !starName.trim() || starClaiming ? 0.5 : 1,
                        cursor: !starName.trim() || starClaiming ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {starClaiming && (
                        <div
                          className="w-3 h-3 rounded-full border-2 animate-spin"
                          style={{ borderColor: 'rgba(255, 179, 71,0.4)', borderTopColor: 'var(--stars)' }}
                        />
                      )}
                      Inscribe
                    </button>
                    <button
                      onClick={() => setStarSkipped(true)}
                      className="px-4 py-2 rounded-xl text-xs"
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(148,163,184,0.5)',
                      }}
                    >
                      Skip
                    </button>
                  </div>
                  {starError && (
                    <p className="text-xs mt-2" style={{ color: 'var(--terracotta)' }}>{starError}</p>
                  )}
                </div>
              )
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 14, color: 'var(--stars)' }}>★</span>
                  <span className="text-base font-semibold" style={{ color: 'var(--stars)' }}>
                    {starClaimed.chosenName}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>Your star is named.</p>
                <a
                  href={starClaimed.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--terracotta)', fontSize: 12, textDecoration: 'none' }}
                >
                  View proof page →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl text-sm"
          style={{
            background: 'rgba(7,11,20,0.92)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'var(--text)',
            fontFamily: 'var(--font-display)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {toast}
        </div>
      )}

    </PageContainer>
  );
}
