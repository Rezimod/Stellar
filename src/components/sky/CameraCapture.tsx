'use client';

import { useEffect, useState } from 'react';
import { useCamera, generateSimPhoto } from '@/hooks/useCamera';
import Button from '@/components/shared/Button';

interface CameraCaptureProps {
  missionName: string;
  onCapture: (photo: string) => void;
}

export default function CameraCapture({ missionName, onCapture }: CameraCaptureProps) {
  const { videoRef, stream, error, facingMode, startCamera, flipCamera, stopCamera, capture } = useCamera();
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    startCamera('environment');
    return () => stopCamera();
  }, []);

  const handleCapture = () => {
    const photo = capture(missionName);
    stopCamera();
    setPreview(photo);
  };

  const handleRetake = () => {
    setPreview(null);
    startCamera('environment');
  };

  const handleSubmit = () => {
    if (preview) onCapture(preview);
  };

  // Review screen
  if (preview) {
    return (
      <div className="flex flex-col items-center gap-4">
        <img src={preview} alt="Preview" className="w-full max-w-md rounded-lg border border-[rgba(56, 240, 255, 0.12)]" />
        <div className="flex gap-4 w-full max-w-md">
          <Button variant="ghost" onClick={handleRetake} className="flex-1">
            🔄 Retake
          </Button>
          <Button variant="brass" onClick={handleSubmit} className="flex-1">
            ✅ Submit for Verification
          </Button>
        </div>
      </div>
    );
  }

  // Sim fallback
  if (error === 'permission_denied') {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400 mb-2 text-sm">Camera not available — using simulated photo</p>
        <p className="text-slate-600 text-xs mb-4 italic">You can retake before submitting</p>
        <Button variant="brass" onClick={() => setPreview(generateSimPhoto(missionName))}>
          📸 Generate Simulated Photo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md aspect-[4/3] bg-black rounded-lg overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 border border-[#FFD166]/60 rounded-full" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1.5 text-[10px] font-mono text-[#FFD166]">
          ASTROMAN · {missionName} · LIVE · {new Date().toLocaleTimeString()}
        </div>
        {/* Flip camera */}
        <button
          onClick={flipCamera}
          className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs hover:bg-black/80 transition-all"
        >
          🔄 {facingMode === 'environment' ? 'Front' : 'Rear'}
        </button>
      </div>
      <Button variant="brass" onClick={handleCapture} className="w-full max-w-md">
        📸 Capture
      </Button>
    </div>
  );
}
