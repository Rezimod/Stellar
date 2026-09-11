'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

const TABS = [
  { key: 'network', href: '/observatory', exact: true },
  { key: 'simulator', href: '/observatory/simulator' },
  { key: 'telescope', href: '/observatory/telescope' },
  { key: 'captures', href: '/observatory/captures' },
  { key: 'requests', href: '/observatory/requests' },
  { key: 'operator', href: '/observatory/operator' },
  { key: 'proof', href: '/observatory/how-it-works' },
] as const;

/** The observatory's own tabs, under the app header. An instrument or a session page counts as the network. */
export default function ObservatoryNav() {
  const t = useTranslations('observatory.nav');
  const pathname = usePathname();

  return (
    <nav className="obs-nav" aria-label={t('aria')}>
      {TABS.map((tab) => {
        const active =
          'exact' in tab
            ? pathname === tab.href ||
              (!TABS.some((o) => !('exact' in o) && pathname.startsWith(o.href)) &&
                pathname.startsWith('/observatory'))
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className="obs-nav__tab"
            aria-current={active ? 'page' : undefined}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
