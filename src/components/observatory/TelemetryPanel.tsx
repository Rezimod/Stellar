import type { MissionState } from '@/lib/observatory/mission';
import { formatExposure } from './ControlPanel';

export type Telemetry = {
  state: MissionState;
  altitude: number;
  azimuth: number;
  fovArcmin: number;
  /** Null while the mount is parked — there is nothing to measure. */
  targetArcmin: number | null;
  subs: number;
  exposureSec: number;
  gain: number;
  seeingArcsec: number;
  /** What the stack currently resolves — seeing at first, diffraction at best. */
  resolvedArcsec: number;
  focalLengthMm: number;
  plateScaleArcsecPx: number;
  rotationDegPerHour: number | null;
  cloudCover: number | null;
};

/** Data reads in mono; the eye can compare digits down a column. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className="font-mono text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value}
      </dd>
    </div>
  );
}

export default function TelemetryPanel({ t }: { t: Telemetry }) {
  const integration = t.subs * t.exposureSec;

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <h3 className="mb-3 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Telemetry
      </h3>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-8">
        <Row label="Altitude" value={`${t.altitude.toFixed(2)}°`} />
        <Row label="Azimuth" value={`${t.azimuth.toFixed(2)}°`} />
        <Row label="Field of view" value={`${t.fovArcmin.toFixed(1)}′ wide`} />
        <Row
          label="Target size"
          value={
            t.targetArcmin === null
              ? '—'
              : t.targetArcmin < 1
                ? `${(t.targetArcmin * 60).toFixed(1)}″`
                : `${t.targetArcmin.toFixed(1)}′`
          }
        />
        <Row
          label="Fills frame"
          value={t.targetArcmin === null ? '—' : `${((t.targetArcmin / t.fovArcmin) * 100).toFixed(1)}%`}
        />
        <Row label="Seeing" value={`${t.seeingArcsec.toFixed(1)}″`} />
        <Row label="Resolving" value={`${t.resolvedArcsec.toFixed(2)}″`} />
        <Row label="Focal length" value={`${Math.round(t.focalLengthMm)} mm`} />
        <Row label="Plate scale" value={`${t.plateScaleArcsecPx.toFixed(2)}″/px`} />
        <Row label="Sub-exposure" value={formatExposure(t.exposureSec)} />
        <Row label="Gain" value={String(t.gain)} />
        <Row label="Subs stacked" value={String(t.subs)} />
        <Row
          label="Integration"
          value={integration >= 60 ? `${Math.floor(integration / 60)}m ${Math.round(integration % 60)}s` : `${integration.toFixed(0)}s`}
        />
        <Row
          label="Field rotation"
          value={t.rotationDegPerHour === null ? '—' : `${t.rotationDegPerHour.toFixed(1)}°/h`}
        />
        <Row label="Cloud" value={t.cloudCover === null ? '—' : `${Math.round(t.cloudCover)}%`} />
      </dl>
    </div>
  );
}
