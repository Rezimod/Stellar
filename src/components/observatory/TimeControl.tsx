/**
 * The simulated clock.
 *
 * A real booking is made for a time in the future, and the sky at that time is
 * what decides whether the booking is worth making. Defaulting to "now" is
 * honest but leaves the console refusing everything through the working day,
 * so the visitor can step the clock to tonight's dark window — the same window
 * the forecast pages already compute.
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
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Site time{' '}
        <span className="font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {stamp}
        </span>
        {offsetMs !== 0 && (
          <span style={{ color: 'var(--accent-text)' }}> · simulated forward</span>
        )}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onJumpToNight}
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          Jump to tonight
        </button>
        <button
          type="button"
          onClick={onReturnToNow}
          disabled={offsetMs === 0}
          className="rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Now
        </button>
      </div>
    </div>
  );
}
