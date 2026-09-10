import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import BackButton from '@/components/shared/BackButton';
import PageContainer from '@/components/layout/PageContainer';
import FieldPlate from '@/components/observatory/FieldPlate';
import ReadinessBadge from '@/components/observatory/ReadinessBadge';
import SiteClock from '@/components/observatory/SiteClock';
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
  const tReady = await getTranslations('observatory.readiness');
  const now = new Date();
  // adapterFor, not a fresh simulator: a node wired to real hardware must not
  // have its readiness answered by the simulator standing in for it.
  const readiness = await adapterFor(node).getReadiness(node, now);
  const { instrument } = node;
  const fov = fieldOfView(instrument);
  const code = String(NODES.findIndex((n) => n.id === node.id) + 1).padStart(2, '0');

  return (
    <PageContainer variant="wide" className="py-6 pb-16 sm:py-10">
      <BackButton />

      <header className="obs-node-head">
        <div className="min-w-0">
          <p className="obs-eyebrow">
            <span className="font-display">{t('code', { code })}</span> ·{' '}
            {t('header', {
              site: node.site,
              bortle: node.bortle,
              timezone: node.timezone.replace('_', ' '),
            })}
          </p>
          <h1 className="obs-h1 mt-3">{node.name}</h1>
          {readiness.detail && (
            <p className="obs-lede">{tReady(readiness.detail.key, readiness.detail.values)}</p>
          )}
        </div>
        <div className="obs-node-head__state">
          <ReadinessBadge readiness={readiness} />
          <span className="obs-label">
            {t('siteTime')} <SiteClock timezone={node.timezone} />
          </span>
        </div>
      </header>

      <section className="obs-node-plate">
        <FieldPlate instrument={instrument} at={now} variant="full" />

        <div className="obs-node-plate__sheet">
          <div className="obs-section__head">
            <h2 className="obs-h2">{t('instrumentTitle')}</h2>
            <span className="obs-label">{instrument.optics}</span>
          </div>
          <dl className="obs-sheet mt-4">
            <Row label={t('optics')} value={instrument.optics} />
            <Row label={t('camera')} value={instrument.camera} />
            <Row label={t('mount')} value={instrument.mount} />
            <Row label={t('aperture')} value={`${instrument.apertureMm} mm`} mono />
            <Row label={t('focalLength')} value={`${instrument.focalLengthMm} mm`} mono />
            <Row label={t('focalRatio')} value={`f/${focalRatio(instrument).toFixed(0)}`} mono />
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
        </div>
      </section>

      <section className="obs-section">
        <div className="obs-section__head">
          <h2 className="obs-h2">{t('holdTitle')}</h2>
          <span className="obs-label">
            {t('price', { price: node.priceGel, minutes: node.sessionMinutes })}
          </span>
        </div>
        <p className="obs-section__lead">
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

      <ol className="obs-ways obs-section">
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
    </PageContainer>
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
