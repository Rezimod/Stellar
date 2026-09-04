import { useTranslations } from 'next-intl';
import type { NodeReadiness } from '@/lib/observatory/types';

/** Green only when the sky and the instrument both say yes. */
const TONE: Record<NodeReadiness['state'], { fg: string; bg: string; bd: string }> = {
  online:   { fg: 'var(--yes)', bg: 'var(--yes-dim)', bd: 'var(--yes-border)' },
  busy:     { fg: 'var(--accent-text)', bg: 'var(--accent-dim)', bd: 'var(--accent-border)' },
  weather:  { fg: 'var(--no)', bg: 'var(--no-dim)', bd: 'var(--no-border)' },
  daylight: { fg: 'var(--text-muted)', bg: 'var(--surface)', bd: 'var(--border)' },
  offline:  { fg: 'var(--text-muted)', bg: 'var(--surface)', bd: 'var(--border)' },
};

export default function ReadinessBadge({ readiness }: { readiness: NodeReadiness }) {
  const t = useTranslations('observatory.state');
  const tone = TONE[readiness.state];

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
      style={{ color: tone.fg, background: tone.bg, borderColor: tone.bd }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: tone.fg }}
      />
      {t(readiness.state)}
    </span>
  );
}
