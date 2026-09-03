/**
 * The clock in a booked room.
 *
 * The simulator lets a visitor move time to tonight's dark window; a session
 * cannot. The slot is twenty minutes of a real instrument's night, so the only
 * numbers that matter are the site's clock and how much of the slot is left.
 */
export default function SessionClock({
  now,
  timezone,
  startsAtMs,
  endsAtMs,
}: {
  now: number;
  timezone: string;
  startsAtMs: number;
  endsAtMs: number;
}) {
  const clock = (at: number) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(at));

  const leftMs = Math.max(0, endsAtMs - now);
  const minutes = Math.floor(leftMs / 60_000);
  const seconds = Math.floor((leftMs % 60_000) / 1000);
  const running = now >= startsAtMs;
  // Under two minutes the slot is closing and the readout should say so.
  const closing = running && leftMs < 120_000;

  return (
    <div className="obs-panel">
      <div className="obs-panel__bar" style={{ borderBottom: 0 }}>
        <span className="flex items-center gap-3">
          <span className="obs-panel__title">Site time</span>
          <span className="obs-readout__value">{clock(now)}</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="obs-panel__title">
            Slot {clock(startsAtMs)}–{clock(endsAtMs)}
          </span>
          <span
            className="obs-readout__value"
            style={{ color: closing ? 'var(--no)' : 'var(--text-primary)' }}
          >
            {running
              ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} left`
              : 'Warming up'}
          </span>
        </span>
      </div>
    </div>
  );
}
