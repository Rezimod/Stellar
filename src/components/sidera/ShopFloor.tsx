'use client';

import { useMemo, useState } from 'react';
import ObjectArt from './ObjectArt';
import ShopCard, { type ShopCardProps } from './ShopCard';

export type FloorCard = ShopCardProps & { group: string; objectType: string };
export type FloorGroup = { key: string; label: string; cover: string; count: string };

/** The set laid out to browse: a row of groups, a search, and the tiles. */
export default function ShopFloor({ cards, groups }: { cards: FloorCard[]; groups: FloorGroup[] }) {
  const [group, setGroup] = useState<string>('all');
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter(
      (c) =>
        (group === 'all' || c.group === group) &&
        (!q || `${c.name} ${c.designation} ${c.objectType}`.toLowerCase().includes(q)),
    );
  }, [cards, group, query]);

  return (
    <div className="sd-floor">
      <div className="sd-floor__bar">
        <div className="sd-floor__tabs" role="tablist" aria-label="Browse the set">
          {groups.map((g) => {
            const on = group === g.key;
            return (
              <button
                key={g.key}
                type="button"
                role="tab"
                aria-selected={on}
                className="sd-floor__tab"
                onClick={() => setGroup(on && g.key !== 'all' ? 'all' : g.key)}
              >
                <ObjectArt designation={g.cover} className="sd-floor__thumb" />
                <span>{g.label}</span>
                <span className="sd-floor__count">{g.count}</span>
              </button>
            );
          })}
        </div>
        <label className="sd-floor__search">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Search the set</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, designation, type…"
          />
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="sd-note">Nothing in the set matches “{query}”.</p>
      ) : (
        <ul className="sd-floor__grid">
          {shown.map(({ group: _g, objectType: _t, ...c }) => (
            <li key={c.designation}>
              <ShopCard {...c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
