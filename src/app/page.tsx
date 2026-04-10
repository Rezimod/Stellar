'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePrivy } from '@privy-io/react-auth';
import { ECOSYSTEM, MISSIONS } from '@/lib/constants';
import { useAppState } from '@/hooks/useAppState';
import AstroLogo from '@/components/shared/AstroLogo';
import { MissionIcon } from '@/components/shared/PlanetIcons';
import { Telescope, Camera, Satellite, Layers } from 'lucide-react';
import RewardIcon from '@/components/shared/RewardIcon';
import TonightTargets from '@/components/observe/TonightTargets';

const ecoCards = [
  { icon: '🛒', title: 'astroman.ge', subtitle: 'Main Store', desc: 'Browse telescopes', href: ECOSYSTEM.store, ext: true },
  { icon: '🏛️', title: 'club.astroman.ge', subtitle: 'Loyalty Club', desc: 'Earn stars', href: ECOSYSTEM.club, ext: true },
  { icon: '📱', title: 'Stellar', subtitle: 'This App', desc: 'Collect discoveries, earn rewards', href: '/sky', ext: false },
];

export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();
  const { user } = usePrivy();
  const { state } = useAppState();
  const walletAddress =
    (user?.linkedAccounts.find(
      (a): a is Extract<typeof a, { type: 'wallet' }> =>
        a.type === 'wallet' && 'chainType' in a && (a as { chainType?: string }).chainType === 'solana'
    )?.address) ?? null;
  const stepIcons = [Telescope, Camera, Satellite, Layers];
  const howItWorksSteps = [
    { step: 1, icon: stepIcons[0], title: t('home.steps.observe'), desc: t('home.steps.observeDesc') },
    { step: 2, icon: stepIcons[1], title: t('home.steps.capture'), desc: t('home.steps.captureDesc') },
    { step: 3, icon: stepIcons[2], title: t('home.steps.verify'), desc: t('home.steps.verifyDesc') },
    { step: 4, icon: stepIcons[3], title: t('home.steps.mint'),   desc: t('home.steps.mintDesc') },
  ];
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-16 flex flex-col items-center gap-8 sm:gap-12 animate-page-enter">

      {/* Hero */}
      <div className="text-center flex flex-col items-center gap-5">
        <AstroLogo heightClass="h-14" />
        <p className="text-[#FFD166] text-sm tracking-widest uppercase font-mono">✦ STELLAR ✦</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>
          {t('common.tagline').split(' ').map((word, i) => (
            <span key={i} className="animate-word inline-block mr-2" style={{ animationDelay: `${i * 150 + 200}ms` }}>
              <span className={i === 0 ? 'text-[#FFD166]' : 'text-white'}>{word}</span>
            </span>
          ))}
        </h1>
        <p className="text-slate-400 max-w-md text-base leading-relaxed">
          {t('common.taglineDesc')}
        </p>
        <Link
          href="/sky"
          className="px-10 py-4 rounded-xl font-bold text-base tracking-wide transition-all duration-200 active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #FFD166, #CC9A33)',
            color: '#070B14',
            boxShadow: '0 0 32px rgba(255,209,102,0.3), 0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          {t('common.startObserving')}
        </Link>
        <Link href="/missions" className="text-xs text-slate-600 hover:text-slate-400 underline mt-1">
          Already a member? Go to Missions →
        </Link>
        {/* Trust indicators */}
        <div className="flex items-center gap-4 text-[11px] text-slate-600 flex-wrap justify-center">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
            {t('home.trust.astronomers')}
          </span>
          <span className="text-white/10">·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD166]" />
            {t('home.trust.rewards')}
          </span>
        </div>
      </div>

      {/* How It Works */}
      <div id="how-it-works" className="w-full">
        <p className="text-center text-[var(--text-dim)] text-xs mb-8 tracking-widest uppercase">— {t('home.howItWorks')} —</p>
        <div className="flex flex-col sm:flex-row gap-0">
          {howItWorksSteps.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="flex-1 flex flex-col items-center text-center relative px-4 py-2">
                {/* Connector line between steps */}
                {i < howItWorksSteps.length - 1 && (
                  <div className="hidden sm:block absolute top-[22px] left-[calc(50%+24px)] right-0 h-px"
                    style={{ background: 'linear-gradient(to right, rgba(255,209,102,0.2), rgba(255,255,255,0.03))' }} />
                )}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center mb-4 relative z-10"
                  style={{ border: '1px solid rgba(255,209,102,0.2)', background: 'rgba(255,209,102,0.05)' }}
                >
                  <Icon size={18} className="text-[#FFD166]/70" />
                </div>
                <p className="text-white font-semibold text-sm mb-1.5">{item.title}</p>
                <p className="text-slate-600 text-xs leading-relaxed max-w-[120px]">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tonight's Live Targets — heading owned by component to avoid orphan during load */}
      <TonightTargets
        onStartObserve={() => router.push('/observe')}
        walletAddress={walletAddress}
      />

      {/* Mission Grid */}
      <div className="w-full">
        <p className="text-center text-[var(--text-dim)] text-xs mb-6 tracking-widest uppercase">— {t('home.missions')} —</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {MISSIONS.map(m => {
            const vis = m.difficulty === 'Beginner' ? { label: 'Excellent', color: 'bg-emerald-400' } : { label: 'Good', color: 'bg-yellow-400' };
            return (
              <Link key={m.id} href="/missions" className="glass-card p-3 flex flex-col items-center gap-2 text-center group hover:border-[#38F0FF]/20 transition-all">
                <div className="w-10 h-10 flex items-center justify-center">
                  <MissionIcon id={m.id} size={36} />
                </div>
                <p className="text-white text-xs font-semibold">{m.name}</p>
                <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                  <span className={`w-1.5 h-1.5 rounded-full ${vis.color}`} />
                  {vis.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Top Astronomers */}
      <div className="w-full">
        <p className="text-center text-[var(--text-dim)] text-xs mb-6 tracking-widest uppercase">
          — {t('home.leaderboard')} —
          <span className="text-[10px] text-slate-700 ml-2 normal-case">(demo)</span>
        </p>
        <div className="glass-card overflow-hidden">
          {(() => {
            const FALLBACK = [
              { rank: 1, name: 'AstroHunter', location: 'Tbilisi', points: 1280, verified: true, isUser: false },
              { rank: 2, name: 'StarFinder',  location: 'Lisbon',  points: 940,  verified: true, isUser: false },
              { rank: 3, name: 'NebulaScout', location: 'Tokyo',   points: 820,  verified: false, isUser: false },
              { rank: 4, name: 'CosmicEye',   location: 'Arizona', points: 650,  verified: true, isUser: false },
              { rank: 5, name: 'MoonWatcher', location: 'Berlin',  points: 410,  verified: false, isUser: false },
            ];
            const userMissions = state.completedMissions ?? [];
            const userPoints = userMissions.length * 100;
            const entries = userPoints > 0
              ? [...FALLBACK, { rank: FALLBACK.length + 1, name: user?.email?.address?.split('@')[0] ?? 'You', location: 'Your City', points: userPoints, verified: true, isUser: true }]
              : FALLBACK;
            return entries.map((entry, i) => {
              const rankColor = entry.rank === 1 ? 'text-[#FFD166]' : entry.rank === 2 ? 'text-slate-300' : entry.rank === 3 ? 'text-amber-600' : 'text-[var(--text-dim)]';
              return (
                <div key={entry.rank} className={`flex items-center gap-3 px-5 py-3 ${i > 0 ? 'border-t border-white/5' : ''} ${entry.rank === 1 ? 'bg-[#FFD166]/5' : ''} ${entry.isUser ? 'bg-[#38F0FF]/5' : ''}`}>
                  <span className={`text-sm font-bold w-6 text-center ${rankColor}`}>#{entry.rank}</span>
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-cosmos)] flex items-center justify-center text-xs">
                    {entry.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm font-medium">{entry.name}</span>
                    {entry.isUser && <span className="text-[10px] text-[#FFD166] ml-1">You</span>}
                    <p className="text-slate-700 text-[10px]">{entry.location}</p>
                  </div>
                  {entry.verified && <span className="text-xs" title="Verified Observer">🔭</span>}
                  <span className="text-[#FFD166] text-sm font-semibold">{entry.points} ✦</span>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Ecosystem */}
      <div className="w-full">
        <p className="text-center text-[var(--text-dim)] text-xs mb-6 tracking-widest uppercase">— {t('home.explorePlatform')} —</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ecoCards.map(card => (
            card.ext ? (
              <a
                key={card.title}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#0F1F3D] border border-[rgba(56,240,255,0.12)] hover:border-[#FFD166] rounded-xl p-3 flex flex-col gap-2 transition-all duration-200 group"
              >
                <span className="text-2xl">{card.icon}</span>
                <p className="text-[#FFD166] text-xs font-mono group-hover:underline">{card.title}</p>
                <p className="text-slate-300 text-sm font-medium">{card.subtitle}</p>
                <p className="text-slate-500 text-xs">{card.desc}</p>
                <p className="text-[#FFD166] text-xs mt-auto">{t('common.visitStore')}</p>
              </a>
            ) : (
              <Link
                key={card.title}
                href={card.href}
                className="bg-[#0F1F3D] border border-[#FFD166]/40 hover:border-[#FFD166] rounded-xl p-3 flex flex-col gap-2 transition-all duration-200 group glow-gold"
              >
                <span className="text-2xl">{card.icon}</span>
                <p className="text-[#FFD166] text-xs font-mono">{card.title}</p>
                <p className="text-slate-300 text-sm font-medium">{card.subtitle}</p>
                <p className="text-slate-500 text-xs">{card.desc}</p>
                <p className="text-[#FFD166] text-xs mt-auto">{t('common.launch')}</p>
              </Link>
            )
          ))}
        </div>
      </div>

      {/* Observe & Earn */}
      <div className="w-full">
        <p className="text-center text-[var(--text-dim)] text-xs mb-6 tracking-widest uppercase">— {t('home.observeEarn')} —</p>
        <div className="glass-card border border-[#FFD166]/20 p-6 flex flex-col gap-4 glow-gold">
          <p className="text-slate-300 text-center">{t('home.observeEarnDesc')}</p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 text-sm">
              <RewardIcon emoji="🎫" size={16} />
              <span className="text-slate-300">Discounts up to 20% on telescopes</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <RewardIcon emoji="🌕" size={16} />
              <span className="text-slate-300">Free Moon Lamp for your first lunar observation</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <RewardIcon emoji="🏆" size={16} />
              <span className="text-slate-300">Free Custom Star Map for completing all 5 missions</span>
            </div>
          </div>
          <Link
            href="/club"
            className="text-center px-5 py-2.5 bg-gradient-to-r from-[#FFD166] to-[#CC9A33] text-black font-bold rounded-lg hover:from-[#FFE08A] transition-all duration-200 text-sm w-full sm:w-auto"
          >
            {t('common.startEarning')}
          </Link>
        </div>
      </div>

    </div>
  );
}
