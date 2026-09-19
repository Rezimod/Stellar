'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/set/001', label: 'Set 001' },
  { href: '/capsules', label: 'Capsules' },
  { href: '/collection', label: 'Collection' },
] as const;

/** The three Sidera destinations. Client-side only to mark the current page.
 *  Tonight arrives with the voting in Phase 8; until then the bar links only
 *  to pages that exist. */
export default function SideraNavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sidera" className="sd-bar__links">
      {LINKS.map((l) => {
        const current = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link key={l.href} href={l.href} className="sd-navlink" aria-current={current ? 'page' : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
