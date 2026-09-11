'use client';

import Image from 'next/image';
import { Aperture, Camera, Check, Search, Volume2 } from 'lucide-react';
import { formatExposure } from './ControlPanel';
import { EXPOSURES, SIM_TARGETS, targetPhoto, type TargetBrightness } from '@/lib/observatory/sim-targets';
import { TRAINS } from '@/lib/observatory/optics';
import type { SafetyVerdict } from '@/lib/observatory/safety';

export type LiveDockProps = {
  targetId: string | null;
  verdicts: Record<string, SafetyVerdict>;
  onGoTo: (id: string) => void;
  trainId: string;
  onTrain: (id: string) => void;
  exposureSec: number;
  brightness: TargetBrightness;
  onExposure: (v: number) => void;
  audioOn: boolean;
  onAudio: () => void;
  onCapture: () => void;
  canCapture: boolean;
  onPark: () => void;
  parked: boolean;
  /** The last frame taken this session: its target and the site clock at capture. */
  last: { targetId: string; at: string } | null;
  labels: {
    target: string;
    zoom: string;
    exposure: string;
    audio: string;
    capture: string;
    park: string;
    lastCapture: string;
  };
};

/**
 * The control dock along the bottom of the live view.
 *
 * Everything a visitor touches while the telescope is running, in the order
 * they touch it: what to look at, how hard to magnify it, how long a sub runs,
 * whether the motors are audible, and the shutter. The instrument's numbers
 * stay in the telemetry tab; this bar is verbs.
 */
export default function LiveDock(p: LiveDockProps) {
  const lastPhoto = p.last ? targetPhoto(SIM_TARGETS.find((s) => s.id === p.last!.targetId)!) : null;
  const current = p.targetId ? targetPhoto(SIM_TARGETS.find((s) => s.id === p.targetId)!) : null;

  return (
    <div className="obs-dock">
      <div className="obs-dock__seg">
        <span className="obs-dock__label">{p.labels.target}</span>
        <div className="obs-dock__control" style={{ position: 'relative' }}>
          {current && (
            <span className="obs-picker__disc" style={{ position: 'absolute', left: 6, width: 32, height: 32, pointerEvents: 'none' }}>
              <Image src={current.src} alt="" fill sizes="32px" />
            </span>
          )}
          <select
            className={current ? 'obs-select obs-select--thumb' : 'obs-select'}
            value={p.targetId ?? ''}
            onChange={(e) => p.onGoTo(e.target.value)}
            aria-label={p.labels.target}
          >
            {!p.targetId && <option value="">—</option>}
            {SIM_TARGETS.map((s) => {
              const verdict = p.verdicts[s.id];
              return (
                <option key={s.id} value={s.id} disabled={verdict !== undefined && !verdict.ok}>
                  {s.name}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="obs-dock__seg">
        <span className="obs-dock__label">{p.labels.zoom}</span>
        <div className="obs-dock__control">
          <Search size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--text-secondary)' }} />
          <div className="obs-seg" role="group" aria-label={p.labels.zoom}>
            {TRAINS.map((train) => (
              <button
                key={train.id}
                type="button"
                className="obs-seg__btn"
                aria-pressed={train.id === p.trainId}
                onClick={() => p.onTrain(train.id)}
              >
                {train.multiplier.toFixed(train.multiplier < 1 ? 2 : 0)}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="obs-dock__seg">
        <span className="obs-dock__label">{p.labels.exposure}</span>
        <div className="obs-dock__control">
          <Aperture size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--text-secondary)' }} />
          <select
            className="obs-select"
            value={p.exposureSec}
            onChange={(e) => p.onExposure(Number(e.target.value))}
            aria-label={p.labels.exposure}
          >
            {EXPOSURES[p.brightness].map((v) => (
              <option key={v} value={v}>
                {formatExposure(v)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="obs-dock__seg">
        <span className="obs-dock__label">{p.labels.audio}</span>
        <div className="obs-dock__control">
          <Volume2 size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--text-secondary)' }} />
          <button
            type="button"
            className="obs-switch"
            role="switch"
            aria-checked={p.audioOn}
            aria-pressed={p.audioOn}
            aria-label={p.labels.audio}
            onClick={p.onAudio}
          />
        </div>
      </div>

      <div className="obs-dock__seg obs-dock__seg--end">
        <div className="obs-dock__control">
          <button type="button" className="obs-capture" onClick={p.onCapture} disabled={!p.canCapture}>
            <Camera size={18} strokeWidth={1.75} aria-hidden="true" />
            {p.labels.capture}
          </button>
          <button type="button" className="obs-ghost" onClick={p.onPark} disabled={p.parked}>
            {p.labels.park}
          </button>
        </div>
      </div>

      {p.last && (
        <div className="obs-dock__seg">
          <div className="obs-last">
            <span className="obs-last__thumb">
              {lastPhoto && <Image src={lastPhoto.src} alt="" width={64} height={52} />}
            </span>
            <span className="obs-last__text">
              <b>{p.labels.lastCapture}</b>
              <span className="font-mono">{p.last.at}</span>
            </span>
            <Check size={16} strokeWidth={2} className="obs-last__ok" aria-hidden="true" />
          </div>
        </div>
      )}
    </div>
  );
}
