/**
 * The simulated clock.
 *
 * A booking is made for a time in the future, and the sky at that time decides
 * whether it is worth making. Defaulting to now is honest but leaves the
 * console refusing everything through the working day, so the visitor can step
 * to tonight's dark window — the same window the forecast pages compute.
 */
export default function TimeControl({
  now,
  timezone,
  offsetMs,
  onJumpToNight,
  onReturnToNow,
}: {
  now: number;
  timezone: string;
  offsetMs: number;
  onJumpToNight: () => void;
  onReturnToNow: () => void;
}) {
  const stamp = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(now));

  return (
    <div className="obs-panel">
      <div className="obs-panel__bar" style={{ borderBottom: 0 }}>
        <span className="flex items-center gap-3">
          <span className="obs-panel__title">Site time</span>
          <span className="obs-readout__value">{stamp}</span>
          {offsetMs !== 0 && (
            <span className="obs-panel__title" style={{ color: 'var(--accent-text)' }}>
              Simulated forward
            </span>
          )}
        </span>

        <span className="flex gap-2">
          <button type="button" className="obs-action" onClick={onJumpToNight}>
            Jump to tonight
          </button>
          <button type="button" className="obs-action" onClick={onReturnToNow} disabled={offsetMs === 0}>
            Now
          </button>
        </span>
      </div>
    </div>
  );
}
