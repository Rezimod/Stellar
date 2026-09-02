import ReadinessBadge from './ReadinessBadge';
import type { NodeWithReadiness } from '@/lib/observatory/types';

const TIER_LABEL = {
  first_party: 'Stellar-operated',
  kitted: 'Partner · Node Kit',
  byo: 'Partner · own rig',
} as const;

/** Site-local time, so "next window" reads in the sky's clock, not the visitor's. */
function siteTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export default function NodeCard({ node }: { node: NodeWithReadiness }) {
  const { instrument, readiness } = node;

  return (
    <article
      className="rounded-xl border p-5"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            {node.name}
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {node.site} · Bortle {node.bortle} · {TIER_LABEL[node.tier]}
          </p>
        </div>
        <ReadinessBadge readiness={readiness} />
      </div>

      {readiness.detail && (
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {readiness.detail}
          {readiness.nextWindowAt && readiness.state !== 'online' && (
            <> Next dark window at {siteTime(readiness.nextWindowAt, node.timezone)} site time.</>
          )}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Spec label="Optics" value={instrument.optics} />
        <Spec label="Aperture" value={`${instrument.apertureMm} mm`} mono />
        <Spec label="Focal length" value={`${instrument.focalLengthMm} mm`} mono />
        <Spec label="Camera" value={instrument.camera} />
      </dl>

      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Best for {instrument.suitedTo.join(' · ')}
        </p>
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
          <span className="font-mono">{node.priceGel} ₾</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {' '}per <span className="font-mono">{node.sessionMinutes}</span> min
          </span>
        </p>
      </div>
    </article>
  );
}

function Spec({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm ${mono ? 'font-mono' : ''}`}
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </dd>
    </div>
  );
}
