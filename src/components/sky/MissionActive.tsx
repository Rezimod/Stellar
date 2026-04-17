'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Mission, SkyVerification, MissionState, PhotoVerificationResult } from '@/lib/types';
import { usePrivy } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { getUnlockedRewards, getRank } from '@/lib/rewards';
import CameraCapture from './CameraCapture';
import Verification from './Verification';
import MintAnimation from '@/components/shared/MintAnimation';
import Button from '@/components/shared/Button';
import LoadingRing from '@/components/ui/LoadingRing';
import ScoreRing from '@/components/ui/ScoreRing';
import { calculateSkyScore, visibilityToMeters, type SkyScoreResult } from '@/lib/sky-score';
import { Copy, Check, Award, ExternalLink, Camera, X } from 'lucide-react';
import { getMissionImage } from '@/lib/mission-icons';
import { buildTwitterShareUrl, buildFarcasterShareUrl, buildShareImageUrl } from '@/lib/share';
import RewardIcon from '@/components/shared/RewardIcon';
import { getStarlight, consumeStarlight } from '@/lib/starlight';
import { getTierForStreak, type StreakTier } from '@/lib/constellation-streak';
import { calculateRarity, type RarityInfo } from '@/lib/nft-rarity';
import { rollCosmicBonus, type CosmicBonus } from '@/lib/cosmic-bonus';
import { recordChallengeProgress, claimChallengeReward, getActiveChallenge } from '@/lib/celestial-challenges';
import MoonPhase from '@/components/shared/MoonPhase';

const MISSION_STEPS = [
  { label: 'Brief', keys: ['observing'] },
  { label: 'Capture', keys: ['camera'] },
  { label: 'Verify', keys: ['verifying', 'verified'] },
  { label: 'Seal', keys: ['minting'] },
];

function getCurrentStepIndex(step: string): number {
  const idx = MISSION_STEPS.findIndex(s => s.keys.includes(step));
  return idx === -1 ? 0 : idx;
}

interface MissionActiveProps {
  mission: Mission;
  onClose: () => void;
}

interface NewReward {
  icon: string;
  name: string;
  description: string;
  code?: string;
}

