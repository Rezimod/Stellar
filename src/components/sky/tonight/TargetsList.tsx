'use client';

import CelestialIcon from './CelestialIcon';
import { targets, type Target } from './data';

export default function TargetsList({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const visible = targets.filter((t) => !t.setting).length;
  const setting = targets.filter((t) => t.setting).length;

  return (
    <section className="targets">
      <header className="targets__head">
        <h3 className="targets__title">Tonight’s targets</h3>
        <span className="targets__meta">
          {String(visible).padStart(2, '0')} visible · {String(setting).padStart(2, '0')} setting
        </span>
      </header>
      <ul className="targets__list">
        {targets.map((t) => (
          <Row key={t.id} target={t} active={t.id === activeId} onSelect={onSelect} />
        ))}
      </ul>
    </section>
  );
}

function Row({
  target,
  active,
  onSelect,
}: {
  target: Target;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const mag = target.magnitude >= 0 ? `+${target.magnitude.toFixed(1)}` : target.magnitude.toFixed(1);
  return (
    <li>
      <button
        type="button"
        className={`trow${active ? ' trow--active' : ''}${target.setting ? ' trow--setting' : ''}`}
        onClick={() => onSelect(target.id)}
      >
        <CelestialIcon kind={target.icon} size={38} />
        <span className="trow__text">
          <span className="trow__name">{target.name}</span>
          <span className="trow__sub">{target.type} · mag {mag}</span>
        </span>
        <span className="trow__alt">
          <span className="trow__bar" aria-hidden="true">
            <span className="trow__bar-fill" style={{ width: `${Math.round((target.altitude / 90) * 100)}%` }} />
          </span>
          <span className="trow__alt-num">{target.altitude}°</span>
        </span>
      </button>
    </li>
  );
}
