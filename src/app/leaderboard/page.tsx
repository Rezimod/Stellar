'use client';

import { useState } from 'react';
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

const LEADERBOARD = [
  { handle: 'StarHunter_Giorgi', rank: 'Celestial',  observations: 47, stars: 2340 },
  { handle: 'NightSky_Nino',     rank: 'Celestial',  observations: 41, stars: 2105 },
  { handle: 'CosmicTea',         rank: 'Celestial',  observations: 38, stars: 1980 },
  { handle: 'AstroLeko',         rank: 'Pathfinder', observations: 29, stars: 1450 },
  { handle: 'DeepField_Ana',     rank: 'Pathfinder', observations: 24, stars: 1220 },
  { handle: 'You',               rank: 'Observer',   observations: 12, stars:  580, isYou: true },
  { handle: 'OrionSeeker',       rank: 'Observer',   observations: 11, stars:  540 },
  { handle: 'SkyWatcher_Kote',   rank: 'Observer',   observations:  9, stars:  435 },
  { handle: 'NebulaMari',        rank: 'Stargazer',  observations:  5, stars:  240 },
  { handle: 'GalacticDavit',     rank: 'Stargazer',  observations:  3, stars:  140 },
] as const;

type Entry = typeof LEADERBOARD[number] & { isYou?: boolean };

const PODIUM_COLORS = [
  { border: 'rgba(255,209,102,0.4)',  bg: 'rgba(255,209,102,0.08)',  label: '#FFD166', medal: '🥇', size: 'text-2xl', order: 1 },
  { border: 'rgba(192,192,192,0.35)', bg: 'rgba(192,192,192,0.06)',  label: '#C0C0C0', medal: '🥈', size: 'text-xl',  order: 2 },
  { border: 'rgba(205,127,50,0.35)',  bg: 'rgba(205,127,50,0.06)',   label: '#CD7F32', medal: '🥉', size: 'text-xl',  order: 3 },
];

const TIME_TABS = ['This Week', 'This Month', 'All Time'] as const;

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<typeof TIME_TABS[number]>('This Month');

  const top3 = LEADERBOARD.slice(0, 3) as unknown as Entry[];
  const rest  = LEADERBOARD.slice(3) as unknown as Entry[];

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
          <p className="text-slate-500 text-sm mt-0.5">Top astronomers by Stars earned this month</p>
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
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {top3.map((entry, i) => {
          const p = PODIUM_COLORS[i];
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
                style={{ background: `${RANK_BADGES[entry.rank].color}18`, color: RANK_BADGES[entry.rank].color, border: `1px solid ${RANK_BADGES[entry.rank].color}30` }}
              >
                {RANK_BADGES[entry.rank].label}
              </div>
              <p className="text-[#FFD166] font-bold text-sm">
                {entry.stars.toLocaleString()} <span className="text-xs">✦</span>
              </p>
              <p className="text-slate-600 text-[10px]">{entry.observations} obs</p>
            </div>
          );
        })}
      </div>

      {/* Full ranked list */}
      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <Star size={13} className="text-[#FFD166]" />
          <span className="text-white text-sm font-semibold">Rankings</span>
        </div>

        {LEADERBOARD.map((entry, i) => {
          const e = entry as Entry;
          const badge = RANK_BADGES[e.rank];
          const isYou = 'isYou' in e && e.isYou;

          return (
            <div
              key={e.handle}
              className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 transition-colors"
              style={isYou ? { background: 'rgba(20,184,166,0.07)', borderLeft: '2px solid rgba(20,184,166,0.5)' } : {}}
            >
              {/* Rank number */}
              <span
                className="w-6 text-center text-sm font-bold flex-shrink-0"
                style={{ color: i === 0 ? '#FFD166' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#475569' }}
              >
                {i + 1}
              </span>

              {/* Handle */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: isYou ? '#5EEAD4' : '#e2e8f0' }}
                >
                  {e.handle}
                  {isYou && (
                    <span className="ml-2 text-[10px] font-normal text-[#14B8A6]">(you)</span>
                  )}
                </p>
                <div
                  className="inline-block mt-0.5 px-1.5 py-px rounded text-[10px] font-medium"
                  style={{ background: `${badge.color}15`, color: badge.color }}
                >
                  {badge.label}
                </div>
              </div>

              {/* Observations */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Telescope size={11} className="text-slate-600" />
                <span className="text-slate-500 text-xs">{e.observations}</span>
              </div>

              {/* Stars */}
              <span className="text-[#FFD166] text-sm font-bold flex-shrink-0">
                {e.stars.toLocaleString()} <span className="text-xs font-normal">✦</span>
              </span>
            </div>
          );
        })}
      </Card>

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

      <p className="text-center text-slate-700 text-xs">Observations sealed as NFTs on Solana</p>
    </div>
  );
}
