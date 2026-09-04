'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Routing } from '@/lib/observatory/routing';

/**
 * "Your sky is shut. This one is not."
 *
 * Renders nothing at all unless there is something true to say. A band that
 * appears on a clear night, or that offers an instrument sitting under the
 * same cloud as the reader, would teach people to ignore it — and the one
 * night it matters is the night it has to be believed.
 */
export default function SkyRoutingBand({ lat, lon }: { lat: number; lon: number }) {
  const t = useTranslations('observatory.routing');
  const [routing, setRouting] = useState<Routing | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/observatory/routing?lat=${lat}&lon=${lon}`);
        if (!res.ok) return;
        const data = (await res.json()) as Routing;
        if (!cancelled) setRouting(data);
      } catch {
        // The forecast above is the page's job; this band is an extra.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  if (!routing) return null;

  const best = routing.options[0];
  const here = routing.hereCloud;

  // Nothing better to offer. Rather than stay silent when the reader is
  // clouded out, say the true and useful thing: the network is short of
  // instruments, and that is what would fix it.
  if (!best) {
    const cloudedOut = here !== null && here >= 60;
    if (!cloudedOut || !routing.sameSky) return null;

    return (
      <Band>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('sameSky', { cloud: Math.round(here) })}
          {routing.registeredNotOnline > 0 && (
            <> {t('registered', { count: routing.registeredNotOnline })}</>
          )}
        </p>
        <Actions>
          <Action href="/observatory/operator">{t('putOnNetwork')}</Action>
        </Actions>
      </Band>
    );
  }

  const cloud = best.readiness.cloudCover;
  const comparable = here !== null && cloud !== null;

  return (
    <Band>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {comparable
          ? `${t('here', { cloud: Math.round(here) })} ${t('under', {
              name: best.name,
              site: best.site,
              cloud: Math.round(cloud),
            })}`
          : t('openNow', { name: best.name, site: best.site })}{' '}
        {best.nextSlot
          ? t('nextSlot', {
              // 24-hour, like every other clock in the app — a mono span
              // reading "06:23 PM" belongs to a different product.
              time: new Date(best.nextSlot.startsAt).toLocaleString(undefined, {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }),
              minutes: best.sessionMinutes,
              price: best.priceGel,
            })
          : t('full')}
      </p>
      <Actions>
        <Action href={`/observatory/${best.nodeId}`}>{t('book', { name: best.name })}</Action>
        <Action href="/observatory/requests" quiet>
          {t('askInstead')}
        </Action>
      </Actions>
    </Band>
  );
}

function Band({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="mt-4 flex flex-col gap-3 border p-4"
      style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-dim)' }}
    >
      {children}
    </section>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-5 gap-y-2">{children}</div>;
}

function Action({
  href,
  children,
  quiet,
}: {
  href: string;
  children: React.ReactNode;
  quiet?: boolean;
}) {
  return (
    <Link
      href={href}
      className="text-sm underline"
      style={{ color: quiet ? 'var(--text-secondary)' : 'var(--accent-text)' }}
    >
      {children}
    </Link>
  );
}
