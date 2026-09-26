'use client';

import { useCallback, useEffect, useState } from 'react';
import { RARITIES, rarityInfo } from '@/lib/rarity';
import { SET_GROUPS } from '@/lib/sets/groups';

const FILTERS = [
  { key: 'all', label: 'All' },
  ...SET_GROUPS.map((g) => ({ key: g.key, label: g.short })),
  ...[...RARITIES].reverse().map((r) => ({ key: r, label: `${rarityInfo(r).glyph} ${rarityInfo(r).label}` })),
];

/**
 * Small buttons over the shelf. Each tile on the page carries data-section and
 * data-rarity; a filter hides the others and lets the rest settle in again,
 * staggered. Chapters with nothing left in them fold away.
 */
export default function ShelfFilter() {
  const [active, setActive] = useState('all');

  const apply = useCallback((key: string) => {
    const tiles = document.querySelectorAll<HTMLElement>('[data-shelf-item]');
    let i = 0;
    for (const t of tiles) {
      const show = key === 'all' || t.dataset.section === key || t.dataset.rarity === key;
      t.hidden = !show;
      if (show) {
        t.style.setProperty('--i', String(i++));
        t.classList.remove('is-in');
        void t.offsetWidth;
        t.classList.add('is-in');
      }
    }
    for (const s of document.querySelectorAll<HTMLElement>('[data-shelf-section]')) {
      s.hidden = !s.querySelector('[data-shelf-item]:not([hidden])');
    }
  }, []);

  useEffect(() => apply(active), [active, apply]);

  return (
    <div className="sd-shelf__chips" role="group" aria-label="Show">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          className="sd-shelf__chip"
          aria-pressed={active === f.key}
          data-rarity={f.key}
          onClick={() => setActive(f.key)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
