'use client';

import { BatteryFull, ChevronDown, Loader2, Plus, Telescope, Unplug } from 'lucide-react';
import ArrowPad from '@/components/telescope/ArrowPad';
import SitePlot from '@/components/telescope/SitePlot';
import StepLabel, { type StepState } from '@/components/telescope/StepLabel';
import type { Axis } from '@/lib/observatory/mount-drive';
import type { Station } from '@/lib/observatory/sim-stations';
import { targetTitle, type TelescopeTarget } from '@/lib/observatory/telescope-targets';
import Frames, { type Capture } from './Frames';
import { stationName } from './stations';

export type GotoState = 'idle' | 'slewing' | 'solving' | 'centring' | 'tracking';
export type ObsMode = 'astrophoto' | 'planetary' | 'lunar';
export type RunState = 'todo' | 'running' | 'done';

export type DeskPanelProps = {
  station: Station;
  battery: number;
  onDisconnect: () => void;
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
  captures: Capture[];
  onOpenCapture: (c: Capture) => void;
};

const step = (done: boolean, active: boolean): StepState => (done ? 'done' : active ? 'active' : 'todo');

const Spinner = () => <Loader2 size={16} className="sdt-spin" aria-hidden="true" />;

const PAD_LABELS = { group: 'Hand control', left: 'Slew west', up: 'Slew up', down: 'Slew down', right: 'Slew east' };

