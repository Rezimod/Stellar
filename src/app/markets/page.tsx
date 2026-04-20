'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import PageTransition from '@/components/ui/PageTransition';
import SkyMapHeader from '@/components/markets/SkyMapHeader';
import RecentlyResolved from '@/components/markets/RecentlyResolved';
import { useReadOnlyProgram } from '@/lib/markets/privy-adapter';
import { useAppState } from '@/hooks/useAppState';
import {
  checkObserverAdvantage,
  getOracleKeyForMarketId,
  missionsToObservations,
} from '@/lib/observer-advantage';
import {
  getFullMarkets,
  getAllMarkets,
  type Market,
  type MarketCategory,
  type MarketOnChain,
  type MarketStatus,
} from '@/lib/markets';

type TabValue = 'all' | 'tonight' | 'week';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

interface CategoryDef {
  key: MarketCategory;
  label: string;
  emoji: string;
}

// v2 categories first (post-seed), v1 fallback below
const CATEGORY_ORDER: CategoryDef[] = [
  { key: 'meteor',             label: 'Meteor Showers',  emoji: '☄' },
  { key: 'solar',              label: 'Solar Activity',  emoji: '☀' },
  { key: 'mission',            label: 'Space Missions',  emoji: '🚀' },
  { key: 'comet',              label: 'Comets & Asteroids', emoji: '🌠' },
  { key: 'discovery',          label: 'Scientific Discoveries', emoji: '🔬' },
  { key: 'weather',            label: 'Weather × Sky',   emoji: '🌤' },
  { key: 'sky_event',          label: 'Sky Events',      emoji: '🔭' },
  { key: 'weather_event',      label: 'Weather Events',  emoji: '🌧' },
  { key: 'natural_phenomenon', label: 'Natural Phenomena', emoji: '⚡' },
];

function deriveStatus(on: MarketOnChain, now: Date): MarketStatus {
  if (on.cancelled) return 'cancelled';
  if (on.resolved) return 'resolved';
  if (now >= on.resolutionTime) return 'locked';
  return 'open';
}

function synthesizeMarket(on: MarketOnChain): Market {
  const total = on.yesPool + on.noPool;
  const impliedYesOdds = total === 0 ? 0.5 : on.yesPool / total;
  const now = new Date();
  return {
    metadata: {
      id: `onchain-${on.marketId}`,
      marketId: on.marketId,
      title: on.question || `Market #${on.marketId}`,
      category: 'sky_event',
      closeTime: on.resolutionTime,
      resolutionTime: on.resolutionTime,
      resolutionSource: 'On-chain market — metadata pending',
      yesCondition: on.question,
      whyInteresting: '',
      uiDescription:
        'On-chain market created without seed metadata. Curated copy lands once this market is bound to a seed entry.',
    },
    onChain: on,
    impliedYesOdds,
    impliedNoOdds: 1 - impliedYesOdds,
    timeToClose: on.resolutionTime.getTime() - now.getTime(),
    timeToResolve: on.resolutionTime.getTime() - now.getTime(),
    status: deriveStatus(on, now),
  };
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '—';
  const days = Math.floor(ms / ONE_DAY_MS);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `${hours}h`;
  const mins = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `${mins}m`;
}

