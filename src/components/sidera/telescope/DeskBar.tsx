'use client';

import { useEffect, useRef } from 'react';
import { ChevronsUpDown, CircleHelp, Clock, PanelRightClose, PanelRightOpen, Unplug } from 'lucide-react';
import type { Station } from '@/lib/observatory/sim-stations';
import StationList from './StationList';
import { stationName } from './stations';

/** The strip over the desk: which telescope, what it is doing, how long is left, and the guide. */
export default function DeskBar({
  station,
  now,
  menuOpen,
  onMenu,
  onSelect,
  onDisconnect,
  status,
  frames,
  timeLeftMs,
  panelOpen,
  onPanel,
  onGuide,
}: {
  station: Station | null;
  now: number;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  onSelect: (s: Station) => void;
  onDisconnect: () => void;
  status: string | null;
  frames: number;
  timeLeftMs: number | null;
  panelOpen: boolean;
  onPanel: () => void;
  onGuide: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMenu(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, onMenu]);

  return (
    <div className="sdt-bar">
      <div className="sdt-bar__inner">
        <p className="sdt-bar__crumb sd-label">Observatory</p>

        <div className="sdt-menu" ref={menuRef}>
          <button type="button" className="sdt-menu__button" aria-haspopup="listbox" aria-expanded={menuOpen} onClick={() => onMenu(!menuOpen)}>
            <span className={`sdt-led${station ? ' is-on' : ''}`} aria-hidden="true" />
            <span className="sdt-menu__name">{station ? stationName(station) : 'Select a telescope'}</span>
            <ChevronsUpDown size={16} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="sdt-menu__pop">
              <p className="sdt-menu__hint">A lit dot means it is dark there now.</p>
              <StationList
                current={station}
                now={now}
                onSelect={(s) => {
                  onSelect(s);
                  onMenu(false);
                }}
              />
            </div>
          )}
        </div>

        {station && (
          <button type="button" className="sdt-bar__btn sdt-bar__btn--quiet" onClick={onDisconnect}>
            <Unplug size={16} aria-hidden="true" />
            <span>Disconnect</span>
          </button>
        )}
        {status && (
          <span className="sdt-bar__status" aria-live="polite">
            {status}
          </span>
        )}

        <div className="sdt-bar__right">
          {frames > 0 && <span className="sdt-bar__frames">{frames} {frames === 1 ? 'frame' : 'frames'}</span>}
          {timeLeftMs !== null && (
            <span className="sdt-bar__time" title="Simulated · captures are free">
              <Clock size={14} aria-hidden="true" />
              {formatLeft(timeLeftMs)} left
            </span>
          )}
          <button type="button" className="sdt-bar__btn" onClick={onGuide}>
            <CircleHelp size={16} aria-hidden="true" />
            <span>Guide</span>
          </button>
          {station && (
            <button type="button" className="sdt-bar__btn" onClick={onPanel} aria-pressed={panelOpen}>
              {panelOpen ? <PanelRightClose size={16} aria-hidden="true" /> : <PanelRightOpen size={16} aria-hidden="true" />}
              <span>{panelOpen ? 'Hide controls' : 'Show controls'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatLeft(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
