import type { ReactNode } from 'react';
import Link from 'next/link';
import Wordmark from './ui/Wordmark';
import StellarNavLinks from './StellarNavLinks';
import StellarAccountGate from './StellarAccountGate';
import StellarAuth from './StellarAuth';
import { getNode } from '@/lib/observatory/nodes';
import { LEGACY_HOST } from '@/lib/stellar/legacy';

const FOOT = [
  {
    title: 'Cards',
    links: [
      { href: '/set/001', label: 'First Light' },
      { href: '/collection', label: 'Collection' },
      { href: '/capsules/log', label: 'Public log' },
    ],
  },
  {
    title: 'Live Telescope V1',
    links: [
      { href: '/tonight', label: 'Tonight' },
      { href: '/node', label: 'Live Telescope V1' },
      { href: '/voyage', label: 'Voyage' },
    ],
  },
  {
    title: 'Stellar',
    links: [
      { href: `${LEGACY_HOST}/sky`, label: 'Sky tonight' },
      { href: `${LEGACY_HOST}/marketplace`, label: 'Shop' },
      { href: `${LEGACY_HOST}/learn`, label: 'Learn' },
      { href: `${LEGACY_HOST}/missions`, label: 'Missions' },
    ],
  },
  {
    title: 'Contact',
    links: [
      { href: '/contact', label: 'Contact' },
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
    ],
  },
];

const node = getNode('tbilisi-01')!;

/**
 * The frame every Stellar page wraps itself in:
 *
 *   export default function Page() {
 *     return <StellarShell>…</StellarShell>;
 *   }
 *
 * It puts `.stellar` on its root, which scopes the Stellar tokens and fonts
 * (src/styles/stellar-theme.css) and hides the legacy Stellar nav, footer,
 * bottom tabs and starfield while the page is on screen. Legacy pages are
 * untouched. Content goes inside `.sd-container` for the 16px gutter and the
 * 1040px measure, unless a section is meant to run full-bleed. A page with no
 * visible heading passes `title`, read out as its h1. A page that draws its
 * own header and runs edge to edge, like the observatory console, passes `bare`.
 */
export default function StellarShell({
  children,
  title,
  bare = false,
}: {
  children: ReactNode;
  title?: string;
  bare?: boolean;
}) {
  if (bare)
    return (
      <StellarAuth>
        <div className="stellar">
          <div className="sd-backdrop" aria-hidden="true" />
          {children}
        </div>
      </StellarAuth>
    );
  return (
    <StellarAuth>
      <div className="stellar">
        <div className="sd-backdrop" aria-hidden="true" />
        <header className="sd-bar">
          <div className="sd-container sd-bar__inner">
            <div className="sd-bar__mark">
              <Wordmark href="/" />
            </div>
            <StellarNavLinks />
            <div className="sd-bar__account">
              <StellarAccountGate />
            </div>
          </div>
        </header>

        {title && <h1 className="sr-only">{title}</h1>}
        {children}

        <footer className="sd-foot">
          <div className="sd-container">
            <div className="sd-foot__top">
              <div className="sd-foot__brand">
                <Wordmark href="/" />
                <p>Real objects. Numbered editions.</p>
              </div>
              <nav aria-label="Footer" className="sd-foot__cols">
                {FOOT.map((col) => (
                  <div key={col.title}>
                    <p className="sd-foot__head">{col.title}</p>
                    <ul>
                      {col.links.map((l) => (
                        <li key={l.label}>
                          {l.href.startsWith('/') ? <Link href={l.href}>{l.label}</Link> : <a href={l.href}>{l.label}</a>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>
            <div className="sd-foot__base sd-data">
              <span>
                Live Telescope V1 · The night sky · {node.status}
              </span>
              <span>© {new Date().getFullYear()} Stellar</span>
            </div>
          </div>
        </footer>
      </div>
    </StellarAuth>
  );
}
