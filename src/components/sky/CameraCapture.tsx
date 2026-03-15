'use client';

import { useEffect, useState } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { RefreshCw, RotateCcw } from 'lucide-react';

interface CameraCaptureProps {
  missionName: string;
  onCapture: (photo: string) => void;
}

export default function CameraCapture({ missionName, onCapture }: CameraCaptureProps) {
  const { videoRef, error, facingMode, startCamera, flipCamera, stopCamera, capture } = useCamera();
  const [preview, setPreview] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    startCamera('environment');
    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleCapture = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    const photo = capture(missionName);
    stopCamera();
    setPreview(photo);
  };

  const handleRetake = () => {
    setPreview(null);
    startCamera('environment');
  };

  if (preview) {
    return (
      <div className="flex flex-col flex-1 w-full -mx-4 -mt-4 sm:-mx-0 sm:-mt-0">
        <div className="relative flex-1 min-h-0 bg-black">
          <img src={preview} alt="Observation preview" className="w-full h-full object-cover" style={{ maxHeight: '55vh' }} />
          <div className="absolute bottom-0 left-0 right-0 px-4 py-2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
            <p className="text-[#FFD166] text-[10px] font-mono tracking-widest">STELLAR · {missionName.toUpperCase()} · SIMULATED</p>
          </div>
        </div>
        <div className="px-4 pt-4 pb-2 flex flex-col gap-2">
          <button onClick={() => onCapture(preview)} className="w-full py-4 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}>
            Submit for Verification →
          </button>
          <button onClick={handleRetake} className="w-full py-3 rounded-xl text-sm text-slate-400 flex items-center justify-center gap-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <RotateCcw size={14} /> Retake
          </button>
        </div>
      </div>
    );
  }

  if (error === 'permission_denied') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-5 py-10 text-center px-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-2xl">📷</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-white text-sm font-semibold">Camera access required</p>
          <p className="text-slate-600 text-xs leading-relaxed">Allow camera access in your browser settings<br />to capture your observation.</p>
        </div>
        <div className="text-[10px] text-slate-700 text-center leading-relaxed max-w-[220px]">
          In your browser, look for the camera icon in the address bar and tap Allow.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full -mx-4 -mt-4 sm:-mx-0 sm:-mt-0">
      <div className="relative bg-black flex-1 overflow-hidden" style={{ minHeight: '50vh' }}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {flash && <div className="absolute inset-0 bg-white/30 pointer-events-none" />}
        {[
          { top: '12%', left: '8%',    borderTop: '2px solid rgba(255,209,102,0.7)', borderLeft:  '2px solid rgba(255,209,102,0.7)' },
          { top: '12%', right: '8%',   borderTop: '2px solid rgba(255,209,102,0.7)', borderRight: '2px solid rgba(255,209,102,0.7)' },
          { bottom: '18%', left: '8%', borderBottom: '2px solid rgba(255,209,102,0.7)', borderLeft:  '2px solid rgba(255,209,102,0.7)' },
          { bottom: '18%', right: '8%',borderBottom: '2px solid rgba(255,209,102,0.7)', borderRight: '2px solid rgba(255,209,102,0.7)' },
        ].map((s, i) => <div key={i} className="absolute w-6 h-6 pointer-events-none" style={s} />)}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: '8%' }}>
          <div className="w-1 h-1 rounded-full bg-white/40" />
        </div>
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
          <span className="text-[#FFD166] text-[10px] font-mono tracking-widest uppercase">STELLAR · {missionName}</span>
          <span className="text-white/40 text-[10px] font-mono">{new Date().toLocaleTimeString()}</span>
        </div>
        <button onClick={flipCamera} className="absolute bottom-4 right-4 w-9 h-9 rounded-full flex items-center justify-center active:scale-90" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <RefreshCw size={14} className="text-white/70" />
        </button>
      </div>
      <div className="flex items-center justify-center px-4 py-6" style={{ background: '#070B14' }}>
        <button onClick={handleCapture} className="relative w-16 h-16 rounded-full flex items-center justify-center active:scale-90" style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.25)', boxShadow: '0 0 0 6px rgba(255,255,255,0.04)' }}>
          <div className="w-11 h-11 rounded-full" style={{ background: '#fff' }} />
        </button>
      </div>
    </div>
  );
}
