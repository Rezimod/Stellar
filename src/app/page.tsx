'use client';
import Link from 'next/link';
import { ECOSYSTEM, MISSIONS } from '@/lib/constants';
import AstroLogo from '@/components/shared/AstroLogo';
import { MissionIcon } from '@/components/shared/PlanetIcons';
import { Telescope, Camera, Satellite, Link2 } from 'lucide-react';
import RewardIcon from '@/components/shared/RewardIcon';

const howItWorksSteps = [
  { step: 1, icon: <Telescope size={24} />, color: 'text-[#FFD166]', bg: 'bg-[#FFD166]/10 border-[#FFD166]/20', title: 'Observe', desc: "Point your telescope at tonight's target" },
  { step: 2, icon: <Camera size={24} />, color: 'text-[#38F0FF]', bg: 'bg-[#38F0FF]/10 border-[#38F0FF]/20', title: 'Capture', desc: 'Photograph through the eyepiece' },
  { step: 3, icon: <Satellite size={24} />, color: 'text-[#38F0FF]', bg: 'bg-[#38F0FF]/10 border-[#38F0FF]/20', title: 'Verify', desc: 'Satellite confirms clear sky conditions' },
  { step: 4, icon: <Link2 size={24} />, color: 'text-[#7A5FFF]', bg: 'bg-[#7A5FFF]/10 border-[#7A5FFF]/20', title: 'Mint', desc: 'Proof sealed on Solana as your NFT' },
];

const ecoCards = [
  { icon: '🛒', title: 'astroman.ge', subtitle: 'Main Store', desc: 'Browse telescopes', href: ECOSYSTEM.store, ext: true },
  { icon: '🏛️', title: 'club.astroman.ge', subtitle: 'Loyalty Club', desc: 'Earn stars', href: ECOSYSTEM.club, ext: true },
  { icon: '📱', title: 'Stellar', subtitle: 'This App', desc: 'NFT missions', href: '/club', ext: false },
];

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-16 flex flex-col items-center gap-8 sm:gap-12 animate-page-enter">

      {/* Hero */}
      <div className="text-center flex flex-col items-center gap-5">
        <AstroLogo heightClass="h-14" />
        <p className="text-[#FFD166] text-sm tracking-widest uppercase font-mono">✦ STELLAR ✦</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>
          {['Observe.', 'Verify.', 'Collect.'].map((word, i) => (
            <span key={word} className="animate-word inline-block mr-2" style={{ animationDelay: `${i * 150 + 200}ms` }}>
              <span className={i === 0 ? 'text-[#FFD166]' : 'text-white'}>{word}</span>
            </span>
          ))}
        </h1>
        <p className="text-slate-400 max-w-md text-lg">
          Stargazing verified by satellite. Sealed on Solana.
        </p>
        <div className="flex gap-4 flex-wrap justify-center w-full sm:w-auto">
          <Link
            href="/club"
            className="px-7 py-3 bg-gradient-to-r from-[#FFD166] to-[#CC9A33] text-black font-bold rounded-lg shadow-[0_0_20px_rgba(255,209,102,0.25)] hover:shadow-[0_0_30px_rgba(255,209,102,0.4)] transition-all duration-200"
          >
            Start Observing →
          </Link>
          <a
            href="#how-it-works"
            className="px-7 py-3 border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 rounded-lg transition-all duration-200"
            onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }}
          >
            How It Works ↓
          </a>
        </div>
      </div>

      {/* How It Works */}
      <div id="how-it-works" className="w-full">
        <p className="text-center text-[var(--text-dim)] text-xs mb-6 tracking-widest uppercase">— How It Works —</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {howItWorksSteps.map((item, i) => (
            <div key={item.step} className="glass-card p-4 relative text-center animate-word" style={{ animationDelay: `${i * 100 + 400}ms` }}>
              <span className="absolute top-2 left-3 text-[10px] font-bold text-[#FFD166] bg-[#FFD166]/10 px-1.5 py-0.5 rounded-full">
                {item.step}
              </span>
              <div className={`w-12 h-12 rounded-full ${item.bg} border flex items-center justify-center mb-2 mt-2 mx-auto ${item.color}`}>
                {item.icon}
              </div>
              <p className="text-white font-semibold text-sm mb-1">{item.title}</p>
              <p className="text-[var(--text-secondary)] text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tonight's Targets */}
      <div className="w-full">
        <p className="text-center text-[var(--text-dim)] text-xs mb-6 tracking-widest uppercase">— Tonight&apos;s Targets —</p>
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
        <p className="text-center text-[var(--text-dim)] text-xs mb-6 tracking-widest uppercase">— Leaderboard —</p>
        <div className="glass-card overflow-hidden">
          {[
            { rank: 1, name: 'AstroHunter', points: 1280, verified: true },
            { rank: 2, name: 'StarFinder', points: 940, verified: true },
            { rank: 3, name: 'NebulaScout', points: 820, verified: false },
            { rank: 4, name: 'CosmicEye', points: 650, verified: true },
            { rank: 5, name: 'MoonWatcher', points: 410, verified: false },
          ].map((entry, i) => {
            const rankColor = entry.rank === 1 ? 'text-[#FFD166]' : entry.rank === 2 ? 'text-slate-300' : entry.rank === 3 ? 'text-amber-600' : 'text-[var(--text-dim)]';
            return (
              <div key={entry.rank} className={`flex items-center gap-3 px-5 py-3 ${i > 0 ? 'border-t border-white/5' : ''} ${entry.rank === 1 ? 'bg-[#FFD166]/5' : ''}`}>
                <span className={`text-sm font-bold w-6 text-center ${rankColor}`}>#{entry.rank}</span>
                <div className="w-8 h-8 rounded-full bg-[var(--bg-cosmos)] flex items-center justify-center text-xs">
                  {entry.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-white text-sm font-medium flex-1">{entry.name}</span>
                {entry.verified && <span className="text-xs" title="Verified Observer">🔭</span>}
                <span className="text-[#FFD166] text-sm font-semibold">{entry.points} ✦</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ecosystem */}
      <div className="w-full">
        <p className="text-center text-[var(--text-dim)] text-xs mb-6 tracking-widest uppercase">— The Astroman Ecosystem —</p>
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
                <p className="text-[#FFD166] text-xs mt-auto">Visit →</p>
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
                <p className="text-[#FFD166] text-xs mt-auto">Launch →</p>
              </Link>
            )
          ))}
        </div>
      </div>

      {/* Observe & Earn */}
      <div className="w-full">
        <p className="text-center text-[var(--text-dim)] text-xs mb-6 tracking-widest uppercase">— Observe &amp; Earn —</p>
        <div className="glass-card border border-[#FFD166]/20 p-6 flex flex-col gap-4 glow-gold">
          <p className="text-slate-300 text-center">Complete missions to unlock real rewards from the Astroman store.</p>
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
            Start Earning →
          </Link>
        </div>
      </div>

    </div>
  );
}
