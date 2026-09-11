'use client';

import { useTranslations } from 'next-intl';
import { BatteryFull, ChevronDown, Loader2, Plus, Telescope } from 'lucide-react';
import type { Axis } from '@/lib/observatory/mount-drive';
import type { Station } from '@/lib/observatory/sim-stations';
import { targetTitle, type TelescopeTarget } from '@/lib/observatory/telescope-targets';
import ArrowPad from './ArrowPad';
import SitePlot from './SitePlot';
import StepLabel, { type StepState } from './StepLabel';

export type GotoState = 'idle' | 'slewing' | 'solving' | 'centring' | 'tracking';
export type ObsMode = 'astrophoto' | 'planetary' | 'lunar';
export type RunState = 'todo' | 'running' | 'done';

export type ControlsProps = {
  station: Station;
  battery: number;
  park: RunState;
  onPark: () => void;
  cal: RunState;
  onCalibrate: () => void;
  view: 'explore' | 'data';
  onView: (v: 'explore' | 'data') => void;
  target: TelescopeTarget | null;
  coords: { ra: string; dec: string } | null;
  onChooseTarget: () => void;
  manual: boolean;
  onManual: (on: boolean) => void;
  manualRa: string;
  manualDec: string;
  onManualRa: (v: string) => void;
  onManualDec: (v: string) => void;
  goto: GotoState;
  canPoint: boolean;
  refusal: string | null;
  onPoint: () => void;
  onCancelGoto: () => void;
  fine: boolean;
  onFine: (on: boolean) => void;
  padEnabled: boolean;
  onPress: (axis: Axis, dir: 1 | -1) => void;
  onRelease: (axis: Axis) => void;
  obsMode: ObsMode;
  onObsMode: (m: ObsMode) => void;
  observing: 'idle' | 'starting' | 'running';
  elapsed: string;
  canStart: boolean;
  onStart: () => void;
  onStop: () => void;
  canCapture: boolean;
  capturing: boolean;
  onCapture: () => void;
};

const step = (done: boolean, active: boolean): StepState => (done ? 'done' : active ? 'active' : 'todo');

const Spinner = () => <Loader2 size={16} className="tel-spin" aria-hidden="true" />;

