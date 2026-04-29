'use client';

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
    label: 'SKY EVENT',
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
    window.dispatchEvent(
      new CustomEvent('stellar:astra-open', { detail: { message: q } }),
    );
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
        <h1 className="md-title">{title}</h1>

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
        <p className="md-description">{description}</p>

        {/* Observer advantage banner */}
        {observerAdvantage?.hasAdvantage && (
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: 'var(--stl-amber-bg)',
              border: '1px solid var(--stl-amber)',
            }}
          >
            <span style={{ fontSize: 22 }}>🔭</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--stl-amber)',
                  margin: 0,
                }}
              >
                Observer advantage active — {observerAdvantage.multiplier}× payout
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  color: 'var(--stl-text2)',
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
          <h3 className="md-section-label">Resolution details</h3>
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
            <h3 className="md-section-label">Ask ASTRA</h3>
            <button onClick={askAstra} className="md-astra-cta">
              <span className="md-astra-cta-icon">
                <Sparkles size={17} color="var(--stl-accent)" strokeWidth={1.6} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="md-astra-cta-title">Should I bet on this market?</p>
                <p className="md-astra-cta-sub">
                  Ask the AI astronomer — live sky data, historical rates, recommendation.
                </p>
              </div>
              <span className="md-astra-cta-arrow">→</span>
            </button>
          </section>
        )}

        {/* About this market */}
        {meta?.whyInteresting && (
          <section className="flex flex-col gap-2">
            <h3 className="md-section-label">About this market</h3>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--stl-text2)',
                margin: 0,
              }}
            >
              {meta.whyInteresting}
            </p>
          </section>
        )}

        {/* On-chain */}
        <section className="flex flex-col gap-2">
          <h3 className="md-section-label">On-chain</h3>
          <div className="md-onchain">
            <div style={{ minWidth: 0 }}>
              <div className="md-onchain-label">Market account</div>
              <div className="md-onchain-addr">{marketAddress.toBase58()}</div>
            </div>
            <a
              href={explorerAddressUrl(marketAddress.toBase58())}
              target="_blank"
              rel="noopener noreferrer"
              className="md-explorer"
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
    locked: { label: 'Locked', dot: 'var(--stl-amber)' },
    resolved: { label: 'Resolved', dot: 'var(--stl-accent)' },
    cancelled: { label: 'Cancelled', dot: 'var(--stl-text3)' },
  }[status.kind];
  return (
    <span
      className="flex items-center gap-1.5"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: '0.14em',
        color: 'var(--stl-text2)',
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
      bg: 'var(--stl-green-bg)',
      border: 'var(--stl-green)',
      color: 'var(--stl-green)',
    },
    rose: {
      bg: 'var(--stl-red-bg)',
      border: 'var(--stl-red)',
      color: 'var(--stl-red)',
    },
    amber: {
      bg: 'var(--stl-amber-bg)',
      border: 'var(--stl-amber)',
      color: 'var(--stl-amber)',
    },
    slate: {
      bg: 'var(--stl-bg3)',
      border: 'var(--stl-border2)',
      color: 'var(--stl-text1)',
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
          fontFamily: 'var(--font-display)',
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
            color: 'var(--stl-text2)',
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
    <div className={`md-detail-row ${fullWidth ? 'sm:col-span-2' : ''}`}>
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : 'text'}>{value}</dd>
    </div>
  );
}
