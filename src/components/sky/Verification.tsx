'use client';

import { Satellite, Cloud, Eye, Thermometer, Link2, Wifi, WifiOff, CheckCircle2, Trophy, Droplets, Wind, AlertTriangle } from 'lucide-react';
import type { FarmHawkResult, PollinetStatus } from '@/lib/types';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';

interface VerificationProps {
  photo: string;
  farmhawk: FarmHawkResult;
  pollinet: PollinetStatus;
  stars: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  onMint: () => void;
}

export default function Verification({ photo, farmhawk, pollinet, stars, timestamp, latitude, longitude, onMint }: VerificationProps) {
  return (
    <div className="flex flex-col gap-4">
      <img src={photo} alt="Captured observation" className="w-full max-w-md mx-auto rounded-xl border-2 border-[#34d399]" />

      <Card glow="emerald">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-[#34d399]" />
          <p className="text-[#34d399] font-semibold">Observation Verified!</p>
        </div>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          {new Date(timestamp).toLocaleString()} · {latitude.toFixed(4)}°N {longitude.toFixed(4)}°E
        </p>
      </Card>

      {/* FarmHawk card */}
      <div className="glass-card border border-[#38F0FF]/30 p-5 glow-cyan">
        <div className="flex items-center gap-2 mb-4">
          <Satellite size={16} className="text-[#38F0FF]" />
          <p className="text-[#38F0FF] font-semibold text-sm">FarmHawk Satellite Verification</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
          {[
            { icon: <Cloud size={13} />, label: 'Cloud Cover', value: `${farmhawk.cloudCover}%` },
            { icon: <Eye size={13} />, label: 'Visibility', value: farmhawk.visibility,
              color: farmhawk.visibility === 'Excellent' ? 'text-[#34d399]' : farmhawk.visibility === 'Good' ? 'text-[#FFD166]' : farmhawk.visibility === 'Fair' ? 'text-amber-400' : 'text-red-400' },
            { icon: <Thermometer size={13} />, label: 'Temperature', value: `${farmhawk.temperature}°C` },
            { icon: <Droplets size={13} />, label: 'Humidity', value: `${farmhawk.humidity}%` },
            { icon: <Wind size={13} />, label: 'Wind', value: `${farmhawk.windSpeed} km/h` },
          ].map(row => (
            <div key={row.label} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1 text-[var(--text-dim)] text-xs">{row.icon}{row.label}</div>
              <span className={`font-medium text-sm ${row.color ?? 'text-[var(--text-primary)]'}`}>{row.value}</span>
            </div>
          ))}
        </div>
        <p className="text-[var(--text-secondary)] text-xs mt-3 col-span-2 italic">{farmhawk.conditions}</p>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--border-glass)]">
          <div className="flex items-center gap-1.5">
            {farmhawk.verified
              ? <><CheckCircle2 size={14} className="text-[#34d399]" /><p className="text-[#34d399] font-semibold text-xs uppercase tracking-wide">Conditions Verified</p></>
              : <><AlertTriangle size={14} className="text-amber-400" /><p className="text-amber-400 font-semibold text-xs uppercase tracking-wide">Poor Conditions — proceed at own risk</p></>
            }
          </div>
          <span className="font-hash text-xs text-[var(--text-dim)]">{farmhawk.oracleHash.slice(0, 8)}...{farmhawk.oracleHash.slice(-4)}</span>
        </div>
        <p className="text-[var(--text-dim)] text-xs mt-1">{farmhawk.source}</p>
      </div>

      {/* Pollinet card */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          {pollinet.online ? <Wifi size={14} className="text-[#34d399]" /> : <WifiOff size={14} className="text-amber-400" />}
          <p className="text-[var(--text-secondary)] text-sm font-medium">Pollinet Network</p>
        </div>
        <p className="text-sm text-[var(--text-primary)]">
          {pollinet.online ? 'Online — submitting directly to Solana' : `Offline — mesh relay (${pollinet.peers} peers)`}
        </p>
      </Card>

      <Button variant="brass" onClick={onMint} className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2">
        <Trophy size={18} />
        Create Proof ✦ (+{stars} stars)
      </Button>
    </div>
  );
}
