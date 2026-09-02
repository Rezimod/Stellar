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
    <div className="obs-panel">
      <div className="obs-panel__bar">
        <span className="obs-panel__title">Mission log</span>
        <span className="obs-panel__title">{entries.length}</span>
      </div>
      <div className="obs-panel__body">
        {entries.length === 0 ? (
          <p className="obs-label">Awaiting first command</p>
        ) : (
          <ol className="obs-log">
            {entries.map((entry) => (
              <li key={`${entry.at}-${entry.text}`} className="flex gap-3">
                <span className="obs-log__time">{time(entry.at)}</span>
                <span style={{ color: entry.refused ? 'var(--no)' : 'var(--text-secondary)' }}>
                  {entry.text}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
