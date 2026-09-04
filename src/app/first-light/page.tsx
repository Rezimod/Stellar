'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import BackButton from '@/components/shared/BackButton';
import PageContainer from '@/components/layout/PageContainer';
import { useStellarUser } from '@/hooks/useStellarUser';
import {
  BIRTH_PLACES,
  COMMISSION_TETRI,
  FIRST_LIGHT_TIERS,
  bestMomentOn,
  compassPoint,
  priceTetriFor,
  skyAt,
  type FirstLightTier,
} from '@/lib/observatory/first-light';
import { SIM_TARGETS } from '@/lib/observatory/sim-targets';
import '../observatory/observatory.css';

const TIERS = Object.keys(FIRST_LIGHT_TIERS) as FirstLightTier[];

/** The tier's name and note live in messages; only its price lives in the lib. */
const TIER_KEY = {
  digital: ['tierDigital', 'tierDigitalNote'],
  print: ['tierPrint', 'tierPrintNote'],
  framed: ['tierFramed', 'tierFramedNote'],
} as const;

export default function FirstLightPage() {
  const t = useTranslations('observatory.firstLight');
  const tNetwork = useTranslations('observatory.network');
  const { getAccessToken, login } = usePrivy();
  const { authenticated } = useStellarUser();

  const [recipient, setRecipient] = useState('');
  const [occasion, setOccasion] = useState('');
  const [date, setDate] = useState('2019-03-14');
  const [time, setTime] = useState('21:00');
  const [placeId, setPlaceId] = useState<string>(BIRTH_PLACES[0].id);
  const [targetId, setTargetId] = useState('saturn');
  const [tier, setTier] = useState<FirstLightTier>('framed');
  const [commissioned, setCommissioned] = useState(true);
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  const place = BIRTH_PLACES.find((p) => p.id === placeId)!;
  const moment = useMemo(() => new Date(`${date}T${time}:00Z`), [date, time]);
  const valid = !Number.isNaN(moment.getTime());

  // The half that is exact and needs no telescope. Computed as you type.
  const sky = useMemo(
    () => (valid ? skyAt({ place, at: moment, targetId }) : null),
    [valid, place, moment, targetId],
  );

  // A birthday is a date, not an hour. When the chosen object was below the
  // horizon at the hour given, offer the hour it was highest instead of leaving
  // the sheet reading "below the horizon".
  const better = useMemo(() => {
    if (!sky || sky.target?.up !== false) return null;
    return bestMomentOn({ place, date: moment, targetId });
  }, [sky, place, moment, targetId]);

  const price = priceTetriFor(tier, commissioned);

  const posterUrl = valid
    ? `/api/first-light/poster?target=${targetId}&place=${placeId}&at=${encodeURIComponent(
        moment.toISOString(),
      )}&for=${encodeURIComponent(recipient)}&occasion=${encodeURIComponent(occasion)}`
    : null;

  const order = async () => {
    setState('sending');
    setError('');
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/first-light', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipient,
          occasion,
          placeId,
          targetId,
          tier,
          commissioned,
          moment: moment.toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t('failed'));
        setState('idle');
        return;
      }
      setState('done');
    } catch {
      setError(t('network'));
      setState('idle');
    }
  };

  return (
    <PageContainer variant="wide" className="obs py-6 sm:py-10">
      <BackButton />

      <header className="mt-4 max-w-2xl">
        <h1 className="text-2xl font-medium sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
          {t('title')}
        </h1>
        <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
          {t('lead')}
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,20rem)]">
        <div className="flex flex-col gap-4">
          <section
            className="border p-5"
            style={{ borderColor: 'var(--obs-rule)', background: 'var(--surface)' }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('for')}>
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Nino"
                  maxLength={40}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </Field>
              <Field label={t('occasion')}>
                <input
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="seven years old"
                  maxLength={60}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </Field>
              <Field label={t('night')}>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </Field>
              <Field label={t('hour')}>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </Field>
              <Field label={t('place')}>
                <select
                  value={placeId}
                  onChange={(e) => setPlaceId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={inputStyle}
                >
                  {BIRTH_PLACES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('object')}>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={inputStyle}
                >
                  {SIM_TARGETS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {sky && (
            <section
              className="border p-5"
              style={{ borderColor: 'var(--obs-rule)', background: 'var(--surface)' }}
            >
              <h2 className="obs-label">{t('skyTitle')}</h2>
              <dl className="mt-3 flex flex-col">
                <Reading
                  label={t('moon')}
                  value={t('moonValue', {
                    phase: sky.moon.phase,
                    pct: (sky.moon.illumination * 100).toFixed(0),
                  })}
                />
                <Reading
                  label={sky.target?.name ?? 'Object'}
                  value={
                    sky.target
                      ? sky.target.up
                        ? t('aboveHorizon', {
                            deg: sky.target.altitude.toFixed(0),
                            compass: compassPoint(sky.target.azimuth),
                          })
                        : t('belowHorizon')
                      : t('notComputed')
                  }
                />
                <Reading
                  label={t('alsoUp')}
                  value={
                    sky.bodies.filter((b) => b.up).map((b) => b.name).join(' · ') ||
                    t('noPlanets')
                  }
                />
              </dl>
              {better && (
                <button
                  type="button"
                  onClick={() => setTime(better.at.toISOString().slice(11, 16))}
                  className="mt-3 rounded-md border px-3 py-2 text-left text-sm"
                  style={{
                    borderColor: 'var(--accent-border)',
                    background: 'var(--accent-dim)',
                    color: 'var(--accent-text)',
                  }}
                >
                  {t('better', {
                    name: sky.target?.name ?? '',
                    time: better.at.toISOString().slice(11, 16),
                    deg: better.altitude.toFixed(0),
                  })}
                </button>
              )}

              <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('computed')}
              </p>
            </section>
          )}

          <section
            className="border p-5"
            style={{ borderColor: 'var(--obs-rule)', background: 'var(--surface)' }}
          >
            <h2 className="obs-label">{t('photoTitle')}</h2>
            <label className="mt-3 flex items-start gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={commissioned}
                onChange={(e) => setCommissioned(e.target.checked)}
                className="mt-1"
              />
              <span>
                {t('commission')}
                <span className="block" style={{ color: 'var(--text-muted)' }}>
                  {t('commissionNote', { price: (COMMISSION_TETRI / 100).toFixed(0) })}
                </span>
              </span>
            </label>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('archiveNote')}
            </p>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section
            className="border p-4"
            style={{ borderColor: 'var(--obs-rule)', background: 'var(--surface)' }}
          >
            <h2 className="obs-label">{t('whatYouGet')}</h2>
            <div className="mt-3 flex flex-col gap-2">
              {TIERS.map((tierId) => (
                <label key={tierId} className="flex items-baseline gap-3 text-sm">
                  <input
                    type="radio"
                    name="tier"
                    checked={tier === tierId}
                    onChange={() => setTier(tierId)}
                  />
                  <span className="flex flex-1 flex-col">
                    <span style={{ color: 'var(--text-primary)' }}>
                      {t(TIER_KEY[tierId][0])} ·{' '}
                      <span className="font-mono">
                        {(FIRST_LIGHT_TIERS[tierId].priceTetri / 100).toFixed(0)}
                      </span>{' '}
                      ₾
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t(TIER_KEY[tierId][1])}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <p className="mt-4 text-lg" style={{ color: 'var(--text-primary)' }}>
              <span className="font-mono">{(price / 100).toFixed(0)}</span> ₾
            </p>

            {error && (
              <p className="mt-2 text-sm" style={{ color: 'var(--no)' }} role="alert">
                {error}
              </p>
            )}

            {state === 'done' ? (
              <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('done')}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => (authenticated ? void order() : login())}
                disabled={state === 'sending' || !recipient || !valid}
                className="mt-3 w-full rounded-md border px-4 py-2 text-sm disabled:opacity-60"
                style={{
                  borderColor: 'var(--accent-border)',
                  background: 'var(--accent-dim)',
                  color: 'var(--accent-text)',
                }}
              >
                {state === 'sending' ? t('ordering') : authenticated ? t('order') : t('signIn')}
              </button>
            )}

            <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              {t('dryRun')}
            </p>
          </section>

          {posterUrl && (
            <section
              className="border p-4"
              style={{ borderColor: 'var(--obs-rule)', background: 'var(--surface)' }}
            >
              <h2 className="obs-label">{t('sheet')}</h2>
              {/* The poster is generated server-side, so this is the real thing
                  rather than a mock of it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterUrl}
                alt="First Light poster"
                className="mt-3 w-full border"
                style={{ borderColor: 'var(--obs-rule)' }}
              />
            </section>
          )}
        </aside>
      </div>

      <p className="mt-8 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
        {t('footer')}{' '}
        <Link href="/observatory/how-it-works" className="underline">
          {tNetwork('proofLink')}
        </Link>
        .
      </p>
    </PageContainer>
  );
}

const inputStyle = {
  borderColor: 'var(--border)',
  background: 'var(--canvas)',
  color: 'var(--text-primary)',
} as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="obs-label">{label}</span>
      {children}
    </label>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-wrap items-baseline justify-between gap-x-4 border-t py-2"
      style={{ borderColor: 'var(--obs-rule)' }}
    >
      <dt className="obs-label">{label}</dt>
      <dd className="m-0 text-sm" style={{ color: 'var(--text-primary)' }}>
        {value}
      </dd>
    </div>
  );
}
