'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Mission, SkyVerification, MissionState } from '@/lib/types';
import { usePrivy } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import { getUnlockedRewards, getRank } from '@/lib/rewards';
import CameraCapture from './CameraCapture';
import Verification from './Verification';
import MintAnimation from '@/components/shared/MintAnimation';
import Button from '@/components/shared/Button';
import { Copy, Check, Telescope, Award, ExternalLink } from 'lucide-react';
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
      console.log('[GPS] Unavailable, using Tbilisi coords');
    }
    setCoords({ lat, lon });

    if (!navigator.onLine) {
      setMintError('No internet connection — try again when back online');
      setStep('verified');
      return;
    }

    setStep('verifying');
    const res = await fetch(`/api/sky/verify?lat=${lat}&lon=${lon}`);
    const skyData: SkyVerification = await res.json();
    setSky(skyData);
    setStep('verified');
  };

  const handleMint = async () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setStep('minting');

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
          target: mission.name,
          timestampMs: new Date(timestamp).getTime(),
          lat: coords.lat,
          lon: coords.lon,
          cloudCover: sky?.cloudCover ?? 0,
          oracleHash: sky?.oracleHash ?? 'sim',
          stars: mission.stars,
        }),
      });
      clearTimeout(timer);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Mint failed' }));
        setMintError(err.error ?? 'Mint failed');
        setStep('verified');
        return;
      }

      const data = await res.json();
      txId = data.txId;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Mint failed';
      setMintError(msg);
      setStep('verified');
      return;
    }

    fetch('/api/award-stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientAddress: solanaWallet?.address, amount: mission.stars, reason: mission.name }),
    }).catch(() => {});

    setMintTxId(txId);
    setMintDone(true);
    setTimeout(() => {
      const newCompleted = [...prevCompleted, mission.id];
      const newRank = getRank(newCompleted.length).name;
      const nowUnlocked = getUnlockedRewards(newCompleted, newRank).filter(r => r.unlocked);
      const justUnlocked = nowUnlocked.filter(r => !prevUnlocked.includes(r.id));

      addMission({
        id: mission.id,
        name: mission.name,
        emoji: mission.emoji,
        stars: mission.stars,
        txId,
        photo,
        timestamp,
        latitude: coords.lat,
        longitude: coords.lon,
        sky: sky!,
        status: 'completed',
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
    return (
      <div className="fixed inset-0 z-[60] bg-[#070B14] overflow-hidden flex flex-col items-center"
        style={{ animation: 'doneFadeIn 0.4s ease-out forwards' }}>
        <style>{`
          @keyframes doneFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes starShimmer {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          @keyframes checkDraw {
            from { stroke-dashoffset: 40; }
            to { stroke-dashoffset: 0; }
          }
        `}</style>
        <div className="max-w-sm w-full mx-auto flex flex-col items-center pt-20 px-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle, rgba(52,211,153,0.15), transparent)',
              border: '2px solid rgba(52,211,153,0.3)',
            }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 16l6 6 10-12" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="40" strokeDashoffset="40"
                style={{ animation: 'checkDraw 0.6s ease-out 0.3s forwards' }} />
            </svg>
          </div>

          <h2 className="text-2xl text-white mt-6 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
            Discovery Sealed
          </h2>
          <p className="text-slate-400 text-sm mt-2">{mission.emoji} {mission.name}</p>
          <p className="text-[#FFD166] text-lg font-bold mt-3"
            style={{ animation: 'starShimmer 2s ease-in-out infinite' }}>
            +{mission.stars} ✦
          </p>

          {mintTxId && !mintTxId.startsWith('sim') && (
            <a href={`https://explorer.solana.com/tx/${mintTxId}?cluster=devnet`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full text-xs transition-colors"
              style={{
                background: 'rgba(56,240,255,0.06)',
                border: '1px solid rgba(56,240,255,0.15)',
                color: '#38F0FF',
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(56,240,255,0.12)')}
              onMouseOut={e => (e.currentTarget.style.background = 'rgba(56,240,255,0.06)')}>
              Verified on Solana <ExternalLink size={12} />
            </a>
          )}

          <div className="w-12 h-px my-6" style={{ background: 'rgba(255,255,255,0.1)' }} />

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => router.push('/nfts')}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-colors"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
              View My Collection
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-black text-sm font-semibold"
              style={{ background: 'linear-gradient(to right, #FFD166, #E8B84A)' }}>
              Continue Observing
            </button>
          </div>

          <div className="w-full mt-4 pt-4 border-t border-white/[0.06]">
            <p className="text-center text-[10px] text-white/20 mb-3">Share your discovery</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const text = encodeURIComponent(`I just observed ${mission.name} and sealed it on Solana ✦\n\nstellarrclub.vercel.app`);
                  window.open(`https://warpcast.com/~/compose?text=${text}`, '_blank');
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-[rgba(132,101,203,0.08)] border border-[rgba(132,101,203,0.2)] text-[#8465CB] hover:bg-[rgba(132,101,203,0.15)] transition-colors"
              >
                Warpcast
              </button>
              <button
                onClick={() => {
                  const text = encodeURIComponent(`Just observed ${mission.name} and sealed it as a compressed NFT on @solana ✦\n\nstellarrclub.vercel.app`);
                  window.open(`https://x.com/intent/tweet?text=${text}`, '_blank');
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-[rgba(255,255,255,0.04)] border border-white/[0.08] text-white/60 hover:bg-white/[0.08] transition-colors"
              >
                Post on X
              </button>
            </div>
          </div>

          <p className="mt-8 text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
            Compressed NFT · Solana Devnet · {new Date().toLocaleDateString()}
          </p>
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
              stars={mission.stars}
              timestamp={timestamp}
              latitude={coords.lat}
              longitude={coords.lon}
              onMint={handleMint}
            />
            {mintError && (
              <p className="mt-2 text-center text-xs text-amber-400">{mintError}</p>
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
