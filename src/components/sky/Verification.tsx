'use client';

import type { FarmHawkResult, PollinetStatus } from '@/lib/types';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';

interface VerificationProps {
  photo: string;
  farmhawk: FarmHawkResult;
  pollinet: PollinetStatus;
  points: number;
  onMint: () => void;
}

export default function Verification({ photo, farmhawk, pollinet, points, onMint }: VerificationProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md mx-auto">
        <img src={photo} alt="Captured observation" className="w-full rounded-lg border-2 border-[#34d399]" />
      </div>

      <Card glow="emerald">
        <p className="text-[#34d399] font-semibold">✅ Observation Verified!</p>
        <p className="text-slate-400 text-sm">{new Date().toLocaleString()} · {
          navigator.geolocation ? 'Location acquired' : 'Location unavailable'
        }</p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <p className="text-slate-300 font-medium text-sm mb-3">🛰️ FarmHawk Oracle</p>
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-slate-400">Cloud cover: <span className="text-white">{farmhawk.cloudCover}%</span></p>
            <p className="text-slate-400">Visibility: <span className={
              farmhawk.visibility === 'Excellent' ? 'text-[#34d399]' :
              farmhawk.visibility === 'Good' ? 'text-[#c9a84c]' : 'text-red-400'
            }>{farmhawk.visibility}</span></p>
            <p className="text-slate-500 font-mono text-xs mt-1 truncate">{farmhawk.oracleHash.slice(0, 20)}...</p>
          </div>
        </Card>
        <Card>
          <p className="text-slate-300 font-medium text-sm mb-3">📡 Pollinet Status</p>
          <p className="text-sm">{pollinet.label}</p>
          {!pollinet.online && (
            <p className="text-slate-400 text-xs mt-1">{pollinet.peers} mesh peers active</p>
          )}
        </Card>
      </div>

      <Button variant="brass" onClick={onMint} className="w-full text-lg py-3">
        🏆 Mint Observation NFT (+{points} pts)
      </Button>
    </div>
  );
}
