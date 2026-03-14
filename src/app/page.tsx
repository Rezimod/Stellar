import Link from 'next/link';
import { ECOSYSTEM, SPONSORS } from '@/lib/constants';

const ecoCards = [
  { icon: '🛒', title: 'astroman.ge', subtitle: 'Main Store', desc: 'Browse telescopes', href: ECOSYSTEM.store, ext: true },
  { icon: '🏛️', title: 'club.astroman.ge', subtitle: 'Loyalty Club', desc: 'Earn points', href: ECOSYSTEM.club, ext: true },
  { icon: '🌌', title: 'sky.astroman.ge', subtitle: 'Sky Resources', desc: 'Star charts', href: ECOSYSTEM.sky, ext: true },
  { icon: '📱', title: 'This App', subtitle: 'Proof of Observation', desc: 'NFT missions', href: '/club', ext: false },
];

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center gap-12">
      {/* Hero */}
      <div className="text-center flex flex-col items-center gap-5">
        <p className="text-[#c9a84c] text-sm tracking-widest uppercase font-mono">✦ Proof of Observation</p>
        <h1 className="text-4xl md:text-5xl font-bold text-[#c9a84c]" style={{ fontFamily: 'Georgia, serif' }}>
          Strava for Astronomy
          <br />
          <span className="text-white">on Solana</span>
        </h1>
        <p className="text-slate-400 max-w-md text-lg">
          Verify your stargazing. Earn on-chain rewards.<br />
          Built on Georgia&apos;s first astronomy store.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/club"
            className="px-6 py-3 bg-gradient-to-r from-[#c9a84c] to-[#a07840] text-black font-bold rounded-lg hover:from-[#d4b05c] transition-all duration-200"
          >
            Enter AstroClub →
          </Link>
          <Link
            href="/sky"
            className="px-6 py-3 border border-[#22d3ee] text-[#22d3ee] rounded-lg hover:bg-[#22d3ee]/10 transition-all duration-200"
          >
            Sky Dashboard →
          </Link>
        </div>
      </div>

      {/* Ecosystem */}
      <div className="w-full">
        <p className="text-center text-slate-500 text-sm mb-6 tracking-widest uppercase">— The Astroman Ecosystem —</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ecoCards.map(card => (
            card.ext ? (
              <a
                key={card.title}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#111c30] border border-[#1a2d4d] hover:border-[#c9a84c] rounded-xl p-4 flex flex-col gap-2 transition-all duration-200 group"
              >
                <span className="text-2xl">{card.icon}</span>
                <p className="text-[#c9a84c] text-xs font-mono group-hover:underline">{card.title}</p>
                <p className="text-slate-300 text-sm font-medium">{card.subtitle}</p>
                <p className="text-slate-500 text-xs">{card.desc}</p>
                <p className="text-[#c9a84c] text-xs mt-auto">Visit →</p>
              </a>
            ) : (
              <Link
                key={card.title}
                href={card.href}
                className="bg-[#111c30] border border-[#c9a84c]/40 hover:border-[#c9a84c] rounded-xl p-4 flex flex-col gap-2 transition-all duration-200 group glow-brass"
              >
                <span className="text-2xl">{card.icon}</span>
                <p className="text-[#c9a84c] text-xs font-mono">{card.title}</p>
                <p className="text-slate-300 text-sm font-medium">{card.subtitle}</p>
                <p className="text-slate-500 text-xs">{card.desc}</p>
                <p className="text-[#c9a84c] text-xs mt-auto">Launch →</p>
              </Link>
            )
          ))}
        </div>
      </div>

      {/* Powered by */}
      <div className="text-center">
        <p className="text-slate-600 text-xs mb-3 tracking-widest uppercase">— Powered By —</p>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          {[
            { label: 'Solana', href: SPONSORS.solana },
            { label: 'FarmHawk', href: SPONSORS.farmhawk },
            { label: 'Pollinet', href: SPONSORS.pollinet },
            { label: 'Scriptonia', href: SPONSORS.scriptonia },
          ].map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
              className="text-slate-500 hover:text-[#c9a84c] transition-colors">
              {s.label}
            </a>
          ))}
        </div>
        <p className="text-slate-700 text-xs mt-4">
          Vibecoding From 0 · Superteam Georgia × CyreneAI · March 14-15 2026
        </p>
      </div>
    </div>
  );
}
