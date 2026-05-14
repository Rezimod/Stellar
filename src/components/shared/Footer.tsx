'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import AstroLogo from './AstroLogo';

type FooterLink = { labelKey: string; label?: string; href: string; external?: boolean };
type FooterColumn = { titleKey: string; links: FooterLink[] };

const columns: FooterColumn[] = [
  {
    titleKey: 'colProduct',
    links: [
      { labelKey: 'sky',      href: '/sky' },
      { labelKey: 'missions', href: '/missions' },
      { labelKey: 'learning', href: '/learn' },
      { labelKey: 'shop',     href: '/marketplace' },
    ],
  },
  {
    titleKey: 'colCompany',
    links: [
      { labelKey: 'astroman', label: 'Astroman', href: 'https://astroman.ge', external: true },
      { labelKey: 'github',   label: 'GitHub',   href: 'https://github.com/Morningbriefrezi/Stellar', external: true },
      { labelKey: 'twitter',  label: 'X',        href: 'https://x.com/StellarClub26', external: true },
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

function FooterLinkItem({ link, label }: { link: FooterLink; label: string }) {
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
        {label}
        {link.external && <ExternalLink size={11} style={{ opacity: 0.5 }} />}
      </Link>
    </li>
  );
}

export default function Footer() {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer
      data-stellar-chrome="footer"
      className="relative z-10 mt-auto"
      style={{
        background: 'rgba(10,22,40,0.92)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="stellar-footer-inner max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{
          paddingTop: 48,
          paddingBottom: 24,
        }}
      >
        {/* Top: brand + columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 2fr)',
            gap: 48,
            alignItems: 'start',
          }}
          className="stellar-footer-top"
        >
          <div className="stellar-footer-brand">
            <AstroLogo size={28} variant="white" showWordmark />
            <p
              className="stellar-footer-tagline"
              style={{
                marginTop: 14,
                color: 'rgba(255,255,255,0.5)',
                fontSize: 13,
                lineHeight: 1.55,
                maxWidth: 280,
                fontFamily: 'var(--font-display)',
              }}
            >
              {t('tagline')}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
              gap: 32,
            }}
            className="stellar-footer-cols"
          >
            {columns.map(col => (
              <div key={col.titleKey} className="stellar-footer-col">
                <p
                  className="stellar-footer-col-title"
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
                  {t(col.titleKey)}{/* */}
                </p>
                <ul
                  className="stellar-footer-links"
                  style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  {col.links.map(link => (
                    <FooterLinkItem
                      key={link.href}
                      link={link}
                      label={link.label ?? t(link.labelKey)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="stellar-footer-bottom"
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
            {t('rights', { year })}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
            {t('builtIn')}
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .stellar-footer-inner {
            padding-top: 36px !important;
            padding-bottom: 20px !important;
          }
          .stellar-footer-top {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .stellar-footer-brand {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
          }
          .stellar-footer-tagline {
            margin-left: 0;
            margin-right: 0;
          }
          .stellar-footer-cols {
            grid-template-columns: repeat(2, minmax(0, max-content)) !important;
            gap: 24px 40px !important;
            align-items: start;
            text-align: left;
            justify-content: start;
          }
          .stellar-footer-col {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }
          .stellar-footer-links {
            align-items: flex-start;
          }
          .stellar-footer-bottom {
            margin-top: 28px !important;
            padding-top: 16px !important;
            flex-direction: column;
            justify-content: center !important;
            text-align: center;
            gap: 8px !important;
          }
        }
      `}</style>
    </footer>
  );
}
