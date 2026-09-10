import { formatExposure } from './ControlPanel';
import { airmass, formatHours } from '@/lib/observatory/site-time';

export type Telemetry = {
  altitude: number;
  azimuth: number;
  hourAngle: number | null;
  siderealHours: number;
  fovArcmin: number;
  targetArcmin: number | null;
  subs: number;
  exposureSec: number;
  gain: number;
  seeingArcsec: number;
  resolvedArcsec: number;
  focalLengthMm: number;
  plateScaleArcsecPx: number;
  rotationDegPerHour: number | null;
  cloudCover: number | null;
};

function Readout({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`obs-hud__cell${alert ? ' obs-hud__cell--alert' : ''}`}>
      <dt className="obs-label">{label}</dt>
      <dd className="obs-hud__value">{value}</dd>
    </div>
  );
}

const arcmin = (v: number) => (v < 1 ? `${(v * 60).toFixed(1)}″` : `${v.toFixed(1)}′`);

/**
 * The instrument's numbers in one line under the frame, the way a capture
 * program prints them: pointing on the left, optics in the middle, the
 * integration on the right. A number that needs attention turns red; nothing
 * else on the strip has a colour.
 */
export default function TelemetryPanel({ t }: { t: Telemetry }) {
  const integration = t.subs * t.exposureSec;
  const mass = airmass(t.altitude);

  return (
    <dl className="obs-hud" aria-label="Telemetry">
      <Readout label="Alt" value={`${t.altitude.toFixed(1)}°`} />
      <Readout label="Az" value={`${t.azimuth.toFixed(1)}°`} />
      <Readout label="HA" value={t.hourAngle === null ? '—' : formatHours(t.hourAngle)} />
      <Readout
        label="Airmass"
        value={mass === null ? '—' : mass.toFixed(2)}
        alert={mass !== null && mass > 2}
      />
      <Readout
        label="Field rot"
        value={t.rotationDegPerHour === null ? '—' : `${t.rotationDegPerHour.toFixed(1)}°/h`}
      />
      <Readout label="LST" value={formatHours(t.siderealHours)} />
      <Readout label="Focal" value={`${Math.round(t.focalLengthMm)} mm`} />
      <Readout label="Scale" value={`${t.plateScaleArcsecPx.toFixed(2)}″/px`} />
      <Readout label="FOV" value={arcmin(t.fovArcmin)} />
      <Readout label="Target" value={t.targetArcmin === null ? '—' : arcmin(t.targetArcmin)} />
      <Readout
        label="Fills"
        value={t.targetArcmin === null ? '—' : `${((t.targetArcmin / t.fovArcmin) * 100).toFixed(1)}%`}
      />
      <Readout label="Sub" value={formatExposure(t.exposureSec)} />
      <Readout label="Gain" value={String(t.gain)} />
      <Readout label="Frames" value={t.subs.toLocaleString()} />
      <Readout
        label="Total"
        value={
          integration >= 60
            ? `${Math.floor(integration / 60)}m ${Math.round(integration % 60)}s`
            : `${integration.toFixed(integration < 10 ? 1 : 0)}s`
        }
      />
      <Readout label="Seeing" value={`${t.seeingArcsec.toFixed(1)}″`} />
      <Readout label="Resolving" value={`${t.resolvedArcsec.toFixed(2)}″`} />
      <Readout
        label="Cloud"
        value={t.cloudCover === null ? '—' : `${Math.round(t.cloudCover)}%`}
        alert={t.cloudCover !== null && t.cloudCover > 70}
      />
    </dl>
  );
}
