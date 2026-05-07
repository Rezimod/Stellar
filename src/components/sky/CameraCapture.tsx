'use client';

import { useEffect, useRef, useState } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { RefreshCw, RotateCcw, Camera, Upload, Plus, Minus } from 'lucide-react';

interface CameraCaptureProps {
  missionName: string;
  onCapture: (photo: string) => void;
  onUpload?: (photo: string) => void;
}

export default function CameraCapture({ missionName, onCapture, onUpload }: CameraCaptureProps) {
  const { videoRef, error, zoom, zoomCap, setZoomLevel, startCamera, flipCamera, stopCamera, capture } = useCamera();
  const [preview, setPreview] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isUploadPreview, setIsUploadPreview] = useState(false);
  const pinchRef = useRef<{ baseDist: number; baseZoom: number } | null>(null);

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

  const touchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { baseDist: touchDistance(e.touches), baseZoom: zoom };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const ratio = touchDistance(e.touches) / pinchRef.current.baseDist;
      setZoomLevel(pinchRef.current.baseZoom * ratio);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
  };

  const stepZoom = (dir: 1 | -1) => {
    const step = Math.max(zoomCap.step, 0.25);
    setZoomLevel(zoom + dir * step);
  };

  const zoomPct = (zoom - zoomCap.min) / (zoomCap.max - zoomCap.min);

  // Preview screen
  if (preview) {
    return (
      <div className="flex flex-col gap-2.5 w-full">
        <div className="relative rounded-2xl overflow-hidden bg-canvas w-full mx-auto" style={{ aspectRatio: '1 / 1', maxWidth: 360 }}>
          <img src={preview} alt="Observation preview" className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
            <p className="text-[var(--terracotta)] text-[10px] font-mono tracking-widest">
              STELLAR · {missionName.toUpperCase()} · {isUploadPreview ? 'UPLOADED' : 'CAPTURED'}
            </p>
          </div>
        </div>
        <button
          onClick={() => isUploadPreview ? (onUpload ?? onCapture)(preview) : onCapture(preview)}
          className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.98] flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta))', color: 'var(--canvas)' }}
        >
          Submit for Verification →
        </button>
        <button
          onClick={handleRetake}
          className="w-full py-2.5 rounded-xl text-sm text-text-muted flex items-center justify-center gap-2 flex-shrink-0"
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
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(255, 179, 71,0.06)', border: '1px solid rgba(255, 179, 71,0.15)' }}>
          <Camera size={22} className="text-[var(--terracotta)]/60" />
        </div>
        <p className="text-terracotta text-sm mb-2">Camera access required</p>
        <p className="text-text-muted text-xs mb-5">Allow camera access in your browser settings, or upload a saved sky photo.</p>
        <label
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta))', color: 'var(--canvas)' }}
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
      <div
        className="relative rounded-2xl overflow-hidden bg-canvas w-full mx-auto touch-none select-none"
        style={{ aspectRatio: '1 / 1', maxWidth: 360 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={zoomCap.hardware ? undefined : { transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        />
        {flash && <div className="absolute inset-0 bg-white/30 pointer-events-none" />}

        {/* Corner brackets */}
        {[
          { top: '10%', left: '8%',    borderTop: '2px solid rgba(255, 179, 71,0.7)', borderLeft:  '2px solid rgba(255, 179, 71,0.7)' },
          { top: '10%', right: '8%',   borderTop: '2px solid rgba(255, 179, 71,0.7)', borderRight: '2px solid rgba(255, 179, 71,0.7)' },
          { bottom: '10%', left: '8%', borderBottom: '2px solid rgba(255, 179, 71,0.7)', borderLeft:  '2px solid rgba(255, 179, 71,0.7)' },
          { bottom: '10%', right: '8%',borderBottom: '2px solid rgba(255, 179, 71,0.7)', borderRight: '2px solid rgba(255, 179, 71,0.7)' },
        ].map((s, i) => <div key={i} className="absolute w-5 h-5 pointer-events-none" style={s} />)}

        {/* Center reticle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="w-8 h-8 rounded-full border border-[var(--terracotta)]/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[var(--terracotta)]/60" />
            </div>
            <div className="absolute top-1/2 -left-2 w-1.5 h-px bg-[var(--terracotta)]/20" />
            <div className="absolute top-1/2 -right-2 w-1.5 h-px bg-[var(--terracotta)]/20" />
            <div className="absolute -top-2 left-1/2 h-1.5 w-px bg-[var(--terracotta)]/20" />
            <div className="absolute -bottom-2 left-1/2 h-1.5 w-px bg-[var(--terracotta)]/20" />
          </div>
        </div>

        {/* Top HUD */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)' }}>
          <span className="text-[var(--terracotta)] text-[10px] font-mono tracking-widest uppercase">STELLAR · {missionName}</span>
          <span className="text-text-primary/40 text-[10px] font-mono" suppressHydrationWarning>{new Date().toLocaleTimeString()}</span>
        </div>

        {/* Flip button */}
        <button
          onClick={flipCamera}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center active:scale-90"
          style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <RefreshCw size={14} className="text-text-primary/70" />
        </button>

        {/* Zoom controls — left side, mirrors flip button */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <button
            onClick={() => stepZoom(-1)}
            disabled={zoom <= zoomCap.min + 0.001}
            aria-label="Zoom out"
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 disabled:opacity-40"
            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <Minus size={14} className="text-text-primary/70" />
          </button>
          <span
            className="px-2 h-7 rounded-full text-[10px] font-mono tracking-wider flex items-center justify-center min-w-[40px]"
            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--terracotta)' }}
            suppressHydrationWarning
          >
            {zoom.toFixed(1)}×
          </span>
          <button
            onClick={() => stepZoom(1)}
            disabled={zoom >= zoomCap.max - 0.001}
            aria-label="Zoom in"
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 disabled:opacity-40"
            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <Plus size={14} className="text-text-primary/70" />
          </button>
        </div>

        {/* Zoom level indicator — right edge vertical bar */}
        {zoom > zoomCap.min + 0.001 && (
          <div
            className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-24 rounded-full overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full"
              style={{ height: `${Math.max(0, Math.min(100, zoomPct * 100))}%`, background: 'var(--terracotta)' }}
            />
          </div>
        )}
      </div>

      {/* Capture error */}
      {captureError && (
        <p className="text-terracotta text-xs text-center px-4 flex-shrink-0">{captureError}</p>
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
          <Upload size={15} className="text-text-muted" />
          <input type="file" accept="image/*" className="sr-only" onChange={handleFileUpload} />
        </label>
      </div>

      {/* Capture guide */}
      <div
        className="rounded-xl px-3 py-2.5 flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
      >
        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1.5 font-medium">How to capture</p>
        <div className="flex flex-col gap-1.5">
          {[
            { n: '1', text: 'Point your telescope at the target object' },
            { n: '2', text: 'Hold your phone camera to the eyepiece' },
            { n: '3', text: 'Center the object and press shutter — or tap the upload icon' },
          ].map(tip => (
            <div key={tip.n} className="flex items-start gap-2">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-px"
                style={{ background: 'rgba(255, 179, 71,0.1)', color: 'var(--stars)', border: '1px solid rgba(255, 179, 71,0.2)' }}
              >
                {tip.n}
              </span>
              <p className="text-text-muted text-xs leading-snug">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
