import { ECOSYSTEM } from '@/lib/constants';
import AstroLogo from './AstroLogo';

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-black/20 backdrop-blur-sm mt-auto">
      <div className="flex flex-col items-center gap-1.5 py-4 px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[var(--text-dim)]">
          <span>Powered by</span>
          <a href={ECOSYSTEM.store} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-[#FFD166] transition-colors">
            <AstroLogo heightClass="h-4" />
          </a>
          <span className="text-white/10">·</span>
          <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#7A5FFF] transition-colors">Solana</a>
          <span className="text-white/10">·</span>
          <a href="https://scriptonia.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent-gold)] transition-colors">Scriptonia</a>
        </div>
        <p className="text-[10px] text-[var(--text-dim)]/60">
          Vibecoding From 0 · March 14–15, 2026
        </p>
      </div>
    </footer>
  );
}
