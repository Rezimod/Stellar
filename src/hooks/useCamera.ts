'use client';

import { useRef, useState, useCallback } from 'react';

const DIGITAL_ZOOM_MAX = 5;
const DIGITAL_ZOOM_STEP = 0.1;

function isImageBlack(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let total = 0;
  for (let i = 0; i < data.length; i += 400) {
    total += data[i] + data[i + 1] + data[i + 2];
  }
  return total < 1000;
}

interface ZoomCapability {
  min: number;
  max: number;
  step: number;
  hardware: boolean;
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [zoom, setZoom] = useState(1);
  const [zoomCap, setZoomCap] = useState<ZoomCapability>({
    min: 1, max: DIGITAL_ZOOM_MAX, step: DIGITAL_ZOOM_STEP, hardware: false,
  });

  const detectZoomCapability = useCallback((s: MediaStream) => {
    const track = s.getVideoTracks()[0];
    if (!track || typeof track.getCapabilities !== 'function') {
      setZoomCap({ min: 1, max: DIGITAL_ZOOM_MAX, step: DIGITAL_ZOOM_STEP, hardware: false });
      return;
    }
    const caps = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number; max: number; step: number } };
    if (caps.zoom && typeof caps.zoom.max === 'number' && caps.zoom.max > caps.zoom.min) {
      setZoomCap({ min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step ?? 0.1, hardware: true });
    } else {
      setZoomCap({ min: 1, max: DIGITAL_ZOOM_MAX, step: DIGITAL_ZOOM_STEP, hardware: false });
    }
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
    stream?.getTracks().forEach(t => t.stop());

    // Guard: mediaDevices not available (WebView, HTTP, old browser)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('permission_denied');
      return;
    }

    let s: MediaStream | null = null;
    try {
      s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: facing }, width: { ideal: 1280 }, height: { ideal: 960 } },
      });
    } catch {
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
        });
      } catch {
        setError('permission_denied');
        return;
      }
    }

    setStream(s);
    setFacingMode(facing);
    setZoom(1);
    detectZoomCapability(s);
    if (videoRef.current) videoRef.current.srcObject = s;
    setError(null);
  }, [stream, detectZoomCapability]);

  const flipCamera = useCallback(() => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(next);
  }, [facingMode, startCamera]);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setZoom(1);
  }, [stream]);

  const setZoomLevel = useCallback(async (next: number) => {
    const clamped = Math.max(zoomCap.min, Math.min(zoomCap.max, next));
    setZoom(clamped);
    if (zoomCap.hardware && stream) {
      const track = stream.getVideoTracks()[0];
      try {
        await track.applyConstraints({ advanced: [{ zoom: clamped } as MediaTrackConstraintSet] });
      } catch {
        // Some browsers reject mid-stream — fall back to digital silently.
        setZoomCap(c => ({ ...c, hardware: false, max: Math.max(c.max, DIGITAL_ZOOM_MAX) }));
      }
    }
  }, [zoomCap, stream]);

  const capture = useCallback((_missionName: string): string | null => {
    if (videoRef.current && stream) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d')!;

      // Hardware zoom is already baked into the stream — draw 1:1.
      // Digital zoom: crop the centered region from the source video and stretch it.
      if (!zoomCap.hardware && zoom > 1) {
        const sw = (video.videoWidth || 640) / zoom;
        const sh = (video.videoHeight || 480) / zoom;
        const sx = ((video.videoWidth || 640) - sw) / 2;
        const sy = ((video.videoHeight || 480) - sh) / 2;
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 640, 480);
      } else {
        ctx.drawImage(video, 0, 0, 640, 480);
      }

      if (isImageBlack(canvas)) {
        return null; // Too dark — caller must prompt user to try again
      }

      return canvas.toDataURL('image/jpeg', 0.85);
    }
    return null; // No camera stream — caller must show upload or retry UI
  }, [stream, zoom, zoomCap.hardware]);

  return {
    videoRef, stream, error, facingMode,
    zoom, zoomCap, setZoomLevel,
    startCamera, flipCamera, stopCamera, capture,
  };
}

