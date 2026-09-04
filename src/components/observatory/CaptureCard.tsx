import CaptureFrame from './CaptureFrame';
import type { GalleryCapture } from '@/lib/observatory/gallery';

/**
 * A capture as a specimen sheet: a modest frame with its data around it.
 *
 * The instrument, the integration and the night are set in mono beside the
 * picture because they are what makes the picture mean anything — a six-inch
 * scope will not out-resolve Hubble, and the honest way to show its work is
 * as a record rather than as a mural.
 */
export default function CaptureCard({ capture }: { capture: GalleryCapture }) {
  return (
    <figure className="obs-panel m-0 flex flex-col">
      {capture.frame ? (
        <CaptureFrame recipe={capture.frame} alt={`${capture.targetName} from ${capture.site}`} />
      ) : (
        <div
          className="flex items-center justify-center"
          style={{ aspectRatio: '16 / 9', background: 'var(--canvas)' }}
        >
          <span className="obs-label">no frame stored</span>
        </div>
      )}

      <figcaption className="flex flex-col gap-2 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {capture.targetName}
          </span>
          <ProvenanceTag provenance={capture.provenance} />
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
          <Row label="instrument" value={capture.instrument} />
          <Row label="aperture" value={`${capture.apertureMm} mm`} />
          <Row label="integration" value={integration(capture.integrationSec)} />
          <Row label="subs" value={String(capture.subs)} />
          <Row label="site" value={capture.site} />
          <Row label="night" value={night(capture.capturedAt)} />
        </dl>
      </figcaption>
    </figure>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="obs-label">{label}</dt>
      <dd
        className="m-0 truncate font-mono text-xs"
        style={{ color: 'var(--text-secondary)' }}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function ProvenanceTag({ provenance }: { provenance: GalleryCapture['provenance'] }) {
  const instrument = provenance === 'instrument';
  return (
    <span
      className="obs-label border px-1.5 py-0.5"
      style={{
        borderColor: instrument ? 'var(--yes-border)' : 'var(--obs-rule-strong)',
        color: instrument ? 'var(--yes)' : 'var(--text-muted)',
      }}
    >
      {instrument ? 'instrument' : 'simulated'}
    </span>
  );
}

/** Integration in the unit an imager would say it out loud in. */
function integration(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)} ms`;
  if (seconds < 90) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;
  return `${(seconds / 60).toFixed(1)} min`;
}

function night(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
