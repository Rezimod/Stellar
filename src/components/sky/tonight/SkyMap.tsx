'use client';

import { useMemo } from 'react';
import CelestialIcon from './CelestialIcon';
import { skyMarks, type SkyObjectMark } from './data';

// Deterministic scatter so server and client render identical star fields.
function scatterStars(count: number) {
  let seed = 9301;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rand() * 100,
    y: rand() * 100,
    r: 0.4 + rand() * 1.1,
    o: 0.25 + rand() * 0.6,
    delay: rand() * 4,
  }));
}

// Faint violet constellation strokes — Cygnus, Cassiopeia, Leo (stylised).
const CONSTELLATIONS = [
  'M 46 34 L 50 40 L 54 46 L 58 52 M 50 40 L 44 44 M 50 40 L 56 36',
  'M 60 16 L 65 20 L 69 17 L 73 22 L 78 19',
  'M 12 64 L 18 70 L 24 68 L 30 73 L 26 80 L 18 78',
];

export default function SkyMap({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const stars = useMemo(() => scatterStars(50), []);

  return (
    <section className="skymap">
      <div className="skymap__overlay-top">
        <div className="skymap__heading">
          <h1 className="skymap__title">Sky tonight</h1>
          <p className="skymap__sub">TBILISI · 41.72°N · CLEAR · BORTLE 6</p>
        </div>
        <div className="skymap__chips">
          <span className="skymap__live">
            <span className="skymap__live-dot" aria-hidden="true" />
            LIVE · 03:14 PM
          </span>
          <span className="skymap__upnext">↑ Up next · Jupiter rises in 06:42</span>
        </div>
      </div>

      <svg className="skymap__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {/* dashed ecliptic curve */}
        <path className="skymap__ecliptic" d="M 0 70 Q 30 38 55 44 T 100 30" />
        {CONSTELLATIONS.map((d, i) => (
          <path key={i} className="skymap__constellation" d={d} />
        ))}
        {stars.map((s) => (
          <circle
            key={s.id}
            className="skymap__star"
            cx={s.x}
            cy={s.y}
            r={s.r}
            style={{ opacity: s.o, animationDelay: `${s.delay}s` }}
          />
        ))}
      </svg>

      {skyMarks.map((m) => (
        <Mark key={m.id} mark={m} active={m.id === activeId} onSelect={onSelect} />
      ))}

      <div className="skymap__legend">
        <span className="skymap__legend-item"><i className="skymap__legend-dot skymap__legend-dot--prime" />Prime</span>
        <span className="skymap__legend-item"><i className="skymap__legend-dot skymap__legend-dot--mission" />Mission</span>
        <span className="skymap__legend-item"><i className="skymap__legend-dot skymap__legend-dot--ecliptic" />Ecliptic</span>
      </div>
      <span className="skymap__hint">Click an object · hold for history</span>
    </section>
  );
}

function Mark({
  mark,
  active,
  onSelect,
}: {
  mark: SkyObjectMark;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const cls = [
    'mark',
    mark.prime ? 'mark--prime' : '',
    mark.mission ? 'mark--mission' : '',
    active ? 'mark--active' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={cls}
      style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
      onClick={() => onSelect(mark.id)}
    >
      {mark.prime && <span className="mark__halo" aria-hidden="true" />}
      <span className="mark__glyph"><CelestialIcon kind={mark.icon} size={mark.prime ? 30 : 22} /></span>
      <span className="mark__label">
        <span className="mark__name">{mark.name}</span>
        <span className="mark__detail">{mark.detail}</span>
      </span>
    </button>
  );
}