export default function MissionActive({ mission, onClose }: MissionActiveProps) {
  const router = useRouter();
  const { state, addMission } = useAppState();
  const { user, getAccessToken } = usePrivy();
  const solanaWallet = user?.linkedAccounts.find(
    (a): a is Extract<typeof a, { type: 'wallet' }> =>
      a.type === 'wallet' && 'chainType' in a && (a as { chainType?: string }).chainType === 'solana'
  );
  const [step, setStep] = useState<MissionState>('observing');
  const [photo, setPhoto] = useState('');
  const [sky, setSky] = useState<SkyVerification | null>(null);
  const [coords, setCoords] = useState({ lat: 41.7151, lon: 44.8271 });
  const [timestamp, setTimestamp] = useState('');
  const [mintDone, setMintDone] = useState(false);
  const [mintTxId, setMintTxId] = useState('');
  const [mintError, setMintError] = useState('');
  const [newRewards, setNewRewards] = useState<NewReward[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showSlowMint, setShowSlowMint] = useState(false);
  const [skyScore, setSkyScore] = useState<SkyScoreResult | null>(null);
  const [nftImageUrl, setNftImageUrl] = useState('');
  const [photoVerification, setPhotoVerification] = useState<PhotoVerificationResult | null>(null);
  const [mintTier, setMintTier] = useState<StreakTier | null>(null);
  const [mintRarity, setMintRarity] = useState<RarityInfo | null>(null);
  const [cosmicBonus, setCosmicBonus] = useState<CosmicBonus | null>(null);
  const [totalStarsEarned, setTotalStarsEarned] = useState<number>(0);
  const [challengeCompleted, setChallengeCompleted] = useState<boolean>(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [challengeVisible, setChallengeVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Name a Star state
  const [nearestStar, setNearestStar] = useState<{
    catalogId: string; ra: number; dec: number; mag: number;
    constellation: string | null; properName: string | null;
  } | null>(null);
  const [starName, setStarName] = useState('');
  const [starClaiming, setStarClaiming] = useState(false);
  const [starClaimed, setStarClaimed] = useState<{ chosenName: string; proofUrl: string } | null>(null);
  const [starError, setStarError] = useState('');
  const [starSkipped, setStarSkipped] = useState(false);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (step === 'done') {
      document.getElementById('mission-done-overlay')?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [step]);

  useEffect(() => {
    if (step !== 'minting') { setShowSlowMint(false); return; }
    const t = setTimeout(() => setShowSlowMint(true), 30000);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (!overlayVisible) return;
    const t = setTimeout(() => setOverlayVisible(false), 2800);
    return () => clearTimeout(t);
  }, [overlayVisible]);

  useEffect(() => {
    if (!challengeVisible) return;
    const t = setTimeout(() => setChallengeVisible(false), 3300);
    return () => clearTimeout(t);
  }, [challengeVisible]);

  useEffect(() => {
    if (step !== 'done' || !mintTxId) return;
    if (mission.demo || mintTxId.startsWith('sim')) return;
    fetch(`/api/star/nearest-unclaimed?lat=${coords.lat}&lon=${coords.lon}&target=${encodeURIComponent(mission.name)}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setNearestStar(data); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, mintTxId]);

  const handleCapture = async (p: string, source: 'camera' | 'upload' = 'camera') => {
    setPhoto(p);
    const ts = new Date().toISOString();
    setTimestamp(ts);

    let lat = 41.7151, lon = 44.8271;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    } catch {
      // GPS unavailable, using default Tbilisi coords
    }
    setCoords({ lat, lon });

    if (!navigator.onLine) {
      setMintError('No internet connection — try again when back online');
      setStep('verified');
      return;
    }

    setStep('verifying');
    try {
      let skyData: SkyVerification;
      const res = await fetch(`/api/sky/verify?lat=${lat}&lon=${lon}`);
      if (res.ok) {
        skyData = await res.json();
      } else {
        // Sky API unavailable — use optimistic fallback so user can still mint
        skyData = {
          verified: true,
          cloudCover: 20,
          visibility: 'Good',
          conditions: 'Sky data temporarily unavailable — using estimated conditions',
          humidity: 50,
          temperature: 12,
          windSpeed: 5,
          oracleHash: '0x' + Date.now().toString(16).padStart(40, '0'),
          verifiedAt: new Date().toISOString(),
        };
        setMintError('Sky data unavailable — proceeding with estimated conditions.');
      }
      // Demo missions always treat sky as verified — weather data still shown for context
      const effectiveSky = mission.demo ? { ...skyData, verified: true } : skyData;
      setSky(effectiveSky);
      setSkyScore(calculateSkyScore({
        cloudCover: skyData.cloudCover,
        visibility: visibilityToMeters(skyData.visibility),
        humidity: skyData.humidity ?? 50,
        windSpeed: skyData.windSpeed ?? 5,
      }));
      if (!skyData.verified && !mission.demo) {
        setMintError('Cloudy sky — observation logged with 0 stars. You can still mint.');
      }

      // Demo missions skip photo verification — go straight to mint
      if (!mission.demo) {
        try {
          const verifyToken = await getAccessToken().catch(() => null);
          const blob = await (await fetch(p)).blob();
          const mimeType = blob.type || 'image/jpeg';
          const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
          const file = new File([blob], `observation.${ext}`, { type: mimeType });
          const fd = new FormData();
          fd.append('file', file);
          fd.append('lat', String(lat));
          fd.append('lon', String(lon));
          fd.append('capturedAt', ts);
          const pvRes = await fetch('/api/observe/verify', {
            method: 'POST',
            body: fd,
            headers: verifyToken ? { 'Authorization': `Bearer ${verifyToken}` } : {},
          });
          if (pvRes.ok) {
            const pv: PhotoVerificationResult = await pvRes.json();
            setPhotoVerification(pv);
            if (!pv.accepted) {
              if (source === 'upload') {
                // Save to gallery without NFT or stars
                if (solanaWallet?.address) {
                  fetch('/api/observe/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      wallet: solanaWallet.address,
                      target: mission.name,
                      confidence: 'rejected',
                      mintTx: null,
                      lat,
                      lon,
                    }),
                  }).catch(() => {});
                }
                const isSafePhoto = (url: string) =>
                  url.startsWith('data:image/jpeg;base64,') ||
                  url.startsWith('data:image/png;base64,') ||
                  url.startsWith('data:image/webp;base64,') ||
                  url.startsWith('blob:') ||
                  url.startsWith('/images/');
                addMission({
                  id: mission.id + '_gallery_' + Date.now().toString(36),
                  name: mission.name,
                  emoji: mission.emoji,
                  stars: 0,
                  txId: 'gallery_' + Date.now().toString(36),
                  photo: isSafePhoto(p) ? p : '',
                  timestamp: ts,
                  latitude: lat,
                  longitude: lon,
                  sky: skyData,
                  status: 'gallery',
                });
                setStep('gallery-saved');
                return;
              }
              setMintError(pv.reason ?? 'Photo rejected — please retake');
              setStep('camera');
              return;
            }
          }
        } catch {
          // Photo verification offline — allow but log low confidence
        }
      }

      setStep('verified');
    } catch {
      setMintError('Sky check offline — please try again in a moment');
      setStep('camera');
    }
  };

  const handleMint = async () => {
    setStep('minting');

    // --- Fetch server-authoritative streak (single source of truth) ---
    let streakCount = 0;
    if (solanaWallet?.address) {
      try {
        const r = await fetch(`/api/streak?walletAddress=${encodeURIComponent(solanaWallet.address)}`);
        const d = await r.json();
        streakCount = d.streak ?? 0;
      } catch {
        streakCount = 0;
      }
    }
    const tier = getTierForStreak(streakCount);
    setMintTier(tier);

    // --- Compute effective stars with multiplier ---
    const baseStars = sky?.verified ? mission.stars : 0;
    const effectiveStars = Math.round(baseStars * tier.multiplier);

    // --- Compute rarity from sky score + streak ---
    const rarityInfo = calculateRarity(skyScore?.score ?? 0, streakCount);
    setMintRarity(rarityInfo);

    const prevCompleted = state.completedMissions
      .filter(m => m.status === 'completed')
      .map(m => m.id);
    const prevRank = getRank(prevCompleted.length).name;
    const prevUnlocked = getUnlockedRewards(prevCompleted, prevRank)
      .filter(r => r.unlocked)
      .map(r => r.id);

    setMintError('');

    // --- Mint the NFT, passing rarity through ---
    let txId = 'sim_' + Date.now().toString(36);
    try {
      const authToken = await getAccessToken().catch(() => null);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch('/api/mint', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          userAddress: solanaWallet?.address ?? null,
          target: mission.target || (mission.name === 'Demo Observation' ? 'Jupiter' : mission.name),
          timestampMs: new Date(timestamp).getTime(),
          lat: coords.lat,
          lon: coords.lon,
          cloudCover: sky?.cloudCover ?? 0,
          oracleHash: sky?.oracleHash ?? 'sim',
          stars: effectiveStars,
          rarity: rarityInfo.rarity,
          multiplier: tier.multiplier,
          demo: mission.demo === true,
        }),
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        txId = data.txId;
        console.log('[mint] On-chain success, txId:', data.txId);
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg: string = errData?.error ?? '';
        console.error('[mint] API error', res.status, msg);
        if (res.status === 400 && (msg.toLowerCase().includes('cloud cover') || msg.toLowerCase().includes('sky conditions'))) {
          setMintError('The sky is too cloudy to verify tonight. Check back when cloud cover drops below 70%.');
          setStep('verified');
          setMintDone(false);
          return;
        }
        setMintError('NFT mint failed — your observation is saved locally. You can retry from your NFTs page.');
      }
    } catch (err) {
      console.error('[mint] Network/timeout error:', err);
    }

    setMintTxId(txId);

    // --- Build NFT image URL with rarity ---
    const targetName = mission.target || (mission.name === 'Demo Observation' ? 'Jupiter' : mission.name);
    const nftUrl = `/api/nft-image?target=${encodeURIComponent(targetName)}&ts=${new Date(timestamp).getTime()}&lat=${coords.lat.toFixed(4)}&lon=${coords.lon.toFixed(4)}&cc=${sky?.cloudCover ?? 0}&stars=${effectiveStars}&rarity=${rarityInfo.rarity}`;
    setNftImageUrl(nftUrl);

    // --- Roll cosmic bonus (seeded per user+date+target) ---
    const bonus = rollCosmicBonus(rarityInfo.rarity, sky?.oracleHash ?? 'sim', user?.id ?? '', mission.id);
    setCosmicBonus(bonus);
    setOverlayVisible(bonus.triggered);

    // --- Compute TRUE total stars including bonus ---
    const totalStars = effectiveStars + (bonus.triggered ? bonus.amount : 0);
    setTotalStarsEarned(totalStars);

    // --- Award cosmic bonus Stars via /api/award-stars (fire-and-forget, idempotent) ---
    if (bonus.triggered && solanaWallet?.address) {
      const authToken = await getAccessToken().catch(() => null);
      fetch('/api/award-stars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          recipientAddress: solanaWallet.address,
          amount: bonus.amount,
          reason: `cosmic_bonus:${targetName}`,
          idempotencyKey: `cosmic:${txId}`,
        }),
      }).catch(() => {});
    }

    // --- Consume Starlight (skip demo) ---
    if (!mission.demo) consumeStarlight();

    // --- Track weekly challenge progress ---
    const chResult = recordChallengeProgress(skyScore?.score ?? 0, targetName);
    if (chResult.justCompleted) {
      setChallengeCompleted(true);
      setChallengeVisible(true);
      const cb = claimChallengeReward();
      if (cb > 0 && solanaWallet?.address) {
        const authToken = await getAccessToken().catch(() => null);
        fetch('/api/award-stars', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            recipientAddress: solanaWallet.address,
            amount: cb,
            reason: 'weekly_challenge',
            idempotencyKey: `challenge:${getActiveChallenge().id}:${solanaWallet.address}`,
          }),
        }).catch(() => {});
      }
    }

    setMintDone(true);

    // --- Log observation (use TOTAL stars so server records the full amount) ---
    if (solanaWallet?.address) {
      fetch('/api/observe/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: solanaWallet.address,
          target: targetName,
          identifiedObject: photoVerification?.identifiedObject ?? targetName,
          verificationToken: photoVerification?.verificationToken ?? null,
          capturedAt: photoVerification?.metadata?.capturedAt ?? new Date().toISOString(),
          confidence: photoVerification?.confidence ?? (sky?.verified ? 'medium' : 'low'),
          mintTx: txId,
          lat: coords.lat,
          lon: coords.lon,
          oracleHash: sky?.oracleHash ?? null,
        }),
      }).catch(() => {});
    }

    setTimeout(() => {
      const newCompleted = [...prevCompleted, mission.id];
      const newRank = getRank(newCompleted.length).name;
      const nowUnlocked = getUnlockedRewards(newCompleted, newRank).filter(r => r.unlocked);
      const justUnlocked = nowUnlocked.filter(r => !prevUnlocked.includes(r.id));

      const isSafePhoto = (url: string) =>
        url.startsWith('data:image/jpeg;base64,') ||
        url.startsWith('data:image/png;base64,') ||
        url.startsWith('data:image/webp;base64,') ||
        url.startsWith('blob:') ||
        url.startsWith('/images/');

      addMission({
        id: mission.id,
        name: mission.target || (mission.name === 'Demo Observation' ? 'Jupiter' : mission.name),
        emoji: mission.emoji,
        stars: totalStars,
        txId,
        photo: isSafePhoto(photo) ? photo : '',
        timestamp,
        latitude: coords.lat,
        longitude: coords.lon,
        sky: sky!,
        status: txId.startsWith('sim') ? 'pending' : 'completed',
        method: txId.startsWith('sim') ? 'simulated' : 'onchain',
      });

      setStep('done');
      if (justUnlocked.length > 0) {
        setTimeout(() => {
          setNewRewards(justUnlocked.map(r => ({ icon: r.icon, name: r.name, description: r.description, code: r.code })));
        }, 1800);
      }
    }, 1200);
  };

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

  // Reward unlock modal
  if (newRewards.length > 0) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-start pt-14 overflow-y-auto px-4 pb-8" style={{ background: 'rgba(7,11,20,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="relative max-w-sm w-full mx-auto flex flex-col gap-3 text-center p-5 pt-10 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
          <button
            onClick={() => setNewRewards([])}
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
                    <button onClick={() => copyCode(r.code!)} className="p-2 border border-[rgba(99,102,241,0.12)] hover:border-[#818cf8] rounded-lg text-slate-400 hover:text-[#818cf8] transition-all flex-shrink-0">
                      {copiedCode === r.code ? <Check size={14} className="text-[#34d399]" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>
          <div className="flex gap-2 sm:gap-3">
            <a href="https://astroman.ge" target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center text-xs py-2.5 px-3 border border-[#FFD166]/30 text-[#FFD166] rounded-lg hover:bg-[#FFD166]/10 transition-all">
              Visit astroman.ge →
            </a>
            <button onClick={() => setNewRewards([])}
              className="flex-1 text-xs py-2.5 px-3 bg-[#34d399]/10 border border-[#34d399]/30 text-[#34d399] rounded-lg hover:bg-[#34d399]/20 transition-all">
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    const isOnChain = mintTxId && !mintTxId.startsWith('sim');
    const starsEarned = totalStarsEarned || (sky?.verified ? mission.stars : 0);
    const appUrl = 'https://stellarrclub.vercel.app';
    const ogImageUrl = skyScore
      ? buildShareImageUrl({ target: mission.name, score: skyScore.score, grade: skyScore.grade, stars: starsEarned, date: new Date().toISOString().slice(0, 10), emoji: skyScore.emoji })
      : undefined;
    const confettiColors = ['var(--accent)', 'var(--stars)', 'var(--success)', '#A855F7', '#F87171'];

    // Photo to display: actual captured photo, or local astronomy image fallback
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
    const displayPhoto = photo || NASA_FALLBACKS[mission.id] || '/images/planets/earth.jpg';

    return (
      <div
        id="mission-done-overlay"
        className="fixed inset-0 z-[58] overflow-hidden flex flex-col"
        style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(99,102,241,0.07) 0%, transparent 55%), var(--bg-base)' }}
      >
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

        {/* Cosmic bonus overlay */}
        {cosmicBonus?.triggered && (
          <div
            className="fixed top-16 left-1/2 -translate-x-1/2 z-20 animate-cosmic-reveal"
            style={{
              pointerEvents: 'none',
              opacity: overlayVisible ? 1 : 0,
              transition: 'opacity 400ms ease',
            }}
          >
            <div
              className="flex items-center gap-3 px-5 py-3 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(168,85,247,0.95) 0%, rgba(99,102,241,0.95) 100%)',
                border: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 16px 40px rgba(168,85,247,0.5)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 8px white)' }}>✦</span>
              <div>
                <p className="text-[9px] font-bold tracking-[0.2em] text-white/80 m-0" style={{ textTransform: 'uppercase' }}>Cosmic Bonus</p>
                <p className="text-xl font-black text-white m-0 leading-tight">+{cosmicBonus.amount} ✦</p>
                <p className="text-[10px] text-white/85 m-0 italic mt-0.5">{cosmicBonus.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Weekly challenge complete */}
        {challengeCompleted && (
          <div
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-20 animate-cosmic-reveal"
            style={{
              pointerEvents: 'none',
              opacity: challengeVisible ? 1 : 0,
              transition: 'opacity 400ms ease',
            }}
          >
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(52,211,153,0.95) 0%, rgba(16,185,129,0.95) 100%)',
                border: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 12px 32px rgba(52,211,153,0.4)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ fontSize: 16 }}>✓</span>
              <div>
                <p className="text-[9px] font-bold tracking-[0.2em] text-white/90 m-0" style={{ textTransform: 'uppercase' }}>Weekly Challenge</p>
                <p className="text-sm font-bold text-white m-0">+{getActiveChallenge().bonusStars} ✦ Claimed</p>
              </div>
            </div>
          </div>
        )}

        {/* Layout — single column, top-aligned, always scrollable */}
        <div className="relative z-10 flex flex-col gap-2 px-4 pt-3 pb-8 max-w-sm mx-auto w-full overflow-y-auto">

          {/* Close button — top-right, inside content column */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors z-20"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <X size={14} />
          </button>

          {/* Header row */}
          <div className="flex items-center gap-3 animate-slide-up flex-shrink-0 pr-10">
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
              style={{ fontSize: "clamp(32px, 8vw, 48px)", color: "#FFD166", fontFamily: 'monospace', textShadow: '0 0 24px rgba(255,209,102,0.8), 0 0 48px rgba(255,209,102,0.4)', letterSpacing: '-0.02em' }}
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
            {/* Gradient overlay at bottom for badges */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, rgba(7,11,20,0.85) 0%, transparent 100%)', pointerEvents: 'none' }} />

            {/* Rarity badge — top-right */}
            {mintRarity && mintRarity.rarity !== 'Common' && (
              <div
                className="absolute top-2 right-2 px-2 py-0.5 rounded-lg flex items-center gap-1"
                style={{ background: 'rgba(7,11,20,0.8)', border: `1px solid ${mintRarity.color}60`, backdropFilter: 'blur(6px)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: mintRarity.color }}
              >
                <span style={{ fontSize: 10 }}>{mintRarity.glyph}</span>
                <span>{mintRarity.rarity}</span>
              </div>
            )}

            {/* Sky score ring — bottom-right overlay */}
            {skyScore && (
              <div className="absolute bottom-2.5 right-2.5 flex flex-col items-center" style={{ background: 'rgba(7,11,20,0.7)', borderRadius: 12, padding: '6px 8px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <ScoreRing size={52} strokeWidth={4} value={skyScore.score} color="gradient" sublabel={skyScore.grade} />
              </div>
            )}

            {/* Explorer link — bottom-left */}
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
              onClick={() => { onClose(); router.push('/nfts'); }}
              className="py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--gradient-accent)', color: 'var(--bg-base)' }}
            >
              View NFTs →
            </button>
            <button
              onClick={onClose}
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
      </div>
    );
  }

  if (step === 'gallery-saved') {
    return (
      <div className="fixed inset-0 z-[58] bg-[#070B14] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <img src={getMissionImage(mission.id)} alt={mission.name} className="w-full h-full object-cover" />
            </div>
            <p className="text-white text-sm font-semibold">{mission.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <X size={14} />
          </button>
        </div>
        <div className="flex flex-col justify-between flex-1 min-h-0 px-6 py-5 max-w-sm mx-auto w-full text-center gap-4">
          <div className="flex flex-col items-center gap-3">
            {photo && (
              <div className="w-full rounded-xl overflow-hidden bg-black" style={{ maxHeight: '30vh', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 12 }}>
                <img src={photo} alt="Uploaded observation" className="w-full h-full object-cover" style={{ opacity: 0.85 }} />
              </div>
            )}
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)' }}>
              <Camera size={20} className="text-slate-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base mb-1">Photo Saved</h3>
              <p className="text-slate-400 text-sm leading-snug">
                {photoVerification?.reason ?? "Your photo didn't pass AI verification."}
              </p>
              <p className="text-slate-600 text-xs mt-1.5">No Stars earned · Not minted as NFT</p>
            </div>
          </div>
          <div className="flex gap-3 w-full flex-shrink-0">
            <button
              onClick={() => { setStep('camera'); setPhotoVerification(null); }}
              className="flex-1 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fullBleed = false;

  return (
    <div
      className="fixed inset-0 z-[58] flex items-stretch justify-center"
      style={{ background: 'rgba(7,11,20,0.96)', backdropFilter: 'blur(6px)' }}
    >
    <div
      ref={containerRef}
      className="w-full max-w-2xl h-full bg-[#070B14] overflow-hidden flex flex-col"
      style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
    >

      {/* Step progress indicator */}
      {(() => {
        const current = getCurrentStepIndex(step);
        return (
          <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-2 px-6">
            <div className="flex items-center justify-center gap-0">
              {MISSION_STEPS.map((s, i) => (
                <React.Fragment key={s.label}>
                  <div
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === current ? 10 : 8,
                      height: i === current ? 10 : 8,
                      background: i <= current ? 'var(--accent)' : 'var(--border-strong)',
                      opacity: i > current ? 0.4 : 1,
                      boxShadow: i === current ? 'var(--shadow-glow-accent)' : 'none',
                    }}
                  />
                  {i < MISSION_STEPS.length - 1 && (
                    <div
                      className="flex-1 h-px mx-1"
                      style={{
                        width: 24,
                        background: i < current ? 'rgba(99,102,241,0.5)' : 'var(--border-subtle)',
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-center mt-1.5 text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {MISSION_STEPS[current]?.label}
            </p>
          </div>
        );
      })()}

      {/* Top bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-2 z-10"
        style={{
          borderBottom: fullBleed ? 'none' : '1px solid rgba(255,255,255,0.05)',
          position: fullBleed ? 'absolute' : 'relative',
          top: 0, left: 0, right: 0,
          background: fullBleed ? 'linear-gradient(to bottom, rgba(7,11,20,0.9), transparent)' : '#0a0a0a',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={getMissionImage(mission.id)}
              alt={mission.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{mission.name}</p>
            {!fullBleed && <p className="text-slate-600 text-[11px]">{mission.desc}</p>}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className={`flex flex-col flex-1 min-h-0 overflow-y-auto ${fullBleed ? '' : 'px-4 py-4 max-w-xl mx-auto w-full'}`}>

        {step === 'observing' && (
          <div className="flex flex-col gap-5 pt-4">
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
            >
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4"
                style={{ border: '1px solid rgba(255,209,102,0.25)', boxShadow: '0 0 24px rgba(255,209,102,0.1)' }}
              >
                <img
                  src={getMissionImage(mission.id)}
                  alt={mission.name}
                  className="w-full h-full object-cover"
                  style={{ display: 'block' }}
                />
              </div>
              <p className="text-white text-base font-semibold mb-2">
                Point your telescope at <span className="text-[#FFD166]">{mission.name}</span>
              </p>
              <p className="text-slate-400 text-sm leading-relaxed">
                {mission.hint}
              </p>
              {mission.demo && (
                <p className="text-amber-400 text-xs mt-3 opacity-70">
                  Demo mode — upload any photo; mints a real NFT on Solana
                </p>
              )}
            </div>
            <Button
              variant="brass"
              onClick={() => { setMintError(''); setStep('camera'); }}
              className="w-full"
            >
              Begin Observation →
            </Button>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">Reward</p>
                <p className="text-[#FFD166] font-bold text-sm mt-1">{mission.stars} ✦</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">Difficulty</p>
                <p className="text-white font-semibold text-sm mt-1 capitalize">{mission.difficulty || 'Beginner'}</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">Target</p>
                <p className="text-white font-semibold text-sm mt-1">{mission.target || mission.name}</p>
              </div>
            </div>
          </div>
        )}

        {step === 'camera' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <CameraCapture
              missionName={mission.name}
              onCapture={(p) => handleCapture(p, 'camera')}
              onUpload={(p) => handleCapture(p, 'upload')}
            />
          </div>
        )}

        {step === 'verifying' && (
          <div className="flex flex-col flex-1 min-h-0 items-center justify-center gap-4">
            <div
              className="flex flex-col items-center gap-4 p-8 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
            >
              <LoadingRing size={64} message="Analyzing sky + photo..." facts={[]} />
              <p className="text-[11px] font-body" style={{ color: 'var(--text-muted)' }}>This may take a moment</p>
            </div>
          </div>
        )}

        {step === 'verified' && sky && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <Verification
              photo={photo}
              sky={sky}
              stars={sky.verified ? mission.stars : 0}
              timestamp={timestamp}
              latitude={coords.lat}
              longitude={coords.lon}
              onMint={handleMint}
              compact={true}
            />
            {photoVerification && (
              <div className="mt-2 text-center">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  photoVerification.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                  photoVerification.confidence === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  AI: {photoVerification.identifiedObject} · {photoVerification.confidence} confidence
                </span>
              </div>
            )}
            {mintError && (
              <div className="mt-2 text-center">
                <p className="text-xs text-amber-400">{mintError}</p>
                {mintError.includes('cloudy') && (
                  <Link href="/sky" className="text-xs text-[#818cf8] underline mt-1 inline-block">
                    Check sky forecast →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'minting' && (
          <MintAnimation done={mintDone} slowMsg={showSlowMint} />
        )}
      </div>
    </div>
    </div>
  );
}
