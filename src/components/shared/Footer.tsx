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
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* 3-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }} className="footer-cols">
          <style>{`@media (min-width: 768px) { .footer-cols { grid-template-columns: 1.5fr 1fr 1fr !important; } }`}</style>

          {/* Column 1 — Stellar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{
              color: '#FFD166',
              fontSize: 15,
              letterSpacing: '0.15em',
              fontWeight: 700,
              fontFamily: 'monospace',
            }}>
              ✦ STELLAR
            </span>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              Astronomy on Solana · Powered by Astroman
            </p>
            <a
              href="https://github.com/Morningbriefrezi/Stellar"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, textDecoration: 'none' }}
            >
              Open source · MIT License ↗
            </a>
            <p style={{ color: '#34d399', fontSize: 11, margin: 0 }}>47 observations sealed on-chain</p>
          </div>

          {/* Column 2 — Platform */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
              Platform
            </p>
            {[
              { href: '/sky',         label: 'Sky Forecast' },
              { href: '/missions',    label: 'Missions' },
              { href: '/chat',        label: 'ASTRA AI' },
              { href: '/marketplace', label: 'Marketplace' },
              { href: '/nfts',        label: 'NFT Gallery' },
              { href: '/profile',     label: 'Profile' },
            ].map(link => (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-white transition-colors"
                style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textDecoration: 'none' }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Column 3 — Community */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
              Community
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>
              Built in Tbilisi, Georgia 🇬🇪
            </p>
            <span style={{
              display: 'inline-block',
              alignSelf: 'flex-start',
              border: '1px solid rgba(255,209,102,0.4)',
              color: '#FFD166',
              fontSize: 10,
              padding: '2px 10px',
              borderRadius: 999,
            }}>
              2nd place · Superteam Georgia Hackathon
            </span>
            {[
              { href: ECOSYSTEM.store,                                label: 'Astroman Store' },
              { href: 'https://explorer.solana.com/?cluster=devnet', label: 'Solana Explorer' },
              { href: 'https://arena.colosseum.org',                  label: 'Colosseum' },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textDecoration: 'none' }}
              >
                {link.label} ↗
              </a>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
              <a
                href="https://github.com/Morningbriefrezi/Stellar"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textDecoration: 'none' }}
              >
                GitHub
              </a>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>·</span>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>Twitter (soon)</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          marginTop: 24,
          paddingTop: 16,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: 0 }}>© 2026 Astroman · Stellar</p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: 0 }}>Built on Solana · Devnet &nbsp;◎ Solana</p>
        </div>
      </div>
    </footer>
  );
}
