'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStellarUser } from '@/hooks/useStellarUser';
import { Telescope } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import PageContainer from '@/components/layout/PageContainer';

const RANK_LABELS: Record<string, { label: string; color: string }> = {
  Celestial:  { label: 'Celestial',  color: 'var(--stars)' },
  Pathfinder: { label: 'Pathfinder', color: '#7A5FFF' },
  Observer:   { label: 'Observer',   color: '#818cf8' },
  Stargazer:  { label: 'Stargazer',  color: '#94a3b8' },
};

interface LiveEntry {
  wallet: string;
  observations: number;
  total_stars: number;
}

interface DisplayEntry {
  handle: string;
  wallet: string;
  rank: string;
  observations: number;
  stars: number;
}

const TIME_TABS = ['This Week', 'This Month', 'All Time'] as const;

function rankFromStars(stars: number): string {
  if (stars >= 1500) return 'Celestial';
  if (stars >= 800)  return 'Pathfinder';
  if (stars >= 300)  return 'Observer';
  return 'Stargazer';
}

function shortWallet(wallet: string): string {
  if (wallet.length < 10) return wallet;
  return `⬡ ${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

function walletColor(address: string): string {
  const hex = address.replace(/[^0-9a-fA-F]/g, '').slice(0, 2) || '00';
  return `hsl(${parseInt(hex, 16) * 1.4}, 60%, 55%)`;
}

function AvatarCircle({ name, size = 40, color }: { name: string; size?: number; color?: string }) {
  const initial = name[0]?.toUpperCase() ?? '?';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color ? `${color}18` : 'rgba(255,255,255,0.06)',
        border: `1px solid ${color ? `${color}35` : 'rgba(255,255,255,0.1)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 700,
        color: color ?? 'rgba(255,255,255,0.7)',
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

function ShimmerRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 animate-pulse">
      <div className="w-6 h-4 rounded bg-white/5 flex-shrink-0" />
      <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-28 rounded bg-white/5" />
        <div className="h-2.5 w-16 rounded bg-white/5" />
      </div>
      <div className="h-3 w-8 rounded bg-white/5" />
      <div className="h-4 w-14 rounded bg-white/5" />
    </div>
  );
}

