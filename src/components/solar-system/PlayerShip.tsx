'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine, ChevronsUp, Crosshair, Globe, HelpCircle, Minus, Moon, Orbit, Pause, Play,
  Plus, Radio, Rocket, Ruler, Satellite, Shield, Sparkles, Star, X, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { attachDesktopControls, clearFlightInput, zoomFlightCamera } from '@/lib/solar-system/flight-input';
import { type FlightSession, type ShipKind } from '@/lib/solar-system/player-ship';
import { FlightGear, FlightJumpCard } from './FlightDrive';
import { GameStick } from './GameStick';

interface PlayerShipProps {
  session: FlightSession;
  onActiveChange: (active: boolean) => void;
  /** The ship is low over the Moon and the pilot asked to go down. */
  onLand: () => void;
  /** Moon Mode has the screen; the deck stays paused underneath. */
  landed: boolean;
}
const SHIPS: ShipKind[] = ['kestrel', 'xfoil', 'endurance'];
const BARS = ['shield', 'energy', 'boost'] as const;
const KEY_ROWS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r10', 'r7', 'r8', 'r9'] as const;
const TOUCH_ROWS = ['t1', 't2', 't3', 't7', 't6', 't8', 't4', 't5'] as const;
const HELP_SEEN = 'stellar_explore_help';
const ICONS = [Shield, Zap, ChevronsUp];
/** The quick rail down the left edge: a named world, or a kind to walk
 *  through. A rail key only shows when the system it is flown in has one. */
