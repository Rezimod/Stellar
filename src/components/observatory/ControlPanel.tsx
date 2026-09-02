import { EXPOSURES, SIM_TARGETS, type SimTarget, type TargetBrightness } from '@/lib/observatory/sim-targets';
import type { SafetyVerdict } from '@/lib/observatory/safety';
import { ROIS, TRAINS } from '@/lib/observatory/optics';

export type ControlProps = {
  targetId: string | null;
  /** Why each target cannot be commanded, when it cannot. */
  verdicts: Record<string, SafetyVerdict>;
  onGoTo: (target: SimTarget) => void;
  exposureSec: number;
  onExposure: (v: number) => void;
  brightness: TargetBrightness;
  gain: number;
  onGain: (v: number) => void;
  trainId: string;
  onTrain: (id: string) => void;
  roiId: string;
  onRoi: (id: string) => void;
  onCapture: () => void;
  canCapture: boolean;
  onPark: () => void;
  parked: boolean;
};

/** Milliseconds below a second — nobody writes a lunar sub as 0.01 s. */
export function formatExposure(sec: number): string {
  return sec < 1 ? `${Math.round(sec * 1000)} ms` : `${sec} s`;
}

export default function ControlPanel(p: ControlProps) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <h3 className="mb-3 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Controls
      </h3>

      <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>Target</p>
      <div className="flex flex-col gap-1.5">
        {SIM_TARGETS.map((target) => {
          const verdict = p.verdicts[target.id];
          const refused = verdict && !verdict.ok;
          const active = p.targetId === target.id;

          return (
            <button
              key={target.id}
              type="button"
              onClick={() => p.onGoTo(target)}
              disabled={refused}
              // Refused targets stay visible with the reason attached. Hiding
              // them teaches nothing; showing why is the product.
              className="rounded-md border px-3 py-2 text-left text-sm disabled:cursor-not-allowed"
              style={{
                borderColor: active ? 'var(--accent-border)' : 'var(--border)',
                background: active ? 'var(--accent-dim)' : 'transparent',
                color: refused ? 'var(--text-muted)' : 'var(--text-primary)',
                opacity: refused ? 0.65 : 1,
              }}
            >
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span>{target.name}</span>
                {refused && (
                  <span className="text-xs" style={{ color: 'var(--no)' }}>
                    {!verdict.ok && verdict.reason}
                  </span>
                )}
              </span>
              {!refused && (
                <span className="mt-0.5 block text-xs" style={{ color: 'var(--text-muted)' }}>
                  {target.expect}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-4 mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        Optical train — set for you on GoTo, and yours to change
      </p>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Barlow / reducer</span>
          <select
            value={p.trainId}
            onChange={(e) => p.onTrain(e.target.value)}
            className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}
          >
            {TRAINS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Read-out window</span>
          <select
            value={p.roiId}
            onChange={(e) => p.onRoi(e.target.value)}
            className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}
          >
            {ROIS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sub-exposure</span>
          <select
            value={p.exposureSec}
            onChange={(e) => p.onExposure(Number(e.target.value))}
            className="mt-1 w-full rounded-md border px-2 py-1.5 font-mono text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)', color: 'var(--text-primary)' }}
          >
            {EXPOSURES[p.brightness].map((v) => (
              <option key={v} value={v}>{formatExposure(v)}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Gain <span className="font-mono">{p.gain}</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={p.gain}
            onChange={(e) => p.onGain(Number(e.target.value))}
            className="mt-3 w-full"
            style={{ accentColor: 'var(--accent)' }}
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={p.onCapture}
          disabled={!p.canCapture}
          className="flex-1 rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-dim)', color: 'var(--accent-text)' }}
        >
          Capture
        </button>
        <button
          type="button"
          onClick={p.onPark}
          disabled={p.parked}
          className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Park
        </button>
      </div>
    </div>
  );
}
