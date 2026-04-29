'use client';

import type { Market, MarketCategory, MarketStatus } from '@/lib/markets';

interface MarketCardProps {
  market: Market;
  onClick: () => void;
  observerAdvantage?: boolean;
}

const DEFAULT_CATEGORY = {
  label: 'MARKET',
  emoji: '✦',
  color: 'var(--stars)',
  bg: 'rgba(232, 130, 107,0.10)',
  border: 'rgba(232, 130, 107,0.22)',
};

const CATEGORY_META: Partial<
  Record<
    MarketCategory,
    { label: string; emoji: string; color: string; bg: string; border: string }
  >
> = {
  sky_event: {
    label: 'SKY',
    emoji: '🔭',
    color: 'var(--stars)',
    bg: 'rgba(232, 130, 107,0.12)',
    border: 'rgba(232, 130, 107,0.25)',
  },
  weather_event: {
    label: 'WEATHER',
    emoji: '🌧',
    color: 'var(--seafoam)',
    bg: 'rgba(94, 234, 212,0.10)',
    border: 'rgba(94, 234, 212,0.25)',
  },
  natural_phenomenon: {
    label: 'NATURE',
    emoji: '⚡',
    color: 'var(--terracotta)',
    bg: 'rgba(232, 130, 107,0.10)',
    border: 'rgba(232, 130, 107,0.25)',
  },
  meteor: {
    label: 'METEOR',
    emoji: '☄',
    color: 'var(--stars)',
    bg: 'rgba(232, 130, 107,0.12)',
    border: 'rgba(232, 130, 107,0.25)',
  },
  solar: {
    label: 'SOLAR',
    emoji: '☀',
    color: 'var(--terracotta)',
    bg: 'rgba(232, 130, 107,0.10)',
    border: 'rgba(232, 130, 107,0.25)',
  },
  mission: {
    label: 'MISSION',
    emoji: '🚀',
    color: 'var(--stl-teal)',
    bg: 'rgba(94, 234, 212,0.10)',
    border: 'rgba(94, 234, 212,0.22)',
  },
  comet: {
    label: 'COMET',
    emoji: '🌠',
    color: 'var(--terracotta)',
    bg: 'rgba(232, 130, 107,0.12)',
    border: 'rgba(232, 130, 107,0.25)',
  },
  discovery: {
    label: 'DISCOVERY',
    emoji: '🔬',
    color: 'var(--success)',
    bg: 'rgba(94, 234, 212,0.10)',
    border: 'rgba(94, 234, 212,0.25)',
  },
  weather: {
    label: 'WEATHER',
    emoji: '🌤',
    color: 'var(--seafoam)',
    bg: 'rgba(94, 234, 212,0.10)',
    border: 'rgba(94, 234, 212,0.25)',
  },
};

const STATUS_META: Record<
  MarketStatus,
  { label: string; dot: string }
> = {
  open:      { label: 'Open',      dot: 'var(--success)' },
  locked:    { label: 'Locked',    dot: 'var(--terracotta)' },
  resolved:  { label: 'Resolved',  dot: 'var(--stars)' },
  cancelled: { label: 'Cancelled', dot: 'var(--text-muted)' },
};

