'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

const columns = [
  {
    title: 'Explore',
    links: [
      { label: 'Sky Forecast',   href: '/sky' },
      { label: 'Missions',       href: '/missions' },
      { label: 'Dark Sky Map',   href: '/darksky' },
      { label: 'ASTRA AI',       href: '/chat' },
    ],
  },
  {
    title: 'Shop',
    links: [
      { label: 'Marketplace',    href: '/marketplace' },
      { label: 'Astroman.ge',    href: 'https://astroman.ge', external: true },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Leaderboard',    href: '/missions' },
      { label: 'Discoveries',    href: '/nfts' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'GitHub',         href: 'https://github.com', external: true },
      { label: 'Colosseum',      href: 'https://arena.colosseum.org', external: true },
    ],
  },
];

export default function Footer() {
  return (
    <footer
      className="relative z-10 mt-auto"
      style={{
        background: 'rgba(10,22,40,0.85)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Mobile — minimal */}
      <div
        className="sm:hidden flex items-center justify-center px-4"
        style={{ paddingTop: 16, paddingBottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
      >
        <div className="flex flex-col items-center gap-1 text-center">
          <span style={{ color: '#FFD166', fontSize: 13, letterSpacing: '0.2em', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
            ✦ STELLAR
          </span>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, margin: 0, letterSpacing: '0.04em' }}>
            Built on Solana
          </p>
        </div>
      </div>

      {/* Desktop — 4-column */}
      <div className="hidden sm:block max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-4 gap-8 mb-10">
          {columns.map(col => (
            <div key={col.title}>
              <p style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                marginBottom: 12,
                fontFamily: 'var(--font-display)',
              }}>
                {col.title}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                      style={{
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: 12,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'color 150ms ease-out',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}
                    >
                      {link.label}
                      {link.external && <ExternalLink size={9} style={{ opacity: 0.5 }} />}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
            Built in Tbilisi 🇬🇪 · © 2026 Stellar
          </span>
          <span style={{
            color: 'rgba(255,255,255,0.25)',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}>
            Powered by{' '}
            <span style={{ color: '#9945FF', fontWeight: 600 }}>Solana</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
