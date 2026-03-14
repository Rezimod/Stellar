'use client';

import { useState, useEffect } from 'react';
import type { Mission, FarmHawkResult, PollinetStatus, MissionState } from '@/lib/types';
import { verifyWithFarmHawk } from '@/lib/farmhawk';
import { getPollinetStatus } from '@/lib/pollinet';
import { mintNFT } from '@/lib/solana';
import { generateSimPhoto } from '@/hooks/useCamera';
import { useAppState } from '@/hooks/useAppState';
import CameraCapture from './CameraCapture';
import Verification from './Verification';
import MintAnimation from '@/components/shared/MintAnimation';
import Button from '@/components/shared/Button';

interface MissionActiveProps {
  mission: Mission;
  onClose: () => void;
}

export default function MissionActive({ mission, onClose }: MissionActiveProps) {
  const { addMission } = useAppState();
  const [step, setStep] = useState<MissionState>('observing');
  const [photo, setPhoto] = useState('');
  const [farmhawk, setFarmhawk] = useState<FarmHawkResult | null>(null);
  const [pollinet, setPollinet] = useState<PollinetStatus | null>(null);
  const [mintDone, setMintDone] = useState(false);

  const handleCapture = async (p: string) => {
    setPhoto(p);
    setStep('verifying');
    console.log('[Verify] Starting FarmHawk verification');
    const [fh] = await Promise.all([
      verifyWithFarmHawk(41.7151, 44.8271), // Tbilisi coords
    ]);
    setFarmhawk(fh);
    setPollinet(getPollinetStatus());
    setStep('verified');
  };

  const handleMint = async () => {
    setStep('minting');
    console.log('[Mint] Minting observation NFT for', mission.name);
    const result = await mintNFT(`${mission.name} Observation`, 'OBS');
    setMintDone(true);
    setTimeout(() => {
      addMission({
        id: mission.id,
        name: mission.name,
        points: mission.points,
        txId: result.txId,
        photo,
        timestamp: new Date().toISOString(),
        farmhawk: farmhawk!,
        pollinet: pollinet!,
      });
      setStep('done');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05080f]/95 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
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
            <div className="border-2 border-dashed border-[#1a2d4d] rounded-xl p-8 text-center">
              <p className="text-4xl mb-4">🔭</p>
              <p className="text-slate-300 mb-2">Point your telescope at <span className="text-[#c9a84c]">{mission.name}</span></p>
              <p className="text-slate-500 text-sm italic">{mission.hint}</p>
            </div>
            <Button variant="brass" onClick={() => setStep('camera')} className="w-full">
              📷 Open Camera
            </Button>
          </div>
        )}

        {step === 'camera' && (
          <CameraCapture missionName={mission.name} onCapture={handleCapture} />
        )}

        {step === 'verifying' && (
          <div className="text-center py-12">
            <p className="text-4xl animate-spin-slow mb-4">🛰️</p>
            <p className="text-[#c9a84c] font-semibold">Verifying observation...</p>
            <p className="text-slate-400 text-sm mt-2">Querying FarmHawk satellite oracle</p>
          </div>
        )}

        {step === 'verified' && farmhawk && pollinet && (
          <Verification
            photo={photo}
            farmhawk={farmhawk}
            pollinet={pollinet}
            points={mission.points}
            onMint={handleMint}
          />
        )}

        {step === 'minting' && <MintAnimation done={mintDone} />}
      </div>
    </div>
  );
}
