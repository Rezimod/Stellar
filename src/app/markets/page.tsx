'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicKey } from '@solana/web3.js';
import PageTransition from '@/components/ui/PageTransition';
import {
  useReadOnlyProgram,
  useStellarSigner,
} from '@/lib/markets/privy-adapter';
import { useAppState } from '@/hooks/useAppState';
import { useStarsBalance } from '@/hooks/useStarsBalance';
import { useVisibleInterval } from '@/hooks/useVisibleInterval';
import InlineBetPanel from '@/components/markets/InlineBetPanel';
import MyActiveBets from '@/components/markets/MyActiveBets';
import {
  checkObserverAdvantage,
  getOracleKeyForMarketId,
  missionsToObservations,
} from '@/lib/observer-advantage';
import {
  buildFullMarketsFromOnChain,
  getAllMarkets,
  getConfig,
  invalidateMarketsCache,
  type Market,
  type MarketCategory,
  type MarketOnChain,
  type MarketSide,
  type MarketStatus,
} from '@/lib/markets';
import { displayTitle } from '@/lib/markets/display';
import {
  getCategoryIcon,
  TelescopeIcon,
} from '@/components/icons/MarketIcons';
import { MISSIONS } from '@/lib/constants';

const MISSION_IMAGE: Record<string, string> = {
  'demo':            '/images/planets/jupiter.jpg',
  'quick-jupiter':   '/images/planets/jupiter.jpg',
  'quick-saturn':    '/images/planets/saturn.jpg',
  'free-observation':'/images/constellations/orion.jpg',
  'moon':            '/images/planets/moon.jpg',
  'jupiter':         '/images/planets/jupiter.jpg',
  'saturn':          '/images/planets/saturn.jpg',
  'orion':           '/images/dso/m42.jpg',
  'pleiades':        '/images/dso/m45.jpg',
  'andromeda':       '/images/dso/m31.jpg',
  'crab':            '/images/dso/m1.jpg',
};
function missionImage(id: string): string {
  return MISSION_IMAGE[id] ?? '/images/planets/jupiter.jpg';
}

type CategoryFilter = 'all' | MarketCategory;
type Theme = 'light' | 'dark';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THEME_KEY = 'stellar-markets-theme';

interface CategoryDef {
  key: MarketCategory;
  label: string;
}

const CATEGORY_ORDER: CategoryDef[] = [
  { key: 'meteor',             label: 'Meteor showers' },
  { key: 'solar',              label: 'Solar activity' },
  { key: 'mission',            label: 'Space missions' },
  { key: 'comet',              label: 'Comets & asteroids' },
  { key: 'discovery',          label: 'Scientific discoveries' },
  { key: 'weather',            label: 'Weather × sky' },
  { key: 'sky_event',          label: 'Sky events' },
  { key: 'weather_event',      label: 'Weather events' },
  { key: 'natural_phenomenon', label: 'Natural phenomena' },
  { key: 'crypto',             label: 'Crypto markets' },
  { key: 'sports',             label: 'Sports' },
];

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: 'all',        label: 'All' },
  { value: 'meteor',     label: 'Meteor showers' },
  { value: 'solar',      label: 'Solar' },
  { value: 'mission',    label: 'Missions' },
  { value: 'comet',      label: 'Comets' },
  { value: 'discovery',  label: 'Discoveries' },
  { value: 'weather',    label: 'Weather' },
  { value: 'sky_event',  label: 'Sky events' },
  { value: 'crypto',     label: 'Crypto' },
  { value: 'sports',     label: 'Sports' },
];

interface SkyEvent {
  month: string;
  day: number;
  date: Date;
  title: string;
  desc: string;
}

const UPCOMING_SKY_EVENTS: SkyEvent[] = [
  { month: 'Apr', day: 22, date: new Date('2026-04-22'), title: 'Lyrid meteor shower peak', desc: 'ZHR 18, moonlight minimal' },
  { month: 'May', day: 2,  date: new Date('2026-05-02'), title: 'Asteroid Vesta at opposition', desc: 'Brightest of the year' },
  { month: 'May', day: 5,  date: new Date('2026-05-05'), title: 'Eta Aquariids peak', desc: 'Halley debris, ZHR 50' },
  { month: 'Jun', day: 17, date: new Date('2026-06-17'), title: 'Venus-Moon occultation', desc: 'Daytime event, visible from US' },
  { month: 'Aug', day: 12, date: new Date('2026-08-12'), title: 'Perseids peak + solar eclipse', desc: 'New moon, ideal conditions' },
];

