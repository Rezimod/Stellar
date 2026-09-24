'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import { Hourglass, MapPin } from 'lucide-react';
import CornerClock from '@/components/observatory/CornerClock';
import { useStellarUser } from '@/hooks/useStellarUser';
import { classOf, priceTetriFor } from '@/lib/observatory/capture-requests';
import { NODES } from '@/lib/observatory/nodes';
import { SIM_TARGETS, targetPhoto } from '@/lib/observatory/sim-targets';
import type { CaptureRequest } from '@/lib/observatory/requests';

/** The node the queue runs on while there is one. */
const NODE = NODES[0];

const PATIENCE = [
  { days: 3, key: 'nights3' },
  { days: 7, key: 'week' },
  { days: 14, key: 'fortnight' },
] as const;

const CLASS_KEY = {
  bright: 'classBright',
  deep_short: 'classDeepShort',
  deep_long: 'classDeepLong',
} as const;

export default function RequestsPage() {
  const t = useTranslations('observatory.requests');
  const tNetwork = useTranslations('observatory.network');
  const { getAccessToken, login } = usePrivy();
  const { authenticated, ready } = useStellarUser();

  const [targetId, setTargetId] = useState(SIM_TARGETS[0].id);
  const [days, setDays] = useState(7);
  const [requests, setRequests] = useState<CaptureRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/observatory/requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setRequests(data.requests as CaptureRequest[]);
    } catch {
      // The queue below is a convenience; the form above still works.
    }
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  const place = async () => {
    setBusy(true);
    setError('');
    try {
      const token = await getAccessToken();
      const now = new Date();
      const res = await fetch('/api/observatory/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nodeId: NODE.id,
          targetId,
          windowStart: now.toISOString(),
          windowEnd: new Date(now.getTime() + days * 86_400_000).toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t('failed'));
        return;
      }
      await load();
    } catch {
      setError(t('network'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      const token = await getAccessToken();
      await fetch(`/api/observatory/requests/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch {
      setError(t('network'));
    }
  };

  const target = SIM_TARGETS.find((s) => s.id === targetId) ?? SIM_TARGETS[0];
  const photo = targetPhoto(target);
  const price = priceTetriFor(targetId);

  return (
    <>
      <section className="obs-scene">
        <CornerClock timezone={NODE.timezone} zoneLabel={tNetwork('boardSiteTime', { site: NODE.site })} />

        <div className="obs-scene__body">
          <div className="obs-float obs-float--main">
            <div className="obs-float__head">
              <span className="obs-float__node">
                <MapPin size={18} strokeWidth={1.75} aria-hidden="true" />
                {NODE.name}
              </span>
              <span className="obs-pill">
                <Hourglass size={12} strokeWidth={2} aria-hidden="true" />
                {t(CLASS_KEY[classOf(targetId) ?? 'bright'])}
              </span>
            </div>
            <p className="obs-float__meta">
              <span>{NODE.site}</span>
              <span>{NODE.instrument.optics}</span>
            </p>

            <h1 className="obs-float__title">{t('title')}</h1>
            <p className="obs-float__text">{t('lead')}</p>

            <div className="obs-float__rule" />

            <span className="obs-dock__label">{t('object')}</span>
            <div className="obs-picker mt-2" role="group" aria-label={t('object')}>
              {SIM_TARGETS.map((s) => {
                const p = targetPhoto(s);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="obs-picker__btn"
                    aria-pressed={s.id === targetId}
                    onClick={() => setTargetId(s.id)}
                  >
                    <span className="obs-picker__disc">
                      {p && <Image src={p.src} alt="" fill sizes="44px" />}
                    </span>
                    {s.name}
                  </button>
                );
              })}
            </div>

            <div className="obs-card">
              <div className="obs-card__head">
                <span className="obs-card__title">{target.name}</span>
                <span className="obs-card__aside">
                  <span className="font-mono">{((price ?? 0) / 100).toFixed(0)}</span> ₾
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{target.expect}</p>
            </div>

            <label className="obs-field-label mt-4">
              {t('wait')}
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="obs-select"
                style={{ width: '100%' }}
              >
                {PATIENCE.map((p) => (
                  <option key={p.days} value={p.days}>
                    {t(p.key)}
                  </option>
                ))}
              </select>
            </label>

            <p className="obs-float__text" style={{ fontSize: '13px' }}>
              {t('priceNote', {
                cls: t(CLASS_KEY[classOf(targetId) ?? 'bright']),
                price: ((price ?? 0) / 100).toFixed(0),
              })}
            </p>

            {error && (
              <p className="mt-3 text-sm" style={{ color: 'var(--no)' }} role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => (authenticated ? void place() : login())}
              disabled={busy}
              className="obs-capture mt-5"
            >
              {busy ? t('placing') : authenticated ? t('join') : t('signIn')}
            </button>
          </div>

          <div className="obs-scene__object obs-scene__object--photo">
            {photo && (
              <Image key={photo.src} src={photo.src} alt={photo.alt} fill sizes="(max-width: 900px) 80vw, 40rem" priority />
            )}
          </div>
        </div>

        <div className="obs-dock obs-dock--wrap">
          <div className="obs-dock__seg obs-dock__seg--grow">
            <span className="obs-dock__label">{t('yours')}</span>
            {requests.length === 0 ? (
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('footer')}{' '}
                <Link href="/observatory/how-it-works" className="underline">
                  {tNetwork('proofLink')}
                </Link>
                .
              </span>
            ) : (
              <ul className="flex flex-col gap-2">
                {requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                    <span className="flex min-w-0 flex-col">
                      <span style={{ color: 'var(--text-primary)' }}>{r.targetName}</span>
                      <span className="obs-label">{explain(r, t)}</span>
                    </span>
                    <span className="flex items-baseline gap-4">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {/* JetBrains Mono has no lari sign; the number is mono, the symbol is not. */}
                        <span className="font-mono">{(r.priceTetri / 100).toFixed(0)}</span> ₾
                      </span>
                      {r.state === 'queued' && (
                        <button
                          type="button"
                          onClick={() => void cancel(r.id)}
                          className="text-xs underline"
                          style={{ color: 'var(--text-muted)', minHeight: 0, padding: 0 }}
                        >
                          {t('withdraw')}
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function explain(
  r: CaptureRequest,
  t: (key: string, values?: Record<string, string>) => string,
): string {
  const date = new Date(r.windowEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  switch (r.state) {
    case 'queued':
      return t('waiting', { date });
    case 'scheduled':
      return r.scheduledAt
        ? t('scheduled', {
            date: new Date(r.scheduledAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            }),
          })
        : t('scheduledPlain');
    case 'delivered':
      return t('delivered');
    case 'expired':
      return t('expired');
    case 'cancelled':
      return t('cancelled');
  }
}
