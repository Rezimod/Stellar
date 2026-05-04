'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CatalogDifficulty } from '@/lib/sky/catalog';
import { getTargetPhoto } from '@/lib/sky/target-photos';
import { PlanetIcon } from './PlanetIcon';
import type { ObjectId, SkyObject } from './types';

interface TargetPickerProps {
  objects: SkyObject[];
  activeId: ObjectId | null;
  onSelect: (id: ObjectId) => void;
  autoRotate: boolean;
  onToggleAuto: () => void;
}

type TierFilter = 'all' | CatalogDifficulty;

const TIER_ORDER: TierFilter[] = ['all', 'easy', 'medium', 'hard'];

function fmtHHmm(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

export function TargetPicker({
  objects,
  activeId,
  onSelect,
  autoRotate,
  onToggleAuto,
}: TargetPickerProps) {
  const t = useTranslations('sky.picker');
  const [tier, setTier] = useState<TierFilter>('all');

  const filtered = useMemo(() => {
    return objects.filter((o) => {
      if (o.id === 'sun' && !o.visible) return false;
      if (tier === 'all') return true;
      return o.difficulty === tier;
    });
  }, [objects, tier]);

  const sorted = useMemo(() => {
    const visible: SkyObject[] = [];
    const below: SkyObject[] = [];
    for (const o of filtered) {
      (o.visible ? visible : below).push(o);
    }
    visible.sort((a, b) => {
      if (a.id === 'moon' && b.id !== 'moon') return -1;
      if (b.id === 'moon' && a.id !== 'moon') return 1;
      return b.altitude - a.altitude;
    });
    below.sort((a, b) => {
      const ar = a.riseTime ? new Date(a.riseTime).getTime() : Number.POSITIVE_INFINITY;
      const br = b.riseTime ? new Date(b.riseTime).getTime() : Number.POSITIVE_INFINITY;
      return ar - br;
    });
    return { visible, below };
  }, [filtered]);

  const visibleCount = sorted.visible.length;

  // Tier counts (live, ignore the active tier filter).
  const tierCounts = useMemo(() => {
    const counts: Record<CatalogDifficulty, number> = { easy: 0, medium: 0, hard: 0 };
    for (const o of objects) {
      if (!o.visible) continue;
      if (o.id === 'sun') continue;
      counts[o.difficulty]++;
    }
    return counts;
  }, [objects]);

  // AUTO mode: every 30s, re-pick the highest visible target in current tier.
  useEffect(() => {
    if (!autoRotate) return;
    if (sorted.visible.length === 0) return;
    const pickHighest = () => onSelect(sorted.visible[0].id);
    pickHighest();
    const id = setInterval(pickHighest, 30_000);
    return () => clearInterval(id);
  }, [autoRotate, sorted.visible, onSelect]);

  return (
    <div className="target-picker">
      <div className="target-picker__row-top">
        <div className="target-picker__tiers" role="tablist" aria-label={t('tierAria')}>
          {TIER_ORDER.map((tk) => {
            const active = tier === tk;
            const count =
              tk === 'all'
                ? tierCounts.easy + tierCounts.medium + tierCounts.hard
                : tierCounts[tk];
            return (
              <button
                key={tk}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTier(tk)}
                className={`target-tier${active ? ' is-active' : ''} target-tier--${tk}`}
              >
                <span className="target-tier__label">{t(`tier.${tk}`)}</span>
                <span className="target-tier__count">{count}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onToggleAuto}
          className={`target-picker__auto${autoRotate ? ' is-on' : ''}`}
          aria-pressed={autoRotate}
          title={t('autoToggle')}
        >
          <span className="target-picker__auto-dot" />
          {t('auto')}
        </button>
      </div>

      <div className="target-picker__label">
        {t('header', { count: visibleCount })}
      </div>

      <div className="target-cards">
        {sorted.visible.map((o) => (
          <TargetCard key={o.id} obj={o} active={o.id === activeId} onSelect={onSelect} t={t} />
        ))}
        {sorted.below.map((o) => (
          <TargetCard key={o.id} obj={o} active={o.id === activeId} onSelect={onSelect} t={t} />
        ))}
        {sorted.visible.length === 0 && sorted.below.length === 0 && (
          <span className="target-picker__empty">{t('emptyTier')}</span>
        )}
      </div>
    </div>
  );
}

function TargetCard({
  obj,
  active,
  onSelect,
  t,
}: {
  obj: SkyObject;
  active: boolean;
  onSelect: (id: ObjectId) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const photo = getTargetPhoto(obj.id);
  const setLabel = fmtHHmm(obj.setTime);
  const riseLabel = fmtHHmm(obj.riseTime);

  let primary: string;
  let secondary: string;
  if (obj.visible) {
    primary = `+${Math.round(obj.altitude)}° ${obj.compassDirection}`;
    secondary = obj.circumpolar
      ? t('upAllNight')
      : setLabel
        ? t('setsAt', { time: setLabel })
        : t('upAllNight');
  } else {
    primary = obj.circumpolar
      ? t('upAllNight')
      : riseLabel
        ? t('risesAt', { time: riseLabel })
        : t('belowHorizon');
    secondary = setLabel ? t('setsAt', { time: setLabel }) : '';
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(obj.id)}
      className={`target-card target-card--${obj.type}${active ? ' is-active' : ''}${!obj.visible ? ' is-below' : ''}`}
      aria-pressed={active}
    >
      <span className="target-card__thumb">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
        ) : (
          <PlanetIcon
            id={obj.id}
            type={obj.type}
            magnitude={obj.magnitude}
            phase={obj.phase}
            size={36}
            glow={false}
          />
        )}
      </span>
      <span className="target-card__body">
        <span className="target-card__name">{obj.name}</span>
        <span className="target-card__primary">{primary}</span>
        {secondary && <span className="target-card__secondary">{secondary}</span>}
      </span>
      {obj.instrument === 'binoculars' && <BinocsIcon />}
      {obj.instrument === 'telescope' && <TelescopeIcon />}
    </button>
  );
}

function TelescopeIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" aria-hidden="true" className="target-card__scope">
      <path d="M2.5 11l4.5-7 6 3.5-2 3.5L2.5 11Z" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinejoin="round" />
      <path d="M5 11.5l-2 3.5" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
      <path d="M9.5 11.5l-1 2.5" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
    </svg>
  );
}

function BinocsIcon() {
  return (
    <svg width={13} height={11} viewBox="0 0 16 14" aria-hidden="true" className="target-card__scope">
      <circle cx={4} cy={9} r={3.5} fill="none" stroke="currentColor" strokeWidth={1.2} />
      <circle cx={12} cy={9} r={3.5} fill="none" stroke="currentColor" strokeWidth={1.2} />
      <path d="M3 5l1.4-2.5h7.2L13 5" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" />
      <line x1={7.5} y1={9} x2={8.5} y2={9} stroke="currentColor" strokeWidth={1.2} />
    </svg>
  );
}