const PODIUM_CONFIG = [
  {
    rankNum: 2,
    rankColor: '#C0C0C0',
    border: 'rgba(192,192,192,0.25)',
    bg: 'rgba(192,192,192,0.05)',
    padTop: 32,
    avatarSize: 40,
    rankFontSize: '1.75rem',
    slideFrom: '-40px',
  },
  {
    rankNum: 1,
    rankColor: 'var(--stars)',
    border: 'rgba(255,209,102,0.4)',
    bg: 'rgba(255,209,102,0.07)',
    padTop: 0,
    avatarSize: 48,
    rankFontSize: '2.25rem',
    slideFrom: '0px',
    glow: '0 0 30px rgba(255,209,102,0.2), 0 0 60px rgba(255,209,102,0.08)',
    scale: 'scale(1.04)',
    crown: true,
  },
  {
    rankNum: 3,
    rankColor: '#CD7F32',
    border: 'rgba(205,127,50,0.25)',
    bg: 'rgba(205,127,50,0.05)',
    padTop: 56,
    avatarSize: 36,
    rankFontSize: '1.5rem',
    slideFrom: '40px',
  },
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<typeof TIME_TABS[number]>('This Month');
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [podiumVisible, setPodiumVisible] = useState(false);
  const [leaderError, setLeaderError] = useState(false);

  const { address } = useStellarUser();
  const currentWallet = address ?? '';

  useEffect(() => {
    setLoading(true);
    setPodiumVisible(false);
    setLeaderError(false);
    const period = activeTab === 'This Week' ? 'week' : activeTab === 'All Time' ? 'all' : 'month';
    fetch(`/api/leaderboard?period=${period}`)
      .then(r => r.json())
      .then((data: { leaderboard: LiveEntry[] }) => {
        setEntries(
          data.leaderboard.map(e => ({
            handle: shortWallet(e.wallet),
            wallet: e.wallet,
            rank: rankFromStars(e.total_stars),
            observations: e.observations,
            stars: e.total_stars,
          }))
        );
      })
      .catch(() => {
        setEntries([]);
        setLeaderError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTab]);

  // Only show podium when data is loaded and entries exist
  useEffect(() => {
    if (!loading && entries.length > 0) {
      const t = setTimeout(() => setPodiumVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [loading, entries.length]);

  const top3  = entries.slice(0, 3);
  const rest  = entries.slice(3);

  const currentUserIndex = currentWallet
    ? entries.findIndex(e => e.wallet.toLowerCase() === currentWallet.toLowerCase())
    : -1;
  const currentUserInTop20 = currentUserIndex >= 0 && currentUserIndex < 20;
  const currentUserNotShown = currentUserIndex >= 20;

  const isEmpty = !loading && entries.length === 0 && !leaderError;

  // Podium display order: [2nd, 1st, 3rd]
  const podiumSlots = [
    { entry: top3[1], cfg: PODIUM_CONFIG[0] },
    { entry: top3[0], cfg: PODIUM_CONFIG[1] },
    { entry: top3[2], cfg: PODIUM_CONFIG[2] },
  ];

  return (
    <PageContainer variant="content" className="py-6 sm:py-10 animate-page-enter flex flex-col gap-5">
      <BackButton />

      {/* Header */}
      <div>
        <h1
          className="text-2xl text-white/90"
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
        >
          Leaderboard
        </h1>
      </div>

      {/* Live data notice */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
        style={{
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.12)',
          color: 'rgba(99,102,241,0.7)',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', flexShrink: 0, opacity: 0.7, display: 'inline-block' }} />
        Leaderboard updates with real observer data as missions are completed on-chain
      </div>

      {/* Time filter tabs */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {TIME_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
            style={
              activeTab === tab
                ? { background: 'rgba(255,209,102,0.12)', color: 'var(--stars)', border: '1px solid rgba(255,209,102,0.22)' }
                : { color: 'var(--color-text-secondary)' }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error state */}
      {leaderError && !loading && (
        <div className="rounded-2xl p-8 text-center flex flex-col items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-white/60 text-sm">Couldn&apos;t load the leaderboard.</p>
          <button
            onClick={() => { setLeaderError(false); setActiveTab(t => t); }}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div
          className="rounded-2xl p-10 text-center flex flex-col items-center gap-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.15)' }}
          >
            <span style={{ fontSize: 28 }}>🏆</span>
          </div>
          <div>
            <p className="text-white/80 font-semibold text-sm">Be the first on the board</p>
            <p className="text-white/40 text-xs mt-1">Complete a mission to appear here.</p>
          </div>
          <Link
            href="/missions"
            className="mt-1 px-5 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            Go to Missions →
          </Link>
        </div>
      )}

      {/* Podium — top 3 */}
      {!isEmpty && (
        <>
          {loading ? (
            <div className="flex items-end gap-2 sm:gap-3">
              {[{ h: 140 }, { h: 180 }, { h: 120 }].map((s, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-2xl animate-pulse"
                  style={{ height: s.h, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-2 sm:gap-3">
              {podiumSlots.map(({ entry, cfg }, slotIndex) => {
                if (!entry) return <div key={slotIndex} className="flex-1" />;
                const rankLabel = RANK_LABELS[entry.rank] ?? RANK_LABELS['Stargazer'];

                // #1 animates first (delay 0), #2 and #3 animate after (delay 180ms)
                const animDelay = cfg.rankNum === 1 ? 0 : 180;
                const isFirst = cfg.rankNum === 1;

                return (
                  <div
                    key={cfg.rankNum}
                    className="flex-1 rounded-2xl p-3 flex flex-col items-center text-center gap-2"
                    style={{
                      paddingTop: `${(cfg.padTop ?? 0) + 12}px`,
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      boxShadow: cfg.glow ?? 'none',
                      transform: podiumVisible
                        ? (isFirst ? 'scale(1.04)' : 'translateX(0) scale(1)')
                        : (isFirst ? 'scale(0.92)' : `translateX(${cfg.slideFrom}) scale(0.95)`),
                      opacity: podiumVisible ? 1 : 0,
                      transition: `transform 420ms cubic-bezier(0.34,1.56,0.64,1) ${animDelay}ms, opacity 300ms ease-out ${animDelay}ms`,
                    }}
                  >
                    {cfg.crown && (
                      <span className="text-lg leading-none" style={{ marginBottom: -4 }}>👑</span>
                    )}

                    <span
                      className="font-bold leading-none"
                      style={{ fontSize: cfg.rankFontSize, color: cfg.rankColor }}
                    >
                      {cfg.rankNum}
                    </span>

                    <AvatarCircle name={entry.handle} size={cfg.avatarSize} color={cfg.rankColor} />

                    <p
                      className="font-mono leading-tight w-full truncate"
                      style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.7)' }}
                    >
                      {entry.handle}
                    </p>

                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="font-bold"
                        style={{ fontSize: isFirst ? '0.9rem' : '0.8rem', color: 'var(--stars)' }}
                      >
                        {entry.stars.toLocaleString()} ✦
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {entry.observations} obs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full ranking list */}
          <Card variant="default" padding="none" hover={false}>
            <div
              className="px-4 py-3 border-b flex items-center gap-2"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                Rankings
              </span>
            </div>

            {loading
              ? Array.from({ length: 7 }).map((_, i) => <ShimmerRow key={i} />)
              : entries.map((entry, i) => {
                  const rankLabel = RANK_LABELS[entry.rank] ?? RANK_LABELS['Stargazer'];
                  const isCurrentUser = currentWallet && entry.wallet.toLowerCase() === currentWallet.toLowerCase();
                  const rankNumColor = i === 0 ? 'var(--stars)' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--color-text-muted)';
                  const avatarColor = i < 3 ? rankNumColor : walletColor(entry.wallet);
                  const rowBg = i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent';

                  return (
                    <div
                      key={`${entry.handle}-${i}`}
                      className="flex items-center gap-3 px-4 py-3 border-b last:border-0 transition-colors"
                      style={{
                        borderColor: 'rgba(255,255,255,0.05)',
                        background: rowBg,
                        borderLeft: isCurrentUser ? '3px solid #818cf8' : undefined,
                        paddingLeft: isCurrentUser ? '13px' : undefined,
                      }}
                    >
                      <span
                        className="w-6 text-center font-bold flex-shrink-0"
                        style={{ fontSize: 'var(--text-sm)', color: rankNumColor }}
                      >
                        {i + 1}
                      </span>

                      <AvatarCircle name={entry.handle} size={30} color={avatarColor} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p
                            className="font-mono truncate"
                            style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', fontWeight: 500 }}
                          >
                            {entry.handle}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="teal" size="sm">You</Badge>
                          )}
                        </div>
                        <div
                          className="mt-0.5 inline-block px-1.5 py-px rounded text-[10px] font-medium"
                          style={{ background: `${rankLabel.color}15`, color: rankLabel.color }}
                        >
                          {rankLabel.label}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Telescope size={11} style={{ color: 'var(--color-text-muted)' }} />
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                          {entry.observations}
                        </span>
                      </div>

                      <span
                        className="font-bold flex-shrink-0"
                        style={{ fontSize: 'var(--text-sm)', color: 'var(--stars)' }}
                      >
                        {entry.stars.toLocaleString()} <span className="font-normal text-[10px]">✦</span>
                      </span>
                    </div>
                  );
                })}
          </Card>

          {/* Current user outside top 20 */}
          {!loading && currentUserNotShown && currentUserIndex >= 0 && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.15)',
                borderLeft: '3px solid #818cf8',
              }}
            >
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Your Rank: #{currentUserIndex + 1}
              </span>
              <div className="flex-1" />
              <span style={{ fontSize: 'var(--text-xs)', color: '#818cf8' }}>
                {entries[currentUserIndex]?.stars.toLocaleString()} ✦
              </span>
            </div>
          )}
        </>
      )}

      {/* Footer note */}
      <p className="text-center text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        Updated every 5 minutes · Observations sealed as NFTs on Solana
      </p>

      {/* CTA */}
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.14)' }}
      >
        <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
          Complete missions to climb the leaderboard
        </p>
        <p className="text-xs mt-1 mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Each verified observation earns Stars and moves you up the ranks
        </p>
        <Link
          href="/missions"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #34d399, #14B8A6)', color: '#0a0a0a' }}
        >
          Start Observing →
        </Link>
      </div>
    </PageContainer>
  );
}
