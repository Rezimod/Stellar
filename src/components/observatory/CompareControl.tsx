/**
 * Single sub against the live stack, on the same frame.
 *
 * The improvement stacking buys happens over a couple of minutes, which is
 * long enough to miss entirely. Splitting the frame puts the before and the
 * after side by side on the same object at the same instant.
 */
export default function CompareControl({
  splitAt,
  onSplit,
  subs,
  disabled,
}: {
  splitAt: number | null;
  onSplit: (v: number | null) => void;
  subs: number;
  disabled: boolean;
}) {
  const active = splitAt !== null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
        <input
          type="checkbox"
          checked={active}
          disabled={disabled}
          onChange={(e) => onSplit(e.target.checked ? 0.5 : null)}
          style={{ accentColor: 'var(--accent)' }}
        />
        Compare with a single sub
      </label>

      {active && (
        <>
          <input
            type="range"
            min={5}
            max={95}
            value={Math.round((splitAt ?? 0.5) * 100)}
            onChange={(e) => onSplit(Number(e.target.value) / 100)}
            aria-label="Position of the comparison divider"
            className="min-w-[140px] flex-1"
            style={{ accentColor: 'var(--accent)' }}
          />
          <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            1 sub · {subs.toLocaleString()} stacked
          </p>
        </>
      )}

      {!active && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {disabled ? 'Available once the mount is on target.' : 'Split the frame: raw left, stacked right.'}
        </p>
      )}
    </div>
  );
}
