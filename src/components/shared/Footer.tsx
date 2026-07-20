'use client';

import Link from 'next/link';
import {
  ExternalLink, Sparkles, CircleDot, BookOpen, ShoppingBag,
  User, ShieldCheck, Lock, Mail,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import AstroLogo from './AstroLogo';

type IconCmp = React.ComponentType<{ size?: number }>;

function XIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type FooterLink = { labelKey: string; label?: string; href: string; external?: boolean; Icon: IconCmp };
type FooterColumn = { titleKey: string; links: FooterLink[] };

const columns: FooterColumn[] = [
  {
    titleKey: 'colProduct',
    links: [
      { labelKey: 'sky',      href: '/sky',         Icon: Sparkles },
      { labelKey: 'missions', href: '/missions',    Icon: CircleDot },
      { labelKey: 'learning', href: '/learn',       Icon: BookOpen },
      { labelKey: 'shop',     href: '/marketplace', Icon: ShoppingBag },
    ],
  },
  {
    titleKey: 'colCompany',
    links: [
      { labelKey: 'astroman', label: 'Astroman', href: 'https://astroman.ge', external: true, Icon: User },
      { labelKey: 'twitter',  label: 'X',        href: 'https://x.com/StellarClub26', external: true, Icon: XIcon },
    ],
  },
  {
    titleKey: 'colLegal',
    links: [
      { labelKey: 'faq',           label: 'FAQ',           href: '/faq',           Icon: BookOpen },
      { labelKey: 'terms',         href: '/terms',         Icon: ShieldCheck },
      { labelKey: 'privacy',       href: '/privacy',       Icon: Lock },
      { labelKey: 'cookies',       label: 'Cookie Policy', href: '/cookie-policy', Icon: ShieldCheck },
      { labelKey: 'accessibility', label: 'Accessibility', href: '/accessibility', Icon: ShieldCheck },
      { labelKey: 'returns',       label: 'Returns',       href: '/returns',       Icon: ShoppingBag },
      { labelKey: 'contact',       href: '/contact',       Icon: Mail },
    ],
  },
];

const linkBase: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  transition: 'color 150ms ease-out',
};

function FooterLinkItem({ link, label }: { link: FooterLink; label: string }) {
  const { Icon } = link;
  return (
    <li>
      <Link
        href={link.href}
        target={link.external ? '_blank' : undefined}
        rel={link.external ? 'noopener noreferrer' : undefined}
        style={linkBase}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
      >
        <span className="stellar-footer-link-ic" aria-hidden="true"><Icon size={15} /></span>
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
      className="stellar-footer relative z-10 mt-auto"
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
                color: 'var(--text-secondary)',
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
              <div
                key={col.titleKey}
                className={`stellar-footer-col${col.titleKey === 'colLegal' ? ' stellar-footer-col--legal' : ''}`}
              >
                <p
                  className="stellar-footer-col-title"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
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
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {t('rights', { year })}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {t('builtIn')}
          </span>
        </div>
      </div>

      <style>{`
        .stellar-footer { background: rgba(10,22,40,0.92); border-top: 1px solid rgba(255,255,255,0.06); }
        [data-theme="light"] .stellar-footer { background: #E7EBF4; border-top: 1px solid rgba(15,23,42,0.08); }

        /* Leading link icons are a mobile-only treatment. */
        .stellar-footer-link-ic { display: none; }

        @media (max-width: 640px) {
          .stellar-footer-inner {
            padding-top: 36px !important;
            /* clear the fixed BottomNav (70px + safe area) so legal links stay reachable */
            padding-bottom: calc(90px + env(safe-area-inset-bottom)) !important;
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
            grid-template-columns: 1fr 1fr !important;
            gap: 26px 28px !important;
            align-items: start;
            text-align: left;
          }
          .stellar-footer-col {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            min-width: 0;
          }
          /* Legal runs full width on its own row, below Product + Company. */
          .stellar-footer-col--legal { grid-column: 1 / -1; }
          /* Gold section headers with a trailing rule line. */
          .stellar-footer-col-title {
            display: flex !important;
            align-items: center;
            gap: 12px;
            width: 100%;
            color: var(--accent-text, #F5A623) !important;
          }
          .stellar-footer-col-title::after {
            content: '';
            flex: 1;
            height: 1px;
            background: var(--border);
          }
          .stellar-footer-links {
            align-items: flex-start;
            width: 100%;
          }
          .stellar-footer-links li { width: 100%; }
          .stellar-footer-link-ic {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            margin-right: 8px;
            flex-shrink: 0;
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
