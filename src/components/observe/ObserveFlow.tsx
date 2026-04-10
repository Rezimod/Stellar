'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ImagePlus, ArrowLeft, ExternalLink } from 'lucide-react';
import type { PhotoVerificationResult } from '@/lib/types';

interface ObserveFlowProps {
  onClose: () => void;
  walletAddress: string | null;
}

const ANALYSIS_TEXTS = [
  'Identifying celestial object...',
  'Cross-checking star positions...',
  'Calculating reward...',
];

const CONFIDENCE_BADGE: Record<string, { cls: string; label: string }> = {
  high:     { cls: 'bg-green-500/20 text-green-400 border border-green-500/30',  label: '✓ High Confidence' },
  medium:   { cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',  label: '● Medium Confidence' },
  low:      { cls: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',  label: '○ Low Confidence' },
  rejected: { cls: 'bg-red-500/20 text-red-400 border border-red-500/30',        label: '✗ Rejected' },
};

export default function ObserveFlow({ onClose, walletAddress }: ObserveFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<'capture' | 'uploading' | 'result' | 'minting' | 'done'>('capture');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [verification, setVerification] = useState<PhotoVerificationResult | null>(null);
  const [error, setError] = useState('');
  const [mintTxId, setMintTxId] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [analysisIdx, setAnalysisIdx] = useState(0);
  const [doubleCapture, setDoubleCapture] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firstFrameFileRef = useRef<File | null>(null);
  const mintingRef = useRef(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setLocation({ lat: 41.72, lon: 44.83 })
    );
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  useEffect(() => {
    if (step !== 'uploading') return;
    const id = setInterval(() => setAnalysisIdx(i => (i + 1) % 3), 2000);
    return () => clearInterval(id);
  }, [step]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      setError('Camera access denied');
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });

      if (doubleCapture) {
        // First shot — store it, start countdown, keep camera running
        firstFrameFileRef.current = file;
        setFirstFrame(canvas.toDataURL('image/jpeg'));
        setCountdown(3);

        let n = 3;
        const tick = () => {
          n--;
          setCountdown(n);
          if (n > 0) {
            setTimeout(tick, 1000);
          } else {
            // Second shot
            const v = videoRef.current;
            const c = canvasRef.current;
            if (!v || !c) return;
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            c.getContext('2d')?.drawImage(v, 0, 0);
            c.toBlob((blob2) => {
              if (!blob2) return;
              const secondFile = new File([blob2], 'capture2.jpg', { type: 'image/jpeg' });
              const dataUrl = c.toDataURL('image/jpeg');
              setPhoto(dataUrl);
              setPhotoFile(secondFile);
              streamRef.current?.getTracks().forEach(t => t.stop());
              setCameraActive(false);
              setCountdown(null);
              const firstFile = firstFrameFileRef.current;
              firstFrameFileRef.current = null;
              setFirstFrame(null);
              handleVerify(secondFile, firstFile ?? undefined);
            }, 'image/jpeg', 0.9);
          }
        };
        setTimeout(tick, 1000);
      } else {
        setPhotoFile(file);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        streamRef.current?.getTracks().forEach(t => t.stop());
        setCameraActive(false);
        handleVerify(file);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleVerify = async (fileOverride?: File, firstFrameFile?: File) => {
    setStep('uploading');
    setError('');
    const file = fileOverride ?? photoFile;
    if (!file) { setError('No photo selected'); setStep('capture'); return; }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lat', String(location?.lat ?? 41.72));
    formData.append('lon', String(location?.lon ?? 44.83));
    formData.append('capturedAt', new Date().toISOString());
    if (firstFrameFile) formData.append('file2', firstFrameFile);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch('/api/observe/verify', { method: 'POST', body: formData, signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) { setError('Verification failed — try again'); setStep('capture'); return; }
      const result: PhotoVerificationResult = await res.json();
      setVerification(result);
      setStep('result');
    } catch {
      setError('Verification failed — try again');
      setStep('capture');
    }
  };

  const logObservation = (v: PhotoVerificationResult, mintTx: string | null = null) => {
    if (!walletAddress) return;
    fetch('/api/observe/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: walletAddress,
        target: v.identifiedObject,
        stars: v.starsAwarded,
        confidence: v.confidence,
        mintTx: mintTx || null,
      }),
    }).catch(() => {});
  };

  const handleMintObservation = async () => {
    if (!verification || mintingRef.current) return;
    mintingRef.current = true;
    setStep('minting');
    let txId = '';
    try {
      const res = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: walletAddress,
          target: verification.identifiedObject,
          timestampMs: new Date(verification.metadata.capturedAt).getTime(),
          lat: verification.metadata.lat,
          lon: verification.metadata.lon,
          cloudCover: verification.metadata.cloudCover,
          oracleHash: verification.metadata.fileHash,
          stars: verification.starsAwarded,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        txId = data.txId ?? '';
        setMintTxId(txId);
      }
    } catch { /* fall through to done */ }
    mintingRef.current = false;
    setStep('done');
  };

  const handleCollectOnly = () => {
    if (!verification || mintingRef.current) return;
    mintingRef.current = true;
    logObservation(verification);
    setStep('done');
  };

  const resetToCapture = () => {
    setPhoto(null);
    setPhotoFile(null);
    setVerification(null);
    setError('');
    setMintTxId('');
    setFirstFrame(null);
    setCountdown(null);
    firstFrameFileRef.current = null;
    setStep('capture');
  };

  // --- uploading ---
  if (step === 'uploading') {
    return (
      <div className="fixed inset-0 z-[60] bg-[#070B14] flex flex-col items-center justify-center gap-6 px-4">
        {photo && <img src={photo} alt="" className="rounded-xl max-h-48 object-cover opacity-60" />}
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce bg-[#38F0FF]/40"
              style={{ animationDelay: `${i * 180}ms` }} />
          ))}
        </div>
        <p className="text-white text-sm">Analyzing your observation...</p>
        <p className="text-slate-500 text-xs">{ANALYSIS_TEXTS[analysisIdx]}</p>
      </div>
    );
  }

  // --- minting ---
  if (step === 'minting') {
    return (
      <div className="fixed inset-0 z-[60] bg-[#070B14] flex flex-col items-center justify-center gap-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce bg-[#38F0FF]/40"
              style={{ animationDelay: `${i * 180}ms` }} />
          ))}
        </div>
        <p className="text-white text-sm">Sealing your discovery on Solana...</p>
      </div>
    );
  }

  // --- done ---
  if (step === 'done' && verification) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#070B14] flex flex-col items-center justify-center px-6 gap-5">
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.15), transparent)', border: '2px solid rgba(20,184,166,0.3)' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M8 16l6 6 10-12" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-2xl text-white" style={{ fontFamily: 'Georgia, serif' }}>
          {mintTxId ? 'Discovery Sealed' : 'Stars Collected'}
        </h2>
        <p className="text-slate-400 text-sm">{verification.identifiedObject}</p>
        <p className="text-2xl font-bold" style={{ color: '#FFD166' }}>+{verification.starsAwarded} ✦</p>
        {mintTxId && !mintTxId.startsWith('sim') && (
          <a href={`https://explorer.solana.com/tx/${mintTxId}?cluster=devnet`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs text-[#14B8A6]"
            style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)' }}>
            View on Solana Explorer <ExternalLink size={12} />
          </a>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
          <button onClick={() => router.push('/nfts')}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
            View NFTs
          </button>
          <button onClick={resetToCapture}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
            Observe Again
          </button>
          <button onClick={onClose}
            className="w-full py-3 rounded-xl text-black text-sm font-semibold"
            style={{ background: 'linear-gradient(to right, #FFD166, #E8B84A)' }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  // --- result ---
  if (step === 'result' && verification) {
    const badge = CONFIDENCE_BADGE[verification.confidence] ?? CONFIDENCE_BADGE.low;
    const moonRows: [string, string][] = verification.target === 'moon' ? [
      ['Expected Phase', verification.astronomyCheck.expectedPhase ?? '—'],
      ['Altitude', verification.astronomyCheck.expectedAltitude != null ? verification.astronomyCheck.expectedAltitude.toFixed(1) + '°' : '—'],
    ] : [];
    const metricRows: [string, string][] = [
      ['Object', verification.identifiedObject],
      ['Visible', verification.astronomyCheck.objectVisible ? 'Yes ✓' : 'Not confirmed'],
      ['Sharpness', verification.imageAnalysis.sharpness],
      ['Screenshot', verification.imageAnalysis.isScreenshot ? 'Detected ✗' : 'None ✓'],
      ...moonRows,
    ];
    return (
      <div className="fixed inset-0 z-[60] bg-[#070B14] overflow-y-auto">
        <div className="max-w-sm mx-auto px-4 py-6 flex flex-col gap-4">
          {photo && <img src={photo} alt="" className="rounded-xl max-h-40 object-cover mx-auto" />}
          <div className={`self-center px-4 py-2 rounded-full text-sm font-semibold ${badge.cls}`}>{badge.label}</div>
          <p className="text-white text-lg text-center" style={{ fontFamily: 'Georgia, serif' }}>{verification.identifiedObject}</p>
          <p className="text-slate-400 text-sm text-center">{verification.reason}</p>
          <div className="grid grid-cols-2 gap-3">
            {metricRows.map(([label, val]) => (
              <div key={label} className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</p>
                <p className="text-white text-sm font-medium mt-0.5 truncate">{val}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-1">
            {verification.accepted ? (
              <>
                <p className="text-2xl font-bold" style={{ color: '#FFD166' }}>+{verification.starsAwarded} ✦</p>
                <p className="text-slate-500 text-xs mt-1">Stars earned for this observation</p>
              </>
            ) : (
              <>
                <p className="text-red-400 text-sm">This image could not be verified</p>
                <p className="text-slate-500 text-xs mt-1">{verification.reason}</p>
              </>
            )}
          </div>
          {error && <p className="text-amber-400 text-xs text-center">{error}</p>}
          <div className="flex flex-col gap-3">
            {verification.accepted ? (
              <>
                <button onClick={handleMintObservation}
                  className="w-full py-3 rounded-xl text-black text-sm font-semibold"
                  style={{ background: 'linear-gradient(to right, #FFD166, #E8B84A)' }}>
                  Seal on Solana ✦
                </button>
                <button onClick={handleCollectOnly}
                  className="w-full py-3 rounded-xl text-slate-400 text-sm"
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Collect Stars Only
                </button>
              </>
            ) : (
              <>
                <button onClick={resetToCapture}
                  className="w-full py-3 rounded-xl text-black text-sm font-semibold"
                  style={{ background: 'linear-gradient(to right, #FFD166, #E8B84A)' }}>
                  Try Another Photo
                </button>
                <button onClick={onClose}
                  className="w-full py-3 rounded-xl text-slate-400 text-sm"
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- capture ---
  return (
    <div className="fixed inset-0 z-[60] bg-[#070B14] flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-lg font-semibold" style={{ fontFamily: 'Georgia, serif' }}>Observe</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
        {cameraActive ? (
          <div className="w-full max-w-sm flex flex-col items-center gap-4">
            <div className="relative w-full">
              <video ref={videoRef} autoPlay playsInline muted
                className="rounded-2xl w-full aspect-[3/4] object-cover bg-black" />
              {countdown !== null && (
                <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3"
                  style={{ background: 'rgba(7,11,20,0.72)' }}>
                  <p className="text-slate-300 text-xs tracking-widest uppercase">Hold steady...</p>
                  <p className="text-7xl font-bold text-white">{countdown}</p>
                  {firstFrame && (
                    <img src={firstFrame} alt="" className="w-16 h-16 rounded-lg object-cover opacity-60 mt-1" />
                  )}
                </div>
              )}
            </div>
            {countdown === null && (
              <>
                <button onClick={captureFrame}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-black font-bold text-sm"
                  style={{ background: 'linear-gradient(to right, #FFD166, #E8B84A)' }}>
                  Capture
                </button>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl w-full"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex-1">
                    <p className="text-white text-xs font-medium">Live Capture Mode</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">Takes 2 photos for stronger verification</p>
                  </div>
                  <button
                    onClick={() => setDoubleCapture(v => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${doubleCapture ? 'bg-[#14B8A6]' : 'bg-slate-700'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${doubleCapture ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-4">
            <button onClick={startCamera}
              className="rounded-2xl p-6 flex items-center gap-4 text-left transition-colors hover:bg-[#14B8A6]/10"
              style={{ background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.2)' }}>
              <Camera size={28} className="text-[#14B8A6] flex-shrink-0" />
              <div>
                <p className="text-white font-semibold">Take Photo</p>
                <p className="text-slate-500 text-xs mt-0.5">Point at the sky and capture</p>
              </div>
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl p-6 flex items-center gap-4 text-left transition-colors hover:bg-white/[0.03]"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(148,163,184,0.15)' }}>
              <ImagePlus size={28} className="text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-white font-semibold">Upload from Gallery</p>
                <p className="text-slate-500 text-xs mt-0.5">Select a photo you already took</p>
              </div>
            </button>
          </div>
        )}
        {error && <p className="text-amber-400 text-xs text-center">{error}</p>}
        <p className="text-slate-500 text-xs text-center">Phone photos are welcome — even a blurry moon counts!</p>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/tiff,image/heic,image/heif"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          setPhotoFile(file);
          const reader = new FileReader();
          reader.onload = () => { setPhoto(reader.result as string); handleVerify(file); };
          reader.readAsDataURL(file);
        }} />
    </div>
  );
}