/** The left rail: where the telescope is, and the four steps to a frame, in order. */
export default function ControlsPanel(p: ControlsProps) {
  const t = useTranslations('observatory.telescope');
  const parked = p.park === 'done';
  const calibrated = p.cal === 'done';
  const pointed = p.goto === 'tracking';
  const inGoto = p.goto === 'slewing' || p.goto === 'solving' || p.goto === 'centring';
  const busy = p.park === 'running' || p.cal === 'running';

  return (
    <aside className="tel-rail" aria-label={t('controls')}>
      <section className="tel-rail__section">
        <h2 className="tel-rail__title">{t('location')}</h2>
        <SitePlot lat={p.station.lat} lon={p.station.lon} />
        <dl className="tel-kv">
          <div><dt>{t('latitude')}</dt><dd>{Math.abs(p.station.lat).toFixed(2)}°{p.station.lat >= 0 ? 'N' : 'S'}</dd></div>
          <div><dt>{t('longitude')}</dt><dd>{Math.abs(p.station.lon).toFixed(2)}°{p.station.lon >= 0 ? 'E' : 'W'}</dd></div>
          <div><dt>{t('altitude')}</dt><dd>{p.station.elevationM.toLocaleString()} m</dd></div>
          <div><dt>{t('battery')}</dt><dd>{p.battery}% <BatteryFull size={14} aria-hidden="true" /></dd></div>
        </dl>
      </section>

      <section className="tel-rail__section">
        <StepLabel n={1} state={step(parked, !parked)}>{t('step1')}</StepLabel>
        <button type="button" className={`tel-btn${!parked && !busy ? ' tel-btn--focus' : ''}`} disabled={busy || parked} onClick={p.onPark}>
          {p.park === 'running' ? <><Spinner />{t('parking')}</> : t('park')}
        </button>

        <StepLabel n={2} state={step(calibrated, parked && !calibrated)}>{t('step2')}</StepLabel>
        <button
          type="button"
          className={`tel-btn${parked && !calibrated && !busy ? ' tel-btn--focus' : ''}`}
          disabled={!parked || busy || inGoto}
          onClick={p.onCalibrate}
        >
          {p.cal === 'running' ? <><Spinner />{t('calibrating')}</> : calibrated ? t('recalibrate') : t('calibrate')}
        </button>
      </section>

      <section className="tel-rail__section">
        <div className="tel-seg" role="tablist" aria-label={t('viewMode')}>
          {(['explore', 'data'] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={p.view === v} className="tel-seg__item" disabled={!calibrated} onClick={() => p.onView(v)}>
              {t(v === 'explore' ? 'exploreMode' : 'dataMode')}
            </button>
          ))}
        </div>

        <StepLabel n={3} state={step(pointed, calibrated && !pointed)}>{t('step3')}</StepLabel>
        <p className="tel-rail__sub">{t('pointToTarget')}</p>
        <label className="tel-switch">
          <span>{t('manualCoords')}</span>
          <input type="checkbox" role="switch" checked={p.manual} disabled={!calibrated || inGoto} onChange={(e) => p.onManual(e.target.checked)} />
          <span className="tel-switch__track" aria-hidden="true" />
        </label>

        {p.manual ? (
          <div className="tel-coords tel-coords--edit">
            <label><span>{t('ra')}</span><input className="tel-input" value={p.manualRa} placeholder="00:42:44.3" onChange={(e) => p.onManualRa(e.target.value)} disabled={inGoto} /></label>
            <label><span>{t('dec')}</span><input className="tel-input" value={p.manualDec} placeholder="+41:16:07.5" onChange={(e) => p.onManualDec(e.target.value)} disabled={inGoto} /></label>
          </div>
        ) : (
          <>
            <button type="button" className="tel-btn tel-btn--between" disabled={!calibrated || inGoto} onClick={p.onChooseTarget}>
              <span className="tel-btn__truncate">{p.target ? t('observeTarget', { name: targetTitle(p.target) }) : t('chooseTarget')}</span>
              <Plus size={16} aria-hidden="true" />
            </button>
            <dl className="tel-coords">
              <div><dt>{t('ra')}</dt><dd>{p.coords?.ra ?? '–'}</dd></div>
              <div><dt>{t('dec')}</dt><dd>{p.coords?.dec ?? '–'}</dd></div>
            </dl>
          </>
        )}

        {inGoto ? (
          <>
            <p className="tel-rail__status">
              {t(p.goto === 'slewing' ? 'goingTo' : p.goto === 'solving' ? 'solving' : 'centring')}
            </p>
            <button type="button" className="tel-btn tel-btn--danger tel-btn--focus" onClick={p.onCancelGoto}>{t('cancelGoto')}</button>
          </>
        ) : (
          <button type="button" className={`tel-btn${p.canPoint && !pointed ? ' tel-btn--focus' : ''}`} disabled={!p.canPoint} onClick={p.onPoint}>
            {t('pointButton')}
          </button>
        )}
        {p.refusal && <p className="tel-rail__refusal" role="alert">{p.refusal}</p>}

        <div className="tel-rail__row">
          <span className="tel-rail__sub">{t('manualControl')}</span>
          <label className="tel-check">
            {t('fineControl')}
            <input type="checkbox" checked={p.fine} onChange={(e) => p.onFine(e.target.checked)} disabled={!calibrated} />
          </label>
        </div>
        <ArrowPad
          disabled={!p.padEnabled}
          labels={{ group: t('manualControl'), left: t('padLeft'), up: t('padUp'), down: t('padDown'), right: t('padRight') }}
          onPress={p.onPress}
          onRelease={p.onRelease}
        />
      </section>

      <section className="tel-rail__section">
        <StepLabel n={4} state={step(p.observing === 'running', pointed && p.observing !== 'running')}>{t('step4')}</StepLabel>
        <p className="tel-rail__sub">{t('settings')}</p>
        <label className="tel-select">
          <select value={p.obsMode} disabled={p.observing !== 'idle'} onChange={(e) => p.onObsMode(e.target.value as ObsMode)}>
            <option value="astrophoto">{t('modeAstrophoto')}</option>
            <option value="planetary">{t('modePlanetary')}</option>
            <option value="lunar">{t('modeLunar')}</option>
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>

        {p.observing === 'running' ? (
          <>
            <div className="tel-kv tel-kv--single"><div><dt>{t('elapsed')}</dt><dd>{p.elapsed}</dd></div></div>
            <button type="button" className="tel-btn tel-btn--danger" onClick={p.onStop}>{t('stopObservation')}</button>
          </>
        ) : (
          <button type="button" className="tel-btn tel-btn--go" disabled={!p.canStart || p.observing === 'starting'} onClick={p.onStart}>
            {p.observing === 'starting' ? <><Spinner />{t('starting')}</> : <><Telescope size={16} aria-hidden="true" />{t('startObservation')}</>}
          </button>
        )}
        <button type="button" className="tel-btn tel-btn--capture" disabled={!p.canCapture || p.capturing} onClick={p.onCapture}>
          {p.capturing ? <Spinner /> : <span className="tel-btn__badge">{t('captureCost')}</span>}
          {p.capturing ? t('capturing') : t('captureImage')}
        </button>
      </section>
    </aside>
  );
}
