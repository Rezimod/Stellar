import type { ReactNode } from 'react';
import Link from 'next/link';
import Wordmark from './ui/Wordmark';
import StellarNavLinks from './StellarNavLinks';
import StellarAccountGate from './StellarAccountGate';
import StellarAuth from './StellarAuth';
import { getNode } from '@/lib/observatory/nodes';
import { LEGACY_HOST } from '@/lib/stellar/legacy';
import { siteDarkWindow, siteNightDate } from '@/lib/stellar/target';
import SiteClock from './SiteClock';

const FOOT = [
  {
    title: 'Cards',
    links: [
      { href: '/set/001', label: 'First Light' },
      { href: '/collection', label: 'Collection' },
      { href: '/capsules/log', label: 'Public log' },
      { href: '/tonight', label: 'Tonight' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { href: '/node', label: 'Live Telescope V1' },
      { href: '/voyage', label: 'Voyage' },
      { href: `${LEGACY_HOST}/sky`, label: 'Sky tonight' },
      { href: `${LEGACY_HOST}/learn`, label: 'Learn' },
    ],
  },
  {
    title: 'Stellar',
    links: [
      { href: `${LEGACY_HOST}/marketplace`, label: 'Shop' },
      { href: '/contact', label: 'Contact' },
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
    ],
  },
];

const node = getNode('tbilisi-01')!;
const coords = `${node.lat.toFixed(2)}° N · ${node.lon.toFixed(2)}° E`;
const hhmm = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('en-GB', { timeZone: node.timezone, hour: '2-digit', minute: '2-digit' }).format(d) : '—';

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

        <SiteFooter />
      </div>
    </StellarAuth>
  );
}

/** Mission control: the telescope's panel beside the links, the wordmark as the floor. */
function SiteFooter() {
  const dark = siteDarkWindow(node, siteNightDate(node.timezone, new Date()));
  return (
    <footer className="sd-foot">
      <div className="sd-container">
        <div className="sd-foot__top">
          <div className="sd-foot__brand">
            <Wordmark href="/" />
            <div className="sd-foot__panel">
              <p className="sd-foot__ptitle">
                Live Telescope V1 <span className="sd-foot__state">{node.status}</span>
              </p>
              <dl>
                <div>
                  <dt>Site time</dt>
                  <dd>
                    <SiteClock timezone={node.timezone} /> · {node.site.split(',')[0]}
                  </dd>
                </div>
                <div>
                  <dt>Night</dt>
                  <dd>
                    {hhmm(dark.duskStart)} → {hhmm(dark.dawnEnd)}
                  </dd>
                </div>
                <div>
                  <dt>Tonight</dt>
                  <dd>
                    <Link href="/tonight">The card →</Link>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <nav aria-label="Footer" className="sd-foot__cols">
            {FOOT.map((col) => (
              <div key={col.title}>
                <p className="sd-foot__head">{col.title}</p>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.label}>{l.href.startsWith('/') ? <Link href={l.href}>{l.label}</Link> : <a href={l.href}>{l.label}</a>}</li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="sd-foot__mark" aria-hidden="true">
          STELLAR
        </p>
        <div className="sd-foot__base sd-data">
          <span>{coords}</span>
          <span>
            © {new Date().getFullYear()} Stellar · {node.site.split(',')[0]}
          </span>
        </div>
      </div>
    </footer>
  );
}
