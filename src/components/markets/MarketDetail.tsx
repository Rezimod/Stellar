'use client';

import { useRouter } from 'next/navigation';
import type { PublicKey } from '@solana/web3.js';
import { ExternalLink, Sparkles } from 'lucide-react';
import BetForm from './BetForm';
import PoolStats from './PoolStats';
import UserPositionCard from './UserPositionCard';
import { PROGRAM_ID, marketPDA } from '@/lib/markets';
import type {
  MarketCategory,
  MarketMetadata,
  MarketOnChain,
  Position,
} from '@/lib/markets';
import type { ObserverAdvantage } from '@/lib/observer-advantage';

const DEFAULT_CATEGORY = {
  label: 'MARKET',
  emoji: '✦',
  color: '#FFD166',
  bg: 'rgba(255,209,102,0.10)',
  border: 'rgba(255,209,102,0.22)',
};

const CATEGORY_META: Partial<
  Record<
    MarketCategory,
    { label: string; emoji: string; color: string; bg: string; border: string }
  >
> = {
  sky_event: {
    label: 'SKY EVENT',
    emoji: '🔭',
    color: '#FFD166',
    bg: 'rgba(255,209,102,0.12)',
    border: 'rgba(255,209,102,0.25)',
  },
  weather_event: {
    label: 'WEATHER',
    emoji: '🌧',
    color: '#5EEAD4',
    bg: 'rgba(94,234,212,0.10)',
    border: 'rgba(94,234,212,0.25)',
  },
  natural_phenomenon: {
    label: 'NATURE',
    emoji: '⚡',
    color: '#C4B5FD',
    bg: 'rgba(196,181,253,0.10)',
    border: 'rgba(196,181,253,0.25)',
  },
  meteor: {
    label: 'METEOR',
    emoji: '☄',
    color: '#FFD166',
    bg: 'rgba(255,209,102,0.12)',
    border: 'rgba(255,209,102,0.25)',
  },
  solar: {
    label: 'SOLAR',
    emoji: '☀',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.25)',
  },
  mission: {
    label: 'MISSION',
    emoji: '🚀',
    color: '#38F0FF',
    bg: 'rgba(56,240,255,0.10)',
    border: 'rgba(56,240,255,0.22)',
  },
  comet: {
    label: 'COMET',
    emoji: '🌠',
    color: '#8465CB',
    bg: 'rgba(132,101,203,0.12)',
    border: 'rgba(132,101,203,0.25)',
  },
  discovery: {
    label: 'DISCOVERY',
    emoji: '🔬',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.10)',
    border: 'rgba(52,211,153,0.25)',
  },
  weather: {
    label: 'WEATHER',
    emoji: '🌤',
    color: '#5EEAD4',
    bg: 'rgba(94,234,212,0.10)',
    border: 'rgba(94,234,212,0.25)',
  },
};

