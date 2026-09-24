import type { ReactNode } from 'react';
import Link from 'next/link';
import Wordmark from './ui/Wordmark';
import SideraNavLinks from './SideraNavLinks';
import SideraAccount from './SideraAccount';

/**
 * The frame every Sidera page wraps itself in:
 *
 *   export default function Page() {
 *     return <SideraShell>…</SideraShell>;
 *   }
 *
 * It puts `.sidera` on its root, which scopes the Sidera tokens and fonts
 * (src/styles/sidera-tokens.css) and hides the legacy Stellar nav, footer,
 * bottom tabs and starfield while the page is on screen. Legacy pages are
 * untouched. Content goes inside `.sd-container` for the 16px gutter and the
 * 1040px measure, unless a section is meant to run full-bleed. A page with no
 * visible heading passes `title`, read out as its h1. A page that draws its
 * own header and runs edge to edge, like the observatory console, passes `bare`.
 */
export default function SideraShell({ children, title, bare = false }: { children: ReactNode; title?: string; bare?: boolean }) {
  if (bare)
    return (
      <div className="sidera">
        <div className="sd-backdrop" aria-hidden="true" />
        {children}
      </div>
    );
  return (
    <div className="sidera">
      <div className="sd-backdrop" aria-hidden="true" />
      <header className="sd-bar">
        <div className="sd-container sd-bar__inner">
          <div className="sd-bar__mark">
            <Wordmark href="/" />
          </div>
          <SideraNavLinks />
          <div className="sd-bar__account">
            <SideraAccount />
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
  );
}
