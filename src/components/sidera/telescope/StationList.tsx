'use client';

import { useEffect, useState } from 'react';
import { STATIONS, skyStateAt, type SkyState, type Station } from '@/lib/observatory/sim-stations';
import { SKY_LABEL, stationName } from './stations';

/**
 * The stations, each graded against its own sky when the list appears. A lit
 * dot means it is dark there now and it can be connected; anything else is
 * named and greyed, so a visitor learns why rather than wondering.
 */
export default function StationList({
  current,
  now,
  onSelect,
}: {
  current: Station | null;
  now: number;
  onSelect: (station: Station) => void;
}) {
  const [states, setStates] = useState<Record<string, SkyState>>({});

  // Graded once: a station does not change state while the list is open.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setStates(Object.fromEntries(STATIONS.map((s) => [s.id, skyStateAt(s, new Date(now))]))), []);

  return (
    <ul className="sdt-stations" role="listbox" aria-label="Telescopes">
      {STATIONS.map((s) => {
        const state = states[s.id] ?? 'day';
        const available = state === 'night';
        return (
          <li key={s.id}>
            <button
              type="button"
              role="option"
              aria-selected={current?.id === s.id}
              className="sdt-station"
              disabled={!available}
              onClick={() => onSelect(s)}
            >
              <span className={`sdt-led${available ? ' is-on' : ''}`} aria-hidden="true" />
              <span className="sdt-station__text">
                <span className="sdt-station__name">{stationName(s)}</span>
                <span className="sdt-station__meta">
                  {s.site} · {s.instrument.optics}
                </span>
              </span>
              <span className={`sdt-station__sky sdt-station__sky--${state}`}>{SKY_LABEL[state]}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
