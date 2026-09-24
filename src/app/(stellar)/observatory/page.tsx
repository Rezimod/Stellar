import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CloudSun, MapPin, Moon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import PageContainer from '@/components/layout/PageContainer';
import CornerClock from '@/components/observatory/CornerClock';
import FieldPlate from '@/components/observatory/FieldPlate';
import NodeCard from '@/components/observatory/NodeCard';
import { getNodesWithReadiness } from '@/lib/observatory/nodes';
import { OPERATOR_TIERS } from '@/lib/observatory/operator-tiers';

export const metadata: Metadata = {
  title: 'Observatory — Stellar',
  description:
    'Book time on a real telescope. Watch a real object, live, through an instrument somewhere the sky is clear.',
};

// Readiness depends on the Sun and the weather, so the page cannot be static —
// but it changes on the scale of minutes, not requests.
export const revalidate = 300;

const WAYS = [
  { key: 'way1', href: '/observatory/simulator' },
  { key: 'way2', href: null },
  { key: 'way3', href: '/observatory/requests' },
] as const;

function siteTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export default async function ObservatoryPage() {
  const t = await getTranslations('observatory.network');
  const tState = await getTranslations('observatory.state');
  const tReady = await getTranslations('observatory.readiness');
  const now = new Date();
  const nodes = await getNodesWithReadiness(now);
  const observable = nodes.filter((n) => n.readiness.state === 'online').length;
  const first = nodes[0] ?? null;
  const share = {
    from: Math.round(OPERATOR_TIERS[0].operatorShare * 100),
    to: Math.round(OPERATOR_TIERS[OPERATOR_TIERS.length - 1].operatorShare * 100),
  };
  const cloud = first?.readiness.cloudCover ?? null;
  const skyTone = cloud === null ? '' : cloud > 70 ? ' obs-status__icon--bad' : cloud > 30 ? ' obs-status__icon--warn' : '';

  return (
    <>
      <section className="obs-scene">
        {first && (
          <CornerClock timezone={first.timezone} zoneLabel={t('boardSiteTime', { site: first.site })} />
        )}

        <div className="obs-scene__body">
          <div className="obs-float obs-float--main">
            {first ? (
              <>
                <div className="obs-float__head">
                  <span className="obs-float__node">
                    <MapPin size={18} strokeWidth={1.75} aria-hidden="true" />
                    {first.name}
                  </span>
                  <span className={`obs-pill obs-pill--${first.readiness.state}`}>
                    <span className="obs-led" aria-hidden="true" />
                    {tState(first.readiness.state)}
                  </span>
                </div>
                <p className="obs-float__meta">
                  <span>{first.site}</span>
                  <span>{first.instrument.optics}</span>
                  <span>{first.instrument.camera}</span>
                </p>
              </>
            ) : (
              <p className="obs-float__meta">{t('empty')}</p>
            )}

            <h1 className="obs-float__title">{t('title')}</h1>
            <p className="obs-float__subtitle">
              {t('instrumentCount', { count: nodes.length })} · {t('observableNow', { count: observable })}
            </p>
            <p className="obs-float__text">{t('lead')}</p>

            {first && (
              <>
                <div className="obs-float__rule" />
                <div className="obs-status">
                  <div className="obs-status__item">
                    <span className={`obs-status__icon${skyTone}`}>
                      <CloudSun size={24} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="obs-status__fact">
                        {cloud === null ? '—' : `${Math.round(cloud)}% ${t('boardCloud').toLowerCase()}`}
                      </span>
                      <span className="obs-status__about">{first.site}</span>
                    </span>
                  </div>
                  <div className="obs-status__item">
                    <span className="obs-status__icon">
                      <Moon size={24} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="obs-status__fact">
                        {first.readiness.nextWindowAt
                          ? siteTime(first.readiness.nextWindowAt, first.timezone)
                          : first.readiness.state === 'online'
                            ? t('boardDarkNow')
                            : '—'}
                      </span>
                      <span className="obs-status__about">{t('boardDark')}</span>
                    </span>
                  </div>
                </div>
                {first.readiness.detail && (
                  <p className="obs-float__text" style={{ marginTop: '1rem' }}>
                    {tReady(first.readiness.detail.key, first.readiness.detail.values)}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/observatory/${first.id}`} className="obs-ghost obs-ghost--primary">
                    {t('heroBook')}
                  </Link>
                  <Link href="/observatory/simulator" className="obs-ghost">
                    {t('tryCta')}
                  </Link>
                </div>
              </>
            )}
          </div>

          {first && (
            <div className="obs-scene__object">
              <FieldPlate instrument={first.instrument} at={now} />
              <span className="obs-hero__credit" style={{ position: 'static', display: 'block', textAlign: 'center', marginTop: '0.5rem' }}>
                {t('plateCredit')}
              </span>
            </div>
          )}
        </div>

        <nav className="obs-dock obs-dock--wrap" aria-label={t('waysTitle')}>
          {WAYS.map((way, i) => {
            const href = way.href ?? (first ? `/observatory/${first.id}` : '/observatory');
            return (
              <Link key={way.key} href={href} className="obs-dock__seg obs-dock__way">
                <span className="obs-dock__way-n font-display">{String(i + 1).padStart(2, '0')}</span>
                <span className="obs-dock__way-title">{t(`${way.key}Title`)}</span>
                <span className="obs-dock__way-line">{t(`${way.key}Cta`)} →</span>
              </Link>
            );
          })}
          <div className="obs-dock__seg obs-dock__seg--end">
            <span className="obs-dock__label">{t('ownerEyebrow')}</span>
            <Link href="/observatory/operator" className="obs-ghost">
              {t('ownerCta')}
            </Link>
          </div>
        </nav>
      </section>

      <PageContainer variant="fullscreen" className="obs-below">
        <section className="obs-float obs-float--section">
          <div className="obs-section__head">
            <h2 className="obs-h2">{t('instrumentsTitle')}</h2>
            <span className="obs-label">{t('instrumentCount', { count: nodes.length })}</span>
          </div>
          <div className="mt-2 flex flex-col gap-6">
            {nodes.map((node, i) => (
              <NodeCard key={node.id} node={node} index={i} />
            ))}
          </div>
        </section>

        <section className="obs-float obs-float--section">
          <div className="obs-section__head">
            <h2 className="obs-h2">{t('waysTitle')}</h2>
            <span className="obs-label">{t('waysNote')}</span>
          </div>
          <ol className="obs-ways mt-2">
            {WAYS.map((way, i) => {
              const href = way.href ?? (first ? `/observatory/${first.id}` : '/observatory');
              return (
                <li key={way.key} className="obs-way">
                  <span className="obs-way__n font-display" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="obs-way__body">
                    <h3 className="obs-way__title">{t(`${way.key}Title`)}</h3>
                    <p className="obs-way__text">{t(`${way.key}Body`)}</p>
                  </div>
                  <Link href={href} className="obs-way__link">
                    {t(`${way.key}Cta`)}
                    <span aria-hidden="true"> →</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="obs-band obs-band--float">
          <Image src="/hero/hero-deepfield.jpg" alt="" fill sizes="100vw" className="obs-band__img" />
          <div className="obs-band__body px-6 sm:px-8">
            <div className="obs-band__copy">
              <p className="obs-eyebrow">{t('ownerEyebrow')}</p>
              <h2 className="obs-h2 obs-h2--band mt-3">{t('ownerTitle')}</h2>
              <p className="obs-band__text">{t('ownerLead')}</p>
              <Link href="/observatory/operator" className="obs-ghost obs-ghost--primary mt-6">
                {t('ownerCta')}
              </Link>
            </div>
            <dl className="obs-band__figures">
              <div>
                <dt className="obs-label">{t('ownerFrom')}</dt>
                <dd className="obs-band__figure">{share.from}%</dd>
              </div>
              <div>
                <dt className="obs-label">{t('ownerTo')}</dt>
                <dd className="obs-band__figure">{share.to}%</dd>
              </div>
            </dl>
          </div>
          <span className="obs-hero__credit">{t('heroCredit')}</span>
        </section>

        <nav className="obs-more" aria-label={t('moreTitle')}>
          <span className="obs-label">{t('moreTitle')}</span>
          <Link href="/observatory/how-it-works">{t('proofLink')}</Link>
          <Link href="/observatory/captures">{t('capturesLink')}</Link>
          <Link href="/first-light">{t('firstLightLink')}</Link>
        </nav>
      </PageContainer>
    </>
  );
}
