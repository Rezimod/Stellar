import Link from 'next/link';
import { ECOSYSTEM } from '@/lib/constants';

export default function Footer() {
  return (
    <footer
      className="relative z-10 mt-auto"
      style={{
        background: 'rgba(7,11,20,0.8)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <span style={{ color: '#FFD166', fontSize: 13, letterSpacing: '0.15em', fontWeight: 700, fontFamily: 'monospace' }}>
          ✦ STELLAR
        </span>

        {/* Nav links */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', alignItems: 'center' }}>
          {[
            { href: '/sky',          label: 'Sky Forecast' },
            { href: '/missions',     label: 'Missions' },
            { href: '/chat',         label: 'ASTRA AI' },
            { href: '/marketplace',  label: 'Marketplace' },
            { href: '/profile',      label: 'Profile' },
            { href: ECOSYSTEM.store, label: 'Astroman ↗', external: true },
            { href: 'https://github.com/Morningbriefrezi/Stellar', label: 'GitHub ↗', external: true },
          ].map(link =>
            link.external ? (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textDecoration: 'none' }}>
                {link.label}
              </a>
            ) : (
              <Link key={link.label} href={link.href}
                className="hover:text-white transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textDecoration: 'none' }}>
                {link.label}
              </Link>
            )
          )}
        </div>

        {/* Copyright */}
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, margin: 0 }}>
          © 2026 Stellar · Built on Solana
        </p>
      </div>
    </footer>
  );
}
