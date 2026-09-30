'use client';

import { useEffect, useState } from 'react';
import { SET_GROUPS } from '@/lib/sets/groups';

const FILTERS = [{ key: 'all', label: 'All' }, ...SET_GROUPS.map((g) => ({ key: g.key, label: g.short }))];

/**
 * Search and families over the shelf. Each tile on the page carries
 * data-section and data-name; the filter hides the rest in place, so the
 * hundred tiles are never rendered again.
 */
export default function ShelfFilter({ total }: { total: number }) {
  const [family, setFamily] = useState('all');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(total);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    let n = 0;
    for (const t of document.querySelectorAll<HTMLElement>('[data-shelf-item]')) {
      const show = (family === 'all' || t.dataset.section === family) && (!q || t.dataset.name!.includes(q));
      t.hidden = !show;
      if (show) n++;
    }
    setShown(n);
  }, [family, query]);

  return (
    <div className="sd-filter">
      <label className="sd-filter__search">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10.4 10.4L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input type="search" placeholder="Search the set" aria-label="Search the set" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="sd-filter__chips" role="group" aria-label="Family">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className="sd-filter__chip" aria-pressed={family === f.key} onClick={() => setFamily(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <p className="sd-filter__count" aria-live="polite">
        {shown === total ? `${total} cards` : shown === 0 ? 'No card matches' : `${shown} of ${total} cards`}
      </p>
    </div>
  );
}
