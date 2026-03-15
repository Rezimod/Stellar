'use client';

import { useEffect, useState, useRef } from 'react';
import { useCamera, generateSimPhoto } from '@/hooks/useCamera';
import { RefreshCw, RotateCcw, Camera } from 'lucide-react';

interface CameraCaptureProps {
  missionName: string;
  onCapture: (photo: string) => void;
}

export default function CameraCapture({ missionName, onCapture }: CameraCaptureProps) {
  const { videoRef, error, facingMode, startCamera, flipCamera, stopCamera, capture } = useCamera();
  const [preview, setPreview] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const autoSimDone = useRef(false);

  useEffect(() => {
    startCamera('environment');
    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-generate sim photo if camera unavailable
  useEffect(() => {
    if (error === 'permission_denied' && !autoSimDone.current && !preview) {
      autoSimDone.current = true;
      setTimeout(() => setPreview(generateSimPhoto(missionName)), 400);
    }
  }, [error, missionName, preview]);

  const handleCapture = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    const photo = capture(missionName);
    stopCamera();
    setPreview(photo);
  };

  const handleRetake = () => {
    setPreview(null);
    autoSimDone.current = false;
    startCamera('environment');
  };

  // Preview screen
  if (preview) {
    return (
      <div className="flex flex-col gap-3 w-full">
        <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
          <img src={preview} alt="Observation preview" className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
            <p className="text-[#FFD166] text-[10px] font-mono tracking-widest">STELLAR · {missionName.toUpperCase()} · CAPTURED</p>
          </div>
        </div>
        <button
          onClick={() => onCapture(preview)}
          className="w-full py-4 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
        >
          Submit for Verification →
        </button>
        <button
          onClick={handleRetake}
          className="w-full py-3 rounded-xl text-sm text-slate-400 flex items-center justify-center gap-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <RotateCcw size={14} /> Retake
        </button>
      </div>
    );
  }

  // Loading / waiting for camera
  if (error === 'permission_denied') {
    // Will auto-sim — show brief loading state
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,209,102,0.06)', border: '1px solid rgba(255,209,102,0.15)' }}>
          <Camera size={22} className="text-[#FFD166]/60" />
        </div>
        <div>
          <p className="text-white text-sm font-medium">Preparing observation…</p>
          <p className="text-slate-600 text-xs mt-1">Generating simulated sky photo</p>
        </div>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-1 h-1 rounded-full bg-[#FFD166]/40 animate-bounce" style={{ animationDelay: `${i * 160}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // Live viewfinder
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Viewfinder */}
      <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {flash && <div className="absolute inset-0 bg-white/30 pointer-events-none" />}

        {/* Corner brackets */}
        {[
          { top: '10%', left: '8%',    borderTop: '2px solid rgba(255,209,102,0.7)', borderLeft:  '2px solid rgba(255,209,102,0.7)' },
          { top: '10%', right: '8%',   borderTop: '2px solid rgba(255,209,102,0.7)', borderRight: '2px solid rgba(255,209,102,0.7)' },
          { bottom: '10%', left: '8%', borderBottom: '2px solid rgba(255,209,102,0.7)', borderLeft:  '2px solid rgba(255,209,102,0.7)' },
          { bottom: '10%', right: '8%',borderBottom: '2px solid rgba(255,209,102,0.7)', borderRight: '2px solid rgba(255,209,102,0.7)' },
        ].map((s, i) => <div key={i} className="absolute w-5 h-5 pointer-events-none" style={s} />)}

        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-1 h-1 rounded-full bg-white/40" />
        </div>

        {/* Top HUD */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2.5" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)' }}>
          <span className="text-[#FFD166] text-[10px] font-mono tracking-widest uppercase">STELLAR · {missionName}</span>
          <span className="text-white/40 text-[10px] font-mono">{new Date().toLocaleTimeString()}</span>
        </div>

        {/* Flip button */}
        <button
          onClick={flipCamera}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center active:scale-90"
          style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <RefreshCw size={14} className="text-white/70" />
        </button>
      </div>

      {/* Shutter */}
      <div className="flex items-center justify-center py-2">
        <button
          onClick={handleCapture}
          className="w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '2px solid rgba(255,255,255,0.3)',
            boxShadow: '0 0 0 6px rgba(255,255,255,0.04)',
          }}
        >
          <div className="w-11 h-11 rounded-full" style={{ background: '#fff' }} />
        </button>
      </div>

      {/* Capture guide */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2.5 font-medium">How to capture</p>
        <div className="flex flex-col gap-2">
          {[
            { n: '1', text: 'Point your telescope at the target object' },
            { n: '2', text: 'Hold your phone camera to the eyepiece' },
            { n: '3', text: 'Center the object in the reticle, then press the shutter' },
          ].map(tip => (
            <div key={tip.n} className="flex items-start gap-2.5">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-px"
                style={{ background: 'rgba(255,209,102,0.1)', color: '#FFD166', border: '1px solid rgba(255,209,102,0.2)' }}
              >
                {tip.n}
              </span>
              <p className="text-slate-500 text-xs leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
