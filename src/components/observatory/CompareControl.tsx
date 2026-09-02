/**
 * Single sub against the live stack, on the same frame.
 *
 * The improvement stacking buys arrives over a couple of minutes, which is
 * long enough to miss entirely. Splitting the frame puts the before and the
 * after side by side on the same object at the same instant.
 */
export default function CompareControl({
  splitAt,
  onSplit,
  disabled,
}: {
  splitAt: number | null;
  onSplit: (v: number | null) => void;
  disabled: boolean;
}) {
  const active = splitAt !== null;

  return (
    <div className="obs-panel">
      <div className="obs-panel__bar" style={{ borderBottom: 0 }}>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
          <input
            type="checkbox"
            checked={active}
            disabled={disabled}
            onChange={(e) => onSplit(e.target.checked ? 0.5 : null)}
            style={{ accentColor: 'var(--accent)' }}
          />
          <span className="obs-panel__title">Raw sub / stack split</span>
        </label>

        {active ? (
          <input
            type="range"
            min={5}
            max={95}
            value={Math.round((splitAt ?? 0.5) * 100)}
            onChange={(e) => onSplit(Number(e.target.value) / 100)}
            aria-label="Position of the comparison divider"
            className="min-w-[120px] flex-1"
            style={{ accentColor: 'var(--accent)' }}
          />
        ) : (
          <span className="obs-panel__title">{disabled ? 'Requires target' : 'Ready'}</span>
        )}
      </div>
    </div>
  );
}