export function generateSimPhoto(name: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;

  // Dark sky background
  const grad = ctx.createRadialGradient(320, 240, 20, 320, 240, 320);
  grad.addColorStop(0, '#0d1230');
  grad.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 480);

  // Stars
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * 640;
    const y = Math.random() * 480;
    const r = Math.random() * 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.8 + 0.2})`;
    ctx.fill();
  }

  const n = name.toLowerCase();

  if (n.includes('moon')) {
    // Bright cream moon
    const moonGrad = ctx.createRadialGradient(320, 192, 5, 310, 185, 75);
    moonGrad.addColorStop(0, '#f5f0d8');
    moonGrad.addColorStop(0.6, '#ddd8b8');
    moonGrad.addColorStop(1, '#b8b098');
    ctx.beginPath();
    ctx.arc(320, 192, 70, 0, Math.PI * 2);
    ctx.fillStyle = moonGrad;
    ctx.fill();
    // Craters
    [[-18, -12, 10], [15, 8, 7], [-5, 20, 14], [25, -20, 5], [-30, 10, 6]].forEach(([cx, cy, cr]) => {
      ctx.beginPath();
      ctx.arc(320 + cx, 192 + cy, cr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,115,95,0.35)';
      ctx.fill();
    });
    // Terminator shadow edge glow
    ctx.beginPath();
    ctx.arc(320, 192, 70, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,245,200,0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (n.includes('saturn')) {
    // Planet body
    const satGrad = ctx.createRadialGradient(315, 188, 5, 315, 188, 45);
    satGrad.addColorStop(0, '#e8d5a0');
    satGrad.addColorStop(1, '#b09040');
    ctx.beginPath();
    ctx.arc(320, 192, 45, 0, Math.PI * 2);
    ctx.fillStyle = satGrad;
    ctx.fill();
    // Rings (ellipse)
    ctx.save();
    ctx.translate(320, 192);
    ctx.scale(1, 0.28);
    ctx.beginPath();
    ctx.arc(0, 0, 85, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200,170,80,0.7)';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 100, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(180,150,60,0.4)';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
    // Re-draw planet over rings
    ctx.beginPath();
    ctx.arc(320, 192, 45, 0, Math.PI * 2);
    ctx.fillStyle = satGrad;
    ctx.fill();
  } else if (n.includes('jupiter')) {
    // Planet with bands
    const jupGrad = ctx.createRadialGradient(315, 185, 5, 315, 185, 55);
    jupGrad.addColorStop(0, '#e8c870');
    jupGrad.addColorStop(1, '#a07830');
    ctx.beginPath();
    ctx.arc(320, 192, 55, 0, Math.PI * 2);
    ctx.fillStyle = jupGrad;
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(320, 192, 55, 0, Math.PI * 2);
    ctx.clip();
    [[-15, 8], [5, 14], [20, 8]].forEach(([dy, h]) => {
      ctx.fillStyle = 'rgba(140,90,40,0.35)';
      ctx.fillRect(265, 192 + dy, 110, h);
    });
    ctx.restore();
    // Galilean moons
    [[-90, 2], [-70, 1.5], [75, 2.5], [100, 1.5]].forEach(([dx, r]) => {
      ctx.beginPath();
      ctx.arc(320 + dx, 192, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });
  } else if (n.includes('orion') || n.includes('nebula')) {
    // Nebula glow
    const nebGrad = ctx.createRadialGradient(320, 200, 10, 320, 200, 120);
    nebGrad.addColorStop(0, 'rgba(180,120,255,0.6)');
    nebGrad.addColorStop(0.4, 'rgba(100,80,200,0.3)');
    nebGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = nebGrad;
    ctx.fillRect(0, 0, 640, 480);
    // Core stars
    [[320, 200, 3], [300, 185, 2], [340, 215, 2.5], [310, 220, 1.5]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });
  } else if (n.includes('pleiad') || n.includes('sister')) {
    // Star cluster — bright blue-white stars
    [[320, 200, 3.5], [295, 185, 2.5], [348, 192, 2.5], [308, 220, 2], [340, 215, 2], [280, 205, 1.5], [360, 205, 1.5]].forEach(([x, y, r]) => {
      const sg = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      sg.addColorStop(0, 'rgba(200,220,255,0.9)');
      sg.addColorStop(1, 'rgba(100,150,255,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(x, y, r * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#5EEAD4';
      ctx.fill();
    });
  } else {
    // Generic astro object
    const objGrad = ctx.createRadialGradient(320, 200, 5, 320, 200, 60);
    objGrad.addColorStop(0, 'rgba(255,220,150,0.9)');
    objGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = objGrad;
    ctx.beginPath();
    ctx.arc(320, 200, 60, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crosshair
  ctx.strokeStyle = 'rgba(201,168,76,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(320, 192, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(300, 192); ctx.lineTo(340, 192);
  ctx.moveTo(320, 172); ctx.lineTo(320, 212);
  ctx.stroke();

  return canvas.toDataURL('image/jpeg', 0.85);
}