function formatVolume(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

function formatStat(n: number): string {
  return n.toLocaleString();
}

function oddsColorClass(yesPct: number): { odds: string; fill: string } {
  if (yesPct >= 60) return { odds: 'stl-odds-hi',  fill: 'stl-fill-hi' };
  if (yesPct >= 40) return { odds: 'stl-odds-mid', fill: 'stl-fill-mid' };
  return                   { odds: 'stl-odds-lo',  fill: 'stl-fill-lo' };
}

export default function MarketsPage() {
  const router = useRouter();
  const program = useReadOnlyProgram();
  const { state } = useAppState();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabValue>('all');

  const observations = useMemo(
    () => missionsToObservations(state.completedMissions ?? []),
    [state.completedMissions],
  );

  const advantageByMarketId = useMemo(() => {
    const map: Record<number, boolean> = {};
    for (const m of markets) {
      const key = getOracleKeyForMarketId(m.onChain.marketId);
      map[m.onChain.marketId] = checkObserverAdvantage(key, observations).hasAdvantage;
    }
    return map;
  }, [markets, observations]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getFullMarkets(program), getAllMarkets(program)])
      .then(([bound, allOnChain]) => {
        if (cancelled) return;
        const boundIds = new Set(bound.map((m) => m.onChain.marketId));
        const synthesized = allOnChain
          .filter((on) => !boundIds.has(on.marketId))
          .map(synthesizeMarket);
        setMarkets([...bound, ...synthesized]);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[markets] failed to load', err);
        setError(err instanceof Error ? err.message : 'Failed to load markets');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [program]);

  // Visible set after tab filter (tonight / week / all)
  const visible = useMemo(() => {
    const now = Date.now();
    if (tab === 'tonight') {
      return markets.filter(
        (m) => m.status === 'open' && m.metadata.closeTime.getTime() - now <= ONE_DAY_MS,
      );
    }
    if (tab === 'week') {
      return markets.filter(
        (m) => m.status === 'open' && m.metadata.closeTime.getTime() - now <= ONE_WEEK_MS,
      );
    }
    return markets;
  }, [markets, tab]);

  // Group by category preserving CATEGORY_ORDER
  const grouped = useMemo(() => {
    const out: { def: CategoryDef; items: Market[] }[] = [];
    for (const def of CATEGORY_ORDER) {
      const items = visible.filter((m) => m.metadata.category === def.key);
      if (items.length === 0) continue;
      // Sort: open first (by close time asc), then locked, then resolved (by resolution desc)
      items.sort((a, b) => {
        const aOpen = a.status === 'open' ? 0 : a.status === 'locked' ? 1 : 2;
        const bOpen = b.status === 'open' ? 0 : b.status === 'locked' ? 1 : 2;
        if (aOpen !== bOpen) return aOpen - bOpen;
        if (aOpen === 2) {
          return b.metadata.resolutionTime.getTime() - a.metadata.resolutionTime.getTime();
        }
        return a.metadata.closeTime.getTime() - b.metadata.closeTime.getTime();
      });
      out.push({ def, items });
    }
    return out;
  }, [visible]);

  const summary = useMemo(() => {
    let open = 0;
    let resolved = 0;
    let staked = 0;
    let tonight = 0;
    let week = 0;
    const now = Date.now();
    for (const m of markets) {
      if (m.status === 'open') {
        open++;
        const dt = m.metadata.closeTime.getTime() - now;
        if (dt <= ONE_DAY_MS) tonight++;
        if (dt <= ONE_WEEK_MS) week++;
      }
      if (m.status === 'resolved') resolved++;
      staked += m.onChain.totalStaked;
    }
    return { total: markets.length, open, resolved, staked, tonight, week };
  }, [markets]);

  return (
    <PageTransition>
      <PageContainer variant="wide" className="py-3 sm:py-6 flex flex-col gap-5">
        {/* Header */}
        <header className="flex flex-col gap-1.5">
          <h1 className="stl-display-lg" style={{ margin: 0, color: 'var(--stl-text-bright)' }}>
            Observatory Logbook
          </h1>
          <p className="stl-mono-kicker" style={{ color: 'var(--stl-text-muted)', margin: 0 }}>
            {loading
              ? 'Loading on-chain state…'
              : `${summary.open} open · ${summary.resolved} resolved · ${formatStat(summary.staked)} ✦ staked`}
          </p>
        </header>

        {/* Sky map header (kept from Day 7) */}
        {!loading && markets.length > 0 && (
          <SkyMapHeader markets={markets} advantageByMarketId={advantageByMarketId} />
        )}

        {/* Recently resolved strip */}
        {!loading && markets.length > 0 && (
          <RecentlyResolved markets={markets} />
        )}

        {/* Summary stat grid */}
        {!loading && markets.length > 0 && (
          <div className="stl-summary-grid">
            <div className="stl-summary-cell">
              <span className="stl-summary-label">Total Markets</span>
              <span className="stl-summary-value">{formatStat(summary.total)}</span>
            </div>
            <div className="stl-summary-cell">
              <span className="stl-summary-label">Live</span>
              <span className="stl-summary-value">{formatStat(summary.open)}</span>
            </div>
            <div className="stl-summary-cell">
              <span className="stl-summary-label">Resolved</span>
              <span className="stl-summary-value">{formatStat(summary.resolved)}</span>
            </div>
            <div className="stl-summary-cell">
              <span className="stl-summary-label">Stars Staked</span>
              <span className="stl-summary-value">
                {formatVolume(summary.staked)}{' '}
                <span style={{ fontSize: 14, color: 'var(--stl-gold)' }}>✦</span>
              </span>
            </div>
          </div>
        )}

        {/* Tab bar */}
        {!loading && markets.length > 0 && (
          <div className="stl-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'all'}
              className="stl-tab"
              onClick={() => setTab('all')}
            >
              All <span className="stl-tab-count">({summary.total})</span>
            </button>
            <button
              role="tab"
              aria-selected={tab === 'tonight'}
              className="stl-tab"
              onClick={() => setTab('tonight')}
            >
              Tonight <span className="stl-tab-count">({summary.tonight})</span>
            </button>
            <button
              role="tab"
              aria-selected={tab === 'week'}
              className="stl-tab"
              onClick={() => setTab('week')}
            >
              This Week <span className="stl-tab-count">({summary.week})</span>
            </button>
            <button
              className="stl-tab"
              onClick={() => router.push('/my-positions')}
              style={{ marginLeft: 'auto', opacity: 0.65 }}
            >
              My Bets →
            </button>
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  background: 'var(--stl-bg-surface)',
                  border: '1px solid var(--stl-border-soft)',
                  borderRadius: 'var(--stl-r-sm)',
                  height: 42,
                }}
              />
            ))}
          </div>
        ) : error ? (
          <div
            className="rounded-xl px-4 py-6 text-center"
            style={{
              background: 'rgba(244,63,94,0.06)',
              border: '1px solid rgba(244,63,94,0.2)',
              color: 'rgba(252,165,165,0.85)',
              fontFamily: 'var(--font-serif)',
              fontSize: 13,
            }}
          >
            Couldn&rsquo;t load markets &mdash; {error}
          </div>
        ) : visible.length === 0 ? (
          <div
            className="rounded-xl px-4 py-10 text-center flex flex-col items-center gap-2"
            style={{
              background: 'var(--stl-bg-surface)',
              border: '1px solid var(--stl-border-soft)',
            }}
          >
            <span style={{ fontSize: 28, opacity: 0.6 }}>✦</span>
            <p className="stl-display-md" style={{ color: 'var(--stl-text-bright)', margin: 0 }}>
              No markets in this window
            </p>
            <p className="stl-body-sm" style={{ color: 'var(--stl-text-muted)', margin: 0 }}>
              {tab === 'all'
                ? 'Live markets seed when the judging window opens.'
                : 'Try a wider filter to see upcoming markets.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col" id="markets-table">
            {grouped.map(({ def, items }) => (
              <section key={def.key} style={{ display: 'flex', flexDirection: 'column' }}>
                <header className="stl-cat-header">
                  <span style={{ fontSize: 13, opacity: 0.7 }}>{def.emoji}</span>
                  <span className="stl-cat-name">{def.label}</span>
                  <span className="stl-cat-count">({items.length})</span>
                </header>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {items.map((m) => (
                    <MarketRow
                      key={m.onChain.marketId}
                      market={m}
                      advantage={!!advantageByMarketId[m.onChain.marketId]}
                      onClick={() => router.push(`/markets/${m.onChain.marketId}`)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </PageContainer>
    </PageTransition>
  );
}

interface RowProps {
  market: Market;
  advantage: boolean;
  onClick: () => void;
}

function MarketRow({ market, advantage, onClick }: RowProps) {
  const resolved = market.status === 'resolved';
  const cancelled = market.status === 'cancelled';
  const emoji = market.metadata.emoji ?? '✦';
  const yesPct = Math.round(market.impliedYesOdds * 100);
  const volume = market.onChain.totalStaked;
  const now = Date.now();
  const countdown = formatCountdown(market.metadata.closeTime.getTime() - now);
  const colors = oddsColorClass(yesPct);

  const isResolvedYes = resolved && market.onChain.outcome === 'yes';
  const isResolvedNo = resolved && market.onChain.outcome === 'no';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`stl-row-obs ${resolved || cancelled ? 'stl-row-obs-resolved' : ''}`}
      id={`market-${market.onChain.marketId}`}
    >
      <span className="stl-row-obs-emoji" aria-hidden>{emoji}</span>
      <span className="stl-row-obs-title">
        {advantage && !resolved && (
          <span className="stl-adv-badge" title="Observer advantage — 1.5× payout">
            🔭 1.5×
          </span>
        )}
        {market.metadata.title}
      </span>
      <span className="stl-row-obs-right">
        {resolved ? (
          <span
            className={`stl-resolved-tag ${isResolvedYes ? 'stl-resolved-yes' : isResolvedNo ? 'stl-resolved-no' : ''}`}
          >
            {isResolvedYes ? '✓ YES' : isResolvedNo ? '✗ NO' : '⟳'}
          </span>
        ) : cancelled ? (
          <span className="stl-resolved-tag" style={{ color: 'var(--stl-text-dim)' }}>
            ⟳ CANCELLED
          </span>
        ) : (
          <>
            <span className={`stl-row-obs-odds ${colors.odds}`}>{yesPct}%</span>
            <div className="stl-prob-bar" aria-hidden>
              <div className={`stl-prob-fill ${colors.fill}`} style={{ width: `${yesPct}%` }} />
            </div>
            <span className="stl-row-obs-vol">{formatVolume(volume)} ✦</span>
            <span className="stl-row-obs-time">{countdown}</span>
          </>
        )}
      </span>
    </div>
  );
}
