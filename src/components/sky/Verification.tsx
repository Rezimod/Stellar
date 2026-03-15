'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Wifi, WifiOff, Wind, Thermometer, Droplets, Eye, Cloud } from 'lucide-react';
import type { FarmHawkResult, PollinetStatus } from '@/lib/types';

interface VerificationProps {
  photo: string;
  farmhawk: FarmHawkResult;
  pollinet: PollinetStatus;
  stars: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  onMint: () => void;
  onQueueOffline: () => void;
}

export default function Verification({ photo, farmhawk, pollinet, stars, timestamp, latitude, longitude, onMint, onQueueOffline }: VerificationProps) {
  const conditionOk = farmhawk.verified;
  const [offlineMode, setOfflineMode] = useState(!pollinet.online);

  const metrics = [
    { icon: <Cloud size={14} />, label: 'Cloud Cover', value: `${farmhawk.cloudCover}%`, bar: farmhawk.cloudCover, good: farmhawk.cloudCover < 30 },
    { icon: <Eye size={14} />, label: 'Visibility', value: farmhawk.visibility, bar: null, good: conditionOk },
    { icon: <Thermometer size={14} />, label: 'Temperature', value: `${farmhawk.temperature}°C`, bar: null, good: true },
    { icon: <Droplets size={14} />, label: 'Humidity', value: `${farmhawk.humidity}%`, bar: farmhawk.humidity, good: farmhawk.humidity < 70 },
    { icon: <Wind size={14} />, label: 'Wind Speed', value: `${farmhawk.windSpeed} km/h`, bar: null, good: farmhawk.windSpeed < 30 },
  ];

  return (
    <div className="flex flex-col w-full gap-4 mt-2 animate-page-enter">

      {/* Photo — full 4:3 so nothing is cropped */}
      <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '4/3', maxHeight: 220 }}>
        <img src={photo} alt="Observation" className="w-full h-full object-contain" style={{ opacity: 0.9 }} />
        <div
          className="absolute bottom-2.5 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        >
          <CheckCircle2 size={11} className="text-[#34d399]" />
          <span className="text-white text-[11px] font-medium">Observation Captured</span>
        </div>
        <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-white/40">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Data panel */}
      <div className="flex flex-col gap-3">

        {/* Location + condition badge */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-semibold">Verified</p>
            <p className="text-slate-600 text-xs mt-0.5">{latitude.toFixed(4)}°N {longitude.toFixed(4)}°E</p>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
            style={{
              background: conditionOk ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)',
              border: `1px solid ${conditionOk ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}`,
              color: conditionOk ? '#34d399' : '#fbbf24',
            }}
          >
            {conditionOk ? <><CheckCircle2 size={11} /> Clear sky</> : <><AlertTriangle size={11} /> Cloudy</>}
          </div>
        </div>

        {/* Metric grid */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#38F0FF]/60" />
            <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">Satellite Data</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-xl px-2.5 py-2 flex flex-col gap-1"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-1" style={{ color: m.good ? 'rgba(255,255,255,0.3)' : 'rgba(251,191,36,0.5)' }}>
                  {m.icon}
                  <span className="text-[9px] text-slate-600 truncate">{m.label}</span>
                </div>
                <p className="text-white text-xs font-semibold">{m.value}</p>
                {m.bar !== null && (
                  <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(m.bar, 100)}%`,
                      background: m.good ? 'rgba(52,211,153,0.6)' : 'rgba(251,191,36,0.6)',
                    }} />
                  </div>
                )}
              </div>
            ))}
            {/* Oracle */}
            <div className="rounded-xl px-2.5 py-2 flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-[9px] text-slate-600">Oracle</span>
              <p className="text-[#FFD166]/60 text-[10px] font-mono truncate">
                {farmhawk.oracleHash.slice(0, 6)}…{farmhawk.oracleHash.slice(-4)}
              </p>
            </div>
          </div>
        </div>

        {/* Pollinet toggle — click to switch online/offline mode */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOfflineMode(m => !m)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: offlineMode ? 'rgba(251,191,36,0.06)' : 'rgba(52,211,153,0.06)',
              border: `1px solid ${offlineMode ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.15)'}`,
            }}
            title={offlineMode ? 'Click to submit live to Solana' : 'Click to queue offline'}
          >
            {offlineMode
              ? <WifiOff size={11} className="text-amber-400" />
              : <Wifi size={11} className="text-[#34d399]" />
            }
            <span className="text-[10px] font-medium" style={{ color: offlineMode ? '#fbbf24' : '#34d399' }}>
              {offlineMode ? 'Offline · Queue' : 'Pollinet · Live'}
            </span>
          </button>

          {farmhawk.receipt && (
            <details className="text-right">
              <summary className="text-slate-700 text-[10px] cursor-pointer hover:text-slate-500 select-none list-none">
                Oracle receipt ›
              </summary>
              <div className="absolute right-4 mt-2 p-3 rounded-lg font-mono text-[9px] text-slate-600 z-10 text-left"
                style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.06)', maxWidth: 240 }}>
                <p>hash: <span className="text-[#FFD166]/60">{farmhawk.receipt.hash.slice(0,16)}…</span></p>
                <p>coords: {farmhawk.receipt.coordinates.lat.toFixed(3)}N</p>
              </div>
            </details>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={offlineMode ? onQueueOffline : onMint}
          className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.98]"
          style={offlineMode ? {
            background: 'rgba(251,191,36,0.12)',
            border: '1px solid rgba(251,191,36,0.3)',
            color: '#fbbf24',
          } : {
            background: 'linear-gradient(135deg, #FFD166, #CC9A33)',
            color: '#070B14',
            boxShadow: '0 0 24px rgba(255,209,102,0.2)',
          }}
        >
          {offlineMode ? '⏳ Queue for Later' : `Create Proof ✦ +${stars} stars`}
        </button>

        {offlineMode && (
          <p className="text-center text-[10px] text-slate-600">
            Saved locally. Auto-submits to Solana devnet when back online.
          </p>
        )}
      </div>
    </div>
  );
}
