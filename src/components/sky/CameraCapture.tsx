'use client';

import { useEffect, useState } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { RefreshCw, RotateCcw, Camera, Upload } from 'lucide-react';

interface CameraCaptureProps {
  missionName: string;
  onCapture: (photo: string) => void;
  onUpload?: (photo: string) => void;
}

export default function CameraCapture({ missionName, onCapture, onUpload }: CameraCaptureProps) {
  const { videoRef, error, startCamera, flipCamera, stopCamera, capture } = useCamera();
  const [preview, setPreview] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isUploadPreview, setIsUploadPreview] = useState(false);

  useEffect(() => {
    startCamera('environment');
    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    const photo = capture(missionName);
    if (photo === null) {
      setCaptureError('Frame too dark — please point at the sky and try again');
      return;
    }
    stopCamera();
    setIsUploadPreview(false);
    setPreview(photo);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      stopCamera();
      setIsUploadPreview(true);
      setCaptureError(null);
      setPreview(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRetake = () => {
    setPreview(null);
    setCaptureError(null);
    setIsUploadPreview(false);
    startCamera('environment');
  };

  // Preview screen
  if (preview) {
    return (
      <div className="flex flex-col gap-2.5 w-full">
        <div className="relative rounded-2xl overflow-hidden bg-black w-full mx-auto" style={{ aspectRatio: '1 / 1', maxWidth: 360 }}>
          <img src={preview} alt="Observation preview" className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
            <p className="text-[#FFD166] text-[10px] font-mono tracking-widest">
              STELLAR · {missionName.toUpperCase()} · {isUploadPreview ? 'UPLOADED' : 'CAPTURED'}
            </p>
          </div>
        </div>
        <button
          onClick={() => isUploadPreview ? (onUpload ?? onCapture)(preview) : onCapture(preview)}
          className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.98] flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#0a0a0a' }}
        >
          Submit for Verification →
        </button>
        <button
          onClick={handleRetake}
          className="w-full py-2.5 rounded-xl text-sm text-slate-400 flex items-center justify-center gap-2 flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <RotateCcw size={14} /> Retake
        </button>
      </div>
    );
  }

  // Camera permission denied
  if (error === 'permission_denied') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 text-center p-6">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(255,209,102,0.06)', border: '1px solid rgba(255,209,102,0.15)' }}>
          <Camera size={22} className="text-[#FFD166]/60" />
        </div>
        <p className="text-amber-400 text-sm mb-2">Camera access required</p>
        <p className="text-slate-500 text-xs mb-5">Allow camera access in your browser settings, or upload a saved sky photo.</p>
        <label
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#0a0a0a' }}
        >
          <Upload size={15} /> Upload from Device
          <input type="file" accept="image/*" className="sr-only" onChange={handleFileUpload} />
        </label>
      </div>
    );
  }

  // Live viewfinder
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Viewfinder — square, fits in screen without scrolling */}
      <div className="relative rounded-2xl overflow-hidden bg-black w-full mx-auto" style={{ aspectRatio: '1 / 1', maxWidth: 360 }}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {flash && <div className="absolute inset-0 bg-white/30 pointer-events-none" />}

        {/* Corner brackets */}
        {[
          { top: '10%', left: '8%',    borderTop: '2px solid rgba(255,209,102,0.7)', borderLeft:  '2px solid rgba(255,209,102,0.7)' },
          { top: '10%', right: '8%',   borderTop: '2px solid rgba(255,209,102,0.7)', borderRight: '2px solid rgba(255,209,102,0.7)' },
          { bottom: '10%', left: '8%', borderBottom: '2px solid rgba(255,209,102,0.7)', borderLeft:  '2px solid rgba(255,209,102,0.7)' },
          { bottom: '10%', right: '8%',borderBottom: '2px solid rgba(255,209,102,0.7)', borderRight: '2px solid rgba(255,209,102,0.7)' },
        ].map((s, i) => <div key={i} className="absolute w-5 h-5 pointer-events-none" style={s} />)}

        {/* Center reticle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="w-8 h-8 rounded-full border border-[#FFD166]/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[#FFD166]/60" />
            </div>
            <div className="absolute top-1/2 -left-2 w-1.5 h-px bg-[#FFD166]/20" />
            <div className="absolute top-1/2 -right-2 w-1.5 h-px bg-[#FFD166]/20" />
            <div className="absolute -top-2 left-1/2 h-1.5 w-px bg-[#FFD166]/20" />
            <div className="absolute -bottom-2 left-1/2 h-1.5 w-px bg-[#FFD166]/20" />
          </div>
        </div>

        {/* Top HUD */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)' }}>
          <span className="text-[#FFD166] text-[10px] font-mono tracking-widest uppercase">STELLAR · {missionName}</span>
          <span className="text-white/40 text-[10px] font-mono" suppressHydrationWarning>{new Date().toLocaleTimeString()}</span>
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

      {/* Capture error */}
      {captureError && (
        <p className="text-amber-400 text-xs text-center px-4 flex-shrink-0">{captureError}</p>
      )}

      {/* Shutter + Upload row */}
      <div className="flex items-center justify-center gap-5 py-1 flex-shrink-0">
        <button
          onClick={handleCapture}
          className="w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '2px solid rgba(255,255,255,0.3)',
            boxShadow: '0 0 0 5px rgba(255,255,255,0.04)',
          }}
        >
          <div className="w-10 h-10 rounded-full" style={{ background: '#fff' }} />
        </button>
        <label
          className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
          title="Upload from device"
        >
          <Upload size={15} className="text-slate-400" />
          <input type="file" accept="image/*" className="sr-only" onChange={handleFileUpload} />
        </label>
      </div>

      {/* Capture guide */}
      <div
        className="rounded-xl px-3 py-2.5 flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
      >
        <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5 font-medium">How to capture</p>
        <div className="flex flex-col gap-1.5">
          {[
            { n: '1', text: 'Point your telescope at the target object' },
            { n: '2', text: 'Hold your phone camera to the eyepiece' },
            { n: '3', text: 'Center the object and press shutter — or tap the upload icon' },
          ].map(tip => (
            <div key={tip.n} className="flex items-start gap-2">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-px"
                style={{ background: 'rgba(255,209,102,0.1)', color: '#FFD166', border: '1px solid rgba(255,209,102,0.2)' }}
              >
                {tip.n}
              </span>
              <p className="text-slate-500 text-xs leading-snug">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