const SPACE_NEWS = [
  'JWST detects water vapor around K2-18b in expanded dataset',
  'SpaceX Starship IFT-12 hits Mars transfer test profile',
  'Vera Rubin Observatory releases first-light images',
  'ESA Ariel exoplanet survey cleared for 2029 launch',
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
  if (days >= 1) return `${days}d left`;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `${hours}h left`;
  const mins = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `${mins}m left`;
}

function formatVolume(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

function formatCloseDate(d: Date): string {
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function oracleBadge(src: string | undefined): string | null {
  if (!src) return null;
  const s = src.toLowerCase();
  if (s.includes('imo') || s.includes('international meteor')) return 'IMO live';
  if (s.includes('swpc') || s.includes('noaa space weather')) return 'NOAA SWPC';
  if (s.includes('noaa')) return 'NOAA';
  if (s.includes('open-meteo')) return 'Open-Meteo';
  if (s.includes('nasa') && s.includes('spacex')) return 'NASA / SpaceX';
  if (s.includes('nasa')) return 'NASA';
  if (s.includes('spacex')) return 'SpaceX';
  if (s.includes('mpc') || s.includes('minor planet')) return 'MPC';
  if (s.includes('cobs')) return 'COBS';
  if (s.includes('ams ') || s.includes('american meteor')) return 'AMS';
  if (s.includes('jpl') || s.includes('horizons')) return 'NASA JPL';
  if (s.includes('gcn') || s.includes('ligo')) return 'LIGO / GCN';
  if (s.includes('jwst')) return 'JWST team';
  if (s.includes('nobel')) return 'Nobel cttee';
  if (s.includes('gaia')) return 'ESA Gaia';
  if (s.includes('laser seti') || s.includes('seti')) return 'SETI';
  if (s.includes('esa')) return 'ESA';
  if (s.includes('cnsa') || s.includes('chang')) return 'CNSA';
  if (s.includes('colosseum')) return 'Colosseum';
  return null;
}

export default function MarketsPage() {
  const router = useRouter();
  const program = useReadOnlyProgram();
  const signer = useStellarSigner();
  const { state } = useAppState();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [theme, setTheme] = useState<Theme>('light');
  const [mint, setMint] = useState<PublicKey | null>(null);
  const balance = useStarsBalance(signer.publicKey?.toBase58() ?? null);
  const [expanded, setExpanded] = useState<{
    marketId: number;
    side: MarketSide;
  } | null>(null);

  // Mint is filled in by the markets fetch below (config is cached, so this
  // call piggybacks on the same RPC as `getAllMarkets`). No separate effect
  // needed — see the consolidated load effect.

  // Stars balance is provided by the shared `useStarsBalance` hook above; it
  // already listens for `stellar:stars-synced` and re-fetches on demand.

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') setTheme('dark');
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  }

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
    // Reset the markets/config caches when the user explicitly retries so we
    // don't serve a stale failure result.
    if (retryKey > 0) invalidateMarketsCache();
    Promise.all([getAllMarkets(program), getConfig(program)])
      .then(([allOnChain, cfg]) => {
        if (cancelled) return;
        setMint(cfg?.mint ?? null);
        const bound = buildFullMarketsFromOnChain(allOnChain);
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
        setError('Could not load — try again');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [program, retryKey]);

  // Stats — preview markets don't count toward staked/open counters.
  const summary = useMemo(() => {
    let open = 0;
    let resolved = 0;
    let staked = 0;
    for (const m of markets) {
      if (m.metadata.previewOnly) continue;
      if (m.status === 'open') open++;
      if (m.status === 'resolved') resolved++;
      staked += m.onChain.totalStaked;
    }
    return { open, resolved, staked };
  }, [markets]);

  // Trending pool: real (non-preview) open markets closing soonest.
  const trendingPool = useMemo(() => {
    const now = Date.now();
    return markets
      .filter((m) =>
        m.status === 'open' &&
        !m.metadata.previewOnly &&
        m.metadata.closeTime.getTime() > now
      )
      .sort((a, b) => a.metadata.closeTime.getTime() - b.metadata.closeTime.getTime())
      .slice(0, 12);
  }, [markets]);

  const [trendingOffset, setTrendingOffset] = useState(0);
  const [trendingPaused, setTrendingPaused] = useState(false);
  const TRENDING_VISIBLE = 4;

  useVisibleInterval(
    () => setTrendingOffset((o) => (o + 1) % trendingPool.length),
    trendingPool.length <= TRENDING_VISIBLE || trendingPaused ? null : 4500,
  );

  const trending = useMemo(() => {
    if (trendingPool.length === 0) return [];
    const visible = Math.min(TRENDING_VISIBLE, trendingPool.length);
    const out: Market[] = [];
    for (let i = 0; i < visible; i++) {
      out.push(trendingPool[(trendingOffset + i) % trendingPool.length]);
    }
    return out;
  }, [trendingPool, trendingOffset]);

  // Sidebar trending: top 4 by volume (open only, no previews)
  const sidebarTrending = useMemo(() => {
    return markets
      .filter((m) => m.status === 'open' && !m.metadata.previewOnly)
      .sort((a, b) => b.onChain.totalStaked - a.onChain.totalStaked)
      .slice(0, 4);
  }, [markets]);

  // Visible active markets (open/locked) filtered by category
  const grouped = useMemo(() => {
    const active = markets.filter(
      (m) => m.status === 'open' || m.status === 'locked',
    );
    const filtered = category === 'all'
      ? active
      : active.filter((m) => m.metadata.category === category);

    const out: { def: CategoryDef; items: Market[] }[] = [];
    for (const def of CATEGORY_ORDER) {
      const items = filtered.filter((m) => m.metadata.category === def.key);
      if (items.length === 0) continue;
      items.sort((a, b) => {
        const aOpen = a.status === 'open' ? 0 : 1;
        const bOpen = b.status === 'open' ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        return a.metadata.closeTime.getTime() - b.metadata.closeTime.getTime();
      });
      out.push({ def, items });
    }
    return out;
  }, [markets, category]);

  const resolvedItems = useMemo(() => {
    return markets
      .filter((m) => m.status === 'resolved' || m.status === 'cancelled')
      .sort(
        (a, b) =>
          b.metadata.resolutionTime.getTime() - a.metadata.resolutionTime.getTime(),
      );
  }, [markets]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return UPCOMING_SKY_EVENTS
      .filter((e) => e.date.getTime() >= now)
      .slice(0, 3);
  }, []);

  const sidebarMissions = useMemo(
    () =>
      MISSIONS
        .filter((m) => !m.demo && m.id !== 'demo')
        .slice(0, 4),
    [],
  );

  const activeCount = grouped.reduce(
    (n, g) => n + g.items.filter((m) => !m.metadata.previewOnly).length,
    0,
  );
  const previewCount = grouped.reduce(
    (n, g) => n + g.items.filter((m) => m.metadata.previewOnly).length,
    0,
  );

  return (
    <PageTransition>
      <div className={`markets-page ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="mkt-shell">
        {/* Stats bar + theme toggle */}
        <div className="mkt-stats-bar">
          {loading ? (
            <span
              aria-hidden
              className="mkt-stats-skeleton animate-pulse"
            />
          ) : (
            <span className="mkt-stats-text">
              {`${summary.open} open · ${summary.resolved} resolved · ${formatVolume(summary.staked)} staked`}
            </span>
          )}
          <button
            type="button"
            className="mkt-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          />
        </div>

        {/* Trending strip — auto-rotates every 4.5s, pauses on hover */}
        {!loading && trending.length > 0 && (
          <div
            className="mkt-trending-strip"
            role="list"
            onMouseEnter={() => setTrendingPaused(true)}
            onMouseLeave={() => setTrendingPaused(false)}
          >
            {trending.map((m) => {
              const Icon = getCategoryIcon(m.metadata.category);
              const yesPct = Math.round(m.impliedYesOdds * 100);
              const noPct = 100 - yesPct;
              const countdown = formatCountdown(
                m.metadata.closeTime.getTime() - Date.now(),
              );
              const oracle = oracleBadge(m.metadata.resolutionSource);
              const vol = m.onChain.totalStaked;
              return (
                <div
                  key={`${trendingOffset}-${m.onChain.marketId}`}
                  role="listitem"
                  data-category={m.metadata.category}
                  className="mkt-trending-chip mkt-trending-chip--anim"
                  onClick={() => router.push(`/markets/${m.onChain.marketId}`)}
                >
                  <span className="mkt-trending-icon" data-category={m.metadata.category}>
                    <Icon size={20} />
                  </span>
                  <div className="mkt-trending-body">
                    <div className="mkt-trending-title">{displayTitle(m.metadata)}</div>
                    <div className="mkt-trending-meta">
                      {oracle && <span className="mkt-trending-oracle">{oracle}</span>}
                      <span>{countdown}</span>
                      <span className="mkt-trending-vol">{formatVolume(vol)} vol</span>
                    </div>
                  </div>
                  <div className="mkt-trending-odds-col">
                    <span className={`mkt-trending-odds ${yesPct >= 50 ? 'hi' : 'lo'}`}>{yesPct}%</span>
                    <span className="mkt-trending-no">No {noPct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Two-column layout */}
        <div className="mkt-layout">
          <div className="mkt-main">
            <header className="mkt-section-header">
              <h1 className="mkt-section-title">All markets</h1>
              {!loading && (
                <span className="mkt-section-meta mkt-section-live">
                  <span className="live-led" aria-hidden />
                  {activeCount} live markets on Solana
                  {previewCount > 0 && (
                    <span className="mkt-section-preview-count"> · {previewCount} preview</span>
                  )}
                </span>
              )}
            </header>

            <div className="mkt-tabs" role="tablist">
              {CATEGORY_TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={category === t.value}
                  className="mkt-tab"
                  onClick={() => setCategory(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div aria-hidden role="presentation">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="mkt-row-skeleton animate-pulse">
                    <span className="mkt-sk-icon" />
                    <div className="mkt-sk-content">
                      <span className="mkt-sk-title" />
                      <span className="mkt-sk-meta" />
                    </div>
                    <div className="mkt-sk-odds">
                      <span className="mkt-sk-pill" />
                      <span className="mkt-sk-pill" />
                    </div>
                    <span className="mkt-sk-vol" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-text-muted mb-3">{error}</p>
                <button
                  type="button"
                  onClick={() => setRetryKey((k) => k + 1)}
                  className="text-seafoam hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : activeCount === 0 ? (
              <div className="mkt-state">
                <p className="mkt-state-title">No markets in this category</p>
                <p>Try another filter or come back when new markets seed.</p>
              </div>
            ) : (
              <div className="mkt-list">
                {grouped.map(({ def, items }) => (
                  <section key={def.key} data-category={def.key}>
                    <div className="mkt-group-header" data-category={def.key}>{def.label}</div>
                    {items.map((m) => (
                      <MarketRow
                        key={m.onChain.marketId}
                        market={m}
                        advantage={!!advantageByMarketId[m.onChain.marketId]}
                        onClick={() => router.push(`/markets/${m.onChain.marketId}`)}
                        expandedSide={
                          expanded?.marketId === m.onChain.marketId
                            ? expanded.side
                            : null
                        }
                        onPickSide={(side) =>
                          setExpanded((prev) =>
                            prev?.marketId === m.onChain.marketId &&
                            prev.side === side
                              ? null
                              : { marketId: m.onChain.marketId, side },
                          )
                        }
                        onCloseBet={() => setExpanded(null)}
                        onBetSuccess={() => setRetryKey((k) => k + 1)}
                        mint={mint}
                        balance={balance}
                        boost={
                          advantageByMarketId[m.onChain.marketId] ? 1.5 : undefined
                        }
                      />
                    ))}
                  </section>
                ))}

                {resolvedItems.length > 0 && (
                  <section>
                    <div className="mkt-group-header">Resolved</div>
                    {resolvedItems.map((m) => (
                      <ResolvedRow
                        key={m.onChain.marketId}
                        market={m}
                        onClick={() => router.push(`/markets/${m.onChain.marketId}`)}
                      />
                    ))}
                  </section>
                )}
              </div>
            )}

            {/* My active bets — below the browse list per the system spec.
                Hides itself when empty. */}
            <div className="mkt-my-bets-wrap">
              <MyActiveBets variant="compact" title="My active bets" />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="mkt-sidebar">
            <div className="mkt-sidebar-inner">
              <div className="mkt-side-section">
                <div className="mkt-side-head">
                  <span className="mkt-side-title">Tonight&rsquo;s sky</span>
                  <a className="mkt-side-seeall" href="/sky">See all</a>
                </div>
                {upcomingEvents.map((e) => (
                  <div
                    key={`${e.month}-${e.day}`}
                    className="mkt-event"
                    onClick={() => router.push('/sky')}
                  >
                    <div className="mkt-event-date">
                      <span className="m">{e.month}</span>
                      <span className="d">{e.day}</span>
                    </div>
                    <div className="mkt-event-body">
                      <div className="mkt-event-title">{e.title}</div>
                      <div className="mkt-event-desc">{e.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {sidebarTrending.length > 0 && (
                <div className="mkt-side-section">
                  <div className="mkt-side-head">
                    <span className="mkt-side-title">Trending</span>
                    <a
                      className="mkt-side-seeall"
                      href="#"
                      onClick={(ev) => { ev.preventDefault(); setCategory('all'); }}
                    >
                      See all
                    </a>
                  </div>
                  {sidebarTrending.map((m, i) => {
                    const yesPct = Math.round(m.impliedYesOdds * 100);
                    return (
                      <div
                        key={m.onChain.marketId}
                        className="mkt-trend-row"
                        onClick={() => router.push(`/markets/${m.onChain.marketId}`)}
                      >
                        <span className="mkt-trend-rank">{i + 1}</span>
                        <span className="mkt-trend-title">{displayTitle(m.metadata)}</span>
                        <span className={`mkt-trend-odds ${yesPct >= 50 ? 'hi' : 'lo'}`}>
                          {yesPct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mkt-side-section">
                <div className="mkt-tip">
                  <div className="mkt-tip-title">
                    <TelescopeIcon size={14} />
                    <span>Observer advantage</span>
                  </div>
                  <div className="mkt-tip-body">
                    Complete sky missions for 1.5× payout on related markets.
                  </div>
                </div>
              </div>

              {sidebarMissions.length > 0 && (
                <div className="mkt-side-section">
                  <div className="mkt-side-head">
                    <span className="mkt-side-title">Tonight&rsquo;s missions</span>
                    <a
                      className="mkt-side-seeall"
                      href="/missions"
                      onClick={(ev) => { ev.preventDefault(); router.push('/missions'); }}
                    >
                      See all
                    </a>
                  </div>
                  {sidebarMissions.map((m) => (
                    <div
                      key={m.id}
                      className="mkt-mission"
                      onClick={() => router.push('/missions')}
                    >
                      <span className="mkt-mission-thumb" aria-hidden>
                        <img
                          src={missionImage(m.id)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      </span>
                      <div className="mkt-mission-body">
                        <div className="mkt-mission-title">{m.name}</div>
                        <div className="mkt-mission-meta">
                          <span>{m.difficulty}</span>
                          <span className="mkt-mission-dot" aria-hidden>·</span>
                          <span>{m.type === 'telescope' ? 'Telescope' : 'Naked eye'}</span>
                        </div>
                      </div>
                      <span className="mkt-mission-reward">+{m.stars}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mkt-side-section">
                <div className="mkt-side-head">
                  <span className="mkt-side-title">Space news</span>
                </div>
                {SPACE_NEWS.map((n, i) => (
                  <div key={i} className="mkt-news">
                    <span className="mkt-news-dot" />
                    <span className="mkt-news-text">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
        </div>
      </div>
    </PageTransition>
  );
}

interface RowProps {
  market: Market;
  advantage: boolean;
  onClick: () => void;
  expandedSide: MarketSide | null;
  onPickSide: (side: MarketSide) => void;
  onCloseBet: () => void;
  onBetSuccess: () => void;
  mint: PublicKey | null;
  balance: number | null;
  boost?: number;
}

function MarketRow({
  market,
  advantage,
  onClick,
  expandedSide,
  onPickSide,
  onCloseBet,
  onBetSuccess,
  mint,
  balance,
  boost,
}: RowProps) {
  const Icon = getCategoryIcon(market.metadata.category);
  const yesPct = Math.round(market.impliedYesOdds * 100);
  const noPct = 100 - yesPct;
  const oracle = oracleBadge(market.metadata.resolutionSource);
  const closeDate = formatCloseDate(market.metadata.closeTime);
  const volume = market.onChain.totalStaked;
  const locked = market.status === 'locked';
  const isPreview = market.metadata.previewOnly === true;
  const expanded = expandedSide !== null;
  const disabledForBet = locked || isPreview;

  return (
    <div
      role="button"
      tabIndex={0}
      data-category={market.metadata.category}
      className={`mkt-row${expanded ? ' expanded' : ''}${isPreview ? ' preview' : ''}`}
      onClick={() => {
        if (isPreview) return;
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isPreview) return;
          onClick();
        }
      }}
    >
      <span className="mkt-row-icon" data-category={market.metadata.category}>
        <Icon size={16} />
      </span>
      <div className="mkt-row-content">
        <div className="mkt-row-title">{displayTitle(market.metadata)}</div>
        <div className="mkt-row-meta">
          {oracle && <span className="mkt-row-oracle">{oracle}</span>}
          {advantage && (
            <span className="mkt-row-adv">
              <TelescopeIcon size={12} />
              1.5×
            </span>
          )}
          {isPreview && <span className="mkt-row-preview">Preview · trading soon</span>}
          <span className="mkt-row-date">{locked ? 'Locked' : closeDate}</span>
        </div>
      </div>
      <div
        className="mkt-odds-cells"
        role="group"
        aria-label="Place position"
      >
        <button
          type="button"
          className={`mkt-odds-cell yes${expandedSide === 'yes' ? ' active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (disabledForBet) return;
            onPickSide('yes');
          }}
          aria-label={`Bet Yes at ${yesPct}%`}
          disabled={disabledForBet}
        >
          <span className="cell-label">Yes</span>
          <span className="cell-num">{yesPct}<span className="cell-pct">%</span></span>
        </button>
        <button
          type="button"
          className={`mkt-odds-cell no${expandedSide === 'no' ? ' active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (disabledForBet) return;
            onPickSide('no');
          }}
          aria-label={`Bet No at ${noPct}%`}
          disabled={disabledForBet}
        >
          <span className="cell-label">No</span>
          <span className="cell-num">{noPct}<span className="cell-pct">%</span></span>
        </button>
      </div>
      <div className="mkt-row-volume">{formatVolume(volume)}</div>
      {expanded && expandedSide && (
        <InlineBetPanel
          onChain={market.onChain}
          mint={mint}
          balance={balance}
          side={expandedSide}
          locked={locked}
          boostMultiplier={boost}
          onClose={onCloseBet}
          onSuccess={onBetSuccess}
        />
      )}
    </div>
  );
}

function ResolvedRow({ market, onClick }: { market: Market; onClick: () => void }) {
  const Icon = getCategoryIcon(market.metadata.category);
  const cancelled = market.status === 'cancelled';
  const isYes = !cancelled && market.onChain.outcome === 'yes';
  const date = market.metadata.resolutionTime.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });

  const pillClass = cancelled ? 'cancelled' : isYes ? 'yes' : 'no';
  const pillText = cancelled ? 'Cancelled' : isYes ? 'Yes' : 'No';

  return (
    <div
      role="button"
      tabIndex={0}
      className="mkt-row resolved"
      data-category={market.metadata.category}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span className="mkt-row-icon" data-category={market.metadata.category}>
        <Icon size={16} />
      </span>
      <div className="mkt-row-content">
        <div className="mkt-row-title">{displayTitle(market.metadata)}</div>
        <div className="mkt-row-meta">
          <span className="mkt-row-date">Resolved {date}</span>
        </div>
      </div>
      <div className="mkt-odds-pair">
        <span className={`mkt-row-pill ${pillClass}`}>{pillText}</span>
      </div>
      <div className="mkt-row-volume">{formatVolume(market.onChain.totalStaked)}</div>
    </div>
  );
}
