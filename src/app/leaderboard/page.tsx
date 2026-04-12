'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Star, Telescope } from 'lucide-react';
import BackButton from '@/components/shared/BackButton';
import Card from '@/components/shared/Card';

const RANK_BADGES: Record<string, { label: string; color: string }> = {
  Celestial:  { label: 'Celestial',   color: '#FFD166' },
  Pathfinder: { label: 'Pathfinder',  color: '#7A5FFF' },
  Observer:   { label: 'Observer',    color: '#38F0FF' },
  Stargazer:  { label: 'Stargazer',   color: '#94a3b8' },
};

const SEED_DATA = [
  { handle: 'StarHunter_Giorgi', rank: 'Celestial',  observations: 47, stars: 2340 },
  { handle: 'NightSky_Nino',     rank: 'Celestial',  observations: 41, stars: 2105 },
  { handle: 'CosmicTea',         rank: 'Celestial',  observations: 38, stars: 1980 },
  { handle: 'AstroLeko',         rank: 'Pathfinder', observations: 29, stars: 1450 },
  { handle: 'DeepField_Ana',     rank: 'Pathfinder', observations: 24, stars: 1220 },
  { handle: 'OrionSeeker',       rank: 'Observer',   observations: 11, stars:  540 },
  { handle: 'SkyWatcher_Kote',   rank: 'Observer',   observations:  9, stars:  435 },
  { handle: 'NebulaMari',        rank: 'Stargazer',  observations:  5, stars:  240 },
  { handle: 'GalacticDavit',     rank: 'Stargazer',  observations:  3, stars:  140 },
];

interface LiveEntry {
  wallet: string;
  observations: number;
  total_stars: number;
}

interface DisplayEntry {
  handle: string;
  rank: string;
  observations: number;
  stars: number;
  isDemo?: boolean;
}

const PODIUM_COLORS = [
  { border: 'rgba(255,209,102,0.4)',  bg: 'rgba(255,209,102,0.08)',  label: '#FFD166', medal: '🥇', size: 'text-2xl', order: 1 },
  { border: 'rgba(192,192,192,0.35)', bg: 'rgba(192,192,192,0.06)',  label: '#C0C0C0', medal: '🥈', size: 'text-xl',  order: 2 },
  { border: 'rgba(205,127,50,0.35)',  bg: 'rgba(205,127,50,0.06)',   label: '#CD7F32', medal: '🥉', size: 'text-xl',  order: 3 },
];

const TIME_TABS = ['This Week', 'This Month', 'All Time'] as const;

function rankFromStars(stars: number): string {
  if (stars >= 1500) return 'Celestial';
  if (stars >= 800)  return 'Pathfinder';
  if (stars >= 300)  return 'Observer';
  return 'Stargazer';
}