function formatLocal(d: Date): string {
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatVolumeShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

type DerivedStatus =
  | { kind: 'open' }
  | { kind: 'locked'; reason: 'close_time' | 'resolution_time' }
  | { kind: 'resolved'; side: 'yes' | 'no' | 'unresolved' }
  | { kind: 'cancelled' };

function deriveStatus(
  onChain: MarketOnChain,
  meta: MarketMetadata | null,
  now: Date,
): DerivedStatus {
  if (onChain.cancelled) return { kind: 'cancelled' };
  if (onChain.resolved) {
    const s = onChain.outcome;
    return {
      kind: 'resolved',
      side: s === 'yes' || s === 'no' ? s : 'unresolved',
    };
  }
  if (now >= onChain.resolutionTime) {
    return { kind: 'locked', reason: 'resolution_time' };
  }
  if (meta && now >= meta.closeTime) {
    return { kind: 'locked', reason: 'close_time' };
  }
  return { kind: 'open' };
}

interface MarketDetailProps {
  onChain: MarketOnChain;
  meta: MarketMetadata | null;
  mint: PublicKey;
  positions: Position[];
  balance: number | null;
  onRefresh: () => void;
  observerAdvantage?: ObserverAdvantage | null;
}

const EXPLORER_CLUSTER =
  (process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? '').includes('mainnet')
    ? 'mainnet-beta'
    : 'devnet';

function explorerAddressUrl(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=${EXPLORER_CLUSTER}`;
}

export default function MarketDetail({
  onChain,
  meta,
  mint,
  positions,
  balance,
  onRefresh,
  observerAdvantage,
}: MarketDetailProps) {
  const router = useRouter();
  const cat =
    (meta && CATEGORY_META[meta.category]) ||
    CATEGORY_META.sky_event ||
    DEFAULT_CATEGORY;
  const title = meta?.title ?? onChain.question ?? `Market #${onChain.marketId}`;
  const description =
    meta?.uiDescription ??
    'On-chain market created without seed metadata. Curated copy lands once this market is bound to a seed entry.';

  const status = deriveStatus(onChain, meta, new Date());
  const [marketAddress] = marketPDA(PROGRAM_ID, onChain.marketId);
  const boost =
    observerAdvantage?.hasAdvantage ? observerAdvantage.multiplier : undefined;

  const askAstra = () => {
    const q = `Should I bet YES on "${title}"? What's your analysis?`;
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  };

  const yesPct = (() => {
    const total = onChain.yesPool + onChain.noPool;
    if (total === 0) return 50;
    return Math.round((onChain.yesPool / total) * 100);
  })();
  const noPct = 100 - yesPct;
  const closeDate = meta?.closeTime ?? onChain.resolutionTime;
  const canTrade = status.kind === 'open' || status.kind === 'locked';

  return (
    <div className="md-grid">
      <div className="md-main">
        {/* Top row: category badge + status */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.14em',
              color: cat.color,
              background: cat.bg,
              border: `1px solid ${cat.border}`,
              borderRadius: 4,
              padding: '3px 7px',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              lineHeight: 1,
            }}
          >
            <span style={{ fontSize: 11 }}>{cat.emoji}</span>
            {cat.label}
          </span>
          <StatusBadge status={status} />
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 30,
            lineHeight: 1.18,
            fontWeight: 600,
            color: 'var(--stl-text-bright)',
            letterSpacing: '-0.01em',
            margin: 0,
          }}
        >
          {title}
        </h1>

        {/* Polymarket-style meta row: volume + close date */}
        <div className="md-meta-row">
          <span className="md-meta-item">
            <span className="md-meta-label">Vol</span>
            <span className="md-meta-value">{formatVolumeShort(onChain.totalStaked)}</span>
          </span>
          <span className="md-meta-divider" aria-hidden />
          <span className="md-meta-item">
            <span className="md-meta-label">Closes</span>
            <span className="md-meta-value">{formatShortDate(closeDate)}</span>
          </span>
          {meta?.resolutionSource && (
            <>
              <span className="md-meta-divider" aria-hidden />
              <span className="md-meta-item">
                <span className="md-meta-label">Source</span>
                <span className="md-meta-value md-meta-source">{meta.resolutionSource.split('—')[0].trim()}</span>
              </span>
            </>
          )}
        </div>

        {/* Description */}
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.7)',
            margin: 0,
          }}
        >
          {description}
        </p>

        {/* Observer advantage banner */}
        {observerAdvantage?.hasAdvantage && (
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,209,102,0.10), rgba(168,85,247,0.08))',
              border: '1px solid rgba(255,209,102,0.35)',
            }}
          >
            <span style={{ fontSize: 22 }}>🔭</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--stl-gold)',
                  margin: 0,
                }}
              >
                Observer advantage active — {observerAdvantage.multiplier}× payout
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.65)',
                  margin: '2px 0 0',
                }}
              >
                {observerAdvantage.reason}
              </p>
            </div>
          </div>
        )}

        {/* Status banners */}
        {status.kind === 'resolved' && (
          <Banner
            tone={status.side === 'yes' ? 'emerald' : status.side === 'no' ? 'rose' : 'slate'}
            title={
              status.side === 'unresolved'
                ? 'Market resolved'
                : `Resolved: ${status.side.toUpperCase()} won`
            }
            subtitle="Winning positions can be claimed."
          />
        )}
        {status.kind === 'cancelled' && (
          <Banner
            tone="slate"
            title="Market cancelled"
            subtitle="All positions refundable."
          />
        )}
        {status.kind === 'locked' && status.reason === 'resolution_time' && (
          <Banner
            tone="amber"
            title="Awaiting resolution"
            subtitle="Oracle data arrives shortly."
          />
        )}

        {/* Pool stats */}
        <PoolStats onChain={onChain} />

        <UserPositionCard positions={positions} />

        {/* Resolution details */}
      <section className="flex flex-col gap-2">
        <h3
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)',
            margin: 0,
          }}
        >
          Resolution details
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {meta?.yesCondition && (
            <DetailRow label="YES condition" value={meta.yesCondition} fullWidth />
          )}
          {meta?.resolutionSource && (
            <DetailRow label="Resolution source" value={meta.resolutionSource} fullWidth />
          )}
          {meta?.closeTime && (
            <DetailRow label="Closes" value={formatLocal(meta.closeTime)} />
          )}
          <DetailRow
            label="Resolves"
            value={formatLocal(meta?.resolutionTime ?? onChain.resolutionTime)}
          />
          <DetailRow label="Market ID" value={`#${onChain.marketId}`} mono />
          <DetailRow
            label="Pools"
            value={`YES ${onChain.yesPool} · NO ${onChain.noPool}`}
            mono
          />
        </dl>
      </section>

      {/* Ask ASTRA */}
      {status.kind === 'open' && (
        <section className="flex flex-col gap-2">
          <h3
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)',
              margin: 0,
            }}
          >
            Ask ASTRA
          </h3>
          <button
            onClick={askAstra}
            className="rounded-xl flex items-center gap-3 text-left"
            style={{
              background:
                'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(52,211,153,0.08))',
              border: '1px solid rgba(124,58,237,0.3)',
              padding: '14px 16px',
              cursor: 'pointer',
              width: '100%',
              transition: 'border-color 0.18s ease, background 0.18s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                'rgba(124,58,237,0.55)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                'rgba(124,58,237,0.3)';
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(124,58,237,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={17} color="#c4b5fd" strokeWidth={1.6} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--stl-text-bright)',
                  margin: 0,
                }}
              >
                Should I bet on this market?
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.55)',
                  margin: '2px 0 0',
                }}
              >
                Ask the AI astronomer — live sky data, historical rates, recommendation.
              </p>
            </div>
            <span
              style={{
                color: 'rgba(196,181,253,0.8)',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              →
            </span>
          </button>
        </section>
      )}

      {/* About this market */}
      {meta?.whyInteresting && (
        <section className="flex flex-col gap-2">
          <h3
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)',
              margin: 0,
            }}
          >
            About this market
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.68)',
              margin: 0,
            }}
          >
            {meta.whyInteresting}
          </p>
        </section>
      )}

      {/* On-chain */}
      <section className="flex flex-col gap-2">
        <h3
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)',
            margin: 0,
          }}
        >
          On-chain
        </h3>
        <div
          className="rounded-xl flex items-center justify-between gap-3"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '10px 12px',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              Market account
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--stl-text-bright)',
                marginTop: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {marketAddress.toBase58()}
            </div>
          </div>
          <a
            href={explorerAddressUrl(marketAddress.toBase58())}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 flex-shrink-0"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'rgba(196,181,253,0.9)',
              textDecoration: 'none',
              letterSpacing: '0.04em',
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(124,58,237,0.1)',
              border: '1px solid rgba(124,58,237,0.25)',
            }}
          >
            Explorer <ExternalLink size={11} />
          </a>
        </div>
      </section>
      </div>

      <aside className="md-side">
        <div className="md-trade-card">
          <div className="md-trade-head">
            <span className="md-trade-title">{canTrade ? 'Trade this market' : 'Market closed'}</span>
            <StatusBadge status={status} />
          </div>
          <div className="md-odds-preview">
            <div className="md-odds-side yes">
              <span className="md-odds-label">Yes</span>
              <span className="md-odds-value">{yesPct}%</span>
            </div>
            <div className="md-odds-side no">
              <span className="md-odds-label">No</span>
              <span className="md-odds-value">{noPct}%</span>
            </div>
          </div>
          {status.kind === 'resolved' || status.kind === 'cancelled' ? (
            <div className="md-trade-closed">Positions closed</div>
          ) : (
            <BetForm
              onChain={onChain}
              mint={mint}
              balance={balance}
              locked={status.kind === 'locked'}
              onSuccess={onRefresh}
              boostMultiplier={boost}
            />
          )}
          <p className="md-trade-terms">
            On-chain settlement on Solana devnet. Stars are testnet tokens.
          </p>
        </div>
      </aside>
    </div>
  );
}

