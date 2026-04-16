'use client';

import { CheckCircle2, AlertTriangle, Wind, Thermometer, Droplets, Eye, Cloud } from 'lucide-react';
import type { SkyVerification } from '@/lib/types';
import { calculateSkyScore, visibilityToMeters } from '@/lib/sky-score';
import ScoreRing from '@/components/ui/ScoreRing';

interface VerificationProps {
  photo: string;
  sky: SkyVerification;
  stars: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  onMint: () => void;
  compact?: boolean;
}

export default function Verification({ photo, sky, stars, timestamp, latitude, longitude, onMint, compact = false }: VerificationProps) {
  const conditionOk = sky.verified;

  const skyScore = calculateSkyScore({
    cloudCover: sky.cloudCover,
    visibility: visibilityToMeters(sky.visibility),
    humidity: sky.humidity ?? 50,
    windSpeed: sky.windSpeed ?? 5,
  });

  const metrics = [
    { icon: <Cloud size={12} />, label: 'Cloud', value: `${sky.cloudCover}%`, bar: sky.cloudCover, good: sky.cloudCover < 30 },
    { icon: <Eye size={12} />, label: 'Visibility', value: sky.visibility, bar: null, good: conditionOk },
    { icon: <Thermometer size={12} />, label: 'Temp', value: `${sky.temperature}°C`, bar: null, good: true },
    { icon: <Droplets size={12} />, label: 'Humidity', value: `${sky.humidity}%`, bar: sky.humidity, good: (sky.humidity ?? 50) < 70 },
    { icon: <Wind size={12} />, label: 'Wind', value: `${sky.windSpeed} km/h`, bar: null, good: (sky.windSpeed ?? 0) < 30 },
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden animate-page-enter" style={{ gap: compact ? 8 : 12 }}>

      {/* Photo */}
      <div
        className="relative rounded-xl overflow-hidden bg-black flex-shrink-0"
        style={{ maxHeight: compact ? '30vh' : '35vh', aspectRatio: '4/3' }}
      >
        <img src={photo} alt="Observation" className="w-full h-full object-contain" style={{ opacity: 0.9 }} />
        <div
          className="absolute bottom-2 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        >
          <CheckCircle2 size={10} className="text-[#34d399]" />
          <span className="text-white text-[10px] font-medium">Observation Captured</span>
        </div>
        <div className="absolute bottom-2 right-2.5 text-[10px] font-mono text-white/40">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Data panel */}
      <div className="flex flex-col" style={{ gap: compact ? 6 : 10 }}>

        {/* Location + condition + score ring in one row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold w-fit"
              style={{
                background: conditionOk ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)',
                border: `1px solid ${conditionOk ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}`,
                color: conditionOk ? '#34d399' : '#fbbf24',
              }}
            >
              {conditionOk ? <><CheckCircle2 size={10} /> Clear sky</> : <><AlertTriangle size={10} /> Cloudy</>}
            </div>
            <p className="text-slate-600 text-[10px] mt-0.5 truncate">{latitude.toFixed(3)}°N {longitude.toFixed(3)}°E</p>
          </div>
          <div className="flex-shrink-0">
            <ScoreRing size={compact ? 60 : 72} value={skyScore.score} color="gradient" sublabel={skyScore.grade} />
          </div>
        </div>

        {/* Metric grid — 3 cols, max 2 rows */}
        <div
          className="rounded-xl p-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-1 h-1 rounded-full bg-[#38F0FF]/60" />
            <span className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">Sky Data</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-lg px-2 py-1.5 flex flex-col gap-0.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-1" style={{ color: m.good ? 'rgba(255,255,255,0.3)' : 'rgba(251,191,36,0.5)' }}>
                  {m.icon}
                  <span className="text-[9px] text-slate-600 truncate">{m.label}</span>
                </div>
                <p className="text-white text-[11px] font-semibold">{m.value}</p>
                {m.bar !== null && (
                  <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(m.bar as number, 100)}%`,
                      background: m.good ? 'rgba(52,211,153,0.6)' : 'rgba(251,191,36,0.6)',
                    }} />
                  </div>
                )}
              </div>
            ))}
            {/* Hash cell */}
            <div className="rounded-lg px-2 py-1.5 flex flex-col gap-0.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-[9px] text-slate-600">Hash</span>
              <p className="text-[#FFD166]/60 text-[10px] font-mono truncate">
                {sky.oracleHash.slice(0, 6)}…{sky.oracleHash.slice(-4)}
              </p>
            </div>
          </div>
        </div>

        {/* Oracle badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
            Sky Oracle · Open-Meteo · {new Date(sky.verifiedAt).toLocaleTimeString()}
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={onMint}
          className="w-full rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.97] hover:opacity-90 flex-shrink-0"
          style={{
            padding: compact ? '10px 0' : '14px 0',
            background: stars > 0
              ? 'linear-gradient(135deg, #FFD166, #CC9A33)'
              : 'linear-gradient(135deg, rgba(56,240,255,0.12), rgba(20,184,166,0.12))',
            color: stars > 0 ? '#070B14' : '#38F0FF',
            border: stars > 0 ? 'none' : '1px solid rgba(56,240,255,0.25)',
            boxShadow: stars > 0 ? '0 0 24px rgba(255,209,102,0.2)' : '0 0 16px rgba(56,240,255,0.08)',
          }}
        >
          {stars > 0 ? `Seal on Solana  +${stars} Stars` : 'Log Cloudy Observation'}
        </button>
      </div>
    </div>
  );
}