function shortWallet(wallet: string): string {
  if (wallet.length < 10) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

function ShimmerRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 animate-pulse">
      <div className="w-6 h-4 rounded bg-white/5 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 rounded bg-white/5" />
        <div className="h-2.5 w-16 rounded bg-white/5" />
      </div>
      <div className="h-3 w-8 rounded bg-white/5" />
      <div className="h-4 w-14 rounded bg-white/5" />
    </div>
  );
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<typeof TIME_TABS[number]>('This Month');
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then((data: { leaderboard: LiveEntry[] }) => {
        if (data.leaderboard.length === 0) {
          setEntries(SEED_DATA.map(e => ({ ...e, isDemo: true })));
          setIsDemo(true);
        } else {
          setEntries(
            data.leaderboard.map(e => ({
              handle: shortWallet(e.wallet),
              rank: rankFromStars(e.total_stars),
              observations: e.observations,
              stars: e.total_stars,
            }))
          );
          setIsDemo(false);
        }
      })
      .catch(() => {
        setEntries(SEED_DATA.map(e => ({ ...e, isDemo: true })));
        setIsDemo(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const top3 = entries.slice(0, 3);
  const rest  = entries.slice(3);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 animate-page-enter flex flex-col gap-5">
      <BackButton />
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(255,209,102,0.1)', border: '1px solid rgba(255,209,102,0.2)' }}
        >
          <Trophy size={18} className="text-[#FFD166]" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#FFD166]" style={{ fontFamily: 'Georgia, serif' }}>
            Observer Leaderboard
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Top astronomers by Stars earned this month
            {isDemo && !loading && (
              <span className="ml-2 text-slate-600">(demo data)</span>
            )}
          </p>
        </div>
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
                ? { background: 'rgba(255,209,102,0.15)', color: '#FFD166', border: '1px solid rgba(255,209,102,0.25)' }
                : { color: '#64748b' }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Podium — top 3 */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="rounded-2xl p-4 flex flex-col items-center gap-2 animate-pulse"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="w-8 h-8 rounded-full bg-white/5" />
              <div className="h-3 w-20 rounded bg-white/5" />
              <div className="h-2.5 w-14 rounded bg-white/5" />
              <div className="h-4 w-16 rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {top3.map((entry, i) => {
            const p = PODIUM_COLORS[i];
            const badge = RANK_BADGES[entry.rank] ?? RANK_BADGES['Stargazer'];
            return (
              <div
                key={entry.handle}
                className="rounded-2xl p-3 sm:p-4 flex flex-col items-center text-center gap-1.5 transition-all"
                style={{ background: p.bg, border: `1px solid ${p.border}` }}
              >
                <span className={`${p.size} leading-none`}>{p.medal}</span>
                <p className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-2">{entry.handle}</p>
                <div
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: `${badge.color}18`, color: badge.color, border: `1px solid ${badge.color}30` }}
                >
                  {badge.label}
                </div>
                <p className="text-[#FFD166] font-bold text-sm">
                  {entry.stars.toLocaleString()} <span className="text-xs">✦</span>
                </p>
                <p className="text-slate-600 text-[10px]">{entry.observations} obs</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full ranked list */}
      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <Star size={13} className="text-[#FFD166]" />
          <span className="text-white text-sm font-semibold">Rankings</span>
        </div>

        {loading ? (
          Array.from({ length: 7 }).map((_, i) => <ShimmerRow key={i} />)
        ) : (
          entries.map((entry, i) => {
            const badge = RANK_BADGES[entry.rank] ?? RANK_BADGES['Stargazer'];
            return (
              <div
                key={`${entry.handle}-${i}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 transition-colors"
              >
                <span
                  className="w-6 text-center text-sm font-bold flex-shrink-0"
                  style={{ color: i === 0 ? '#FFD166' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#475569' }}
                >
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-slate-200">{entry.handle}</p>
                  <div
                    className="inline-block mt-0.5 px-1.5 py-px rounded text-[10px] font-medium"
                    style={{ background: `${badge.color}15`, color: badge.color }}
                  >
                    {badge.label}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Telescope size={11} className="text-slate-600" />
                  <span className="text-slate-500 text-xs">{entry.observations}</span>
                </div>

                <span className="text-[#FFD166] text-sm font-bold flex-shrink-0">
                  {entry.stars.toLocaleString()} <span className="text-xs font-normal">✦</span>
                </span>
              </div>
            );
          })
        )}
      </Card>

      {/* Updated every 5 min note */}
      <p className="text-center text-slate-700 text-xs">
        Updated every 5 minutes · Observations sealed as NFTs on Solana
      </p>

      {/* CTA */}
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.15)' }}
      >
        <p className="text-white font-semibold text-sm mb-1">Complete missions to climb the leaderboard</p>
        <p className="text-slate-500 text-xs mb-4">Each verified observation earns Stars and moves you up the ranks</p>
        <Link
          href="/missions"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #34d399, #14B8A6)', color: '#070B14' }}
        >
          Start Observing →
        </Link>
      </div>
    </div>
  );
}
