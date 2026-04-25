'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

type FooterLink = { label: string; href: string; external?: boolean };
type FooterColumn = { title: string; links: FooterLink[] };

const columns: FooterColumn[] = [
  {
    title: 'Stellar',
    links: [
      { label: 'Sky',         href: '/sky' },
      { label: 'Missions',    href: '/missions' },
      { label: 'Markets',     href: '/markets' },
      { label: 'Shop',        href: '/marketplace' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Astroman',    href: 'https://astroman.ge', external: true },
      { label: 'GitHub',      href: 'https://github.com/Morningbriefrezi/Stellar', external: true },
      { label: 'X',           href: 'https://x.com/StellarClub26', external: true },
      { label: 'Colosseum',   href: 'https://arena.colosseum.org', external: true },
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
      {/* Desktop — 2-column */}
      <div className="hidden sm:block max-w-6xl mx-auto px-6 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 mb-10 max-w-md">
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
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ color: 'var(--stl-text-whisper)', fontSize: 11 }}>
            Built in Tbilisi 🇬🇪 · Colosseum Frontier 2026
          </span>
          <span style={{ color: 'var(--stl-text-whisper)', fontSize: 11 }}>
            A project by Rezi — founder of Astroman.ge
          </span>
        </div>
      </div>
    </footer>
  );
}
