import type { ObservationStatus } from '@/lib/sidera/observability';

type ObservationStatusMarkProps = {
  status: ObservationStatus;
  className?: string;
};

const LABEL: Record<ObservationStatus, { short: string; long: string }> = {
  dedicated: { short: 'Dedicated', long: 'a dedicated Node 01 target' },
  eligible: { short: 'Eligible', long: 'eligible for Node 01' },
  not_available: { short: 'Not observable', long: 'not observable from Node 01' },
};

/** Circles, in ink: filled, open, open and struck through. Never brass, never a diamond. */
function Glyph({ status }: { status: ObservationStatus }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <circle cx="6" cy="6" r="4.5" fill={status === 'dedicated' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1" />
      {status === 'not_available' && <path d="M2.8 9.2 L9.2 2.8" stroke="currentColor" strokeWidth="1" />}
    </svg>
  );
}

/**
 * Whether Node 01 can photograph what a card shows. Monochrome with a hairline
 * outline (dashed when not observable) so it stays distinct from the brass
 * RarityMark beside it. Scarcity and observability are unrelated: Europa is
 * epic and not observable.
 */
export default function ObservationStatusMark({ status, className = '' }: ObservationStatusMarkProps) {
  const { short, long } = LABEL[status];
  return (
    <span className={`sd-status sd-status--${status} ${className}`.trim()} title={`Observation: ${long}`}>
      <Glyph status={status} />
      <span className="sr-only">Observation status: </span>
      <span>{short}</span>
    </span>
  );
}
