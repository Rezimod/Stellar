'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useVisibleInterval } from '@/hooks/useVisibleInterval';
import Image from 'next/image';
import { TrendingUp, TrendingDown, Newspaper, Flame, Clock3, Radio, Activity } from 'lucide-react';
import PageTransition from '@/components/ui/PageTransition';
import type { Category, Market, NewsItem, Bet, LiveBet } from '@/lib/markets/types';
import { TODAY, STORAGE_KEY, CATEGORIES, MARKETS, NEWS, FAKE_BETTORS } from '@/lib/markets/data';
import { daysUntil, countdown, formatVolume, pick, generateLiveBet } from '@/lib/markets/utils';

export default function MarketsPage() {
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stake, setStake] = useState<number>(50);
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [bets, setBets] = useState<Bet[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);
  const seedRef = useRef(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setBets(JSON.parse(raw));
    } catch (e) { console.error('[markets] read bets', e); }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
    } catch (e) { console.error('[markets] save bets', e); }
  }, [bets]);

  useEffect(() => {
    const initial: LiveBet[] = Array.from({ length: 14 }, (_, i) => generateLiveBet(i));
    seedRef.current = 14;
    setLiveBets(initial);
  }, []);

  useVisibleInterval(() => {
    seedRef.current += 1;
    setLiveBets(prev => [generateLiveBet(seedRef.current), ...prev].slice(0, 24));
  }, 5000);

  const upcoming = useMemo(
    () => MARKETS
      .filter(m => new Date(m.resolvesAt).getTime() >= TODAY.getTime())
      .sort((a, b) => new Date(a.resolvesAt).getTime() - new Date(b.resolvesAt).getTime()),
    [],
  );

  const filtered = useMemo(
    () => filter === 'all' ? upcoming : upcoming.filter(m => m.category === filter),
    [filter, upcoming],
  );

  const featured = upcoming[0];
  const closingSoon = upcoming.slice(1, 7);
  const topMovers = useMemo(
    () => [...upcoming]
      .sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend))
      .slice(0, 6),
    [upcoming],
  );
  const totalVolume = useMemo(
    () => MARKETS.reduce((sum, m) => sum + m.volume, 0),
    [],
  );

  const byCategory = useMemo(() => {
    const groups = new Map<Category, Market[]>();
    for (const m of filtered) {
      if (!groups.has(m.category)) groups.set(m.category, []);
      groups.get(m.category)!.push(m);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const totalStaked = bets.reduce((sum, b) => sum + b.stake, 0);

  function placeBet(marketId: string) {
    if (stake <= 0) return;
    setBets(prev => [{ marketId, side, stake, ts: Date.now() }, ...prev]);
    const m = MARKETS.find(x => x.id === marketId);
    setToast(`${stake}★ on ${side.toUpperCase()} — ${m?.title.slice(0, 40)}…`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2400);
    setExpanded(null);
  }

  useEffect(() => () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  return (
    <PageTransition>
      <style jsx global>{`
        @keyframes marketsTicker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marketsBetIn {
          0%   { opacity: 0; transform: translateY(-6px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes marketsPulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.55; transform: scale(0.85); }
        }
        .markets-ticker-track {
          display: flex;
          gap: 10px;
          width: max-content;
          animation: marketsTicker 60s linear infinite;
        }
        .markets-ticker-track:hover { animation-play-state: paused; }
        .markets-live-row { animation: marketsBetIn 320ms ease-out both; }
        .markets-live-dot { animation: marketsPulseDot 1.6s ease-in-out infinite; }
        .markets-scrollx::-webkit-scrollbar { display: none; }
        .markets-side-btn {
          transition: transform 140ms ease, filter 140ms ease, background 200ms ease;
        }
        .markets-side-btn[data-active="false"]:hover,
        .markets-side-btn[data-active="false"]:focus-visible {
          filter: brightness(1.4);
          transform: translateY(-1px) scale(1.01);
          outline: none;
        }
        .markets-side-btn[data-active="true"] {
          filter: drop-shadow(0 8px 18px rgba(0,0,0,0.45));
        }
        .markets-split-odds {
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }
        button:hover .markets-split-odds,
        .markets-split-odds:hover {
          border-color: rgba(255,255,255,0.18);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 4px 14px rgba(0,0,0,0.25);
        }
        button:hover .markets-split-odds .markets-split-fill-yes,
        .markets-split-odds:hover .markets-split-fill-yes {
          background: linear-gradient(to right, rgba(52,211,153,0.22), rgba(52,211,153,0.42));
        }
        button:hover .markets-split-odds .markets-split-fill-no,
        .markets-split-odds:hover .markets-split-fill-no {
          background: linear-gradient(to left, rgba(248,113,113,0.22), rgba(248,113,113,0.42));
        }
        button:hover .markets-split-odds .markets-split-divider,
        .markets-split-odds:hover .markets-split-divider {
          background: rgba(255,255,255,0.38);
          box-shadow: 0 0 6px rgba(255,255,255,0.28);
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Preview banner — markets UI is currently a preview; on-chain
            settlement is wired post-hackathon. Surfacing this honestly so
            users who try a bet and check Solscan don't feel misled. */}
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(245,158,11,0.28)',
            background: 'rgba(245,158,11,0.08)',
            color: 'rgba(245,222,179,0.92)',
            fontSize: 12.5,
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <span aria-hidden style={{ fontSize: 14, lineHeight: 1, marginTop: 1 }}>◐</span>
          <span>
            <strong style={{ fontWeight: 600, color: 'rgba(252,211,77,1)' }}>Preview mode.</strong>{' '}
            Markets and bets are simulated for now. On-chain settlement on Solana
            devnet ships next — your bets here won&apos;t hit the chain yet.
          </span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1
              className="font-display"
              style={{
                fontSize: 'clamp(2rem, 5vw, 2.75rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Sky Markets
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                marginTop: 6,
                fontSize: 14,
                maxWidth: 560,
              }}
            >
              Stake ★ Stars on celestial and earthbound outcomes. Resolves with
              public oracles — no degens, no leverage.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <HeaderStat label="Open" value={String(upcoming.length)} />
              <HeaderStat label="Volume" value={`${formatVolume(totalVolume)}★`} />
              <HeaderStat label="Active" value={String(liveBets.length)} pulse />
            </div>
          </div>
          <div
            className="hidden sm:flex flex-col items-end shrink-0"
            style={{
              padding: '10px 14px',
              border: '1px solid var(--border)',
              borderRadius: 12,
              background: 'var(--surface)',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              My positions
            </span>
            <span style={{ fontSize: 18, color: 'var(--terracotta)', fontFamily: 'var(--font-mono, JetBrains Mono)', fontWeight: 600 }}>
              {totalStaked}★
            </span>
          </div>
        </div>

        {/* Live bets ticker */}
        <LiveBetsTicker bets={liveBets} />

        {/* Featured market */}
        {featured && (
          <FeaturedCard
            market={featured}
            stake={stake}
            side={side}
            setStake={setStake}
            setSide={setSide}
            onBet={() => placeBet(featured.id)}
          />
        )}

        {/* Top movers */}
        <SectionHeader icon={<Activity size={14} strokeWidth={1.8} />} title="Top movers" subtitle="Biggest 7-day swings" />
        <div className="mb-6 -mx-4 px-4 overflow-x-auto markets-scrollx" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-2 w-max">
            {topMovers.map(m => (
              <MoverCard
                key={m.id}
                market={m}
                onClick={() => {
                  setFilter(m.category);
                  setExpanded(m.id);
                  document.getElementById(`row-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />
            ))}
          </div>
        </div>

        {/* Closing-soon section */}
        <SectionHeader icon={<Clock3 size={14} strokeWidth={1.8} />} title="Closing soon" />
        <div className="mb-6 -mx-4 px-4 overflow-x-auto markets-scrollx" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-2 w-max">
            {closingSoon.map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setFilter(m.category);
                  setExpanded(m.id);
                  document.getElementById(`row-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="text-left shrink-0 transition-all hover:scale-[1.02]"
                style={{
                  width: 240,
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  background: 'var(--surface)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {countdown(m.resolvesAt)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--yes)', fontFamily: 'var(--font-mono, JetBrains Mono)' }}>
                    {Math.round(m.yes * 100)}%
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {m.title}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* News section */}
        <SectionHeader icon={<Newspaper size={14} strokeWidth={1.8} />} title="Sky news" subtitle="What the oracles are saying" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
          {NEWS.map(n => {
            const m = n.marketId ? MARKETS.find(x => x.id === n.marketId) : undefined;
            return (
              <button
                key={n.id}
                onClick={() => {
                  if (m) {
                    setFilter(m.category);
                    setExpanded(m.id);
                    document.getElementById(`row-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                className="text-left transition-colors hover:bg-white/[0.03]"
                style={{
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  background: 'var(--surface)',
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span style={{
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--terracotta)',
                    fontFamily: 'var(--font-mono, JetBrains Mono)',
                  }}>
                    {n.source}
                  </span>
                  <span style={{ width: 3, height: 3, borderRadius: 99, background: 'var(--text-faint)' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{n.hoursAgo}h ago</span>
                  {m && (
                    <span className="ml-auto" style={{
                      fontSize: 9,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                    }}>
                      → market
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                  {n.headline}
                </div>
              </button>
            );
          })}
        </div>

        {/* Category chips */}
        <SectionHeader icon={<Flame size={14} strokeWidth={1.8} />} title="All markets" />
        <div className="mb-4 -mx-4 px-4 overflow-x-auto markets-scrollx" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-2 w-max">
            {CATEGORIES.map(c => {
              const active = filter === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setFilter(c.key)}
                  className="transition-colors"
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    borderRadius: 999,
                    border: `1px solid ${active ? 'var(--terracotta)' : 'var(--border)'}`,
                    background: active ? 'var(--accent-dim)' : 'var(--surface)',
                    color: active ? 'var(--terracotta)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ marginRight: 6 }}>{c.emoji}</span>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Markets grouped by category */}
        {byCategory.map(([cat, list]) => {
          const meta = CATEGORIES.find(c => c.key === cat);
          return (
            <div key={cat} className="mb-6">
              <div className="flex items-center gap-2 mb-2.5">
                <span style={{ fontSize: 13 }}>{meta?.emoji}</span>
                <h3 className="font-display" style={{
                  fontSize: 13,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--text-primary)',
                  margin: 0,
                }}>
                  {meta?.label}
                </h3>
                <span style={{
                  fontSize: 10,
                  color: 'var(--text-faint)',
                  fontFamily: 'var(--font-mono, JetBrains Mono)',
                }}>
                  {list.length}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              <div className="flex flex-col gap-2">
                {list.map(m => (
                  <MarketRow
                    key={m.id}
                    market={m}
                    expanded={expanded === m.id}
                    onToggle={() => setExpanded(expanded === m.id ? null : m.id)}
                    stake={stake}
                    setStake={setStake}
                    side={side}
                    setSide={setSide}
                    onBet={() => placeBet(m.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* My active bets */}
        {bets.length > 0 && (
          <div className="mt-10">
            <h2
              className="font-display"
              style={{
                fontSize: 20,
                color: 'var(--text-primary)',
                marginBottom: 12,
              }}
            >
              My active positions
            </h2>
            <div className="flex flex-col gap-2">
              {bets.slice(0, 8).map((b, i) => {
                const m = MARKETS.find(x => x.id === b.marketId);
                if (!m) return null;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3"
                    style={{
                      padding: '10px 14px',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      background: 'var(--surface)',
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {countdown(m.resolvesAt)}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '3px 8px',
                        fontSize: 11,
                        letterSpacing: '0.05em',
                        borderRadius: 6,
                        background: b.side === 'yes' ? 'var(--yes-dim)' : 'var(--no-dim)',
                        border: `1px solid ${b.side === 'yes' ? 'var(--yes-border)' : 'var(--no-border)'}`,
                        color: b.side === 'yes' ? 'var(--yes)' : 'var(--no)',
                      }}
                    >
                      {b.side.toUpperCase()} · {b.stake}★
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footnote */}
        <p
          style={{
            marginTop: 32,
            fontSize: 11,
            color: 'var(--text-faint)',
            textAlign: 'center',
          }}
        >
          Devnet preview. Stakes are demo Stars. Live oracle resolution wires up post-hackathon.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          style={{
            padding: '10px 16px',
            fontSize: 13,
            borderRadius: 10,
            background: 'var(--canvas)',
            border: '1px solid var(--terracotta)',
            color: 'var(--text-primary)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}
        >
          {toast}
        </div>
      )}
    </PageTransition>
  );
}

function HeaderStat({ label, value, pulse = false }: { label: string; value: string; pulse?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span style={{
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--text-faint)',
      }}>
        {label}
      </span>
      <span
        className={pulse ? 'markets-live-dot' : ''}
        style={{
          fontSize: 14,
          color: pulse ? 'var(--yes)' : 'var(--text-primary)',
          fontFamily: 'var(--font-mono, JetBrains Mono)',
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function TrendPill({ trend, size = 'sm' }: { trend: number; size?: 'sm' | 'md' }) {
  if (Math.abs(trend) < 0.005) {
    return (
      <span style={{
        fontSize: size === 'sm' ? 10 : 11,
        color: 'var(--text-faint)',
        fontFamily: 'var(--font-mono, JetBrains Mono)',
      }}>
        ―
      </span>
    );
  }
  const up = trend > 0;
  const pct = Math.round(Math.abs(trend) * 100);
  const color = up ? 'var(--yes)' : 'var(--no)';
  return (
    <span
      className="inline-flex items-center gap-0.5"
      style={{
        fontSize: size === 'sm' ? 10 : 11,
        color,
        fontFamily: 'var(--font-mono, JetBrains Mono)',
        fontWeight: 600,
      }}
    >
      {up ? '▲' : '▼'}
      <span>{pct}%</span>
    </span>
  );
}

function MoverCard({ market, onClick }: { market: Market; onClick: () => void }) {
  const yesPct = Math.round(market.yes * 100);
  const up = market.trend >= 0;
  const cat = CATEGORIES.find(c => c.key === market.category);
  return (
    <button
      onClick={onClick}
      className="text-left shrink-0 transition-all hover:scale-[1.02] hover:border-[var(--terracotta)]"
      style={{
        width: 220,
        padding: '12px 14px',
        border: '1px solid var(--border)',
        borderRadius: 14,
        background: 'linear-gradient(180deg, var(--surface) 0%, var(--canvas) 130%)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}>
          {cat?.emoji} {cat?.label}
        </span>
        <TrendPill trend={market.trend} size="md" />
      </div>
      <div style={{
        fontSize: 12.5,
        color: 'var(--text-primary)',
        lineHeight: 1.32,
        marginBottom: 10,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
        minHeight: 32,
      }}>
        {market.title}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--canvas)' }}>
          <div
            style={{
              height: '100%',
              width: `${yesPct}%`,
              background: up ? 'var(--yes)' : 'var(--no)',
              transition: 'width 600ms ease-out',
            }}
          />
        </div>
        <span style={{
          fontSize: 12,
          color: up ? 'var(--yes)' : 'var(--no)',
          fontFamily: 'var(--font-mono, JetBrains Mono)',
          fontWeight: 600,
        }}>
          {yesPct}%
        </span>
      </div>
    </button>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-3 mt-7 mb-3">
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: 'var(--terracotta)' }}>{icon}</span>}
        <h2 className="font-display" style={{
          fontSize: 13,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--text-primary)',
          margin: 0,
        }}>
          {title}
        </h2>
      </div>
      {subtitle && (
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{subtitle}</span>
      )}
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  );
}

function LiveBetsTicker({ bets }: { bets: LiveBet[] }) {
  if (bets.length === 0) return null;
  // Duplicate the list so the marquee loops seamlessly
  const doubled = [...bets.slice(0, 12), ...bets.slice(0, 12)];

  return (
    <div
      className="relative mb-5 overflow-hidden"
      style={{
        padding: '10px 14px',
        border: '1px solid var(--border)',
        borderRadius: 14,
        background: 'linear-gradient(180deg, var(--surface) 0%, var(--canvas) 100%)',
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span className="markets-live-dot" style={{
          width: 8, height: 8, borderRadius: 99,
          background: 'var(--yes)',
          boxShadow: '0 0 0 3px rgba(52,211,153,0.15)',
        }} />
        <span style={{
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono, JetBrains Mono)',
        }}>
          Live · {bets.length} active stakes
        </span>
        <Radio size={11} strokeWidth={1.8} style={{ color: 'var(--text-faint)', marginLeft: 'auto' }} />
      </div>

      <div className="overflow-hidden" style={{
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}>
        <div className="markets-ticker-track">
          {doubled.map((b, i) => (
            <div
              key={`${b.id}-${i}`}
              className="markets-live-row flex items-center gap-2 shrink-0"
              style={{
                padding: '7px 12px',
                borderRadius: 999,
                border: `1px solid ${b.side === 'yes' ? 'var(--yes-border)' : 'var(--no-border)'}`,
                background: b.side === 'yes' ? 'var(--yes-dim)' : 'var(--no-dim)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono, JetBrains Mono)',
                fontSize: 11,
              }}>
                @{b.user}
              </span>
              <span style={{
                color: b.side === 'yes' ? 'var(--yes)' : 'var(--no)',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.05em',
              }}>
                {b.side === 'yes' ? '▲ YES' : '▼ NO'}
              </span>
              <span style={{
                color: 'var(--terracotta)',
                fontFamily: 'var(--font-mono, JetBrains Mono)',
                fontWeight: 600,
              }}>
                {b.stake}★
              </span>
              <span style={{
                color: 'var(--text-secondary)',
                maxWidth: 220,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {b.market.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeaturedCard({
  market,
  stake,
  side,
  setStake,
  setSide,
  onBet,
}: {
  market: Market;
  stake: number;
  side: 'yes' | 'no';
  setStake: (n: number) => void;
  setSide: (s: 'yes' | 'no') => void;
  onBet: () => void;
}) {
  const yesPct = Math.round(market.yes * 100);
  const cat = CATEGORIES.find(c => c.key === market.category);
  const payoutYes = side === 'yes' ? Math.round(stake / market.yes) : 0;
  const payoutNo = side === 'no' ? Math.round(stake / (1 - market.yes)) : 0;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: 18,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div className="relative h-44 sm:h-56">
        <Image
          src={market.image}
          alt={market.title}
          fill
          sizes="(max-width: 800px) 100vw, 800px"
          style={{ objectFit: 'cover' }}
          priority
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(10,23,53,0.1) 0%, rgba(10,23,53,0.6) 60%, rgba(10,23,53,0.95) 100%)',
          }}
        />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span
            style={{
              padding: '4px 10px',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.4)',
              color: 'var(--text-primary)',
              backdropFilter: 'blur(6px)',
            }}
          >
            {cat?.emoji} Featured
          </span>
          <span
            style={{
              padding: '4px 10px',
              fontSize: 11,
              borderRadius: 999,
              background: 'rgba(0,0,0,0.4)',
              color: 'var(--text-secondary)',
              backdropFilter: 'blur(6px)',
            }}
          >
            {countdown(market.resolvesAt)}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(1.25rem, 3vw, 1.6rem)',
              lineHeight: 1.15,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {market.title}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginTop: 6,
            }}
          >
            {market.blurb}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <SplitOdds yes={market.yes} />

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <div className="flex flex-1" style={{ gap: 2 }}>
            <SideButton variant="yes" active={side === 'yes'} pct={yesPct} onClick={() => setSide('yes')} />
            <SideButton variant="no" active={side === 'no'} pct={100 - yesPct} onClick={() => setSide('no')} />
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              value={stake}
              onChange={e => setStake(Math.max(1, parseInt(e.target.value) || 0))}
              style={{
                width: 90,
                padding: '12px 12px',
                fontSize: 14,
                borderRadius: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono, JetBrains Mono)',
              }}
            />
            <button
              onClick={onBet}
              style={{
                padding: '12px 18px',
                fontSize: 14,
                borderRadius: 10,
                background: 'var(--terracotta)',
                color: '#0A1735',
                border: 'none',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              Stake {stake}★
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          <span>Pool {formatVolume(market.volume)}★ · Oracle: {market.oracle}</span>
          <span>
            If win:{' '}
            <span style={{ color: 'var(--terracotta)', fontFamily: 'var(--font-mono, JetBrains Mono)' }}>
              {side === 'yes' ? payoutYes : payoutNo}★
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function SideButton({
  variant,
  active,
  pct,
  onClick,
  compact = false,
}: {
  variant: 'yes' | 'no';
  active: boolean;
  pct: number;
  onClick: () => void;
  compact?: boolean;
}) {
  const isYes = variant === 'yes';
  const color = isYes ? 'var(--yes)' : 'var(--no)';
  const dim = isYes ? 'var(--yes-dim)' : 'var(--no-dim)';
  const Icon = isYes ? TrendingUp : TrendingDown;
  const label = isYes ? 'YES' : 'NO';

  // Chevron clip — YES points right, NO points left so the two buttons read
  // as opposing arrows meeting in the middle.
  const notch = compact ? 12 : 16;
  const clipYes = `polygon(0 0, calc(100% - ${notch}px) 0, 100% 50%, calc(100% - ${notch}px) 100%, 0 100%)`;
  const clipNo  = `polygon(${notch}px 0, 100% 0, 100% 100%, ${notch}px 100%, 0 50%)`;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onClick}
      onFocus={onClick}
      className="markets-side-btn relative flex items-center justify-center gap-2 transition-all"
      data-active={active ? 'true' : 'false'}
      style={{
        flex: 1,
        padding: compact
          ? (isYes ? '11px 18px 11px 14px' : '11px 14px 11px 18px')
          : (isYes ? '14px 22px 14px 18px' : '14px 18px 14px 22px'),
        fontSize: compact ? 13 : 14,
        clipPath: isYes ? clipYes : clipNo,
        background: active
          ? `linear-gradient(180deg, ${color}33, ${dim})`
          : 'var(--canvas)',
        border: 'none',
        color: active ? color : 'var(--text-secondary)',
        fontWeight: 700,
        letterSpacing: '0.04em',
        transform: active ? 'translateY(-1px)' : 'none',
        cursor: 'pointer',
      }}
    >
      <Icon size={compact ? 14 : 16} strokeWidth={2.4} />
      <span>{label}</span>
      <span style={{
        fontFamily: 'var(--font-mono, JetBrains Mono)',
        fontSize: compact ? 11 : 12,
        opacity: active ? 1 : 0.7,
      }}>
        {pct}%
      </span>
    </button>
  );
}

function SplitOdds({ yes }: { yes: number }) {
  const yesPct = Math.round(yes * 100);
  const noPct = 100 - yesPct;
  return (
    <div
      className="markets-split-odds relative flex h-9 items-center"
      style={{
        borderRadius: 8,
        background: 'var(--canvas)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div
        className="markets-split-fill markets-split-fill-yes absolute inset-y-0 left-0"
        style={{
          width: `${yesPct}%`,
          background: 'linear-gradient(to right, rgba(52,211,153,0.14), rgba(52,211,153,0.30))',
          transition: 'width 500ms ease-out, background 200ms',
        }}
      />
      <div
        className="markets-split-fill markets-split-fill-no absolute inset-y-0 right-0"
        style={{
          width: `${noPct}%`,
          background: 'linear-gradient(to left, rgba(248,113,113,0.14), rgba(248,113,113,0.30))',
          transition: 'width 500ms ease-out, background 200ms',
        }}
      />
      <div
        className="markets-split-divider absolute inset-y-0"
        style={{
          left: `calc(${yesPct}% - 0.5px)`,
          width: 1,
          background: 'rgba(255,255,255,0.18)',
          transition: 'left 500ms ease-out, background 200ms, box-shadow 200ms',
        }}
      />
      <div
        className="relative z-10 flex items-center justify-between w-full pointer-events-none"
        style={{
          padding: '0 10px',
          fontSize: 11,
          fontFamily: 'var(--font-mono, JetBrains Mono)',
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        <span style={{ color: 'var(--yes)' }}>YES {yesPct}%</span>
        <span style={{ color: 'var(--no)' }}>{noPct}% NO</span>
      </div>
    </div>
  );
}

function MarketRow({
  market,
  expanded,
  onToggle,
  stake,
  setStake,
  side,
  setSide,
  onBet,
}: {
  market: Market;
  expanded: boolean;
  onToggle: () => void;
  stake: number;
  setStake: (n: number) => void;
  side: 'yes' | 'no';
  setSide: (s: 'yes' | 'no') => void;
  onBet: () => void;
}) {
  const yesPct = Math.round(market.yes * 100);
  const cat = CATEGORIES.find(c => c.key === market.category);
  const payout = side === 'yes' ? Math.round(stake / market.yes) : Math.round(stake / (1 - market.yes));

  return (
    <div
      id={`row-${market.id}`}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--surface)',
        overflow: 'hidden',
        transition: 'background 200ms',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors"
      >
        <div
          className="relative shrink-0"
          style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden' }}
        >
          <Image
            src={market.image}
            alt=""
            fill
            sizes="64px"
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {cat?.emoji} {cat?.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {countdown(market.resolvesAt)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>·</span>
            <TrendPill trend={market.trend} />
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
            }}
          >
            {market.title}
          </div>
        </div>
        <div className="shrink-0 hidden sm:block" style={{ width: 140 }}>
          <SplitOdds yes={market.yes} />
        </div>
        <div className="shrink-0 sm:hidden" style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, color: 'var(--yes)', fontFamily: 'var(--font-mono, JetBrains Mono)', fontWeight: 600 }}>
            {yesPct}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>YES</div>
        </div>
      </button>

      {expanded && (
        <div
          className="p-3 sm:p-4 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex flex-1" style={{ gap: 2 }}>
              <SideButton variant="yes" active={side === 'yes'} pct={yesPct} onClick={() => setSide('yes')} compact />
              <SideButton variant="no" active={side === 'no'} pct={100 - yesPct} onClick={() => setSide('no')} compact />
            </div>
            <div className="flex gap-2">
              {[10, 50, 100, 500].map(q => (
                <button
                  key={q}
                  onClick={() => setStake(q)}
                  style={{
                    padding: '8px 10px',
                    fontSize: 12,
                    borderRadius: 8,
                    background: stake === q ? 'var(--accent-dim)' : 'transparent',
                    border: `1px solid ${stake === q ? 'var(--terracotta)' : 'var(--border)'}`,
                    color: stake === q ? 'var(--terracotta)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono, JetBrains Mono)',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            <button
              onClick={onBet}
              style={{
                padding: '10px 16px',
                fontSize: 13,
                borderRadius: 8,
                background: 'var(--terracotta)',
                color: '#0A1735',
                border: 'none',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              Stake {stake}★
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            <span>{market.blurb}</span>
            <span>
              Pool {formatVolume(market.volume)}★ · win{' '}
              <span style={{ color: 'var(--terracotta)', fontFamily: 'var(--font-mono, JetBrains Mono)' }}>
                {payout}★
              </span>
            </span>
          </div>
          <div className="mt-2" style={{ fontSize: 10, color: 'var(--text-faint)' }}>
            Resolves: {market.oracle}
          </div>
        </div>
      )}
    </div>
  );
}
