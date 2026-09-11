'use client';

import { useTranslations } from 'next-intl';
import { Clock, PanelLeftClose, PanelLeftOpen, Unplug, Upload } from 'lucide-react';
import type { Station } from '@/lib/observatory/sim-stations';
import StationMenu from './StationMenu';

/** The strip under the header: controls toggle, which telescope, what it is doing, how long is left. */
export default function TelescopeToolbar({
  controlsOpen,
  onControls,
  station,
  now,
  menuOpen,
  onMenu,
  onSelect,
  onDisconnect,
  status,
  captures,
  timeLeftMs,
}: {
  controlsOpen: boolean;
  onControls: () => void;
  station: Station | null;
  now: number;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  onSelect: (s: Station) => void;
  onDisconnect: () => void;
  status: string | null;
  captures: number;
  timeLeftMs: number | null;
}) {
  const t = useTranslations('observatory.telescope');
  const left = timeLeftMs === null ? null : formatLeft(timeLeftMs);

  return (
    <div className="tel-toolbar">
      <button type="button" className="tel-toolbar__toggle" onClick={onControls} aria-pressed={controlsOpen} disabled={!station}>
        {controlsOpen ? <PanelLeftClose size={20} aria-hidden="true" /> : <PanelLeftOpen size={20} aria-hidden="true" />}
        <span>{t(controlsOpen ? 'hideControls' : 'showControls')}</span>
      </button>

      <StationMenu current={station} now={now} open={menuOpen} onOpen={onMenu} onSelect={onSelect} />

      {station && (
        <button type="button" className="tel-toolbar__disconnect" onClick={onDisconnect}>
          <Unplug size={18} aria-hidden="true" />
          <span>{t('disconnect')}</span>
        </button>
      )}
      {status && <span className="tel-toolbar__status">{status}</span>}

      <div className="tel-toolbar__right">
        {captures > 0 && <span className="tel-toolbar__count">{t('framesCaptured', { count: captures })}</span>}
        {left && (
          <span className="tel-toolbar__time">
            <span className="tel-toolbar__pill"><Clock size={13} aria-hidden="true" />{t('timeLeft', { time: left })}</span>
            <span className="tel-toolbar__legend">{t('legend')}</span>
          </span>
        )}
        <button type="button" className="tel-toolbar__upload" disabled title={t('uploadHint')}>
          <Upload size={15} aria-hidden="true" />
          {t('upload')}
        </button>
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
