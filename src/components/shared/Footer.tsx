import { ECOSYSTEM } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="relative z-10 bg-black/20 backdrop-blur-sm mt-auto" style={{ borderTop: '1px solid transparent', borderImage: 'linear-gradient(to right, transparent, rgba(255,209,102,0.3), rgba(56,240,255,0.3), rgba(255,209,102,0.3), transparent) 1' }}>
      <div className="flex flex-col items-center gap-1.5 py-4 px-4">
        <p className="text-[10px] text-slate-700 text-center">
          Built with 🔭 by{' '}
          <a href={ECOSYSTEM.store} target="_blank" rel="noopener noreferrer"
            className="hover:text-slate-500 transition-colors">Astroman</a>
          {' '}·{' '}
          <a href="https://scriptonia.xyz" target="_blank" rel="noopener noreferrer"
            className="hover:text-slate-500 transition-colors">Scriptonia</a>
          {' '}· Made in Georgia 🇬🇪
        </p>
      </div>
    </footer>
  );
}
