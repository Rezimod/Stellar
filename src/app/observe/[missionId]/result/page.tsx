'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Copy, Check, Award, ExternalLink, X } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { MISSIONS } from '@/lib/constants';
import { getMissionImage } from '@/lib/mission-icons';
import { getUnlockedRewards, REWARDS } from '@/lib/rewards';
import { buildTwitterShareUrl, buildFarcasterShareUrl, buildShareImageUrl } from '@/lib/share';
import { getActiveChallenge } from '@/lib/celestial-challenges';
import BackButton from '@/components/shared/BackButton';
import MoonPhase from '@/components/shared/MoonPhase';
import RewardIcon from '@/components/shared/RewardIcon';
import ScoreRing from '@/components/ui/ScoreRing';
import { useObserveFlow } from '../ObserveFlowContext';

const NASA_FALLBACKS: Record<string, string> = {
  moon: '/images/planets/moon.jpg',
  jupiter: '/images/planets/jupiter.jpg',
  'quick-jupiter': '/images/planets/jupiter.jpg',
  saturn: '/images/planets/saturn.jpg',
  'quick-saturn': '/images/planets/saturn.jpg',
  mars: '/images/planets/mars.jpg',
  orion: '/images/dso/m42.jpg',
  andromeda: '/images/dso/m31.jpg',
  pleiades: '/images/dso/m45.jpg',
  crab: '/images/dso/m1.jpg',
};

