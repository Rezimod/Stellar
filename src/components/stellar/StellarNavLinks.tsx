'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/set/001', label: 'First Light', match: ['/set', '/card', '/capsule'] },
  { href: '/node', label: 'Live telescope', match: ['/node'] },
  { href: '/tonight', label: 'Tonight', match: ['/tonight'] },
  { href: '/voyage', label: 'Voyage', match: ['/voyage'] },
];

/** The Stellar destinations. Client-side only to mark the current page. */
export default function StellarNavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Stellar" className="sd-bar__links">
      {LINKS.map((l) => {
        const current = l.match.some((p) => pathname.startsWith(p));
        return (
          <Link key={l.href} href={l.href} className="sd-navlink" aria-current={current ? 'page' : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
