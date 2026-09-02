export type LogEntry = { at: number; text: string; refused?: boolean };

/**
 * What the instrument did, and when.
 *
 * This is what makes a clouded-out night legible instead of infuriating, so it
 * records refusals as prominently as successes.
 */
export default function MissionLog({ entries, timezone }: { entries: LogEntry[]; timezone: string }) {
  const time = (at: number) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(at));

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <h3 className="mb-3 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Mission log
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Nothing yet. Choose a target to begin.
        </p>
      ) : (
        <ol className="flex max-h-64 flex-col-reverse gap-1.5 overflow-y-auto">
          {entries.map((entry) => (
            <li key={`${entry.at}-${entry.text}`} className="flex gap-3 text-sm">
              <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {time(entry.at)}
              </span>
              <span style={{ color: entry.refused ? 'var(--no)' : 'var(--text-secondary)' }}>
                {entry.text}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
