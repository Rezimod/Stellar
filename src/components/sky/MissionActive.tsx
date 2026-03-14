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
      } else {
        setStep('done');
        onClose();
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
      <div className="fixed inset-0 z-[60] bg-[#070B14]/95 overflow-y-auto flex items-start sm:items-center justify-center p-4 pt-12 sm:pt-4">
        <div className="glass-card glow-emerald max-w-sm w-full p-5 flex flex-col gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-[#34d399]/10 border border-[#34d399]/20 flex items-center justify-center mx-auto">
            <Award size={28} className="text-[#34d399]" />
          </div>
          <h2 className="text-xl font-bold text-[#34d399]">Reward Unlocked!</h2>
          {newRewards.map(r => (
            <div key={r.name} className="bg-[#070B14] border border-[#34d399]/20 rounded-xl p-4 text-left flex flex-col gap-2">
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
          <div className="flex gap-3 mt-1">
            <a href="https://astroman.ge" target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center text-xs py-2.5 px-3 border border-[#FFD166]/30 text-[#FFD166] rounded-lg hover:bg-[#FFD166]/10 transition-all">
              Visit astroman.ge →
            </a>
            <button onClick={() => { setStep('done'); onClose(); }}
              className="flex-1 text-xs py-2.5 px-3 bg-[#34d399]/10 border border-[#34d399]/30 text-[#34d399] rounded-lg hover:bg-[#34d399]/20 transition-all">
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 bg-[#070B14]/95 ${step === 'minting' ? 'overflow-hidden' : 'overflow-y-auto scrollbar-hide'} flex flex-col`}>
      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-8 flex-1 flex flex-col w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{mission.emoji}</span>
            <div>
              <h2 className="text-xl font-bold text-white">{mission.name}</h2>
              <p className="text-slate-400 text-sm">{mission.desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl px-2">✕</button>
        </div>

        {step === 'observing' && (
          <div className="flex flex-col gap-4">
            <div className="border-2 border-dashed border-[rgba(56, 240, 255, 0.12)] rounded-xl p-4 sm:p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#FFD166]/10 border border-[#FFD166]/20 flex items-center justify-center mb-4 mx-auto">
                <Telescope size={28} className="text-[#FFD166]" />
              </div>
              <p className="text-slate-300 mb-2">Point your telescope at <span className="text-[#FFD166]">{mission.name}</span></p>
              <p className="text-slate-500 text-sm italic">{mission.hint}</p>
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
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#38F0FF]/10 border border-[#38F0FF]/20 flex items-center justify-center mb-4 mx-auto animate-spin-slow">
              <Satellite size={28} className="text-[#38F0FF]" />
            </div>
            <p className="text-[#38F0FF] font-semibold">Scanning sky conditions at your location...</p>
            <p className="text-slate-400 text-sm mt-2">Verify with Satellite 🛰️</p>
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
          <div>
            <MintAnimation done={mintDone} />
            {mintError && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-amber-400 text-xs font-medium">⚠️ Saved locally — on-chain failed</p>
                <p className="text-slate-500 text-xs mt-0.5">{mintError}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
