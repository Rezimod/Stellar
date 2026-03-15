'use client';

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
}

export default function Verification({ photo, farmhawk, pollinet, stars, timestamp, latitude, longitude, onMint }: VerificationProps) {
  const conditionOk = farmhawk.verified;

  const metrics = [
    {
      icon: <Cloud size={14} />,
      label: 'Cloud Cover',
      value: `${farmhawk.cloudCover}%`,
      bar: farmhawk.cloudCover,
      good: farmhawk.cloudCover < 30,
    },
    {
      icon: <Eye size={14} />,
      label: 'Visibility',
      value: farmhawk.visibility,
      bar: null,
      good: conditionOk,
    },
    {
      icon: <Thermometer size={14} />,
      label: 'Temperature',
      value: `${farmhawk.temperature}°C`,
      bar: null,
      good: true,
    },
    {
      icon: <Droplets size={14} />,
      label: 'Humidity',
      value: `${farmhawk.humidity}%`,
      bar: farmhawk.humidity,
      good: farmhawk.humidity < 70,
    },
    {
      icon: <Wind size={14} />,
      label: 'Wind Speed',
      value: `${farmhawk.windSpeed} km/h`,
      bar: null,
      good: farmhawk.windSpeed < 30,
    },
  ];

  return (
    <div className="flex flex-col w-full -mx-4 -mt-4 sm:-mx-0 sm:-mt-0 animate-page-enter">

      {/* Photo header */}
      <div className="relative bg-black" style={{ height: '38vh', minHeight: 180 }}>
        <img
          src={photo}
          alt="Observation"
          className="w-full h-full object-cover"
          style={{ opacity: 0.9 }}
        />
        {/* Verified badge overlay */}
        <div
          className="absolute bottom-3 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        >
          <CheckCircle2 size={12} className="text-[#34d399]" />
          <span className="text-white text-xs font-medium">Observation Captured</span>
        </div>
        <div className="absolute bottom-3 right-4 text-[10px] font-mono text-white/40">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Data panel */}
      <div className="px-4 pt-5 pb-4 flex flex-col gap-4 max-w-2xl mx-auto w-full">

        {/* Location + condition badge */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-semibold">Verified</p>
            <p className="text-slate-600 text-xs mt-0.5">
              {latitude.toFixed(4)}°N {longitude.toFixed(4)}°E
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
            style={{
              background: conditionOk ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)',
              border: `1px solid ${conditionOk ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}`,
              color: conditionOk ? '#34d399' : '#fbbf24',
            }}
          >
            {conditionOk
              ? <><CheckCircle2 size={11} /> Clear sky</>
              : <><AlertTriangle size={11} /> Cloudy</>
            }
          </div>
        </div>

        {/* Satellite data — metric grid */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#38F0FF]/60" />
            <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">Satellite Data</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((m, i) => (
              <div
                key={m.label}
                className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5 animate-slide-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5" style={{ color: m.good ? 'rgba(255,255,255,0.35)' : 'rgba(251,191,36,0.5)' }}>
                    {m.icon}
                    <span className="text-[10px] text-slate-600">{m.label}</span>
                  </div>
                </div>
                <p className="text-white text-sm font-semibold">{m.value}</p>
                {m.bar !== null && (
                  <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(m.bar, 100)}%`,
                        background: m.good ? 'rgba(52,211,153,0.6)' : 'rgba(251,191,36,0.6)',
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            {/* Oracle hash cell */}
            <div
              className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span className="text-[10px] text-slate-600">Oracle</span>
              <p className="text-[#FFD166]/60 text-xs font-mono">{farmhawk.oracleHash.slice(0, 6)}…{farmhawk.oracleHash.slice(-4)}</p>
            </div>
          </div>
        </div>

        {/* Network */}
        <div className="flex items-center gap-2">
          {pollinet.online
            ? <Wifi size={12} className="text-slate-600" />
            : <WifiOff size={12} className="text-slate-600" />
          }
          <span className="text-slate-600 text-xs">
            Pollinet · {pollinet.online ? 'Direct to Solana' : `Mesh relay (${pollinet.peers} peers)`}
          </span>
        </div>

        {/* Oracle receipt (collapsed) */}
        {farmhawk.receipt && (
          <details>
            <summary className="text-slate-700 text-[10px] cursor-pointer hover:text-slate-500 transition-colors select-none">
              View oracle receipt ›
            </summary>
            <div
              className="mt-2 p-3 rounded-lg font-mono text-[9px] text-slate-700 leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
            >
              <p>oracle: <span className="text-slate-500">{farmhawk.receipt.oracle}</span></p>
              <p>hash: <span className="text-[#FFD166]/60">{farmhawk.receipt.hash}</span></p>
              <p>feed: {farmhawk.receipt.feed}</p>
              <p>coords: {farmhawk.receipt.coordinates.lat.toFixed(4)}N {farmhawk.receipt.coordinates.lon.toFixed(4)}E</p>
              <p>ts: {farmhawk.receipt.timestamp}</p>
            </div>
          </details>
        )}

        {/* CTA */}
        <button
          onClick={onMint}
          className="w-full py-4 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.98] mt-1"
          style={{
            background: 'linear-gradient(135deg, #FFD166, #CC9A33)',
            color: '#070B14',
            boxShadow: '0 0 24px rgba(255,209,102,0.2), 0 0 48px rgba(255,209,102,0.08)',
          }}
        >
          Create Proof  ✦  +{stars} stars
        </button>
      </div>
    </div>
  );
}
