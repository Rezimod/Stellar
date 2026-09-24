import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import CornerClock from '@/components/observatory/CornerClock';
import FieldPlate from '@/components/observatory/FieldPlate';
import SlotPicker from '@/components/observatory/SlotPicker';
import { NODES, adapterFor, getNode } from '@/lib/observatory/nodes';
import { fieldOfView, focalRatio, resolvingPowerArcsec } from '@/lib/observatory/optics';

type Params = { params: Promise<{ nodeId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const node = getNode((await params).nodeId);
  if (!node) return { title: 'Instrument not found — Stellar' };

  return {
    title: `${node.name} — Stellar Observatory`,
    description: `${node.instrument.optics} and a ${node.instrument.camera} in ${node.site}. See when the sky is dark over the site and hold a slot.`,
  };
}

// Readiness moves with the Sun and the weather, not with the request.
export const revalidate = 300;

export default async function NodePage({ params }: Params) {
  const node = getNode((await params).nodeId);
  if (!node) notFound();

  const t = await getTranslations('observatory.node');
  const tState = await getTranslations('observatory.state');
  const tReady = await getTranslations('observatory.readiness');
  const now = new Date();
  // adapterFor, not a fresh simulator: a node wired to real hardware must not
  // have its readiness answered by the simulator standing in for it.
  const readiness = await adapterFor(node).getReadiness(node, now);
  const { instrument } = node;
  const fov = fieldOfView(instrument);
  const code = String(NODES.findIndex((n) => n.id === node.id) + 1).padStart(2, '0');

  return (
    <>
      <section className="obs-scene">
        <CornerClock timezone={node.timezone} zoneLabel={`${node.site} · ${t('siteTime')}`} />

        <div className="obs-scene__body">
          <div className="obs-float obs-float--main">
            <div className="obs-float__head">
              <span className="obs-float__node">
                <MapPin size={18} strokeWidth={1.75} aria-hidden="true" />
                <span className="font-display" style={{ color: 'var(--accent-text)', letterSpacing: '0.16em' }}>
                  {t('code', { code })}
                </span>
              </span>
              <span className={`obs-pill obs-pill--${readiness.state}`}>
                <span className="obs-led" aria-hidden="true" />
                {tState(readiness.state)}
              </span>
            </div>
            <p className="obs-float__meta">
              <span>{node.site}</span>
              <span>Bortle {node.bortle}</span>
              <span>{node.timezone.replace('_', ' ')}</span>
            </p>

            <h1 className="obs-float__title">{node.name}</h1>
            <p className="obs-float__subtitle">{instrument.optics}</p>
            {readiness.detail && (
              <p className="obs-float__text">{tReady(readiness.detail.key, readiness.detail.values)}</p>
            )}

            <div className="obs-float__rule" />

            <dl className="obs-sheet">
              <Row label={t('camera')} value={instrument.camera} />
              <Row label={t('mount')} value={instrument.mount} />
              <Row label={t('aperture')} value={`${instrument.apertureMm} mm`} mono />
              <Row label={t('focalLength')} value={`${instrument.focalLengthMm} mm · f/${focalRatio(instrument).toFixed(0)}`} mono />
              <Row
                label={t('fieldOfView')}
                value={`${fov.widthArcmin.toFixed(1)}′ × ${fov.heightArcmin.toFixed(1)}′`}
                mono
              />
              <Row label={t('plateScale')} value={`${fov.plateScaleArcsecPx.toFixed(2)}″/px`} mono />
              <Row label={t('resolvesTo')} value={`${resolvingPowerArcsec(instrument).toFixed(2)}″`} mono />
            </dl>
            <p className="obs-sheet__note">
              {t('bestForLong', {
                targets: instrument.suitedTo.map((k) => t(`target${k}`)).join(' · '),
              })}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/observatory/simulator" className="obs-ghost obs-ghost--primary">
                {t('simCta')}
              </Link>
              <Link href="/observatory/requests" className="obs-ghost">
                {t('requestCta')}
              </Link>
            </div>
          </div>

          <div className="obs-scene__object">
            <FieldPlate instrument={instrument} at={now} variant="full" />
          </div>
        </div>

        <section className="obs-dock obs-dock--slots" aria-labelledby="obs-hold">
          <div className="obs-section__head" style={{ borderBottom: 0, paddingBottom: 0 }}>
            <h2 id="obs-hold" className="obs-card__title" style={{ fontSize: '1.0625rem' }}>
              {t('holdTitle')}
            </h2>
            <span className="obs-label">
              {t('price', { price: node.priceGel, minutes: node.sessionMinutes })}
            </span>
          </div>
          <p className="obs-card__aside mt-1" style={{ maxWidth: '70ch' }}>
            {t('holdIntro', { site: node.site })}{' '}
            {node.status !== 'active' && t('commissioning', { name: node.name })}
          </p>

          <SlotPicker
            nodeId={node.id}
            timezone={node.timezone}
            sessionMinutes={node.sessionMinutes}
            priceGel={node.priceGel}
          />
        </section>
      </section>

      <PageContainer variant="fullscreen" className="obs-below">
        <section className="obs-float obs-float--section">
          <ol className="obs-ways">
            <li className="obs-way">
              <span className="obs-way__n font-display" aria-hidden="true">01</span>
              <div className="obs-way__body">
                <h3 className="obs-way__title">{t('simTitle')}</h3>
                <p className="obs-way__text">{t('simBody')}</p>
              </div>
              <Link href="/observatory/simulator" className="obs-way__link">
                {t('simCta')}<span aria-hidden="true"> →</span>
              </Link>
            </li>
            <li className="obs-way">
              <span className="obs-way__n font-display" aria-hidden="true">02</span>
              <div className="obs-way__body">
                <h3 className="obs-way__title">{t('requestTitle')}</h3>
                <p className="obs-way__text">{t('requestBody')}</p>
              </div>
              <Link href="/observatory/requests" className="obs-way__link">
                {t('requestCta')}<span aria-hidden="true"> →</span>
              </Link>
            </li>
          </ol>
        </section>
      </PageContainer>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="obs-sheet__row">
      <dt className="obs-label">{label}</dt>
      <dd className={mono ? 'obs-sheet__value obs-sheet__value--mono' : 'obs-sheet__value'}>{value}</dd>
    </div>
  );
}
