'use client';

import { useEffect, useRef, type PointerEvent } from 'react';
import { Move } from 'lucide-react';

interface GameStickProps {
  label: string;
  onMove: (x: number, y: number) => void;
}

export function GameStick({ label, onMove }: GameStickProps) {
  const root = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const callback = useRef(onMove);
  callback.current = onMove;

  const reset = () => {
    pointer.current = null;
    root.current?.style.setProperty('--stick-x', '0px');
    root.current?.style.setProperty('--stick-y', '0px');
    if (root.current) root.current.dataset.active = 'false';
    callback.current(0, 0);
  };
  useEffect(() => {
    const hidden = () => { if (document.hidden) reset(); };
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', hidden);
      reset();
    };
  }, []);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== e.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const radius = rect.width * 0.32;
    const dx = (e.clientX - rect.left - rect.width / 2) / radius;
    const dy = (e.clientY - rect.top - rect.height / 2) / radius;
    const length = Math.hypot(dx, dy);
    const scale = length > 1 ? 1 / length : 1;
    e.currentTarget.style.setProperty('--stick-x', `${dx * scale * radius}px`);
    e.currentTarget.style.setProperty('--stick-y', `${dy * scale * radius}px`);
    const response = length > 0.12 ? Math.pow((Math.min(1, length) - 0.12) / 0.88, 1.4) / length : 0;
    callback.current(dx * response, -dy * response);
  };
  const release = (e: PointerEvent<HTMLDivElement>) => {
    if (pointer.current === e.pointerId) reset();
  };

  return (
    <div ref={root} className="game-stick" role="group" aria-label={label} title={label}
      onPointerDown={(e) => {
        if (pointer.current !== null || e.button !== 0) return;
        e.preventDefault();
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.dataset.active = 'true';
        move(e);
      }}
      onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
      <span className="game-stick__axis" aria-hidden />
      <span className="game-stick__thumb" aria-hidden><Move size={22} /></span>
    </div>
  );
}