function formatRelative(ms: number): string {
  if (ms <= 0) return 'closed';
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function compactInt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

export default function MarketCard({ market, onClick, observerAdvantage = false }: MarketCardProps) {
  const cat = CATEGORY_META[market.metadata.category] ?? DEFAULT_CATEGORY;
  const status = STATUS_META[market.status];
  const isResolved = market.status === 'resolved';
  const isCancelled = market.status === 'cancelled';
  const dimmed = isResolved || isCancelled;
  const total = market.onChain.totalStaked;
  const yesPct = Math.round(market.impliedYesOdds * 100);
  const noPct = 100 - yesPct;
  const emptyPools = market.onChain.yesPool === 0 && market.onChain.noPool === 0;

  const resolvedSide =
    isResolved && market.onChain.outcome === 'yes'
      ? 'YES'
      : isResolved && market.onChain.outcome === 'no'
      ? 'NO'
      : null;

  return (
    <button
      onClick={onClick}
      className="relative text-left overflow-hidden transition-all active:scale-[0.99] hover:-translate-y-0.5"
      style={{
        background: 'var(--surface)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '12px 14px',
        minHeight: 196,
        opacity: dimmed ? 0.62 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        cursor: 'pointer',
      }}
    >
      {/* Top row: category badge + status/resolved badge */}
      <div className="flex items-center justify-between gap-2">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.14em',
            color: cat.color,
            background: cat.bg,
            border: `1px solid ${cat.border}`,
            borderRadius: 4,
            padding: '2.5px 6px',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            lineHeight: 1,
          }}
        >
          <span style={{ fontSize: 10 }}>{cat.emoji}</span>
          {cat.label}
        </span>

        {resolvedSide ? (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: resolvedSide === 'YES' ? 'var(--terracotta)' : 'var(--negative)',
              background: resolvedSide === 'YES' ? 'rgba(232, 130, 107, 0.10)' : 'rgba(251, 113, 133, 0.10)',
              border: `1px solid ${resolvedSide === 'YES' ? 'rgba(232, 130, 107, 0.3)' : 'rgba(251, 113, 133, 0.3)'}`,
              borderRadius: 4,
              padding: '2.5px 6px',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            ✓ {resolvedSide}
          </span>
        ) : (
          <span
            className="flex items-center gap-1.5"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 9999,
                background: status.dot,
                boxShadow: `0 0 6px ${status.dot}aa`,
              }}
            />
            {status.label}
          </span>
        )}
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--text)',
          lineHeight: 1.2,
          letterSpacing: '-0.005em',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {market.metadata.title}
      </div>

      {observerAdvantage && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            alignSelf: 'flex-start',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--stars)',
            background: 'rgba(232, 130, 107,0.10)',
            border: '1px solid rgba(232, 130, 107,0.32)',
            borderRadius: 999,
            padding: '2.5px 7px',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}
        >
          🔭 1.5× Observer
        </span>
      )}

      {/* Description */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.45,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {market.metadata.uiDescription}
      </div>

      {/* Spacer pushes odds + stats to bottom */}
      <div style={{ flex: 1 }} />

      {/* Odds bar */}
      {emptyPools ? (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '8px 0',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: 6,
          }}
        >
          Awaiting first position
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            height: 22,
            borderRadius: 5,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              flex: yesPct,
              background: 'linear-gradient(90deg, rgba(94, 234, 212,0.85), rgba(94, 234, 212,0.65))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: '#04140C',
              letterSpacing: '0.04em',
              minWidth: yesPct === 0 ? 0 : 32,
            }}
          >
            {yesPct > 0 ? `YES ${yesPct}%` : ''}
          </div>
          <div
            style={{
              flex: noPct,
              background: 'linear-gradient(90deg, rgba(251, 113, 133, 0.65), rgba(251, 113, 133, 0.85))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: '#1A0810',
              letterSpacing: '0.04em',
              minWidth: noPct === 0 ? 0 : 32,
            }}
          >
            {noPct > 0 ? `NO ${noPct}%` : ''}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div
        className="flex items-center justify-between"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span style={{ color: 'var(--stars)' }}>✦ {compactInt(total)}</span>
        <span>
          {market.status === 'resolved' || market.status === 'cancelled'
            ? `Resolved ${formatRelative(Math.max(0, Date.now() - market.metadata.resolutionTime.getTime()))} ago`
            : market.status === 'locked'
            ? `Resolves in ${formatRelative(market.timeToResolve)}`
            : `Closes in ${formatRelative(market.timeToClose)}`}
        </span>
      </div>
    </button>
  );
}
