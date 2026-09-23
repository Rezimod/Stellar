'use client';

import { Camera, Loader2, Minimize2, Square, Telescope } from 'lucide-react';
import ArrowPad from '@/components/telescope/ArrowPad';
import type { Axis } from '@/lib/observatory/mount-drive';

const PAD_LABELS = { group: 'Hand control', left: 'Slew west', up: 'Slew up', down: 'Slew down', right: 'Slew east' };

/** In full view the panel is gone, so the controls a frame needs ride along the bottom of the screen. */
export default function DeskHud({
  name,
  status,
  elapsed,
  padEnabled,
  onPress,
  onRelease,
  observing,
  canStart,
  onStart,
  onStop,
  canCapture,
  capturing,
  onCapture,
  frames,
  onExit,
}: {
  name: string;
  status: string | null;
  elapsed: string | null;
  padEnabled: boolean;
  onPress: (axis: Axis, dir: 1 | -1) => void;
  onRelease: (axis: Axis) => void;
  observing: 'idle' | 'starting' | 'running';
  canStart: boolean;
  onStart: () => void;
  onStop: () => void;
  canCapture: boolean;
  capturing: boolean;
  onCapture: () => void;
  frames: number;
  onExit: () => void;
}) {
  return (
    <div className="sdt-hud">
      <div className="sdt-hud__info">
        <span className="sdt-hud__name">{name}</span>
        <span className="sdt-hud__status">
          {status ?? 'Idle'}
          {elapsed && ` · ${elapsed}`}
          {frames > 0 && ` · ${frames} ${frames === 1 ? 'frame' : 'frames'}`}
        </span>
      </div>

      <ArrowPad disabled={!padEnabled} labels={PAD_LABELS} onPress={onPress} onRelease={onRelease} />

      <div className="sdt-hud__actions">
        {observing === 'running' ? (
          <button type="button" className="sdt-btn sdt-btn--danger" onClick={onStop}>
            <Square size={14} aria-hidden="true" />
            Stop
          </button>
        ) : (
          <button type="button" className="sdt-btn" disabled={!canStart || observing === 'starting'} onClick={onStart}>
            {observing === 'starting' ? <Loader2 size={16} className="sdt-spin" aria-hidden="true" /> : <Telescope size={16} aria-hidden="true" />}
            {observing === 'starting' ? 'Starting…' : 'Observe'}
          </button>
        )}
        <button type="button" className="sd-btn sd-btn--primary sdt-hud__capture" disabled={!canCapture || capturing} onClick={onCapture}>
          {capturing ? <Loader2 size={16} className="sdt-spin" aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />}
          {capturing ? 'Capturing…' : 'Capture'}
        </button>
        <button type="button" className="sdt-icon-btn" onClick={onExit} aria-label="Exit full view" title="Exit full view (Esc)">
          <Minimize2 size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
