'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCamera } from '@/hooks/useCamera';
import { RefreshCw, RotateCcw, Camera, Upload, Plus, Minus, Smartphone } from 'lucide-react';

interface CameraCaptureProps {
  missionName: string;
  onCapture: (photo: string) => void;
  onUpload?: (photo: string) => void;
}

export default function CameraCapture({ missionName, onCapture, onUpload }: CameraCaptureProps) {
  const t = useTranslations('observeFlow');
  const { videoRef, error, zoom, zoomCap, setZoomLevel, startCamera, flipCamera, stopCamera, capture } = useCamera();
  const [preview, setPreview] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isUploadPreview, setIsUploadPreview] = useState(false);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const [capturing, setCapturing] = useState(false);
  // `capture="environment"` only opens the OS camera on a real device; on a
  // desktop it degrades to an ordinary file picker, which would let a gallery
  // photo be labelled a live capture. Detected after mount to keep SSR and the
  // first client render identical.
  const [hasDeviceCamera, setHasDeviceCamera] = useState(false);
  const pinchRef = useRef<{ baseDist: number; baseZoom: number } | null>(null);

  useEffect(() => {
    startCamera('environment');
    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setHasDeviceCamera(window.matchMedia?.('(pointer: coarse)').matches ?? false);
  }, []);

  // Read the real pixel dimensions of whatever we are about to submit, so the
  // observer can see the quality they actually captured instead of guessing.
  const measure = (dataUrl: string) => {
    const img = document.createElement('img');
    img.onload = () => setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = dataUrl;
  };

  const handleCapture = async () => {
    if (capturing) return; // takePhoto() is async — don't let a double-tap fire twice
    setCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    try {
      const photo = await capture(missionName);
      if (photo === null) {
        setCaptureError(t('capture.tooDark'));
        return;
      }
      stopCamera();
      setIsUploadPreview(false);
      setPreview(photo);
      measure(photo);
    } finally {
      setCapturing(false);
    }
  };

  // `fromCamera` marks a shot the OS camera app produced (the `capture`
  // attribute opens it directly), which counts as a live capture rather than a
  // gallery pick. Reading the file as a data URL keeps the original bytes —
  // and therefore the EXIF the verification pipeline checks — intact.
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fromCamera = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      stopCamera();
      setIsUploadPreview(!fromCamera);
      setCaptureError(null);
      setPreview(dataUrl);
      measure(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRetake = () => {
    setPreview(null);
    setCaptureError(null);
    setIsUploadPreview(false);
    setDimensions(null);
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
          <img src={preview} alt={t('capture.previewAlt')} className="w-full h-full object-contain" />
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between gap-2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
            <p className="text-[var(--terracotta)] text-[10px] font-mono tracking-widest">
              STELLAR · {missionName.toUpperCase()} · {isUploadPreview ? t('capture.uploaded') : t('capture.captured')}
            </p>
            {dimensions && (
              <p className="text-white/70 text-[10px] font-mono whitespace-nowrap">
                {dimensions.w}×{dimensions.h} · {((dimensions.w * dimensions.h) / 1_000_000).toFixed(1)}MP
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => isUploadPreview ? (onUpload ?? onCapture)(preview) : onCapture(preview)}
          className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.98] flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta))', color: 'var(--canvas)' }}
        >
          {t('capture.submit')} →
        </button>
        <button
          onClick={handleRetake}
          className="w-full py-2.5 rounded-xl text-sm text-text-muted flex items-center justify-center gap-2 flex-shrink-0"
          style={{ background: 'rgba(var(--ink), 0.04)', border: '1px solid rgba(var(--ink), 0.07)' }}
        >
          <RotateCcw size={14} /> {t('capture.retake')}
        </button>
      </div>
    );
  }

  // Camera permission denied
  if (error === 'permission_denied') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 text-center p-6">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(227, 218, 201,0.06)', border: '1px solid rgba(227, 218, 201,0.15)' }}>
          <Camera size={22} className="text-[var(--terracotta)]/60" />
        </div>
        <p className="text-terracotta text-sm mb-2">{t('capture.cameraRequired')}</p>
        <p className="text-text-muted text-xs mb-5">{t('capture.cameraHelp')}</p>
        {hasDeviceCamera && (
          <label
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta))', color: 'var(--canvas)' }}
          >
            <Smartphone size={15} /> {t('capture.usePhoneCamera')}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => handleFileUpload(e, true)} />
          </label>
        )}
        <label
          className={`inline-flex items-center gap-2 px-5 rounded-xl text-sm cursor-pointer ${hasDeviceCamera ? 'py-2.5 mt-3' : 'py-3 font-semibold'}`}
          style={hasDeviceCamera
            ? { background: 'rgba(var(--ink), 0.04)', border: '1px solid rgba(var(--ink), 0.12)', color: 'var(--stl-text-muted)' }
            : { background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta))', color: 'var(--canvas)' }}
        >
          <Upload size={15} /> {t('capture.uploadDevice')}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleFileUpload(e)} />
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
        {/* object-contain, not cover: the capture keeps the sensor's full frame,
            so the viewfinder must show that whole frame or the observer frames
            a square and gets something wider. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
          style={zoomCap.hardware ? undefined : { transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        />
        {flash && <div className="absolute inset-0 bg-white/30 pointer-events-none" />}

        {/* Corner brackets */}
        {[
          { top: '10%', left: '8%',    borderTop: '2px solid rgba(227, 218, 201,0.7)', borderLeft:  '2px solid rgba(227, 218, 201,0.7)' },
          { top: '10%', right: '8%',   borderTop: '2px solid rgba(227, 218, 201,0.7)', borderRight: '2px solid rgba(227, 218, 201,0.7)' },
          { bottom: '10%', left: '8%', borderBottom: '2px solid rgba(227, 218, 201,0.7)', borderLeft:  '2px solid rgba(227, 218, 201,0.7)' },
          { bottom: '10%', right: '8%',borderBottom: '2px solid rgba(227, 218, 201,0.7)', borderRight: '2px solid rgba(227, 218, 201,0.7)' },
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
            aria-label={t('capture.zoomOut')}
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
            aria-label={t('capture.zoomIn')}
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

      {/* Gallery · Shutter · Phone camera */}
      <div className="flex items-center justify-center gap-5 py-1 flex-shrink-0">
        <label
          className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          style={{ background: 'rgba(var(--ink), 0.04)', border: '1px solid rgba(var(--ink), 0.12)' }}
          title={t('capture.uploadTitle')}
        >
          <Upload size={15} className="text-text-muted" />
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleFileUpload(e)} />
        </label>
        <button
          onClick={handleCapture}
          className="w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{
            background: 'rgba(var(--ink), 0.08)',
            border: '2px solid rgba(var(--ink), 0.3)',
            boxShadow: '0 0 0 5px rgba(var(--ink), 0.04)',
          }}
        >
          <div className="w-10 h-10 rounded-full" style={{ background: 'var(--text-primary)' }} />
        </button>
        {/* Hands off to the phone's own camera app. This is the only route to
            Night mode, HDR and the full sensor — a browser video stream cannot
            reach them — and it keeps the EXIF the verifier reads. */}
        {hasDeviceCamera && (
        <label
          className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          style={{ background: 'rgba(227, 218, 201,0.10)', border: '1px solid rgba(227, 218, 201,0.28)' }}
          title={t('capture.phoneCameraTitle')}
        >
          <Smartphone size={15} style={{ color: 'var(--accent-text)' }} />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => handleFileUpload(e, true)}
          />
        </label>
        )}
      </div>

      {hasDeviceCamera && (
        <p className="text-[11px] text-center leading-snug px-3 flex-shrink-0" style={{ color: 'var(--stl-text-muted)' }}>
          {t('capture.phoneCameraHint')}
        </p>
      )}

      {/* Capture guide */}
      <div
        className="rounded-xl px-3 py-2.5 flex-shrink-0"
        style={{ background: 'rgba(var(--ink), 0.04)', border: '1px solid rgba(var(--ink), 0.08)', backdropFilter: 'blur(12px)' }}
      >
        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1.5 font-medium">{t('capture.howTo')}</p>
        <div className="flex flex-col gap-1.5">
          {[
            { n: '1', text: t('capture.tip1') },
            { n: '2', text: t('capture.tip2') },
            { n: '3', text: t('capture.tip3') },
          ].map(tip => (
            <div key={tip.n} className="flex items-start gap-2">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-px"
                style={{ background: 'rgba(227, 218, 201,0.1)', color: 'var(--accent-text)', border: '1px solid rgba(227, 218, 201,0.2)' }}
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
