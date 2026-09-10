import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import BackButton from '@/components/shared/BackButton';
import PageContainer from '@/components/layout/PageContainer';
import FieldPlate from '@/components/observatory/FieldPlate';
import NodeCard from '@/components/observatory/NodeCard';
import SiteClock from '@/components/observatory/SiteClock';
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

  return (
    <>
      <section className="obs-stage">
        <PageContainer variant="wide" className="obs-stage__grid">
          <div className="obs-stage__copy">
            <BackButton />
            <p className="obs-eyebrow mt-8">
              {t('instrumentCount', { count: nodes.length })} · {t('observableNow', { count: observable })}
            </p>
            <h1 className="obs-h1 mt-3">{t('title')}</h1>
            <p className="obs-lede">{t('lead')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {first && (
                <Link href={`/observatory/${first.id}`} className="obs-action obs-action--primary">
                  {t('heroBook')}
                </Link>
              )}
              <Link href="/observatory/simulator" className="obs-action">
                {t('tryCta')}
              </Link>
            </div>
          </div>

          {first && (
            <div className="obs-stage__plate">
              <FieldPlate instrument={first.instrument} at={now} />
            </div>
          )}
        </PageContainer>
        <span className="obs-hero__credit">{t('plateCredit')}</span>
      </section>

      <PageContainer variant="wide" className="pb-16">
        {first ? (
          <section className="obs-board" aria-label={t('tonightTitle')}>
            <div className="obs-board__cell">
              <span className="obs-label">{t('boardSiteTime', { site: first.site })}</span>
              <SiteClock timezone={first.timezone} />
            </div>
            <div className="obs-board__cell">
              <span className="obs-label">{t('boardInstrument')}</span>
              <span className={`obs-board__value obs-board__value--${first.readiness.state}`}>
                <span className="obs-led" aria-hidden="true" />
                {tState(first.readiness.state)}
              </span>
            </div>
            <div className="obs-board__cell">
              <span className="obs-label">{t('boardCloud')}</span>
              <span className="obs-board__value">
                {first.readiness.cloudCover === null ? '—' : `${Math.round(first.readiness.cloudCover)}%`}
              </span>
            </div>
            <div className="obs-board__cell">
              <span className="obs-label">{t('boardDark')}</span>
              <span className="obs-board__value">
                {first.readiness.nextWindowAt
                  ? siteTime(first.readiness.nextWindowAt, first.timezone)
                  : first.readiness.state === 'online'
                    ? t('boardDarkNow')
                    : '—'}
              </span>
            </div>
            {first.readiness.detail && (
              <p className="obs-board__note">
                {tReady(first.readiness.detail.key, first.readiness.detail.values)}
              </p>
            )}
          </section>
        ) : (
          <p className="obs-board obs-board__note">{t('empty')}</p>
        )}

        <section className="obs-section">
          <div className="obs-section__head">
            <h2 className="obs-h2">{t('instrumentsTitle')}</h2>
            <span className="obs-label">{t('instrumentCount', { count: nodes.length })}</span>
          </div>
          <div className="mt-6 flex flex-col gap-6">
            {nodes.map((node, i) => (
              <NodeCard key={node.id} node={node} index={i} />
            ))}
          </div>
        </section>

        <section className="obs-section">
          <div className="obs-section__head">
            <h2 className="obs-h2">{t('waysTitle')}</h2>
            <span className="obs-label">{t('waysNote')}</span>
          </div>
          <ol className="obs-ways mt-6">
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
      </PageContainer>

      <section className="obs-band">
        <Image src="/hero/hero-deepfield.jpg" alt="" fill sizes="100vw" className="obs-band__img" />
        <PageContainer variant="wide" className="obs-band__body">
          <div className="obs-band__copy">
            <p className="obs-eyebrow">{t('ownerEyebrow')}</p>
            <h2 className="obs-h2 obs-h2--band mt-3">{t('ownerTitle')}</h2>
            <p className="obs-band__text">{t('ownerLead')}</p>
            <Link href="/observatory/operator" className="obs-action obs-action--primary mt-6 inline-block">
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
        </PageContainer>
        <span className="obs-hero__credit">{t('heroCredit')}</span>
      </section>

      <PageContainer variant="wide" className="py-10">
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
