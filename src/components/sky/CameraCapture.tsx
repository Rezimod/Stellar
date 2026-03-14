'use client';

import { useEffect } from 'react';
import { useCamera, generateSimPhoto } from '@/hooks/useCamera';
import Button from '@/components/shared/Button';

interface CameraCaptureProps {
  missionName: string;
  onCapture: (photo: string) => void;
}

export default function CameraCapture({ missionName, onCapture }: CameraCaptureProps) {
  const { videoRef, stream, error, startCamera, stopCamera, capture } = useCamera();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const handleCapture = () => {
    const photo = capture(missionName);
    stopCamera();
    onCapture(photo);
  };

  if (error === 'permission_denied') {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400 mb-4 text-sm">Camera not available — using simulated photo</p>
        <Button variant="brass" onClick={() => onCapture(generateSimPhoto(missionName))}>
          📸 Generate Simulated Photo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md aspect-[4/3] bg-black rounded-lg overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {/* Crosshair overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 border border-[#c9a84c]/60 rounded-full" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1.5 text-[10px] font-mono text-[#c9a84c]">
          ASTROMAN · {missionName} · LIVE · {new Date().toLocaleTimeString()}
        </div>
      </div>
      <Button variant="brass" onClick={handleCapture} className="w-full max-w-md">
        📸 Capture
      </Button>
    </div>
  );
}
