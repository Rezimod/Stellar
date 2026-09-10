import Link from 'next/link';
import { useTranslations } from 'next-intl';
import ReadinessBadge from './ReadinessBadge';
import { fieldOfView } from '@/lib/observatory/optics';
import type { NodeWithReadiness } from '@/lib/observatory/types';

const TIER_KEY = {
  first_party: 'tierFirstParty',
  kitted: 'tierKitted',
  byo: 'tierByo',
} as const;

/** Site-local time, so "next window" reads in the sky's clock, not the visitor's. */
function siteTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

/**
 * One instrument on the network, as a plate rather than a card: its number,
 * its name, and the four figures that decide what it can photograph.
 */
export default function NodeCard({ node, index }: { node: NodeWithReadiness; index: number }) {
  const t = useTranslations('observatory.node');
  const tReady = useTranslations('observatory.readiness');
  const { instrument, readiness } = node;
  const fov = fieldOfView(instrument);

  return (
    <article className="obs-instrument">
      <div className="obs-instrument__head">
        <span className="obs-instrument__code font-display" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="obs-instrument__name">{node.name}</h3>
          <p className="obs-instrument__site">
            {node.site} · Bortle {node.bortle} · {t(TIER_KEY[node.tier])}
          </p>
        </div>
        <ReadinessBadge readiness={readiness} />
      </div>

      <dl className="obs-specs">
        <Spec label={t('optics')} value={instrument.optics} />
        <Spec label={t('aperture')} value={`${instrument.apertureMm} mm`} mono />
        <Spec label={t('fieldOfView')} value={`${fov.widthArcmin.toFixed(1)}′ × ${fov.heightArcmin.toFixed(1)}′`} mono />
        <Spec label={t('camera')} value={instrument.camera} />
        <Spec label={t('session')} value={t('price', { price: node.priceGel, minutes: node.sessionMinutes })} mono />
      </dl>

      <div className="obs-instrument__foot">
        <p className="obs-instrument__status">
          {readiness.detail && tReady(readiness.detail.key, readiness.detail.values)}
          {readiness.nextWindowAt && readiness.state !== 'online' && (
            <> {tReady('nextWindow', { time: siteTime(readiness.nextWindowAt, node.timezone) })}</>
          )}
        </p>
        <Link href={`/observatory/${node.id}`} className="obs-action obs-action--primary">
          {t('open')}
        </Link>
      </div>
    </article>
  );
}

function Spec({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="obs-specs__item">
      <dt className="obs-label">{label}</dt>
      <dd className={`obs-specs__value${mono ? ' obs-specs__value--mono' : ''}`}>{value}</dd>
    </div>
  );
}
