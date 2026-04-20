'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageTransition from '@/components/ui/PageTransition';
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
import {
  getCategoryIcon,
  TelescopeIcon,
} from '@/components/icons/MarketIcons';

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
  const { state } = useAppState();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [theme, setTheme] = useState<Theme>('light');

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
    return () => { cancelled = true; };
  }, [program]);

  // Stats
  const summary = useMemo(() => {
    let open = 0;
    let resolved = 0;
    let staked = 0;
    for (const m of markets) {
      if (m.status === 'open') open++;
      if (m.status === 'resolved') resolved++;
      staked += m.onChain.totalStaked;
    }
    return { open, resolved, staked };
  }, [markets]);

  // Trending strip: 5 markets closing soonest (still open)
  const trending = useMemo(() => {
    const now = Date.now();
    return markets
      .filter((m) => m.status === 'open' && m.metadata.closeTime.getTime() > now)
      .sort((a, b) => a.metadata.closeTime.getTime() - b.metadata.closeTime.getTime())
      .slice(0, 5);
  }, [markets]);

  // Sidebar trending: top 4 by volume (open only)
  const sidebarTrending = useMemo(() => {
    return markets
      .filter((m) => m.status === 'open')
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

  const activeCount = grouped.reduce((n, g) => n + g.items.length, 0);

  return (
    <PageTransition>
      <div className={`markets-page ${theme === 'dark' ? 'dark' : ''}`}>
        {/* Stats bar + theme toggle */}
        <div className="mkt-stats-bar">
          <span className="mkt-stats-text">
            {loading
              ? 'Loading on-chain state…'
              : `${summary.open} open · ${summary.resolved} resolved · ${formatVolume(summary.staked)} staked`}
          </span>
          <button
            type="button"
            className="mkt-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          />
        </div>

        {/* Trending strip */}
        {!loading && trending.length > 0 && (
          <div className="mkt-trending-strip" role="list">
            {trending.map((m) => {
              const Icon = getCategoryIcon(m.metadata.category);
              const yesPct = Math.round(m.impliedYesOdds * 100);
              const countdown = formatCountdown(
                m.metadata.closeTime.getTime() - Date.now(),
              );
              return (
                <div
                  key={m.onChain.marketId}
                  role="listitem"
                  className="mkt-trending-chip"
                  onClick={() => router.push(`/markets/${m.onChain.marketId}`)}
                >
                  <span className="mkt-trending-icon"><Icon size={18} /></span>
                  <span className="mkt-trending-title">{m.metadata.title}</span>
                  <span className="mkt-trending-countdown">{countdown}</span>
                  <span className="mkt-trending-odds">{yesPct}%</span>
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
                <span className="mkt-section-meta">
                  {activeCount} active
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
              <div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="mkt-skeleton animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="mkt-state">
                <p className="mkt-state-title">Couldn&rsquo;t load markets</p>
                <p>{error}</p>
              </div>
            ) : activeCount === 0 ? (
              <div className="mkt-state">
                <p className="mkt-state-title">No markets in this category</p>
                <p>Try another filter or come back when new markets seed.</p>
              </div>
            ) : (
              <div className="mkt-list">
                {grouped.map(({ def, items }) => (
                  <section key={def.key}>
                    <div className="mkt-group-header">{def.label}</div>
                    {items.map((m) => (
                      <MarketRow
                        key={m.onChain.marketId}
                        market={m}
                        advantage={!!advantageByMarketId[m.onChain.marketId]}
                        onClick={() => router.push(`/markets/${m.onChain.marketId}`)}
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
                        <span className="mkt-trend-title">{m.metadata.title}</span>
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
    </PageTransition>
  );
}

interface RowProps {
  market: Market;
  advantage: boolean;
  onClick: () => void;
}

function MarketRow({ market, advantage, onClick }: RowProps) {
  const Icon = getCategoryIcon(market.metadata.category);
  const yesPct = Math.round(market.impliedYesOdds * 100);
  const noPct = 100 - yesPct;
  const oracle = oracleBadge(market.metadata.resolutionSource);
  const closeDate = formatCloseDate(market.metadata.closeTime);
  const volume = market.onChain.totalStaked;
  const locked = market.status === 'locked';

  return (
    <div
      role="button"
      tabIndex={0}
      className="mkt-row"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span className="mkt-row-icon"><Icon size={18} /></span>
      <div className="mkt-row-content">
        <div className="mkt-row-title">{market.metadata.title}</div>
        <div className="mkt-row-meta">
          {oracle && <span className="mkt-row-oracle">{oracle}</span>}
          {advantage && (
            <span className="mkt-row-adv">
              <TelescopeIcon size={12} />
              1.5×
            </span>
          )}
          <span className="mkt-row-date">{locked ? 'Locked' : closeDate}</span>
        </div>
      </div>
      <div className="mkt-odds-pair">
        <button
          type="button"
          className="mkt-odds-btn yes"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          aria-label={`Yes ${yesPct}%`}
        >
          Yes {yesPct}%
        </button>
        <button
          type="button"
          className="mkt-odds-btn no"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          aria-label={`No ${noPct}%`}
        >
          No {noPct}%
        </button>
      </div>
      <div className="mkt-row-volume">{formatVolume(volume)}</div>
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
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span className="mkt-row-icon"><Icon size={18} /></span>
      <div className="mkt-row-content">
        <div className="mkt-row-title">{market.metadata.title}</div>
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
