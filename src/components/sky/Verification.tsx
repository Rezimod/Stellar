'use client';

import { CheckCircle2, AlertTriangle, Wind, Thermometer, Droplets, Eye, Cloud } from 'lucide-react';
import type { SkyVerification } from '@/lib/types';

interface VerificationProps {
  photo: string;
  sky: SkyVerification;
  stars: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  onMint: () => void;
}

export default function Verification({ photo, sky, stars, timestamp, latitude, longitude, onMint }: VerificationProps) {
  const conditionOk = sky.verified;

  const metrics = [
    { icon: <Cloud size={14} />, label: 'Cloud Cover', value: `${sky.cloudCover}%`, bar: sky.cloudCover, good: sky.cloudCover < 30 },
    { icon: <Eye size={14} />, label: 'Visibility', value: sky.visibility, bar: null, good: conditionOk },
    { icon: <Thermometer size={14} />, label: 'Temperature', value: `${sky.temperature}°C`, bar: null, good: true },
    { icon: <Droplets size={14} />, label: 'Humidity', value: `${sky.humidity}%`, bar: sky.humidity, good: sky.humidity < 70 },
    { icon: <Wind size={14} />, label: 'Wind Speed', value: `${sky.windSpeed} km/h`, bar: null, good: sky.windSpeed < 30 },
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
            <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">Sky Data</span>
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
            {/* Hash */}
            <div className="rounded-xl px-2.5 py-2 flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-[9px] text-slate-600">Hash</span>
              <p className="text-[#FFD166]/60 text-[10px] font-mono truncate">
                {sky.oracleHash.slice(0, 6)}…{sky.oracleHash.slice(-4)}
              </p>
            </div>
          </div>
        </div>

        {/* Sky Oracle badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            Sky Oracle · Open-Meteo · {new Date(sky.verifiedAt).toLocaleTimeString()}
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={onMint}
          className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.97] hover:opacity-90"
          style={{
            background: stars > 0
              ? 'linear-gradient(135deg, #FFD166, #CC9A33)'
              : 'linear-gradient(135deg, rgba(56,240,255,0.12), rgba(20,184,166,0.12))',
            color: stars > 0 ? '#070B14' : '#38F0FF',
            border: stars > 0 ? 'none' : '1px solid rgba(56,240,255,0.25)',
            boxShadow: stars > 0 ? '0 0 24px rgba(255,209,102,0.2)' : '0 0 16px rgba(56,240,255,0.08)',
          }}
        >
          {stars > 0 ? `Seal on Solana  ✦ +${stars}` : '☁  Log Cloudy Observation'}
        </button>
      </div>
    </div>
  );
}
