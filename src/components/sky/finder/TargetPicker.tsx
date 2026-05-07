'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CatalogDifficulty } from '@/lib/sky/catalog';
import { getTargetPhoto } from '@/lib/sky/target-photos';
import { PlanetIcon } from './PlanetIcon';
import type { ObjectId, SkyObject } from './types';

interface TargetPickerProps {
  objects: SkyObject[];
  activeId: ObjectId | null;
  onSelect: (id: ObjectId) => void;
}

export type TierFilter = 'all' | CatalogDifficulty;

const TIER_ORDER: TierFilter[] = ['all', 'easy', 'medium', 'hard'];

/** Curated top-objects cap. Showing more than this turns the picker into a
 *  catalog dump and buries the Moon + bright planets the user actually wants. */
const TOP_OBJECTS_CAP = 10;

/**
 * Priority bucket — lower wins. Moon first, then bright naked-eye planets in
 * brightness order, then outer planets, then bright stars, then DSOs.
 */
function categoryRank(id: string, type: string, magnitude: number): number {
  if (id === 'moon') return 0;
  if (id === 'sun') return 1;
  if (id === 'venus')   return 10;
  if (id === 'jupiter') return 11;
  if (id === 'mars')    return 12;
  if (id === 'saturn')  return 13;
  if (id === 'mercury') return 14;
  if (id === 'uranus')  return 15;
  if (id === 'neptune') return 16;
  if (type === 'star' || type === 'double') {
    // Brighter stars sort first inside the star bucket.
    return 20 + Math.max(0, Math.min(8, magnitude + 2));
  }
  // DSOs last, ordered by brightness.
  return 30 + Math.max(0, Math.min(8, magnitude));
}

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

/* ================================================================
 * Split exports — used by the desktop sky page.
 * The existing TargetPicker remains for any caller that wants the
 * single-block version; these three pieces let the page place the
 * filter row, the visible grid and the below-horizon grid in
 * separate slots (e.g. left-of-map vs right-of-map).
 * ================================================================ */

interface TargetFiltersProps {
  objects: SkyObject[];
  tier: TierFilter;
  onTierChange: (tier: TierFilter) => void;
  primeTarget?: SkyObject | null;
  primeActive?: boolean;
  onPrimeSelect?: () => void;
}