/** The right of the desk: the station, then the four steps to a frame, in order, then the frames. */
export default function DeskPanel(p: DeskPanelProps) {
  const parked = p.park === 'done';
  const calibrated = p.cal === 'done';
  const pointed = p.goto === 'tracking';
  const inGoto = p.goto === 'slewing' || p.goto === 'solving' || p.goto === 'centring';
  const busy = p.park === 'running' || p.cal === 'running';

  return (
    <aside className="sdt-panel" aria-label="Controls">
      <section className="sdt-card sdt-site">
        <div className="sdt-site__head">
          <div>
            <p className="sd-label">Connected</p>
            <h2 className="sdt-site__name">{stationName(p.station)}</h2>
            <p className="sdt-site__meta">
              {p.station.site} · {p.station.instrument.optics}
            </p>
          </div>
          <button type="button" className="sdt-icon-btn" onClick={p.onDisconnect} aria-label="Disconnect" title="Disconnect">
            <Unplug size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="sdt-site__body">
          <SitePlot lat={p.station.lat} lon={p.station.lon} />
          <dl className="sdt-kv">
            <div><dt>Latitude</dt><dd>{Math.abs(p.station.lat).toFixed(2)}°{p.station.lat >= 0 ? 'N' : 'S'}</dd></div>
            <div><dt>Longitude</dt><dd>{Math.abs(p.station.lon).toFixed(2)}°{p.station.lon >= 0 ? 'E' : 'W'}</dd></div>
            <div><dt>Altitude</dt><dd>{p.station.elevationM.toLocaleString('en-US')} m</dd></div>
            <div><dt>Battery</dt><dd>{p.battery}% <BatteryFull size={14} aria-hidden="true" /></dd></div>
          </dl>
        </div>
      </section>

      <section className="sdt-card">
        <StepLabel n={1} state={step(parked, !parked)}>Park at zenith</StepLabel>
        <button type="button" className={`sdt-btn${!parked && !busy ? ' sdt-btn--next' : ''}`} disabled={busy || parked} onClick={p.onPark}>
          {p.park === 'running' ? <><Spinner />Parking…</> : parked ? 'Parked at zenith' : 'Park at zenith'}
        </button>

        <StepLabel n={2} state={step(calibrated, parked && !calibrated)}>Calibrate</StepLabel>
        <button
          type="button"
          className={`sdt-btn${parked && !calibrated && !busy ? ' sdt-btn--next' : ''}`}
          disabled={!parked || busy || inGoto}
          onClick={p.onCalibrate}
        >
          {p.cal === 'running' ? <><Spinner />Calibrating…</> : calibrated ? 'Re-calibrate' : 'Calibrate'}
        </button>
      </section>

      <section className="sdt-card">
        <StepLabel n={3} state={step(pointed, calibrated && !pointed)}>Choose a target and point</StepLabel>

        <label className="sdt-switch">
          <span>Manual coordinates</span>
          <input type="checkbox" role="switch" checked={p.manual} disabled={!calibrated || inGoto} onChange={(e) => p.onManual(e.target.checked)} />
          <span className="sdt-switch__track" aria-hidden="true" />
        </label>

        {p.manual ? (
          <div className="sdt-coords sdt-coords--edit">
            <label>
              <span>RA (h:m:s)</span>
              <input className="sdt-input" value={p.manualRa} placeholder="00:42:44.3" onChange={(e) => p.onManualRa(e.target.value)} disabled={inGoto} inputMode="decimal" />
            </label>
            <label>
              <span>Dec (d:m:s)</span>
              <input className="sdt-input" value={p.manualDec} placeholder="+41:16:07.5" onChange={(e) => p.onManualDec(e.target.value)} disabled={inGoto} inputMode="decimal" />
            </label>
          </div>
        ) : (
          <>
            <button type="button" className="sdt-btn sdt-btn--between" disabled={!calibrated || inGoto} onClick={p.onChooseTarget}>
              <span className="sdt-btn__truncate">{p.target ? targetTitle(p.target) : 'Choose target'}</span>
              <Plus size={16} aria-hidden="true" />
            </button>
            <dl className="sdt-coords">
              <div><dt>RA</dt><dd>{p.coords?.ra ?? '–'}</dd></div>
              <div><dt>Dec</dt><dd>{p.coords?.dec ?? '–'}</dd></div>
            </dl>
          </>
        )}

        {inGoto ? (
          <>
            <p className="sdt-note" role="status">
              <Spinner />
              {p.goto === 'slewing' ? 'Going to coordinates…' : p.goto === 'solving' ? 'Plate-solving the field…' : 'Centring the target…'}
            </p>
            <button type="button" className="sdt-btn sdt-btn--danger" onClick={p.onCancelGoto}>Cancel GoTo</button>
          </>
        ) : (
          <button type="button" className={`sdt-btn${p.canPoint && !pointed ? ' sdt-btn--next' : ''}`} disabled={!p.canPoint} onClick={p.onPoint}>
            {pointed ? 'Point again' : 'Point to target'}
          </button>
        )}
        {p.refusal && <p className="sdt-refusal" role="alert">{p.refusal}</p>}

        <div className="sdt-row">
          <span className="sd-label">Hand control</span>
          <label className="sdt-check">
            <input type="checkbox" checked={p.fine} onChange={(e) => p.onFine(e.target.checked)} disabled={!calibrated} />
            Fine
          </label>
        </div>
        <ArrowPad disabled={!p.padEnabled} labels={PAD_LABELS} onPress={p.onPress} onRelease={p.onRelease} />
        <p className="sdt-hint">Hold a key to slew. The arrow keys work too; F fills the screen.</p>
      </section>

      <section className="sdt-card">
        <StepLabel n={4} state={step(p.observing === 'running', pointed && p.observing !== 'running')}>Observe and capture</StepLabel>

        <div className="sdt-seg" role="tablist" aria-label="View">
          {(['explore', 'data'] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={p.view === v} className="sdt-seg__item" disabled={!calibrated} onClick={() => p.onView(v)}>
              {v === 'explore' ? 'Explore' : 'Telemetry'}
            </button>
          ))}
        </div>

        <label className="sdt-select">
          <span className="sr-only">Observation mode</span>
          <select value={p.obsMode} disabled={p.observing !== 'idle'} onChange={(e) => p.onObsMode(e.target.value as ObsMode)}>
            <option value="astrophoto">Astrophoto · 8 s subs</option>
            <option value="planetary">Planetary · 2× Barlow, 20 ms</option>
            <option value="lunar">Lunar · reducer, 10 ms</option>
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>

        {p.observing === 'running' ? (
          <>
            <dl className="sdt-kv sdt-kv--single"><div><dt>Elapsed</dt><dd>{p.elapsed}</dd></div></dl>
            <button type="button" className="sdt-btn sdt-btn--danger" onClick={p.onStop}>Stop observation</button>
          </>
        ) : (
          <button type="button" className={`sdt-btn${p.canStart ? ' sdt-btn--next' : ''}`} disabled={!p.canStart || p.observing === 'starting'} onClick={p.onStart}>
            {p.observing === 'starting' ? <><Spinner />Starting…</> : <><Telescope size={16} aria-hidden="true" />Start observation</>}
          </button>
        )}
        <button type="button" className="sd-btn sd-btn--primary sdt-capture" disabled={!p.canCapture || p.capturing} onClick={p.onCapture}>
          {p.capturing ? <><Spinner />Capturing…</> : 'Capture this frame'}
        </button>
        {!p.canCapture && <p className="sdt-hint">Capture opens once the mount is tracking a target.</p>}
      </section>

      <Frames captures={p.captures} onOpen={p.onOpenCapture} />
    </aside>
  );
}