function StatusBadge({ status }: { status: DerivedStatus }) {
  const meta = {
    open: { label: 'Open', dot: 'var(--stl-green)' },
    locked: { label: 'Locked', dot: '#FBBF24' },
    resolved: { label: 'Resolved', dot: 'var(--stl-gold)' },
    cancelled: { label: 'Cancelled', dot: '#94A3B8' },
  }[status.kind];
  return (
    <span
      className="flex items-center gap-1.5"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: '0.14em',
        color: 'rgba(255,255,255,0.6)',
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
          background: meta.dot,
          boxShadow: `0 0 6px ${meta.dot}aa`,
        }}
      />
      {meta.label}
    </span>
  );
}

function Banner({
  tone,
  title,
  subtitle,
}: {
  tone: 'emerald' | 'rose' | 'amber' | 'slate';
  title: string;
  subtitle?: string;
}) {
  const toneStyles: Record<
    'emerald' | 'rose' | 'amber' | 'slate',
    { bg: string; border: string; color: string }
  > = {
    emerald: {
      bg: 'rgba(52,211,153,0.10)',
      border: 'rgba(52,211,153,0.3)',
      color: 'var(--stl-green)',
    },
    rose: {
      bg: 'rgba(244,114,182,0.10)',
      border: 'rgba(244,114,182,0.3)',
      color: '#F472B6',
    },
    amber: {
      bg: 'rgba(251,191,36,0.08)',
      border: 'rgba(251,191,36,0.3)',
      color: '#FBBF24',
    },
    slate: {
      bg: 'rgba(148,163,184,0.08)',
      border: 'rgba(148,163,184,0.28)',
      color: 'rgba(226,232,240,0.85)',
    },
  };
  const t = toneStyles[tone];
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          fontWeight: 600,
          color: t.color,
          margin: 0,
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
            margin: '2px 0 0',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  fullWidth,
  mono,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className={fullWidth ? 'sm:col-span-2' : ''}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        padding: '10px 12px',
      }}
    >
      <dt
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)',
          margin: 0,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)',
          fontSize: mono ? 12 : 13,
          color: 'var(--stl-text-bright)',
          margin: '4px 0 0',
          lineHeight: 1.4,
          fontVariantNumeric: mono ? 'tabular-nums' : undefined,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
