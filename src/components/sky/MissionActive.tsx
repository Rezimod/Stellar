'use client';

import { useState } from 'react';
import type { Mission, FarmHawkResult, PollinetStatus, MissionState } from '@/lib/types';
import { verifyWithFarmHawk } from '@/lib/farmhawk';
import { getPollinetStatus, queueOfflineObservation } from '@/lib/pollinet';
import { mintObservation } from '@/lib/solana';
import { getEmailKeypair, getEmailSendTransaction } from '@/lib/emailWallet';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useAppState } from '@/hooks/useAppState';
import { getUnlockedRewards, getRank } from '@/lib/rewards';
import CameraCapture from './CameraCapture';
import Verification from './Verification';
import MintAnimation from '@/components/shared/MintAnimation';
import Button from '@/components/shared/Button';
import { Copy, Check, Telescope, Satellite, Award } from 'lucide-react';
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
  const { state, addMission } = useAppState();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [step, setStep] = useState<MissionState>('observing');
  const [photo, setPhoto] = useState('');
  const [farmhawk, setFarmhawk] = useState<FarmHawkResult | null>(null);
  const [pollinet, setPollinet] = useState<PollinetStatus | null>(null);
  const [coords, setCoords] = useState({ lat: 41.7151, lon: 44.8271 });
  const [timestamp, setTimestamp] = useState('');
  const [mintDone, setMintDone] = useState(false);
  const [mintError, setMintError] = useState('');
  const [newRewards, setNewRewards] = useState<NewReward[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

    const ps = getPollinetStatus();
    setPollinet(ps);

    if (!navigator.onLine) {
      console.log('[Pollinet] Offline — queuing observation');
      const offlineMission = {
        id: mission.id,
        name: mission.name,
        emoji: mission.emoji,
        stars: mission.stars,
        txId: 'pending',
        photo: p,
        timestamp: ts,
        latitude: lat,
        longitude: lon,
        farmhawk: null,
        pollinet: { mode: 'queued' as const, peers: ps.peers },
        status: 'pending' as const,
      };
      await queueOfflineObservation(offlineMission);
      addMission(offlineMission);
      onClose();
      return;
    }

    setStep('verifying');
    console.log('[Verify] Starting FarmHawk verification');
    const fh = await verifyWithFarmHawk(lat, lon);
    setFarmhawk(fh);
    setStep('verified');
  };

  const handleMint = async () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setStep('minting');
    console.log('[Mint] Creating observation proof for', mission.name);

    // Snapshot unlocked rewards before minting
    const prevCompleted = state.completedMissions
      .filter(m => m.status === 'completed')
      .map(m => m.id);
    const prevRank = getRank(prevCompleted.length).name;
    const prevUnlocked = getUnlockedRewards(prevCompleted, prevRank)
      .filter(r => r.unlocked)
      .map(r => r.id);

    setMintError('');
    // Use Phantom wallet or fall back to email keypair
    const emailKeypair = !publicKey ? getEmailKeypair() : null;
    const effectiveKey = publicKey ?? emailKeypair?.publicKey ?? null;
    const send = publicKey
      ? (tx: Parameters<typeof sendTransaction>[0]) => sendTransaction(tx, connection)
      : (getEmailSendTransaction() as Parameters<typeof mintObservation>[0]);
    const result = await mintObservation(send, effectiveKey, {
      target: mission.name,
      timestamp,
      lat: coords.lat,
      lon: coords.lon,
      cloudCover: farmhawk?.cloudCover ?? 0,
      oracleHash: farmhawk?.oracleHash ?? 'sim',
      stars: mission.stars,
    });
    if (result.method === 'simulated' && result.error) {
      setMintError(result.error);
    }
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
        txId: result.txId,
        photo,
        timestamp,
        latitude: coords.lat,
        longitude: coords.lon,
        farmhawk: farmhawk!,
        pollinet: { mode: pollinet!.mode, peers: pollinet!.peers },
        status: 'completed',
        method: result.method === 'onchain' ? 'onchain' : 'simulated',
      });

      if (justUnlocked.length > 0) {
        setNewRewards(justUnlocked.map(r => ({ icon: r.icon, name: r.name, description: r.description, code: r.code })));
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        setStep('done');
        onClose();
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

  const fullBleed = step === 'verified';

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
            <Button variant="brass" onClick={() => setStep('camera')} className="w-full">
              Begin Observation →
            </Button>
          </div>
        )}

        {step === 'camera' && (
          <CameraCapture missionName={mission.name} onCapture={handleCapture} />
        )}

        {step === 'verifying' && (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center animate-spin-slow"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Satellite size={22} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-white text-sm font-medium">Scanning sky conditions</p>
              <p className="text-slate-600 text-xs mt-1">Fetching satellite data for your location…</p>
            </div>
          </div>
        )}

        {step === 'verified' && farmhawk && pollinet && (
          <Verification
            photo={photo}
            farmhawk={farmhawk}
            pollinet={pollinet}
            stars={mission.stars}
            timestamp={timestamp}
            latitude={coords.lat}
            longitude={coords.lon}
            onMint={handleMint}
          />
        )}

        {step === 'minting' && (
          <>
            <MintAnimation done={mintDone} />
            {mintError && (
              <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[70] p-3 rounded-lg backdrop-blur-sm"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <p className="text-amber-400 text-xs font-medium">Saved locally — on-chain failed</p>
                <p className="text-slate-600 text-xs mt-0.5">{mintError}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