interface RailKey {
  key: string;
  /** A world by name … */
  id?: string;
  /** … or every target of these kinds, walked nearest first. */
  kinds?: string;
  icon: LucideIcon;
}
const RAIL: RailKey[] = [
  { key: 'earth', id: 'earth', icon: Globe },
  { key: 'moon', id: 'moon', icon: Moon },
  { key: 'planets', kinds: 'planet', icon: Sparkles },
  { key: 'iss', id: 'iss', icon: Satellite },
  { key: 'stars', kinds: 'star,blackhole', icon: Star },
];
const RAIL_IDS = new Set(RAIL.map((r) => r.id ?? ''));
const SOLAR_IDS = new Set(['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
const fmt = (n: number) => n >= 1e9 ? `${(n / 1e9).toFixed(1)} B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} M` : n >= 1e4 ? `${Math.round(n / 1000)} K` : n >= 100 ? Math.round(n).toLocaleString('en-US') : n.toFixed(2);

export function PlayerShip({ session, onActiveChange, onLand, landed }: PlayerShipProps) {
  const t = useTranslations('solarSystem.flight');
  const tb = useTranslations('solarSystem.bodies');
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [touch, setTouch] = useState(false);
  const [shipKind, setShipKind] = useState<ShipKind>(session.shipKind);
  const [help, setHelp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const radarRef = useRef<HTMLCanvasElement>(null);
  const placeRef = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const velRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const unitRef = useRef<HTMLElement>(null);
  const modeRef = useRef<HTMLSpanElement>(null);
  const rangeLabelRef = useRef<HTMLSpanElement>(null);
  const rangeRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const markerNameRef = useRef<HTMLSpanElement>(null);
  const commsRef = useRef<HTMLDivElement>(null);
  const commsFromRef = useRef<HTMLSpanElement>(null);
  const commsTextRef = useRef<HTMLParagraphElement>(null);
  const orderRef = useRef<HTMLDivElement>(null);
  const orderTextRef = useRef<HTMLSpanElement>(null);
  const orderBarRef = useRef<HTMLSpanElement>(null);
  const landRef = useRef<HTMLButtonElement>(null);
  const railRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const detachRef = useRef<(() => void) | null>(null);
  const pauseRef = useRef<() => void>(() => {});
  const brakeRef = useRef(false);
  const thrustRef = useRef(0);
  const heldRef = useRef<Partial<Record<'fire' | 'boost' | 'brake', number>>>({});
  const zoomRef = useRef(1);

  useEffect(() => setTouch(window.matchMedia('(pointer: coarse)').matches), []);
  const pause = useCallback(() => {
    if (!session.active || session.paused) return;
    zoomRef.current = session.input.camZoom;
    session.paused = true;
    detachRef.current?.();
    detachRef.current = null;
    clearFlightInput(session.input);
    brakeRef.current = false;
    thrustRef.current = 0;
    heldRef.current = {};
    setPaused(true);
  }, [session]);
  pauseRef.current = pause;
  const attach = () => {
    if (!touch && rootRef.current) detachRef.current = attachDesktopControls(session, rootRef.current, () => pauseRef.current());
  };
  const enter = () => {
    session.shipKind = shipKind;
    session.active = true;
    session.paused = false;
    session.telemetry.kills = 0;
    session.telemetry.odometerKm = 0;
    setActive(true);
    setPaused(false);
    onActiveChange(true);
    // First flight opens the control card; after that it is on the key.
    try {
      if (!localStorage.getItem(HELP_SEEN)) {
        setHelp(true);
        localStorage.setItem(HELP_SEEN, '1');
      }
    } catch {
      // Private mode — just fly.
    }
    attach();
  };
  const resume = () => {
    session.paused = false;
    session.input.camZoom = zoomRef.current;
    setPaused(false);
    attach();
  };
  const land = () => {
    pause();
    onLand();
  };
  const exit = () => {
    detachRef.current?.();
    detachRef.current = null;
    session.active = session.paused = false;
    clearFlightInput(session.input);
    setActive(false);
    setPaused(false);
    setHelp(false);
    onActiveChange(false);
  };
  useEffect(() => {
    const hidden = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', hidden);
      detachRef.current?.();
      session.active = session.paused = false;
      clearFlightInput(session.input);
    };
  }, [pause, session]);

  useEffect(() => {
    if (!active) return;
    const tel = session.telemetry;
    const root = rootRef.current;
    const radar = radarRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let radarPx = 0;
    let vw = 0;
    let vh = 0;
    const resize = () => {
      vw = root?.clientWidth ?? window.innerWidth;
      vh = root?.clientHeight ?? window.innerHeight;
      if (radar) {
        radarPx = radar.clientWidth;
        radar.width = radar.height = Math.round(radarPx * dpr);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    const name = (id: string) => SOLAR_IDS.has(id) ? tb(`${id}.name`) : t.has(`bodies.${id}`) ? t(`bodies.${id}`) : id.toUpperCase();
    const text = (el: HTMLElement | null, value: string) => { if (el && el.textContent !== value) el.textContent = value; };
    let raf = 0;
    let lastPaint = 0;
    const paint = (now: number) => {
      raf = requestAnimationFrame(paint);
      if (now - lastPaint < 33) return;
      lastPaint = now;
      const system = t(`systems.${tel.systemName}`);
      // Where you are, big; what that is, small underneath.
      text(placeRef.current, tel.nearId ? name(tel.nearId) : system);
      text(subRef.current, tel.nearId ? `${t('orbit')} · ${system}` : t('system'));
      text(altRef.current, tel.nearId ? `${fmt(tel.nearAltKm)} km` : '—');
      text(velRef.current, `${fmt(tel.speedKmS)} ${t('kmS')}`);
      // In the jump the dial counts down the light years still to go.
      const jumping = tel.jumpPhase === 'travel';
      text(speedRef.current, fmt(jumping ? tel.targetLy * (1 - tel.jumpT) : tel.speedKmS));
      text(unitRef.current, jumping ? t('lyLeft') : t('kmS'));
      text(modeRef.current, t(`modes.${tel.pilot === 'eva' ? 'eva' : tel.mode}`));
      // The bar reads the way to the target when there is one, and the
      // distance flown when there is not.
      text(rangeLabelRef.current, tel.navId ? t('distance') : t('odometer'));
      text(rangeRef.current, `${fmt(tel.navId ? tel.navKm : tel.odometerKm)} km`);
      root?.style.setProperty('--speed', String(Math.min(1, tel.speedFrac)));
      if (root) root.dataset.view = tel.view;
      let status = '';
      if (tel.crashed) status = t('respawn', { n: Math.ceil(tel.respawnIn) });
      else if (tel.docked) status = t('dockedAt', { body: name(tel.dockedTo) });
      else if (tel.alert) status = t(`alerts.${tel.alert}`, { target: t(`systems.${tel.targetName}`), system });
      else if (tel.supply) status = t('supplying');
      else if (tel.pilot === 'eva') status = t(tel.canBoard ? 'evaBoardTouch' : 'evaOut');
      text(statusRef.current, status);
      // Low over the Moon in the ship: the way down opens.
      const canLand = tel.nearId === 'moon' && tel.nearAltKm < 2500 && tel.pilot === 'ship' && !tel.crashed && tel.jumpPhase === 'none' && !tel.docked && !session.paused;
      if (landRef.current) landRef.current.hidden = !canLand;

      // The rail: a key for every kind of thing this system holds, lit when
      // the deck is locked onto one of them.
      RAIL.forEach((r, i) => {
        const el = railRefs.current[i];
        if (!el) return;
        const kinds = r.kinds ? r.kinds.split(',') : null;
        const on = kinds
          ? tel.navList.some((c) => kinds.includes(c.kind))
          : tel.navList.some((c) => c.id === r.id);
        el.hidden = !on;
        const active = kinds ? kinds.includes(tel.navKind) && !RAIL_IDS.has(tel.navId) : tel.navId === r.id;
        el.dataset.on = String(active);
      });

      // Incoming transmission: the harbour that hails, one line at a time.
      const comms = commsRef.current;
      if (comms) {
        const key = `comms.${tel.commsFrom}.l${tel.commsLine}`;
        const on = tel.commsLine > 0 && t.has(key);
        comms.hidden = !on;
        if (on) {
          text(commsFromRef.current, t('commsHeader', { from: name(tel.commsFrom) }));
          text(commsTextRef.current, t(key));
        }
      }

      // Standing order: the world the deck wants taken apart.
      const order = orderRef.current;
      if (order) {
        const on = !!tel.orderId || tel.orderDone;
        order.hidden = !on;
        order.dataset.done = String(tel.orderDone);
        if (on) {
          text(orderTextRef.current, tel.orderDone ? t('orderDone') : t('order', { body: name(tel.orderId) }));
          orderBarRef.current?.style.setProperty('transform', `scaleX(${tel.orderDone ? 0 : tel.orderIntegrity})`);
        }
      }
      const levels = [tel.shield / tel.maxShield, tel.energy, tel.boostCharge];
      levels.forEach((level, i) => {
        barRefs.current[i]?.style.setProperty('transform', `scaleX(${Math.max(0, Math.min(1, level))})`);
      });
      const marker = markerRef.current;
      if (marker) {
        const locked = tel.navId && tel.nav.on;
        const show = !tel.crashed && (locked || tel.markerCount > 0);
        marker.hidden = !show;
        if (show) {
          const x = locked ? (tel.nav.x * 0.5 + 0.5) * vw : tel.markers[0];
          const y = locked ? (-tel.nav.y * 0.5 + 0.5) * vh : tel.markers[1];
          marker.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
          const id = locked ? tel.navId : tel.markerIds[0];
          text(markerNameRef.current, id === 'jump' ? t(`systems.${tel.targetName}`) : name(id));
        }
      }

      if (radar && radarPx > 0) {
        const ctx = radar.getContext('2d');
        if (ctx) {
          const c = radar.width / 2;
          const r = c - 3 * dpr;
          ctx.clearRect(0, 0, radar.width, radar.height);
          ctx.lineWidth = dpr;
          ctx.strokeStyle = 'rgba(160, 210, 245, 0.3)';
          for (const k of [0.4, 0.7, 1]) {
            ctx.beginPath(); ctx.arc(c, c, r * k, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.fillStyle = 'rgba(160, 210, 245, 0.9)';
          ctx.beginPath(); ctx.moveTo(c, c - 5 * dpr); ctx.lineTo(c + 3 * dpr, c + 4 * dpr);
          ctx.lineTo(c - 3 * dpr, c + 4 * dpr); ctx.closePath(); ctx.fill();
          for (let i = 0; i < tel.radarCount; i++) {
            ctx.beginPath(); ctx.arc(c + tel.radar[i * 2] * r, c - tel.radar[i * 2 + 1] * r, 2 * dpr, 0, Math.PI * 2); ctx.fill();
          }
          if (tel.navId) {
            ctx.beginPath(); ctx.arc(c + tel.navRadarX * r * 0.9, c - tel.navRadarY * r * 0.9, 3 * dpr, 0, Math.PI * 2); ctx.stroke();
          }
        }
      }
    };
    raf = requestAnimationFrame(paint);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [active, paused, touch, session, t, tb]);

  const hold = (key: 'fire' | 'boost' | 'brake') => {
    const release = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (heldRef.current[key] !== e.pointerId) return;
      delete heldRef.current[key];
      if (key === 'brake') {
        brakeRef.current = false;
        session.input.thrust = thrustRef.current;
      } else session.input[key] = false;
    };
    return {
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (session.paused || e.button !== 0 || heldRef.current[key] !== undefined) return;
        e.preventDefault();
        heldRef.current[key] = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        if (key === 'brake') {
          brakeRef.current = true;
          session.input.thrust = -1;
        } else session.input[key] = true;
      },
      onPointerUp: release, onPointerCancel: release, onLostPointerCapture: release,
    };
  };
  /** A rail key: a named world goes straight on the nav, a kind walks it. */
  const pick = (r: RailKey) => {
    if (session.paused) return;
    if (r.id) session.input.targetRequest = r.id;
    else session.input.targetKind = r.kinds ?? null;
  };
  const railLabel = (key: string) =>
    key === 'earth' ? tb('earth.name') : key === 'planets' || key === 'stars' ? t(`groups.${key}`) : t(`bodies.${key}`);

  return (
    <div ref={rootRef} className="flight-hud" data-touch={touch} data-phase={active ? 'flying' : 'idle'} data-paused={paused} hidden={landed}>
      {!active ? (
        <div className="flight-hud__launch">
          <button type="button" className="flight-hud__ship" onClick={() => setShipKind(SHIPS[(SHIPS.indexOf(shipKind) + 1) % SHIPS.length])} aria-label={t('hangar')}>
            {t(`ships.${shipKind}`)}
          </button>
          <button type="button" className="flight-hud__explore" onClick={enter}><Rocket size={16} aria-hidden />{t('explore')}</button>
        </div>
      ) : (
        <>
          <div className="flight-hud__head">
            <span ref={placeRef} className="flight-hud__title" />
            <span ref={subRef} className="flight-hud__sub" />
            <div className="flight-hud__readings">
              <span className="flight-hud__reading"><Ruler size={15} aria-hidden /><span>{t('alt')}</span><b ref={altRef} /></span>
              <span className="flight-hud__reading"><Orbit size={15} aria-hidden /><span>{t('speed')}</span><b ref={velRef} /></span>
            </div>
            <span ref={statusRef} className="flight-hud__status" role="status" />
          </div>

          {/* Top right: the session keys, round and out of the way. */}
          <div className="flight-hud__top-keys">
            <button type="button" className="flight-hud__round" onClick={() => { session.input.targetStep = 1; }} disabled={paused} aria-label={t('target')} title={t('target')}>
              <Crosshair size={19} aria-hidden />
            </button>
            <button type="button" className="flight-hud__round" onClick={() => setHelp((h) => !h)} aria-label={t('helpShow')} aria-expanded={help}>
              <HelpCircle size={19} aria-hidden />
            </button>
            <button type="button" className="flight-hud__round" onClick={paused ? resume : pause} aria-label={t(paused ? 'resume' : 'pause')}>
              {paused ? <Play size={19} aria-hidden /> : <Pause size={19} aria-hidden />}
            </button>
            {paused && <button type="button" className="flight-hud__round" onClick={exit} aria-label={t('exit')}><X size={19} aria-hidden /></button>}
          </div>

          {/* Right: the drive card, the standing order, and the camera keys
              under them — one column, so nothing on this side can collide. */}
          <div className="flight-hud__side">
            <FlightJumpCard session={session} paused={paused} touch={touch} />
            <div ref={orderRef} className="flight-hud__card flight-hud__order" hidden>
              <span className="flight-hud__card-icon"><Radio size={18} aria-hidden /></span>
              <span className="flight-hud__card-text">
                <span className="flight-hud__card-label">{t('orderTitle')}</span>
                <span ref={orderTextRef} className="flight-hud__card-value" />
                <span className="flight-hud__track"><span ref={orderBarRef} /></span>
              </span>
              <span className="flight-hud__dot" aria-hidden />
            </div>
            <div className="flight-hud__cam">
              <div className="flight-hud__zoom">
                <button type="button" onClick={() => zoomFlightCamera(session.input, -1)} disabled={paused} aria-label={t('camIn')} title={t('camIn')}><Plus size={18} aria-hidden /></button>
                <button type="button" onClick={() => zoomFlightCamera(session.input, 1)} disabled={paused} aria-label={t('camOut')} title={t('camOut')}><Minus size={18} aria-hidden /></button>
              </div>
              <button type="button" className="flight-hud__view" onClick={() => { session.input.viewToggle = true; }} disabled={paused} aria-label={t('view')} title={t('view')}>3D</button>
            </div>
          </div>

          {/* Left: one key per kind of thing out there. */}
          <div className="flight-hud__rail" role="group" aria-label={t('targets')}>
            {RAIL.map((r, i) => { const Icon = r.icon; return (
              <button key={r.key} ref={(el) => { railRefs.current[i] = el; }} type="button" className="flight-hud__rail-key"
                onClick={() => pick(r)} disabled={paused} hidden>
                <span className="flight-hud__rail-icon"><Icon size={16} aria-hidden /></span>
                <span>{railLabel(r.key)}</span>
              </button>
            ); })}
          </div>

          {help && (
            <div className="flight-hud__help" role="dialog" aria-label={t('help')}>
              <div className="flight-hud__help-head">
                <span>{t('help')}</span>
                <button type="button" onClick={() => setHelp(false)} aria-label={t('exit')}><X size={14} aria-hidden /></button>
              </div>
              {(touch ? TOUCH_ROWS : KEY_ROWS).map((k) => <p key={k}>{t(`keys.${k}`)}</p>)}
            </div>
          )}
          <div ref={markerRef} className="flight-hud__marker" hidden><span ref={markerNameRef} /></div>
          <div ref={commsRef} className="flight-hud__comms" role="status" hidden>
            <span ref={commsFromRef} className="flight-hud__comms-from" />
            <p ref={commsTextRef} />
          </div>

          {/* The dock: the pads, the keys between them, the console bar. */}
          <div className="flight-hud__dock">
            <button ref={landRef} type="button" className="flight-hud__land" onClick={land} hidden>
              <ArrowDownToLine size={16} aria-hidden />{t('land')}
            </button>
            {touch && <>
              <div className="flight-hud__move">
                {!paused && <GameStick label={t('move')} onMove={(x, y) => {
                  thrustRef.current = y;
                  session.input.thrust = brakeRef.current ? -1 : y;
                  session.input.yaw = x;
                }} />}
              </div>
              <div className="flight-hud__look">
                {!paused && <GameStick label={t('look')} onMove={(x, y) => {
                  session.input.lookYaw = x;
                  session.input.pitch = y;
                }} />}
              </div>
            </>}
            <div className="flight-hud__keys">
              <FlightGear session={session} paused={paused} touch={touch} />
              {touch ? (
                <>
                  <button type="button" className="flight-hud__key" {...hold('fire')} disabled={paused} aria-label={t('fire')} title={t('fire')}><Crosshair size={20} aria-hidden /><span>{t('fire')}</span></button>
                  <button type="button" className="flight-hud__key" {...hold('boost')} disabled={paused} aria-label={t('boost')} title={t('boost')}><ChevronsUp size={20} aria-hidden /><span>{t('boost')}</span></button>
                  <button type="button" className="flight-hud__key" {...hold('brake')} disabled={paused} aria-label={t('brake')} title={t('brake')}><Pause size={16} aria-hidden /><span>{t('brake')}</span></button>
                </>
              ) : (
                <button type="button" className="flight-hud__key" onClick={() => { session.input.foilsToggle = true; }} aria-label={t('foils')} title={t('foils')} disabled={paused}>
                  <ChevronsUp size={18} aria-hidden /><span>{t('foils')}</span>
                </button>
              )}
            </div>
            <div className="flight-hud__console">
              <button type="button" className="flight-hud__radar" aria-label={t('target')} onClick={() => { session.input.targetStep = 1; }} disabled={paused}>
                <canvas ref={radarRef} aria-hidden />
              </button>
              <div className="flight-hud__range">
                <span ref={rangeLabelRef} className="flight-hud__console-label" />
                <span ref={rangeRef} className="flight-hud__console-value">0 km</span>
              </div>
              <div className="flight-hud__speed">
                <svg viewBox="0 0 120 120" aria-hidden>
                  <circle cx="60" cy="60" r="52" />
                  <circle className="flight-hud__speed-arc" cx="60" cy="60" r="52" pathLength="1" />
                </svg>
                <span ref={modeRef} className="flight-hud__console-label" />
                <span ref={speedRef} className="flight-hud__speed-value">0</span><small ref={unitRef}>{t('kmS')}</small>
              </div>
              <div className="flight-hud__systems">
                {BARS.map((key, i) => { const Icon = ICONS[i]; return <div key={key} className="flight-hud__sys" aria-label={t(key)}>
                  <Icon size={15} aria-hidden /><span className="flight-hud__sys-name">{t(key)}</span>
                  <span className="flight-hud__track"><span ref={(el) => { barRefs.current[i] = el; }} /></span>
                </div>; })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