export default function ObserveResultPage() {
  const router = useRouter();
  const params = useParams<{ missionId: string }>();
  const missionId = params?.missionId ?? '';
  const mission = MISSIONS.find(m => m.id === missionId);

  const { user } = usePrivy();
  const solanaWallet = user?.linkedAccounts.find(
    (a): a is Extract<typeof a, { type: 'wallet' }> =>
      a.type === 'wallet' && 'chainType' in a && (a as { chainType?: string }).chainType === 'solana'
  );

  const {
    photo, sky, skyScore, timestamp, coords,
    mintTxId, mintTier, mintRarity, cosmicBonus,
    totalStarsEarned, challengeCompleted,
    justUnlockedRewardIds, setJustUnlockedRewardIds,
  } = useObserveFlow();

  // Redirect if no mint has happened
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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);

  // Fetch nearest unclaimed star (skip demo + sim)
  useEffect(() => {
    if (!mission || !mintTxId) return;
    if (mission.demo || mintTxId.startsWith('sim')) return;
    fetch(`/api/star/nearest-unclaimed?lat=${coords.lat}&lon=${coords.lon}&target=${encodeURIComponent(mission.name)}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setNearestStar(data); })
      .catch(() => {});
  }, [mission, mintTxId, coords.lat, coords.lon]);

  // Open rewards modal if something was just unlocked
  useEffect(() => {
    if (justUnlockedRewardIds.length > 0) {
      const t = setTimeout(() => setRewardsModalOpen(true), 1800);
      return () => clearTimeout(t);
    }
  }, [justUnlockedRewardIds.length]);

  const newRewards = useMemo(() => {
    if (justUnlockedRewardIds.length === 0) return [];
    const idSet = new Set(justUnlockedRewardIds);
    return REWARDS.filter(r => idSet.has(r.id)).map(r => ({
      icon: r.icon,
      name: r.name,
      description: r.description,
      code: r.code,
    }));
  }, [justUnlockedRewardIds]);

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
          walletAddress: solanaWallet?.address ?? '',
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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const closeRewardsModal = () => {
    setRewardsModalOpen(false);
    setJustUnlockedRewardIds([]);
  };

  if (!mission) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        <BackButton />
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-white font-semibold text-base mb-2">Mission not found</p>
          <Link
            href="/missions"
            className="inline-block px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}
          >
            Back to missions
          </Link>
        </div>
      </div>
    );
  }

  const isOnChain = !!mintTxId && !mintTxId.startsWith('sim');
  const starsEarned = totalStarsEarned || (sky?.verified ? mission.stars : 0);
  const appUrl = 'https://stellarrclub.vercel.app';
  const ogImageUrl = skyScore
    ? buildShareImageUrl({ target: mission.name, score: skyScore.score, grade: skyScore.grade, stars: starsEarned, date: new Date().toISOString().slice(0, 10), emoji: skyScore.emoji })
    : undefined;
  const confettiColors = ['var(--accent)', 'var(--stars)', 'var(--success)', '#A855F7', '#F87171'];
  const displayPhoto = photo || NASA_FALLBACKS[mission.id] || '/images/planets/earth.jpg';

  return (
    <>
      {/* Confetti burst */}
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            top: '30%',
            left: '50%',
            width: 7,
            height: 7,
            borderRadius: i % 2 === 0 ? '50%' : 2,
            background: confettiColors[i % 5],
            ['--tx' as string]: `${i * 23 - 80}px`,
            ['--ty' as string]: `${-(i * 17 + 30)}px`,
            ['--rot' as string]: `${i * 45}deg`,
            animation: `confettiBurst 800ms var(--ease-out-expo) ${i * 40}ms both`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col gap-2 px-4 pt-3 pb-8 max-w-sm mx-auto w-full">

        {/* Header row */}
        <div className="flex items-center gap-3 animate-slide-up flex-shrink-0">
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '2px solid var(--accent)', boxShadow: '0 0 16px rgba(99,102,241,0.25)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 12 l4 4 l8-8" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Discovery Sealed <span style={{ color: 'var(--accent)' }}>✦</span>
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <img src={getMissionImage(mission.id)} alt="" className="w-3 h-3 rounded object-cover flex-shrink-0" />
                {mission.name}
              </span>
              {isOnChain && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--success)', border: '1px solid rgba(52,211,153,0.2)' }}>
                  ✦ Solana
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cosmic bonus — inline banner */}
        {cosmicBonus?.triggered && (
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-xl animate-cosmic-reveal flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.95) 0%, rgba(99,102,241,0.95) 100%)',
              border: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 12px 28px rgba(168,85,247,0.35)',
            }}
          >
            <span style={{ fontSize: 20, filter: 'drop-shadow(0 0 6px white)' }}>✦</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold tracking-[0.2em] text-white/80 m-0 uppercase">Cosmic Bonus</p>
              <p className="text-base font-black text-white m-0 leading-tight">+{cosmicBonus.amount} ✦ <span className="text-[10px] font-normal text-white/85 italic">{cosmicBonus.message}</span></p>
            </div>
          </div>
        )}

        {/* Weekly challenge — inline banner */}
        {challengeCompleted && (
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-xl animate-cosmic-reveal flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(52,211,153,0.95) 0%, rgba(16,185,129,0.95) 100%)',
              border: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 12px 28px rgba(52,211,153,0.3)',
            }}
          >
            <span style={{ fontSize: 16 }}>✓</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold tracking-[0.2em] text-white/90 m-0 uppercase">Weekly Challenge</p>
              <p className="text-sm font-bold text-white m-0">+{getActiveChallenge().bonusStars} ✦ Claimed</p>
            </div>
          </div>
        )}

        {/* Stars hero */}
        <div
          className="rounded-2xl py-2 px-5 text-center relative overflow-hidden animate-scale-in flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255,209,102,0.08) 0%, rgba(255,180,50,0.04) 100%)',
            border: '1px solid rgba(255,209,102,0.3)',
            boxShadow: '0 0 40px rgba(255,209,102,0.08), inset 0 1px 0 rgba(255,209,102,0.1)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(255,209,102,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
          {mintTier && mintTier.multiplier > 1 && (
            <div
              className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(7,11,20,0.6)', border: '1px solid rgba(255,209,102,0.25)', fontSize: 10, fontWeight: 700, color: '#FFD166' }}
            >
              <MoonPhase phase={mintTier.phase} size={11} />
              <span>{mintTier.multiplier}×</span>
            </div>
          )}
          <p
            className="relative font-black leading-none"
            style={{ fontSize: 'clamp(32px, 8vw, 48px)', color: '#FFD166', fontFamily: 'monospace', textShadow: '0 0 24px rgba(255,209,102,0.8), 0 0 48px rgba(255,209,102,0.4)', letterSpacing: '-0.02em' }}
          >
            +{starsEarned}
          </p>
          <p className="relative text-[10px] font-bold tracking-[0.25em] mt-0.5" style={{ color: 'rgba(255,209,102,0.55)' }}>
            STARS EARNED
          </p>
          {starsEarned >= 100 && (
            <p className="relative text-[9px] mt-1" style={{ color: 'rgba(255,209,102,0.4)' }}>
              ≈ {Math.floor(starsEarned / 100)}% off at astroman.ge
            </p>
          )}
        </div>

        {/* Photo card */}
        <div
          className={`relative rounded-2xl overflow-hidden animate-fade-in ${mintRarity?.rarity === 'Celestial' ? 'animate-rarity-pulse' : ''}`}
          style={{
            border: `2px solid ${mintRarity?.color ?? 'rgba(99,102,241,0.15)'}`,
            boxShadow: mintRarity?.rarity === 'Celestial'
              ? `0 0 32px ${mintRarity.color}55`
              : mintRarity?.rarity === 'Astral'
                ? `0 0 24px ${mintRarity.color}40`
                : '0 0 20px rgba(99,102,241,0.08)',
            background: '#0a0e1a',
            height: 220,
          }}
        >
          <img
            src={displayPhoto}
            alt={mission.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, rgba(7,11,20,0.85) 0%, transparent 100%)', pointerEvents: 'none' }} />

          {mintRarity && mintRarity.rarity !== 'Common' && (
            <div
              className="absolute top-2 right-2 px-2 py-0.5 rounded-lg flex items-center gap-1"
              style={{ background: 'rgba(7,11,20,0.8)', border: `1px solid ${mintRarity.color}60`, backdropFilter: 'blur(6px)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: mintRarity.color }}
            >
              <span style={{ fontSize: 10 }}>{mintRarity.glyph}</span>
              <span>{mintRarity.rarity}</span>
            </div>
          )}

          {skyScore && (
            <div className="absolute bottom-2.5 right-2.5 flex flex-col items-center" style={{ background: 'rgba(7,11,20,0.7)', borderRadius: 12, padding: '6px 8px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <ScoreRing size={52} strokeWidth={4} value={skyScore.score} color="gradient" sublabel={skyScore.grade} />
            </div>
          )}

          {isOnChain && (
            <a
              href={`https://explorer.solana.com/tx/${mintTxId}?cluster=${process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 left-3 flex items-center gap-1 text-[11px]"
              style={{ color: 'var(--accent)', textDecoration: 'none', background: 'rgba(7,11,20,0.7)', borderRadius: 8, padding: '4px 9px', backdropFilter: 'blur(6px)', border: '1px solid rgba(99,102,241,0.25)' }}
            >
              View on Solana <ExternalLink size={10} />
            </a>
          )}
        </div>

        {/* Share row */}
        <div className="grid grid-cols-2 gap-2 animate-fade-in">
          <button
            onClick={() => window.open(buildTwitterShareUrl({ target: mission.name, score: skyScore?.score ?? 0, grade: skyScore?.grade ?? 'Good', stars: starsEarned, appUrl, ogImageUrl }), '_blank')}
            className="flex items-center justify-center gap-2 rounded-xl py-2 text-xs text-white"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span style={{ fontSize: 13 }}>𝕏</span> Share
          </button>
          <button
            onClick={() => window.open(buildFarcasterShareUrl({ target: mission.name, score: skyScore?.score ?? 0, stars: starsEarned, appUrl }), '_blank')}
            className="flex items-center justify-center gap-2 rounded-xl py-2 text-xs"
            style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', color: '#A855F7' }}
          >
            ⬡ Farcaster
          </button>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 animate-slide-up">
          <button
            onClick={() => router.push('/nfts')}
            className="py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: 'var(--gradient-accent)', color: 'var(--bg-base)' }}
          >
            View NFTs →
          </button>
          <button
            onClick={() => router.push('/missions')}
            className="py-2.5 rounded-xl text-sm"
            style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          >
            Continue
          </button>
        </div>

        {/* Name a Star */}
        {!mission.demo && !mintTxId.startsWith('sim') && !starSkipped && (
          <div
            className="flex-shrink-0 pt-5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}
          >
            {!starClaimed ? (
              nearestStar === null ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <div
                    className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'rgba(148,163,184,0.4)', borderTopColor: 'transparent' }}
                  />
                  <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
                    Finding your star...
                  </span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 14, color: '#FFD166', lineHeight: 1 }}>★</span>
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
                          ? 'rgba(255,209,102,0.15)'
                          : 'rgba(255,209,102,0.2)',
                        border: '1px solid rgba(255,209,102,0.35)',
                        color: '#FFD166',
                        opacity: !starName.trim() || starClaiming ? 0.5 : 1,
                        cursor: !starName.trim() || starClaiming ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {starClaiming && (
                        <div
                          className="w-3 h-3 rounded-full border-2 animate-spin"
                          style={{ borderColor: 'rgba(255,209,102,0.4)', borderTopColor: '#FFD166' }}
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
                    <p className="text-xs mt-2" style={{ color: '#FBBF24' }}>{starError}</p>
                  )}
                </div>
              )
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 14, color: '#FFD166' }}>★</span>
                  <span className="text-base font-semibold" style={{ color: '#FFD166' }}>
                    {starClaimed.chosenName}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>Your star is named.</p>
                <a
                  href={starClaimed.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#818cf8', fontSize: 12, textDecoration: 'none' }}
                >
                  View proof page →
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rewards unlock modal */}
      {rewardsModalOpen && newRewards.length > 0 && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-start pt-14 overflow-y-auto px-4 pb-8"
          style={{ background: 'rgba(7,11,20,0.97)', backdropFilter: 'blur(12px)' }}
        >
          <div
            className="relative max-w-sm w-full mx-auto flex flex-col gap-3 text-center p-5 pt-10 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
          >
            <button
              onClick={closeRewardsModal}
              aria-label="Close"
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <X size={14} />
            </button>
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#34d399]/10 border border-[#34d399]/20 flex items-center justify-center mx-auto">
              <Award size={22} className="text-[#34d399]" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#34d399]">Reward Unlocked!</h2>
            <div className="overflow-y-auto flex flex-col gap-2" style={{ maxHeight: '45vh' }}>
              {newRewards.map(r => (
                <div key={r.name} className="rounded-xl p-3 text-left flex flex-col gap-1.5" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <div className="flex items-center gap-3">
                    <RewardIcon emoji={r.icon} />
                    <div>
                      <p className="font-semibold text-white text-sm">{r.name}</p>
                      <p className="text-slate-400 text-xs">{r.description}</p>
                    </div>
                  </div>
                  {r.code && (
                    <div className="mt-1">
                      <p className="text-[var(--text-dim)] text-[9px] uppercase tracking-wider mb-1">Your Code</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-[#070B14] border border-[#FFD166]/25 px-3 py-2 rounded-lg text-sm text-[#FFD166] font-mono flex-1 tracking-wide">
                          {r.code}
                        </code>
                        <button
                          onClick={() => copyCode(r.code!)}
                          className="p-2 border border-[rgba(99,102,241,0.12)] hover:border-[#818cf8] rounded-lg text-slate-400 hover:text-[#818cf8] transition-all flex-shrink-0"
                        >
                          {copiedCode === r.code ? <Check size={14} className="text-[#34d399]" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 sm:gap-3">
              <a
                href="https://astroman.ge"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-xs py-2.5 px-3 border border-[#FFD166]/30 text-[#FFD166] rounded-lg hover:bg-[#FFD166]/10 transition-all"
              >
                Visit astroman.ge →
              </a>
              <button
                onClick={closeRewardsModal}
                className="flex-1 text-xs py-2.5 px-3 bg-[#34d399]/10 border border-[#34d399]/30 text-[#34d399] rounded-lg hover:bg-[#34d399]/20 transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
