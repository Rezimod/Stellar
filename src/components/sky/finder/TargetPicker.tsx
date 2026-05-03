'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { ObjectId, SkyObject } from './types';

interface TargetPickerProps {
  objects: SkyObject[];
  activeId: ObjectId | null;
  onSelect: (id: ObjectId) => void;
  autoRotate: boolean;
  onToggleAuto: () => void;
}

const NAKED_EYE: ReadonlySet<ObjectId> = new Set(['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']);

function fmtHHmm(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

function nakedEyeFor(o: SkyObject): boolean {
  return NAKED_EYE.has(o.id) && o.nakedEye;
}

export function TargetPicker({
  objects,
  activeId,
  onSelect,
  autoRotate,
  onToggleAuto,
}: TargetPickerProps) {
  const t = useTranslations('sky.picker');

  // Hide Sun unless it's currently visible OR within twilight; we approximate
  // "within twilight" as: it's the only above-horizon object signal we have,
  // so just include the Sun when it's visible. Otherwise the picker stays
  // night-facing.
  const sorted = useMemo(() => {
    const visible: SkyObject[] = [];
    const below: SkyObject[] = [];
    for (const o of objects) {
      if (o.id === 'sun' && !o.visible) continue;
      (o.visible ? visible : below).push(o);
    }
    // Visible: Moon first when up, then by brightness (lower magnitude = brighter).
    visible.sort((a, b) => {
      if (a.id === 'moon' && b.id !== 'moon') return -1;
      if (b.id === 'moon' && a.id !== 'moon') return 1;
      return a.magnitude - b.magnitude;
    });
    // Below: by next rise time ascending; missing rise time goes last.
    below.sort((a, b) => {
      const ar = a.riseTime ? new Date(a.riseTime).getTime() : Number.POSITIVE_INFINITY;
      const br = b.riseTime ? new Date(b.riseTime).getTime() : Number.POSITIVE_INFINITY;
      return ar - br;
    });
    return { visible, below };
  }, [objects]);

  const visibleCount = sorted.visible.length;

  // AUTO mode: every 30s, re-pick the brightest visible target.
  useEffect(() => {
    if (!autoRotate) return;
    if (sorted.visible.length === 0) return;
    const pickBrightest = () => onSelect(sorted.visible[0].id);
    pickBrightest();
    const id = setInterval(pickBrightest, 30_000);
    return () => clearInterval(id);
  }, [autoRotate, sorted.visible, onSelect]);

  return (
    <div className="target-picker">
      <div className="target-picker__label">
        {t('header', { count: visibleCount })}
      </div>
      <div className="target-picker__row">
        <div className="target-picker__chips">
          {sorted.visible.map((o) => (
            <ChipVisible
              key={o.id}
              obj={o}
              active={o.id === activeId}
              onSelect={onSelect}
              nakedEye={nakedEyeFor(o)}
            />
          ))}
          {sorted.below.map((o) => (
            <ChipBelow
              key={o.id}
              obj={o}
              active={o.id === activeId}
              onSelect={onSelect}
              risesLabel={t('risesAt', { time: fmtHHmm(o.riseTime) ?? '—' })}
            />
          ))}
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
    </div>
  );
}

function ChipVisible({
  obj,
  active,
  onSelect,
  nakedEye,
}: {
  obj: SkyObject;
  active: boolean;
  onSelect: (id: ObjectId) => void;
  nakedEye: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(obj.id)}
      className={`target-chip${active ? ' is-active' : ''}`}
      aria-pressed={active}
    >
      <span className="target-chip__name">{obj.name}</span>
      <span className="target-chip__alt">{Math.round(obj.altitude)}°</span>
      {!nakedEye && <TelescopeIcon />}
    </button>
  );
}

function ChipBelow({
  obj,
  active,
  onSelect,
  risesLabel,
}: {
  obj: SkyObject;
  active: boolean;
  onSelect: (id: ObjectId) => void;
  risesLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(obj.id)}
      className={`target-chip target-chip--below${active ? ' is-active' : ''}`}
      aria-pressed={active}
    >
      <span className="target-chip__name">{obj.name}</span>
      <span className="target-chip__rises">{risesLabel}</span>
    </button>
  );
}

function TelescopeIcon() {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="target-chip__scope"
    >
      <path
        d="M2.5 11l4.5-7 6 3.5-2 3.5L2.5 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinejoin="round"
      />
      <path d="M5 11.5l-2 3.5" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
      <path d="M9.5 11.5l-1 2.5" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
    </svg>
  );
}
