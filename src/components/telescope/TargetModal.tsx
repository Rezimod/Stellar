'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import {
  gradeTargets,
  sortGraded,
  targetTitle,
  type TargetKind,
  type TargetOrder,
  type TelescopeTarget,
} from '@/lib/observatory/telescope-targets';
import type { Station } from '@/lib/observatory/sim-stations';
import Modal from './Modal';
import TargetArt from './TargetArt';

type TypeFilter = 'all' | 'planets' | 'galaxies' | 'nebulae' | 'clusters' | 'stars';

const KINDS_OF: Record<TypeFilter, TargetKind[] | null> = {
  all: null,
  planets: ['planet', 'moon'],
  galaxies: ['galaxy'],
  nebulae: ['nebula'],
  clusters: ['cluster'],
  stars: ['star'],
};

/** The catalogue as a wall of cards: search, filter by kind, order, and keep only what is up. */
export default function TargetModal({
  station,
  now,
  current,
  onDone,
  onClose,
}: {
  station: Station;
  now: number;
  current: TelescopeTarget | null;
  onDone: (target: TelescopeTarget) => void;
  onClose: () => void;
}) {
  const t = useTranslations('observatory.telescope');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [order, setOrder] = useState<TargetOrder>('zenith');
  const [visibleOnly, setVisibleOnly] = useState(true);
  const [picked, setPicked] = useState<TelescopeTarget | null>(current);

  // Graded once when the modal opens: a minute of sky motion does not reorder a list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const graded = useMemo(() => gradeTargets(station, new Date(now)), [station]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const kinds = KINDS_OF[type];
    return sortGraded(
      graded.filter(
        (g) =>
          (!visibleOnly || g.visible) &&
          (!kinds || kinds.includes(g.target.kind)) &&
          (!q || targetTitle(g.target).toLowerCase().includes(q)),
      ),
      order,
    );
  }, [graded, query, type, order, visibleOnly]);

  return (
    <Modal title={t('modalTitle')} closeLabel={t('close')} onClose={onClose} wide>
      <h2 className="tel-modal__title">{t('modalTitle')}</h2>
      <label className="tel-search">
        <Search size={18} aria-hidden="true" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('search')} aria-label={t('search')} autoFocus />
      </label>

      <div className="tel-filters">
        <label className="tel-filters__field">
          <span>{t('type')}</span>
          <select value={type} onChange={(e) => setType(e.target.value as TypeFilter)}>
            {(Object.keys(KINDS_OF) as TypeFilter[]).map((k) => (
              <option key={k} value={k}>{t(`type_${k}`)}</option>
            ))}
          </select>
        </label>
        <label className="tel-filters__field">
          <span>{t('order')}</span>
          <select value={order} onChange={(e) => setOrder(e.target.value as TargetOrder)}>
            <option value="zenith">{t('orderZenith')}</option>
            <option value="brightest">{t('orderBrightest')}</option>
            <option value="name">{t('orderName')}</option>
          </select>
        </label>
        <label className="tel-check tel-filters__check">
          <input type="checkbox" checked={visibleOnly} onChange={(e) => setVisibleOnly(e.target.checked)} />
          {t('visibleOnly')}
        </label>
      </div>

      <p className="tel-modal__lead">{t('selectPrompt')}</p>
      <p className="tel-modal__count">{t('showing', { shown: shown.length, total: graded.length })}</p>

      <ul className="tel-grid" role="listbox" aria-label={t('modalTitle')}>
        {shown.map(({ target, position, visible }) => (
          <li key={target.id}>
            <button
              type="button"
              role="option"
              aria-selected={picked?.id === target.id}
              className="tel-card"
              onClick={() => setPicked(target)}
            >
              <span className="tel-card__art"><TargetArt target={target} sizes="(min-width: 640px) 220px, 90vw" /></span>
              <span className="tel-card__body">
                <span className="tel-card__name">{targetTitle(target)}</span>
                <span className="tel-card__meta">
                  <span className="tel-card__kind">{t(`kind_${target.kind}`)}</span>
                  <span className={`tel-card__alt${visible ? '' : ' tel-card__alt--low'}`}>
                    {visible ? t('altitudeShort', { alt: position.altitude.toFixed(0) }) : t('belowLimit')}
                  </span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="tel-modal__foot">
        <button type="button" className="tel-btn tel-btn--go" disabled={!picked} onClick={() => picked && onDone(picked)}>
          {t('done')}
        </button>
      </div>
    </Modal>
  );
}
