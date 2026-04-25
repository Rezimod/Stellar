'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import AstroLogo from './AstroLogo';

type FooterLink = { label: string; href: string; external?: boolean };
type FooterColumn = { title: string; links: FooterLink[] };

const columns: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Sky',         href: '/sky' },
      { label: 'Missions',    href: '/missions' },
      { label: 'Markets',     href: '/markets' },
      { label: 'Shop',        href: '/marketplace' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Astroman',    href: 'https://astroman.ge', external: true },
      { label: 'GitHub',      href: 'https://github.com/Morningbriefrezi/Stellar', external: true },
      { label: 'X',           href: 'https://x.com/StellarClub26', external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms',       href: '/terms' },
      { label: 'Privacy',     href: '/privacy' },
      { label: 'Contact',     href: '/contact' },
    ],
  },
];

const linkBase: React.CSSProperties = {
  color: 'rgba(255,255,255,0.55)',
  fontSize: 13,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  transition: 'color 150ms ease-out',
};

function FooterLinkItem({ link }: { link: FooterLink }) {
  return (
    <li>
      <Link
        href={link.href}
        target={link.external ? '_blank' : undefined}
        rel={link.external ? 'noopener noreferrer' : undefined}
        style={linkBase}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.95)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; }}
      >
        {link.label}
        {link.external && <ExternalLink size={11} style={{ opacity: 0.5 }} />}
      </Link>
    </li>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative z-10 mt-auto"
      style={{
        background: 'rgba(10,22,40,0.92)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '48px 40px 24px',
        }}
      >
        {/* Top: brand + columns */}
        <div className="footer-top">
          <div className="footer-brand">
            <AstroLogo size={28} variant="white" showWordmark />
            <p
              style={{
                marginTop: 14,
                color: 'rgba(255,255,255,0.5)',
                fontSize: 13,
                lineHeight: 1.55,
                maxWidth: 280,
                fontFamily: 'var(--font-display)',
              }}
            >
              The night-sky companion for telescope owners. Forecast, plan, and observe with confidence.
            </p>
          </div>

          <div className="footer-cols">
            {columns.map(col => (
              <div key={col.title}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.4)',
                    marginBottom: 14,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {col.title}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map(link => (
                    <FooterLinkItem key={link.href} link={link} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            © {year} Stellar. All rights reserved.
          </span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
            Built in Tbilisi
          </span>
        </div>
      </div>

      <style jsx>{`
        .footer-top {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 2fr);
          gap: 48px;
          align-items: start;
        }
        .footer-cols {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 32px;
        }
        @media (max-width: 720px) {
          .footer-top {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .footer-cols {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 20px;
          }
        }
        @media (max-width: 480px) {
          .footer-cols {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 24px;
          }
        }
      `}</style>
    </footer>
  );
}
