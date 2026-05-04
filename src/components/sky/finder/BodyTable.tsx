'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getTargetPhoto } from '@/lib/sky/target-photos';
import { PlanetIcon } from './PlanetIcon';
import type { ObjectId, SkyObject } from './types';

interface BodyTableProps {
  objects: SkyObject[];
  activeId: ObjectId | null;
  onSelect: (id: ObjectId) => void;
}

function fmtTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

export function BodyTable({ objects, activeId, onSelect }: BodyTableProps) {
  const t = useTranslations('sky.bodyTable');

  // Visible bodies first, sorted by altitude (highest first); below-horizon
  // bodies sorted by upcoming rise time. The list reads top-to-bottom in
  // priority of "what should I look at right now."
  const sorted = [...objects].sort((a, b) => {
    if (a.visible && !b.visible) return -1;
    if (!a.visible && b.visible) return 1;
    if (a.visible) return b.altitude - a.altitude;
    if (a.riseTime && b.riseTime) return a.riseTime.localeCompare(b.riseTime);
    return 0;
  });

  return (
    <div className="body-list" role="listbox" aria-label={t('label')}>
      {sorted.map((o) => (
        <BodyCard
          key={o.id}
          o={o}
          isActive={o.id === activeId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function BodyCard({
  o,
  isActive,
  onSelect,
}: {
  o: SkyObject;
  isActive: boolean;
  onSelect: (id: ObjectId) => void;
}) {
  const t = useTranslations('sky.bodyTable');
  const photo = getTargetPhoto(o.id);
  const [imgErr, setImgErr] = useState(false);
  const showPhoto = photo && !imgErr;

  const setTime = fmtTime(o.setTime);
  const riseTime = fmtTime(o.riseTime);

  // Plain-language status: "Up · sets 22:29", "Rises 06:14", "Up all night",
  // or "Below horizon" — we never make the user parse a table.
  let status: string;
  if (o.circumpolar) {
    status = t('upAllNight');
  } else if (o.visible) {
    status = setTime ? t('setsAt', { time: setTime }) : t('upAllNight');
  } else if (riseTime) {
    status = t('risesAt', { time: riseTime });
  } else {
    status = t('below');
  }

  return (
    <button
      type="button"
      role="option"
      aria-selected={isActive}
      className={`body-card${isActive ? ' is-active' : ''}${!o.visible ? ' is-below' : ''}`}
      onClick={() => onSelect(o.id)}
    >
      <div className="body-card__thumb">
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo!.src}
            alt={photo!.alt}
            loading="lazy"
            decoding="async"
            onError={() => setImgErr(true)}
          />
        ) : (
          <PlanetIcon
            id={o.id}
            type={o.type}
            magnitude={o.magnitude}
            phase={o.phase}
            size={48}
          />
        )}
      </div>
      <div className="body-card__body">
        <div className="body-card__name">{o.name}</div>
        <div className="body-card__status">{status}</div>
      </div>
      {o.visible && (
        <div className="body-card__bearing" aria-hidden="true">
          <span className="body-card__alt">+{Math.round(o.altitude)}°</span>
          <span className="body-card__compass">{o.compassDirection}</span>
        </div>
      )}
    </button>
  );
}
