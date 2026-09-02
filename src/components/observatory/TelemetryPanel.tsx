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
    <div className={`obs-readout${alert ? ' obs-readout--alert' : ''}`}>
      <dt className="obs-label">{label}</dt>
      <dd className="obs-readout__value">{value}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="obs-label" style={{ marginBottom: '0.4rem' }}>{title}</h4>
      <dl>{children}</dl>
    </section>
  );
}

const arcmin = (v: number) => (v < 1 ? `${(v * 60).toFixed(1)}″` : `${v.toFixed(1)}′`);

export default function TelemetryPanel({ t }: { t: Telemetry }) {
  const integration = t.subs * t.exposureSec;
  const mass = airmass(t.altitude);

  return (
    <div className="obs-panel">
      <div className="obs-panel__bar">
        <span className="obs-panel__title">Telemetry</span>
        <span className="obs-panel__title">LST {formatHours(t.siderealHours)}</span>
      </div>
      <div className="obs-panel__body">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
          <Group title="Pointing">
            <Readout label="Alt" value={`${t.altitude.toFixed(2)}°`} />
            <Readout label="Az" value={`${t.azimuth.toFixed(2)}°`} />
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
          </Group>

          <Group title="Optics">
            <Readout label="Focal" value={`${Math.round(t.focalLengthMm)} mm`} />
            <Readout label="Scale" value={`${t.plateScaleArcsecPx.toFixed(2)}″/px`} />
            <Readout label="FOV" value={arcmin(t.fovArcmin)} />
            <Readout label="Target" value={t.targetArcmin === null ? '—' : arcmin(t.targetArcmin)} />
            <Readout
              label="Fills"
              value={t.targetArcmin === null ? '—' : `${((t.targetArcmin / t.fovArcmin) * 100).toFixed(1)}%`}
            />
          </Group>

          <Group title="Integration">
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
            <Readout label="Seeing" value={`${t.seeingArcsec.toFixed(1)}″ FWHM`} />
            <Readout label="Resolving" value={`${t.resolvedArcsec.toFixed(2)}″`} />
            <Readout
              label="Cloud"
              value={t.cloudCover === null ? '—' : `${Math.round(t.cloudCover)}%`}
              alert={t.cloudCover !== null && t.cloudCover > 70}
            />
          </Group>
        </div>
      </div>
    </div>
  );
}
