'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import TargetArt from '@/components/telescope/TargetArt';
import type { Station } from '@/lib/observatory/sim-stations';
import { gradeTargets, sortGraded, targetTitle, type TargetKind, type TargetOrder, type TelescopeTarget } from '@/lib/observatory/telescope-targets';
import DeskModal from './DeskModal';
import { stationName } from './stations';

type TypeFilter = 'all' | 'planets' | 'galaxies' | 'nebulae' | 'clusters' | 'stars';

const TYPES: Record<TypeFilter, { label: string; kinds: TargetKind[] | null }> = {
  all: { label: 'All', kinds: null },
  planets: { label: 'Planets & Moon', kinds: ['planet', 'moon'] },
  galaxies: { label: 'Galaxies', kinds: ['galaxy'] },
  nebulae: { label: 'Nebulae', kinds: ['nebula'] },
  clusters: { label: 'Clusters', kinds: ['cluster'] },
  stars: { label: 'Stars', kinds: ['star'] },
};

const KIND_LABEL: Record<TargetKind, string> = {
  planet: 'Planet',
  moon: 'Moon',
  galaxy: 'Galaxy',
  nebula: 'Nebula',
  cluster: 'Cluster',
  star: 'Star',
};

/** The catalogue as a wall of cards: search, filter by kind, order, and keep only what is up. */
export default function TargetPicker({
  station,
  now,
  current,
  onDone,
  onClose,
}: {
  station: Station;
  now: number;
  current: TelescopeTarget | null;
  onDone: (target: TelescopeTarget) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [order, setOrder] = useState<TargetOrder>('zenith');
  const [visibleOnly, setVisibleOnly] = useState(true);
  const [picked, setPicked] = useState<TelescopeTarget | null>(current);

  // Graded once when the picker opens: a minute of sky motion does not reorder a list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const graded = useMemo(() => gradeTargets(station, new Date(now)), [station]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const kinds = TYPES[type].kinds;
    return sortGraded(
      graded.filter(
        (g) =>
          (!visibleOnly || g.visible) &&
          (!kinds || kinds.includes(g.target.kind)) &&
          (!q || targetTitle(g.target).toLowerCase().includes(q)),
      ),
      order,
    );
  }, [graded, query, type, order, visibleOnly]);

  return (
    <DeskModal
      title="Choose target"
      onClose={onClose}
      wide
      footer={
        <>
          <span className="sdt-hint">{picked ? `Selected: ${targetTitle(picked)}` : 'Select a target to observe.'}</span>
          <button type="button" className="sd-btn sd-btn--primary" disabled={!picked} onClick={() => picked && onDone(picked)}>
            Done
          </button>
        </>
      }
    >
      <p className="sd-label">{stationName(station)} · {station.site}</p>
      <h2 className="sdt-modal__title">Choose target</h2>

      <div className="sdt-filters">
        <label className="sdt-search">
          <Search size={17} aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the catalogue" aria-label="Search the catalogue" autoFocus />
        </label>
        <label className="sdt-select sdt-select--sm">
          <span className="sr-only">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as TypeFilter)}>
            {(Object.keys(TYPES) as TypeFilter[]).map((k) => (
              <option key={k} value={k}>{TYPES[k].label}</option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
        <label className="sdt-select sdt-select--sm">
          <span className="sr-only">Order</span>
          <select value={order} onChange={(e) => setOrder(e.target.value as TargetOrder)}>
            <option value="zenith">Highest first</option>
            <option value="brightest">Brightest</option>
            <option value="name">Name</option>
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
        <label className="sdt-check">
          <input type="checkbox" checked={visibleOnly} onChange={(e) => setVisibleOnly(e.target.checked)} />
          Up in this sky
        </label>
      </div>

      <p className="sdt-modal__count">
        Showing {shown.length} of {graded.length} targets
      </p>

      {shown.length === 0 ? (
        <p className="sdt-hint sdt-modal__empty">
          Nothing matches{query.trim() ? ` “${query.trim()}”` : ''}{visibleOnly ? ' above the limit right now' : ''}.
        </p>
      ) : (
        <ul className="sdt-targets" role="listbox" aria-label="Targets">
          {shown.map(({ target, position, visible }) => (
            <li key={target.id}>
              <button
                type="button"
                role="option"
                aria-selected={picked?.id === target.id}
                className="sdt-target"
                onClick={() => setPicked(target)}
                onDoubleClick={() => onDone(target)}
              >
                <span className="sdt-target__art"><TargetArt target={target} sizes="(min-width: 640px) 200px, 45vw" /></span>
                <span className="sdt-target__body">
                  <span className="sdt-target__name">{targetTitle(target)}</span>
                  <span className="sdt-target__meta">
                    <span>{KIND_LABEL[target.kind]}</span>
                    <span className={visible ? 'sdt-target__alt' : 'sdt-target__alt is-low'}>
                      {visible ? `${position.altitude.toFixed(0)}° up` : 'Below the limit'}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

    </DeskModal>
  );
}
