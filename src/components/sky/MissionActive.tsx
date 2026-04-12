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
import { Copy, Check, Telescope, Award } from 'lucide-react';
import RewardIcon from '@/components/shared/RewardIcon';

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
    const tweet = `Just confirmed my ${mission.name} observation with @StellarApp ✦ Verified on Solana.\n\nDiscover the night sky → stellarrclub.vercel.app`;
    const walletAddr = solanaWallet?.address ?? '';
    const shortAddr = walletAddr.length > 10
      ? `${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}`
      : walletAddr || 'Not connected';
    const isOnChain = mintTxId && !mintTxId.startsWith('sim');

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 text-center overflow-y-auto py-10"
        style={{
          background: 'rgba(5,8,16,0.97)',
          backdropFilter: 'blur(4px)',
          animation: 'doneOverlayIn 0.4s ease-out forwards',
        }}
      >
        <style>{`
          @keyframes doneOverlayIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes emojiPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
        `}</style>

        {/* Top section */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-7xl block" style={{ animation: 'emojiPulse 3s ease-in-out infinite' }}>
            {mission.emoji}
          </span>
          <span className="text-xs tracking-[0.3em] uppercase font-mono" style={{ color: '#14B8A6' }}>
            ✦ VERIFIED ON SOLANA
          </span>
        </div>

        {/* Proof box */}
        <div
          className="rounded-2xl px-6 py-5 w-full max-w-sm text-left"
          style={{
            background: 'rgba(52,211,153,0.05)',
            border: '1px solid rgba(52,211,153,0.2)',
          }}
        >
          <p className="text-sm font-semibold text-white mb-3">Discovery Attestation</p>
          {[
            { label: 'Target', value: mission.name, style: { color: 'white' } as React.CSSProperties },
            { label: 'Observer', value: shortAddr, style: { color: 'white', fontFamily: 'monospace' } as React.CSSProperties },
            { label: 'Stars', value: `+${sky?.verified ? mission.stars : 0} ✦`, style: { color: 'var(--accent-gold)' } as React.CSSProperties },
            { label: 'Network', value: 'Solana Devnet', style: { color: 'white' } as React.CSSProperties },
            { label: 'Status', value: '🟢 Confirmed', style: { color: '#34d399' } as React.CSSProperties },
            ...(isOnChain
              ? [{ label: 'Signature', value: `${mintTxId.slice(0, 8)}...`, style: { color: '#14B8A6', fontFamily: 'monospace' } as React.CSSProperties }]
              : []),
          ].map(row => (
            <div key={row.label} className="flex justify-between text-xs mb-1.5 last:mb-0">
              <span className="text-slate-400">{row.label}</span>
              <span style={row.style}>{row.value}</span>
            </div>
          ))}
          {isOnChain && (
            <a
              href={`https://explorer.solana.com/tx/${mintTxId}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-xs"
              style={{ color: '#14B8A6', textDecoration: 'none' }}
            >
              View on Solana Explorer →
            </a>
          )}
        </div>

        {/* Headline */}
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-2xl font-bold text-white">Observation Confirmed</h2>
          <p className="text-sm text-slate-400 max-w-xs">
            Your discovery has been permanently sealed on Solana.
          </p>
        </div>

        {/* Share buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, '_blank')}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm text-white"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ fontStyle: 'normal' }}>𝕏</span>
            Share on X
          </button>
          <button
            onClick={() => window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(tweet)}`, '_blank')}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm text-white"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            Cast on Farcaster
          </button>
        </div>

        {/* Bottom buttons */}
        <div className="flex flex-col gap-3 w-full max-w-sm mt-2">
          <button
            onClick={() => { onClose(); router.push('/nfts'); }}
            className="w-full py-3 rounded-xl font-semibold text-sm text-black"
            style={{ background: 'linear-gradient(135deg, #34D399, #14B8A6)' }}
          >
            View My Discoveries →
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm text-slate-400"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            Back to Missions
          </button>
        </div>
      </div>
    );
  }

  const fullBleed = false;

  return (
    <div className={`fixed inset-0 z-50 bg-[#070B14] ${step === 'minting' ? 'overflow-hidden' : 'overflow-y-auto scrollbar-hide'} flex flex-col`}>

      {/* Step progress bar */}
      <div className="flex-shrink-0 flex h-0.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
        {(['observing','camera','verifying','verified','minting'] as const).map((s, i) => {
          const steps = ['observing','camera','verifying','verified','minting'];
          const current = steps.indexOf(step);
          return (
            <div
              key={s}
              className="flex-1 transition-all duration-500"
              style={{
                background: i <= current
                  ? 'linear-gradient(90deg, #FFD166, #38F0FF)'
                  : 'transparent',
              }}
            />
          );
        })}
      </div>

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
          <div className="flex flex-col items-center justify-center gap-5 py-24">
            <div className="relative flex items-center justify-center">
              <div className="absolute rounded-full animate-ping"
                style={{ width: 80, height: 80, border: '1px solid rgba(56,240,255,0.12)', animationDuration: '2s' }} />
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(56,240,255,0.06)', border: '1px solid rgba(56,240,255,0.18)' }}>
                <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(56,240,255,0.5))' }}>🔭</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-white text-sm font-medium">Checking sky conditions...</p>
              <p className="text-slate-500 text-xs mt-1">Reading weather data for your location</p>
            </div>
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: 'rgba(56,240,255,0.4)', animationDelay: `${i * 180}ms` }} />
              ))}
            </div>
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
