import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import PageContainer from '@/components/layout/PageContainer';
import { NODES, adapterFor } from '@/lib/observatory/nodes';

export const metadata: Metadata = {
  title: 'How a capture is proved — Stellar Observatory',
  description:
    'What happens between a mount slewing and a record on chain, and why a simulated frame can never mint, earn or be logged as an observation.',
};

/**
 * The chain of custody, written from the code that enforces it.
 *
 * Every claim on this page names the function that makes it true. That is the
 * point: a provenance story a reader cannot check is marketing. If one of
 * these steps is refactored away, this page is wrong and should be changed
 * with it. The prose itself lives under observatory.howItWorks in the message
 * files, because the claims have to hold in Georgian too.
 */

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6'] as const;

const REFUSAL_KEYS = ['refusalMint', 'refusalStar', 'refusalLog', 'refusalSell'] as const;

export default async function HowItWorksPage() {
  const t = await getTranslations('observatory.howItWorks');
  const nodes = NODES;
  const provenances = await Promise.all(
    nodes.map((node) => adapterFor(node).provenanceNow(node)),
  );
  const live = provenances.filter((p) => p === 'instrument');

  return (
    <PageContainer variant="fullscreen" className="obs-below" style={{ paddingTop: '1rem' }}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6 lg:sticky lg:top-20">
          <header className="obs-float obs-float--section">
            <h1 className="obs-float__title" style={{ marginTop: 0 }}>{t('title')}</h1>
            <p className="obs-float__text">{t('intro')}</p>
          </header>

          <section className="obs-float obs-float--section">
            <h2 className="obs-card__title" style={{ fontSize: '1.0625rem' }}>{t('tonightTitle')}</h2>
            <p className="obs-float__text" style={{ marginTop: '0.5rem' }}>
              {t.rich('tonightCount', {
                live: live.length,
                total: nodes.length,
                n: (chunks) => (
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                    {chunks}
                  </span>
                ),
              })}{' '}
              {live.length === 0 ? t('tonightWaiting') : t('tonightMixed')}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/observatory/simulator" className="obs-ghost obs-ghost--primary">
                {t('simulator')}
              </Link>
              <Link href="/observatory" className="obs-ghost">
                {t('network')}
              </Link>
              <Link href="/observatory/captures" className="obs-ghost">
                {t('captures')}
              </Link>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <ol className="obs-float obs-float--section obs-steps">
            {STEP_KEYS.map((key, i) => (
              <li key={key} className="obs-step">
                <span className="obs-step__n font-display" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="obs-step__title">
                    {t(`${key}Title`)}
                    <span className="obs-step__where">{t(`${key}Where`)}</span>
                  </h2>
                  <p className="obs-step__body">{t(`${key}Body`)}</p>
                </div>
              </li>
            ))}
          </ol>

          <section className="obs-float obs-float--section">
            <h2 className="obs-h2">{t('refusalsTitle')}</h2>
            <p className="obs-float__text">{t('refusalsIntro')}</p>
            <ul className="mt-4">
              {REFUSAL_KEYS.map((key) => (
                <li
                  key={key}
                  className="flex items-baseline gap-3 border-t py-2.5 text-sm"
                  style={{ borderColor: 'var(--obs-float-border)', color: 'var(--text-secondary)' }}
                >
                  <span className="obs-label" style={{ color: 'var(--no)' }}>
                    {t('refusalNo')}
                  </span>
                  {t(key)}
                </li>
              ))}
            </ul>
            <p className="obs-float__text" style={{ marginTop: '0.75rem' }}>{t('refusalsNote')}</p>
          </section>

          <section className="obs-float obs-float--section">
            <h2 className="obs-h2">{t('whyTitle')}</h2>
            <p className="obs-float__text">
              {t.rich('whyP1', {
                m: (chunks) => <span className="font-mono">{chunks}</span>,
              })}
            </p>
            <p className="obs-float__text" style={{ marginTop: '0.75rem' }}>{t('whyP2')}</p>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
