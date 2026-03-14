'use client';

import { useRef, useState, useCallback } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', aspectRatio: 4 / 3 },
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setError(null);
      console.log('[Camera] Started');
    } catch (err) {
      console.log('[Camera] Permission denied, using simulation');
      setError('permission_denied');
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  }, [stream]);

  const capture = useCallback((missionName: string): string => {
    if (videoRef.current && stream) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      // Add overlay
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 440, 640, 40);
      ctx.fillStyle = '#c9a84c';
      ctx.font = '12px monospace';
      ctx.fillText(`ASTROMAN · ${missionName} · ${new Date().toISOString()}`, 8, 460);
      return canvas.toDataURL('image/jpeg', 0.85);
    }
    return generateSimPhoto(missionName);
  }, [stream]);

  return { videoRef, stream, error, startCamera, stopCamera, capture };
}

export function generateSimPhoto(name: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;

  // Dark sky background
  const grad = ctx.createRadialGradient(320, 240, 20, 320, 240, 300);
  grad.addColorStop(0, '#1a1a3e');
  grad.addColorStop(1, '#05080f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 480);

  // Stars
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 640;
    const y = Math.random() * 480;
    const r = Math.random() * 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.8 + 0.2})`;
    ctx.fill();
  }

  // Main object glow
  const objGrad = ctx.createRadialGradient(320, 200, 5, 320, 200, 60);
  objGrad.addColorStop(0, 'rgba(255,220,150,0.9)');
  objGrad.addColorStop(0.3, 'rgba(200,180,100,0.4)');
  objGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = objGrad;
  ctx.beginPath();
  ctx.arc(320, 200, 60, 0, Math.PI * 2);
  ctx.fill();

  // Crosshair
  ctx.strokeStyle = 'rgba(201,168,76,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(320, 200, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(280, 200); ctx.lineTo(360, 200);
  ctx.moveTo(320, 160); ctx.lineTo(320, 240);
  ctx.stroke();

  // Overlay bar
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 440, 640, 40);
  ctx.fillStyle = '#c9a84c';
  ctx.font = '11px monospace';
  ctx.fillText(`ASTROMAN · ${name} · SIMULATED · ${new Date().toLocaleTimeString()}`, 8, 460);

  return canvas.toDataURL('image/jpeg', 0.85);
}
