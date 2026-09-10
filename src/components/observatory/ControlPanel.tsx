import { EXPOSURES, type TargetBrightness } from '@/lib/observatory/sim-targets';
import { ROIS, TRAINS } from '@/lib/observatory/optics';

export type ControlProps = {
  exposureSec: number;
  onExposure: (v: number) => void;
  brightness: TargetBrightness;
  trainId: string;
  onTrain: (id: string) => void;
  roiId: string;
  onRoi: (id: string) => void;
  gain: number;
  onGain: (v: number) => void;
  onCapture: () => void;
  canCapture: boolean;
  onPark: () => void;
  parked: boolean;
};

/** Milliseconds below a second — nobody writes a lunar sub as 0.01 s. */
export function formatExposure(sec: number): string {
  return sec < 1 ? `${Math.round(sec * 1000)} ms` : `${sec} s`;
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <label className="block">
      <span className="obs-label">{label}</span>
      <select className="obs-field mt-1" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export default function ControlPanel(p: ControlProps) {
  return (
    <div className="obs-panel">
      <div className="obs-panel__bar">
        <span className="obs-panel__title">Setup</span>
        <span className="obs-panel__title">{p.parked ? 'Parked' : 'Armed'}</span>
      </div>

      <div className="obs-panel__body">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Corrector"
            value={p.trainId}
            onChange={p.onTrain}
            options={TRAINS.map((t) => ({ value: t.id, label: t.label }))}
          />
          <Select
            label="Read-out"
            value={p.roiId}
            onChange={p.onRoi}
            options={ROIS.map((r) => ({ value: r.id, label: r.label }))}
          />
          <Select
            label="Sub-exposure"
            value={p.exposureSec}
            onChange={(v) => p.onExposure(Number(v))}
            options={EXPOSURES[p.brightness].map((v) => ({ value: v, label: formatExposure(v) }))}
          />
          <label className="block">
            <span className="obs-label">Gain {p.gain}</span>
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
            className="obs-action obs-action--primary flex-1"
            onClick={p.onCapture}
            disabled={!p.canCapture}
          >
            Capture
          </button>
          <button type="button" className="obs-action" onClick={p.onPark} disabled={p.parked}>
            Park
          </button>
        </div>
      </div>
    </div>
  );
}
