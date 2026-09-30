import type { ReactNode } from 'react';
import Link from 'next/link';
import Wordmark from './ui/Wordmark';
import StellarNavLinks from './StellarNavLinks';
import StellarAccountGate from './StellarAccountGate';
import StellarAuth from './StellarAuth';

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
          <div className="sd-container sd-foot__inner sd-data">
            <span>Node 01 · commissioning</span>
            <nav aria-label="Legal" className="sd-foot__links">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/contact">Contact</Link>
            </nav>
          </div>
        </footer>
      </div>
    </StellarAuth>
  );
}
