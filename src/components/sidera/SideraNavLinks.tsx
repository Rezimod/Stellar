'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Capsules' },
  { href: '/set/001', label: 'Set 001' },
  { href: '/collection', label: 'Collection' },
  { href: '/tonight', label: 'Tonight' },
  { href: '/node', label: 'Node 01' },
] as const;

/** The Sidera destinations. Client-side only to mark the current page. */
export default function SideraNavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sidera" className="sd-bar__links">
      {LINKS.map((l) => {
        const current = l.href === '/' ? pathname === '/' || pathname.startsWith('/capsule') : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link key={l.href} href={l.href} className="sd-navlink" aria-current={current ? 'page' : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