export function TargetFilters({
  objects,
  tier,
  onTierChange,
  primeTarget = null,
  primeActive = false,
  onPrimeSelect,
}: TargetFiltersProps) {
  const t = useTranslations('sky.picker');
  const counts = useMemo(() => {
    const c: Record<CatalogDifficulty, number> = { easy: 0, medium: 0, hard: 0 };
    for (const o of objects) {
      if (!o.visible || o.id === 'sun') continue;
      c[o.difficulty]++;
    }
    return c;
  }, [objects]);

  return (
    <div className="target-filters">
      {primeTarget && (
        <PrimeTargetCard
          obj={primeTarget}
          active={primeActive}
          onSelect={onPrimeSelect}
          t={t}
        />
      )}
      <div className="target-picker__tiers" role="tablist" aria-label={t('tierAria')}>
        {TIER_ORDER.map((tk) => {
          const active = tier === tk;
          const count =
            tk === 'all' ? counts.easy + counts.medium + counts.hard : counts[tk];
          return (
            <button
              key={tk}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTierChange(tk)}
              className={`target-tier${active ? ' is-active' : ''} target-tier--${tk}`}
            >
              <span className="target-tier__label">{t(`tier.${tk}`)}</span>
              <span className="target-tier__count">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PrimeTargetCard({
  obj,
  active,
  onSelect,
  t,
}: {
  obj: SkyObject;
  active: boolean;
  onSelect?: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const photo = getTargetPhoto(obj.id);
  const setLabel = fmtHHmm(obj.setTime);
  const altitude = `+${Math.round(obj.altitude)}° ${obj.compassDirection}`;
  const window = obj.circumpolar
    ? t('upAllNight')
    : setLabel
      ? t('setsAt', { time: setLabel })
      : t('upAllNight');

  return (
    <button
      type="button"
      onClick={() => onSelect?.()}
      className={`prime-target${active ? ' is-active' : ''}`}
      aria-label={`Prime target tonight: ${obj.name}`}
    >
      <span className="prime-target__thumb">
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
      <span className="prime-target__body">
        <span className="prime-target__eyebrow">
          <PrimeStar />
          <span>Prime tonight</span>
        </span>
        <span className="prime-target__name">{obj.name}</span>
        <span className="prime-target__meta">
          <span className="prime-target__alt">{altitude}</span>
          <span className="prime-target__sep" aria-hidden>·</span>
          <span className="prime-target__window">{window}</span>
        </span>
      </span>
    </button>
  );
}

function PrimeStar() {
  return (
    <svg width={10} height={10} viewBox="0 0 16 16" aria-hidden="true" className="prime-target__star">
      <path d="M8 1.2l1.85 4.6 4.95.4-3.78 3.22 1.18 4.83L8 11.74l-4.2 2.51 1.18-4.83L1.2 6.2l4.95-.4L8 1.2z" fill="currentColor" />
    </svg>
  );
}

interface TargetVisibleGridProps {
  objects: SkyObject[];
  tier: TierFilter;
  activeId: ObjectId | null;
  onSelect: (id: ObjectId) => void;
}

export function TargetVisibleGrid({
  objects,
  tier,
  activeId,
  onSelect,
}: TargetVisibleGridProps) {
  const t = useTranslations('sky.picker');
  const visible = useMemo(() => {
    const filtered = objects.filter((o) => {
      if (o.id === 'sun' && !o.visible) return false;
      if (!o.visible) return false;
      if (tier === 'all') return true;
      return o.difficulty === tier;
    });
    const sorted = filtered.sort((a, b) => {
      const ra = categoryRank(a.id, a.type, a.magnitude);
      const rb = categoryRank(b.id, b.type, b.magnitude);
      if (ra !== rb) return ra - rb;
      return b.altitude - a.altitude;
    });
    return sorted.slice(0, TOP_OBJECTS_CAP);
  }, [objects, tier]);

  return (
    <section className="target-visible">
      {visible.length === 0 ? (
        <div className="target-picker__empty">{t('emptyTier')}</div>
      ) : (
        <div className="target-cards target-cards--visible">
          {visible.map((o) => (
            <TargetCard key={o.id} obj={o} active={o.id === activeId} onSelect={onSelect} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}

interface TargetBelowGridProps {
  objects: SkyObject[];
  tier: TierFilter;
  activeId: ObjectId | null;
  onSelect: (id: ObjectId) => void;
}

export function TargetBelowGrid({
  objects,
  tier,
  activeId,
  onSelect,
}: TargetBelowGridProps) {
  const t = useTranslations('sky.picker');
  const below = useMemo(() => {
    const filtered = objects.filter((o) => {
      if (o.id === 'sun') return false;
      if (o.visible) return false;
      if (tier === 'all') return true;
      return o.difficulty === tier;
    });
    // Same Moon → planets → stars → DSO ordering as the visible grid.
    // Inside a category, sort by next rise time so the user can see what's
    // coming up first. Cap to keep the section glanceable.
    const sorted = filtered.sort((a, b) => {
      const ra = categoryRank(a.id, a.type, a.magnitude);
      const rb = categoryRank(b.id, b.type, b.magnitude);
      if (ra !== rb) return ra - rb;
      const ar = a.riseTime ? new Date(a.riseTime).getTime() : Number.POSITIVE_INFINITY;
      const br = b.riseTime ? new Date(b.riseTime).getTime() : Number.POSITIVE_INFINITY;
      return ar - br;
    });
    return sorted.slice(0, TOP_OBJECTS_CAP);
  }, [objects, tier]);

  if (below.length === 0) return null;

  return (
    <section className="target-below">
      <header className="target-below__head">
        <span className="target-below__label">{t('belowHorizon')}</span>
        <span className="target-below__count">{below.length}</span>
      </header>
      <div className="target-cards target-cards--below">
        {below.map((o) => (
          <TargetCard key={o.id} obj={o} active={o.id === activeId} onSelect={onSelect} t={t} />
        ))}
      </div>
    </section>
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
