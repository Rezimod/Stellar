'use client';

import { memo, useId, useRef, useState } from 'react';
import { editionLabel, plateFor } from '@/lib/sidera/plate';
import CardBack from './CardBack';
import CardFront from './CardFront';
import './sidera-card.css';

type Props = {
  designation: string;
  edition?: number | null;
  capture?: string | null;
  commitment?: string | null;
  /** The hero card: it floats when left alone and can be turned over. */
  hero?: boolean;
};

/**
 * A Sidera card you can hold. Move across it and it leans toward you; the sky
 * sinks behind the object, the labels float above it, the foil follows the light.
 */
function SideraCard({ designation, edition, capture, commitment, hero = false }: Props) {
  const plate = plateFor(designation);
  const u = `sd${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const stage = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  const ed = editionLabel(edition);
  // An edition of a card no longer in the set: its number, on a blank card.
  if (!plate)
    return (
      <div className="sdc">
        <div className="sdc-card sdc-card--blank">
          <span>{designation}</span>
          {edition != null && <span>No. {ed}</span>}
        </div>
      </div>
    );

  const set = (px: number, py: number, live: boolean) => {
    const el = stage.current;
    if (!el) return;
    el.style.setProperty('--px', px.toFixed(3));
    el.style.setProperty('--py', py.toFixed(3));
    el.classList.toggle('is-live', live);
  };

  return (
    <div className={`sdc${hero ? ' sdc--hero' : ''}`}>
      <div
        ref={stage}
        className="sdc-stage"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
          const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
          set(over ? 1 - px : px, py, true);
        }}
        onPointerLeave={() => set(0.5, 0.5, false)}
      >
        <div className="sdc-tilt">
          <div className={`sdc-flip${over ? ' is-over' : ''}`}>
            <div className="sdc-face" role="img" aria-label={`${plate.name}, ${plate.rname}, Set 001 number ${plate.num}${edition != null ? `, edition ${ed} of ${plate.of}` : ''}`}>
              <CardFront plate={plate} edition={edition} capture={capture} u={u} />
            </div>
            {hero && (
              <div className="sdc-face sdc-face--back" aria-hidden={!over}>
                <CardBack plate={plate} edition={edition} commitment={commitment} u={u} />
              </div>
            )}
          </div>
        </div>
      </div>
      {hero && <span className="sdc-shadow" aria-hidden="true" />}
      {hero && (
        <button type="button" className="sd-btn sd-btn--primary sdc-turn" onClick={() => setOver((v) => !v)}>
          {over ? 'Turn it back' : 'Turn it over'}
        </button>
      )}
    </div>
  );
}

export default memo(SideraCard);
