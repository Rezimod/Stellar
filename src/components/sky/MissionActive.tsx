'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Mission, SkyVerification, MissionState } from '@/lib/types';
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
import { Copy, Check, Telescope, Award, ExternalLink } from 'lucide-react';
import { buildTwitterShareUrl, buildFarcasterShareUrl, buildShareImageUrl } from '@/lib/share';
import RewardIcon from '@/components/shared/RewardIcon';

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
  const { user } = usePrivy();
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

  useEffect(() => {
    if (step !== 'minting') { setShowSlowMint(false); return; }
    const t = setTimeout(() => setShowSlowMint(true), 30000);
    return () => clearTimeout(t);
  }, [step]);

  const handleCapture = async (p: string) => {
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
      const res = await fetch(`/api/sky/verify?lat=${lat}&lon=${lon}`);
      if (!res.ok) {
        setMintError('Sky check failed — please try again in a moment');
        setStep('camera');
        return;
      }
      const skyData: SkyVerification = await res.json();
      setSky(skyData);
      setSkyScore(calculateSkyScore({
        cloudCover: skyData.cloudCover,
        visibility: visibilityToMeters(skyData.visibility),
        humidity: skyData.humidity ?? 50,
        windSpeed: skyData.windSpeed ?? 5,
      }));
      if (!skyData.verified) {
        setMintError('Cloudy sky — observation logged with 0 stars. You can still mint.');
      }
      setStep('verified');
    } catch {
      setMintError('Sky check offline — please try again in a moment');
      setStep('camera');
    }
  };

  const handleMint = async () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setStep('minting');

    const effectiveStars = sky?.verified ? mission.stars : 0;

    const prevCompleted = state.completedMissions
      .filter(m => m.status === 'completed')
      .map(m => m.id);
    const prevRank = getRank(prevCompleted.length).name;
    const prevUnlocked = getUnlockedRewards(prevCompleted, prevRank)
      .filter(r => r.unlocked)
      .map(r => r.id);

    setMintError('');

    let txId = 'sim_' + Date.now().toString(36);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch('/api/mint', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: solanaWallet?.address ?? null,
          target: mission.target === null ? 'Night Sky' : mission.name,
          timestampMs: new Date(timestamp).getTime(),
          lat: coords.lat,
          lon: coords.lon,
          cloudCover: sky?.cloudCover ?? 0,
          oracleHash: sky?.oracleHash ?? 'sim',
          stars: effectiveStars,
        }),
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        txId = data.txId;
      } else if (res.status === 400) {
        const errData = await res.json().catch(() => ({}));
        const msg: string = errData?.error ?? '';
        if (msg.toLowerCase().includes('cloud cover') || msg.toLowerCase().includes('sky conditions')) {
          setMintError('The sky is too cloudy to verify tonight. Check back when cloud cover drops below 70%.');
          setStep('verified');
          setMintDone(false);
          return;
        }
        // Other 400 errors: fall through to sim_ path
      }
      // On other API errors: txId stays as sim_… and observation is saved as pending
    } catch {
      // Network / timeout: txId stays as sim_… — observation saved as pending
    }

    setMintTxId(txId);
    setMintDone(true);

    // Award stars only for confirmed on-chain mints
    if (!txId.startsWith('sim') && solanaWallet?.address && effectiveStars > 0) {
      fetch('/api/award-stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientAddress: solanaWallet.address,
          amount: effectiveStars,
          reason: `mission:${mission.id}`,
          idempotencyKey: `${solanaWallet.address}_${mission.id}_v1`,
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
        url.startsWith('blob:');

      addMission({
        id: mission.id,
        name: mission.name,
        emoji: mission.emoji,
        stars: effectiveStars,
        txId,
        photo: isSafePhoto(photo) ? photo : '',
        timestamp,
        latitude: coords.lat,
        longitude: coords.lon,
        sky: sky!,
        status: txId.startsWith('sim') ? 'pending' : 'completed',
        method: txId.startsWith('sim') ? 'simulated' : 'onchain',
      });

      if (justUnlocked.length > 0) {
        setNewRewards(justUnlocked.map(r => ({ icon: r.icon, name: r.name, description: r.description, code: r.code })));
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        setStep('done');
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }, 1200);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Reward unlock modal
  if (newRewards.length > 0) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#070B14] grid place-items-center p-4">
        <div className="glass-card glow-emerald max-w-sm w-full p-5 flex flex-col gap-3 text-center max-h-[85vh] overflow-y-auto">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#34d399]/10 border border-[#34d399]/20 flex items-center justify-center mx-auto">
            <Award size={22} className="text-[#34d399]" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#34d399]">Reward Unlocked!</h2>
          {newRewards.map(r => (
            <div key={r.name} className="bg-[#070B14] border border-[#34d399]/20 rounded-xl p-3 sm:p-4 text-left flex flex-col gap-1.5">
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
                    <button onClick={() => copyCode(r.code!)} className="p-2 border border-[rgba(56,240,255,0.12)] hover:border-[#38F0FF] rounded-lg text-slate-400 hover:text-[#38F0FF] transition-all flex-shrink-0">
                      {copiedCode === r.code ? <Check size={14} className="text-[#34d399]" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2 sm:gap-3">
            <a href="https://astroman.ge" target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center text-xs py-2.5 px-3 border border-[#FFD166]/30 text-[#FFD166] rounded-lg hover:bg-[#FFD166]/10 transition-all">
              Visit astroman.ge →
            </a>
            <button onClick={() => { setStep('done'); onClose(); window.scrollTo({ top: 0, behavior: 'instant' }); }}
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
    const starsEarned = sky?.verified ? mission.stars : 0;
    const appUrl = 'https://stellarrclub.vercel.app';
    const ogImageUrl = skyScore ? buildShareImageUrl({
      target: mission.name,
      score: skyScore.score,
      grade: skyScore.grade,
      stars: starsEarned,
      date: new Date().toISOString().slice(0, 10),
      emoji: skyScore.emoji,
    }) : undefined;
    const confettiColors = ['var(--accent)', 'var(--stars)', 'var(--success)', '#A855F7', '#F87171'];

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto py-12 px-6"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(56,240,255,0.05) 0%, transparent 60%), var(--bg-base)',
        }}
      >
        {/* Confetti burst — 16 CSS-only particles */}
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 8,
              height: 8,
              borderRadius: i % 2 === 0 ? '50%' : 2,
              background: confettiColors[i % 5],
              ['--tx' as string]: `${i * 23 - 80}px`,
              ['--ty' as string]: `${-(i * 17 + 30)}px`,
              ['--rot' as string]: `${i * 45}deg`,
              animation: `confettiBurst 800ms var(--ease-out-expo) ${i * 40}ms both`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Content */}
        <div className="flex flex-col items-center gap-4 text-center relative z-10 max-w-xs mx-auto w-full">

          {/* Checkmark circle */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center animate-scale-in"
            style={{ background: 'var(--accent-dim)', border: '2px solid var(--accent)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 12 l4 4 l8-8"
                stroke="var(--accent)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ strokeDasharray: 24, strokeDashoffset: 0 }}
              />
            </svg>
          </div>

          {/* Title */}
          <h2
            className="text-2xl font-bold animate-slide-up stagger-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Discovery Sealed <span style={{ color: 'var(--accent)' }}>✦</span>
          </h2>

          {/* Mission info */}
          <p
            className="text-base animate-fade-in stagger-2"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}
          >
            {mission.emoji} {mission.name}
          </p>

          {/* Stars counter */}
          <p
            className="text-4xl font-bold animate-scale-in animate-glow-pulse stagger-3"
            style={{ color: 'var(--stars)', fontFamily: 'monospace' }}
          >
            +{starsEarned} ✦
          </p>

          {/* Sky score ring */}
          {skyScore && (
            <div className="animate-fade-in stagger-4">
              <ScoreRing size={80} strokeWidth={6} value={skyScore.score} color="gradient" sublabel={skyScore.grade} />
            </div>
          )}

          {/* Explorer link */}
          {isOnChain && (
            <a
              href={`https://explorer.solana.com/tx/${mintTxId}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs animate-fade-in stagger-5"
              style={{ color: 'var(--accent)', textDecoration: 'none' }}
            >
              View on Solana Explorer <ExternalLink size={12} className="inline" />
            </a>
          )}

          {/* Share buttons */}
          <div className="flex gap-3 justify-center animate-fade-in stagger-5">
            <button
              onClick={() => window.open(buildTwitterShareUrl({
                target: mission.name,
                score: skyScore?.score ?? 0,
                grade: skyScore?.grade ?? 'Good',
                stars: starsEarned,
                appUrl,
                ogImageUrl,
              }), '_blank')}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <span>𝕏</span> Share on X
            </button>
            <button
              onClick={() => window.open(buildFarcasterShareUrl({
                target: mission.name,
                score: skyScore?.score ?? 0,
                stars: starsEarned,
                appUrl,
              }), '_blank')}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#A855F7' }}
            >
              ⬡ Farcaster
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 w-full animate-slide-up stagger-6">
            <button
              onClick={() => { onClose(); router.push('/nfts'); }}
              className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--gradient-accent)', color: 'var(--bg-base)' }}
            >
              View My NFTs →
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm"
              style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              Continue Exploring
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fullBleed = false;

  return (
    <div className={`fixed inset-0 z-50 bg-[#070B14] ${step === 'minting' ? 'overflow-hidden' : 'overflow-y-auto scrollbar-hide'} flex flex-col`}>

      {/* Step progress indicator */}
      {(() => {
        const current = getCurrentStepIndex(step);
        return (
          <div className="flex-shrink-0 flex flex-col items-center pt-5 pb-3 px-6">
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
                        background: i < current ? 'rgba(56,240,255,0.5)' : 'var(--border-subtle)',
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
        className="flex-shrink-0 flex items-center justify-between px-4 py-3 z-10"
        style={{
          borderBottom: fullBleed ? 'none' : '1px solid rgba(255,255,255,0.05)',
          position: fullBleed ? 'absolute' : 'relative',
          top: 0, left: 0, right: 0,
          background: fullBleed ? 'linear-gradient(to bottom, rgba(7,11,20,0.9), transparent)' : '#070B14',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{mission.emoji}</span>
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
          ✕
        </button>
      </div>

      {/* Content */}
      <div className={`flex flex-col ${fullBleed ? 'flex-1' : 'px-4 py-4 max-w-2xl mx-auto w-full'}`}>

        {step === 'observing' && (
          <div className="flex flex-col gap-4 mt-2">
            <div
              className="rounded-xl p-6 text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto"
                style={{ background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.15)' }}
              >
                <Telescope size={22} className="text-[#FFD166]" />
              </div>
              <p className="text-white text-sm font-medium mb-2">
                Point your telescope at <span className="text-[#FFD166]">{mission.name}</span>
              </p>
              <p className="text-slate-600 text-xs leading-relaxed">{mission.hint}</p>
            </div>
            <Button variant="brass" onClick={() => { setMintError(''); setStep('camera'); }} className="w-full">
              Begin Observation →
            </Button>
          </div>
        )}

        {step === 'camera' && (
          <CameraCapture missionName={mission.name} onCapture={handleCapture} />
        )}

        {step === 'verifying' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <LoadingRing size={72} message="Analyzing sky conditions..." facts={[]} />
            <p className="text-[11px] font-body mt-2" style={{ color: 'var(--text-muted)' }}>This may take a moment</p>
          </div>
        )}

        {step === 'verified' && sky && (
          <>
            <Verification
              photo={photo}
              sky={sky}
              stars={sky.verified ? mission.stars : 0}
              timestamp={timestamp}
              latitude={coords.lat}
              longitude={coords.lon}
              onMint={handleMint}
            />
            {mintError && (
              <div className="mt-2 text-center">
                <p className="text-xs text-amber-400">{mintError}</p>
                {mintError.includes('cloudy') && (
                  <Link href="/sky" className="text-xs text-[#38F0FF] underline mt-1 inline-block">
                    Check sky forecast →
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {step === 'minting' && (
          <MintAnimation done={mintDone} slowMsg={showSlowMint} />
        )}
      </div>
    </div>
  );
}
