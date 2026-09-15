'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera, ChevronsDown, ChevronsUp, Drill, Eye, EyeOff, Flame, Gauge, HelpCircle,
  LogIn, Menu, Rocket, Trophy, Wind, X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { makeMoonSurface, type MoonSurfaceHandle } from '@/lib/solar-system/moon-surface';
import { GameStick } from './GameStick';

interface MoonSurfaceProps {
  onReturn: () => void;
}

const KEY_ROWS = ['r1', 'r2', 'r9', 'r3', 'r4', 'r5', 'r10', 'r6', 'r11', 'r12', 'r8', 'r7'] as const;
const TOUCH_ROWS = ['t1', 't2', 't3', 't7', 't4', 't8', 't9', 't6', 't5'] as const;
const HANDLED = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyC', 'KeyF', 'KeyV', 'ControlLeft',
  'Digit1', 'Digit2', 'Digit3', 'Digit4',
]);
const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtRange = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);
/** How wide a degree of the compass is, and how far round it is drawn. */
const PPD = 3.1;
const TURNS = 3;

export function MoonSurface({ onReturn }: MoonSurfaceProps) {
  const t = useTranslations('solarSystem.moon');
  const [touch, setTouch] = useState(false);
  const [help, setHelp] = useState(false);
  const [menu, setMenu] = useState(false);
  const [log, setLog] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [run, setRun] = useState(false);
  const [crouch, setCrouch] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<MoonSurfaceHandle | null>(null);
  // Landing panel.
  const landAltRef = useRef<HTMLSpanElement>(null);
  const landRateRef = useRef<HTMLSpanElement>(null);
  const landOffRef = useRef<HTMLSpanElement>(null);
  const landDriftRef = useRef<HTMLSpanElement>(null);
  const landFuelRef = useRef<HTMLSpanElement>(null);
  const landThrRef = useRef<HTMLSpanElement>(null);
  const assistRef = useRef<HTMLDivElement>(null);
  const plaqueRef = useRef<HTMLDivElement>(null);
  const plaqueGradeRef = useRef<HTMLSpanElement>(null);
  const plaqueSpeedRef = useRef<HTMLSpanElement>(null);
  // Surface.
  const stripRef = useRef<HTMLDivElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const objRef = useRef<HTMLButtonElement>(null);
  const objTextRef = useRef<HTMLSpanElement>(null);
  const objRangeRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const cratersRef = useRef<HTMLSpanElement>(null);
  const poiRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const impactRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const o2Ref = useRef<HTMLSpanElement>(null);
  const o2BarRef = useRef<HTMLSpanElement>(null);
  const hrRef = useRef<HTMLSpanElement>(null);
  const tempRef = useRef<HTMLSpanElement>(null);
  const evaRef = useRef<HTMLSpanElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const actionTextRef = useRef<HTMLSpanElement>(null);
  const workRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLButtonElement>(null);
  const gearTextRef = useRef<HTMLSpanElement>(null);
  const airlockRef = useRef<HTMLDivElement>(null);
  const stanceRef = useRef<HTMLDivElement>(null);
  const movingRef = useRef(false);
  const keyboardMoveRef = useRef({ x: 0, y: 0 });
  const runRef = useRef(false);
  const crouchRef = useRef(false);
  runRef.current = run;
  crouchRef.current = crouch;
  /** What the one contextual key does right now, kept off React. */
  const actionModeRef = useRef<'' | 'use' | 'work'>('');

  useEffect(() => setTouch(window.matchMedia('(pointer: coarse)').matches), []);

  /** The ticks of the compass ribbon: three turns of it, so it never runs out. */
  const ticks = useMemo(() => {
    const out: { deg: number; label: string | null; major: boolean }[] = [];
    const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    for (let d = 0; d < 360 * TURNS; d += 15) {
      const c = d % 360;
      out.push({ deg: d, label: c % 45 === 0 ? names[(c / 45) | 0] : null, major: c % 45 === 0 });
    }
    return out;
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    const root = rootRef.current;
    if (!mount || !root) return;
    const handle = makeMoonSurface(mount);
    handleRef.current = handle;
    const input = handle.input;
    const pressed = new Set<string>();
    const sync = () => {
      const has = (c: string) => pressed.has(c);
      const x = (has('KeyD') || has('ArrowRight') ? 1 : 0) - (has('KeyA') || has('ArrowLeft') ? 1 : 0);
      const y = (has('KeyW') || has('ArrowUp') ? 1 : 0) - (has('KeyS') || has('ArrowDown') ? 1 : 0);
      const len = Math.hypot(x, y) || 1;
      keyboardMoveRef.current = { x: x / len, y: y / len };
      if (!movingRef.current) {
        input.moveX = x / len;
        input.moveY = y / len;
      }
      input.run = has('ShiftLeft') || has('ShiftRight') || runRef.current;
      input.crouch = has('ControlLeft') || crouchRef.current;
      input.work = has('KeyF') || input.work;
      // On the way down, the space bar is the descent engine.
      input.throttle = has('Space') ? 1 : 0;
      input.jump = has('Space') || input.jump;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!HANDLED.has(e.code)) return;
      handle.startAudio();
      if (e.repeat) { e.preventDefault(); return; }
      pressed.add(e.code);
      if (e.code === 'Space') input.jump = true;
      if (e.code === 'KeyF') input.work = true;
      if (e.code === 'KeyE') input.interact = true;
      if (e.code === 'KeyV') input.viewToggle = true;
      if (e.code === 'KeyC') { crouchRef.current = !crouchRef.current; setCrouch(crouchRef.current); }
      if (e.code.startsWith('Digit')) input.gearRequest = Number(e.code.slice(5)) - 1;
      sync();
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!HANDLED.has(e.code)) return;
      pressed.delete(e.code);
      if (e.code === 'Space') input.jump = false;
      if (e.code === 'KeyF') input.work = false;
      sync();
    };
    const onBlur = () => {
      pressed.clear();
      input.moveX = input.moveY = 0;
      input.jump = false; input.run = false; input.work = false; input.throttle = 0;
      keyboardMoveRef.current = { x: 0, y: 0 };
      input.orbitDX = input.orbitDY = 0;
      orbitId = -1;
      runRef.current = false;
      setRun(false);
    };
    const onHidden = () => { if (document.hidden) onBlur(); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onHidden);
    // Press and hold selects nothing and calls up no menu: this is a game.
    const noSelect = (e: Event) => {
      const el = e.target as Element | null;
      if (el && el.closest('.moon-hud__help, .moon-hud__menu, .moon-hud__log')) return;
      e.preventDefault();
    };
    document.addEventListener('selectstart', noSelect);
    document.addEventListener('contextmenu', noSelect);

    // Scene drags orbit the camera independently of the movement station.
    let orbitId = -1;
    let lastX = 0; let lastY = 0;
    const onDown = (e: PointerEvent) => {
      handle.startAudio();
      if (e.button !== 0 || orbitId >= 0) return;
      orbitId = e.pointerId;
      lastX = e.clientX; lastY = e.clientY;
      mount.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId === orbitId) {
        input.orbitDX += e.clientX - lastX;
        input.orbitDY += e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === orbitId) orbitId = -1;
    };
    const onWheel = (e: WheelEvent) => { input.zoom += Math.sign(e.deltaY); e.preventDefault(); };
    mount.addEventListener('pointerdown', onDown);
    mount.addEventListener('pointermove', onMove);
    mount.addEventListener('pointerup', onUp);
    mount.addEventListener('pointercancel', onUp);
    mount.addEventListener('lostpointercapture', onUp);
    mount.addEventListener('wheel', onWheel, { passive: false });

    // HUD paint at ~30 Hz off the telemetry, no React state churn.
    const tel = handle.telemetry;
    const text = (el: HTMLElement | null, v: string) => { if (el && el.textContent !== v) el.textContent = v; };
    const show = (el: HTMLElement | null, on: boolean) => { if (el && el.hidden === on) el.hidden = !on; };
    let raf = 0;
    let lastPaint = 0;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const paint = (now: number) => {
      raf = requestAnimationFrame(paint);
      if (now - lastPaint < 33) return;
      lastPaint = now;
      root.dataset.phase = tel.phase;
      root.dataset.view = tel.view;
      root.dataset.driving = String(tel.view === 'rover' || tel.view === 'cockpit' || tel.view === 'mast');

      // ── The way down. ──
      if (tel.phase !== 'surface') {
        const l = tel.landing;
        text(landAltRef.current, `${l.altitude.toFixed(l.altitude < 10 ? 1 : 0)} m`);
        text(landRateRef.current, `${l.descent.toFixed(1)} m/s`);
        text(landOffRef.current, `${Math.round(l.offset)} m`);
        text(landDriftRef.current, `${l.drift.toFixed(1)} m/s`);
        if (landFuelRef.current) landFuelRef.current.style.width = `${Math.round(l.fuel * 100)}%`;
        if (landThrRef.current) landThrRef.current.style.height = `${Math.round(l.throttle * 100)}%`;
        show(assistRef.current, l.assist);
        show(plaqueRef.current, tel.phase === 'touchdown');
        if (tel.phase === 'touchdown') {
          text(plaqueGradeRef.current, t(`grades.${tel.grade || 'good'}`));
          text(plaqueSpeedRef.current, t('landing.touchdown', { n: l.touchdown.toFixed(2) }));
        }
        return;
      }

      // ── The compass, and the pip for wherever the crew is being sent. ──
      const heading = tel.heading;
      if (stripRef.current) stripRef.current.style.transform = `translateX(${-(heading + 360) * PPD}px)`;
      const m = tel.mission;
      const pip = pipRef.current;
      if (pip) {
        const has = m.hasMarker;
        pip.hidden = !has;
        if (has) {
          let rel = ((m.bearing * 180) / Math.PI - heading + 540) % 360 - 180;
          const edge = Math.abs(rel) > 58;
          rel = Math.max(-58, Math.min(58, rel));
          pip.style.transform = `translateX(calc(-50% + ${rel * PPD}px))`;
          pip.dataset.edge = String(edge);
        }
      }
      // The banner says the same thing louder: only one of them at a time.
      show(objRef.current, (m.hasMarker || m.complete) && !m.banner);
      text(objTextRef.current, t(`mission.${m.objective}`));
      // Standing at a work site, the range is meaningless: show the job.
      text(objRangeRef.current,
        m.task === 'drill' && m.atSite ? `${m.depth.toFixed(1)} m`
        : m.task === 'sweep' && m.atSite ? `${Math.round(m.work * 100)} %`
        : m.distance >= 0 ? fmtRange(m.distance) : '');

      text(altRef.current, `${tel.altitude.toFixed(1)} m`);
      text(speedRef.current, `${tel.speed.toFixed(1)} m/s`);
      text(cratersRef.current, String(tel.craters));
      text(o2Ref.current, `${tel.o2.toFixed(1)}%`);
      if (o2BarRef.current) o2BarRef.current.style.width = `${Math.max(0, Math.min(100, tel.o2))}%`;
      text(hrRef.current, `${Math.round(tel.heartRate)}`);
      text(tempRef.current, `${tel.suitTemp.toFixed(1)}°`);
      text(evaRef.current, fmtTime(tel.evaSeconds));
      text(distRef.current, fmtRange(tel.distanceM));

      // ── The one contextual key: a tap to get on or off, a hold to work. ──
      const driving = tel.view === 'rover' || tel.view === 'cockpit' || tel.view === 'mast';
      const canWork = m.task !== '' && m.atSite;
      const mode: '' | 'use' | 'work' = canWork ? 'work' : (tel.canDrive || driving) ? 'use' : '';
      actionModeRef.current = mode;
      const action = actionRef.current;
      if (action) {
        show(action, mode !== '');
        if (mode !== '') {
          action.dataset.mode = mode;
          const label = mode === 'work'
            ? t(`tasks.${m.task}`)
            : driving ? t(isTouch ? 'dismountTouch' : 'dismount') : t(isTouch ? 'driveTouch' : 'drive');
          text(actionTextRef.current, label);
        }
      }
      const work = workRef.current;
      if (work) {
        const busy = m.work > 0.001 && m.task !== '' && m.task !== 'enter';
        work.hidden = !busy;
        if (busy) {
          work.style.setProperty('--work', String(m.work));
          text(work.firstElementChild as HTMLElement, m.task === 'drill' ? `${m.depth.toFixed(1)} m` : `${Math.round(m.work * 100)}%`);
        }
      }
      // The gear, while there is something to drive.
      const gear = gearRef.current;
      if (gear) {
        show(gear, driving);
        if (driving) {
          gear.dataset.gear = tel.gear;
          text(gearTextRef.current, t(`gears.${tel.gear}`));
        }
      }
      const stance = stanceRef.current;
      if (stance) {
        const s = tel.stumbling ? 'stumble' : tel.sliding ? 'slide' : tel.crouched ? 'crouch' : '';
        stance.hidden = !s || driving;
        if (s) text(stance, t(`stance.${s}`));
      }
      show(airlockRef.current, tel.airlockOpen && !driving);
      const poi = poiRef.current;
      if (poi) {
        poi.hidden = !tel.poiId;
        if (tel.poiId) text(poi, t(`pois.${tel.poiId}`));
      }
      const hintKey = tel.hint ? (isTouch ? `hints.${tel.hint}Touch` : `hints.${tel.hint}`) : '';
      const hint = hintRef.current;
      if (hint) {
        hint.hidden = !hintKey;
        if (hintKey) text(hint, t(hintKey));
      }
      const banner = bannerRef.current;
      if (banner) {
        banner.hidden = !m.banner;
        if (m.banner) text(banner.firstElementChild as HTMLElement, t(`mission.${m.banner}`));
      }
      const impact = impactRef.current;
      if (impact) {
        impact.hidden = tel.impactHold <= 0;
        if (tel.impactHold > 0) text(impact, t('impact', { n: Math.round(tel.impactDist) }));
      }
    };
    raf = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onHidden);
      document.removeEventListener('selectstart', noSelect);
      document.removeEventListener('contextmenu', noSelect);
      mount.removeEventListener('pointerdown', onDown);
      mount.removeEventListener('pointermove', onMove);
      mount.removeEventListener('pointerup', onUp);
      mount.removeEventListener('pointercancel', onUp);
      mount.removeEventListener('lostpointercapture', onUp);
      mount.removeEventListener('wheel', onWheel);
      handle.dispose();
      handleRef.current = null;
    };
  }, [t]);

  /** Capture the finger so a key stays down when it slides off, but never at
   *  the cost of the key itself: the press is registered first either way. */
  const capture = (e: React.PointerEvent<HTMLElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* no live pointer: the key still works */ }
  };
  /** A key that is down while the finger is on it. */
  const hold = (set: (on: boolean) => void) => {
    const off = () => set(false);
    return {
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        set(true);
        capture(e);
      },
      onPointerUp: off, onPointerCancel: off, onLostPointerCapture: off,
    };
  };
  const jumpKey = hold((on) => { const h = handleRef.current; if (h) h.input.jump = on; });
  const throttleKey = hold((on) => { const h = handleRef.current; if (h) h.input.throttle = on ? 1 : 0; });
  /** The contextual key: held it works, tapped it gets you on or off. */
  const actionKey = {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const h = handleRef.current;
      if (h) {
        if (actionModeRef.current === 'work') h.input.work = true;
        else h.input.interact = true;
      }
      capture(e);
    },
    onPointerUp: () => { const h = handleRef.current; if (h) h.input.work = false; },
    onPointerCancel: () => { const h = handleRef.current; if (h) h.input.work = false; },
    onLostPointerCapture: () => { const h = handleRef.current; if (h) h.input.work = false; },
  };
  const cycleView = () => { const h = handleRef.current; if (h) h.input.viewToggle = true; };
  const cycleGear = () => {
    const h = handleRef.current;
    if (!h) return;
    const list = h.telemetry.gears;
    h.input.gearRequest = (list.indexOf(h.telemetry.gear) + 1) % list.length;
  };
  const toggleRun = () => {
    setRun((r) => {
      const h = handleRef.current;
      if (h) h.input.run = !r;
      return !r;
    });
  };
  const toggleCrouch = () => {
    setCrouch((c) => {
      crouchRef.current = !c;
      const h = handleRef.current;
      if (h) h.input.crouch = !c;
      return !c;
    });
  };
  const rewards = handleRef.current?.telemetry.mission.rewards ?? [];

  return (
    <div ref={rootRef} className="moon-surface" data-phase="descent" data-immersive={immersive}>
      <div ref={mountRef} className="moon-surface__canvas" />
      <div className="moon-hud">
        <div className="moon-hud__visor" aria-hidden />

        {/* ── The way down. ── */}
        <div className="moon-hud__landing">
          <div className="moon-hud__land-card">
            <span className="moon-hud__land-title">{t('landing.title')}</span>
            <span className="moon-hud__land-alt" ref={landAltRef} />
            <div className="moon-hud__land-rows">
              <span className="moon-hud__reading"><span>{t('landing.rate')}</span><span ref={landRateRef} /></span>
              <span className="moon-hud__reading"><span>{t('landing.offset')}</span><span ref={landOffRef} /></span>
              <span className="moon-hud__reading"><span>{t('landing.drift')}</span><span ref={landDriftRef} /></span>
            </div>
            <span className="moon-hud__land-fuel"><i ref={landFuelRef} /></span>
            <span className="moon-hud__land-fuel-label">{t('landing.fuel')}</span>
          </div>
          <div ref={assistRef} className="moon-hud__assist" role="status" hidden>{t('landing.assist')}</div>
          <div ref={plaqueRef} className="moon-hud__plaque" role="status" hidden>
            <span ref={plaqueGradeRef} className="moon-hud__plaque-grade" />
            <span ref={plaqueSpeedRef} className="moon-hud__plaque-speed" />
          </div>
        </div>

        {/* ── The compass ribbon, and what it is pointing at. ── */}
        <div className="moon-hud__compass" aria-hidden>
          <div className="moon-hud__strip-wrap">
            <div ref={stripRef} className="moon-hud__strip">
              {ticks.map((k) => (
                <span key={k.deg} className="moon-hud__tick" data-major={k.major} style={{ left: `${k.deg * PPD}px` }}>
                  {k.label && <b>{k.label}</b>}
                </span>
              ))}
            </div>
          </div>
          <div ref={pipRef} className="moon-hud__pip" hidden />
          <span className="moon-hud__needle" />
        </div>

        {/* ── Top left: where we are and what we are here for. ── */}
        <div className="moon-hud__head">
          <span className="moon-hud__place">{t('place')}</span>
          <div className="moon-hud__head-rows">
            <span className="moon-hud__reading"><span>{t('altitude')}</span><span ref={altRef} /></span>
            <span className="moon-hud__reading"><span>{t('speed')}</span><span ref={speedRef} /></span>
            <span className="moon-hud__reading"><span>{t('craters')}</span><span ref={cratersRef}>0</span></span>
          </div>
        </div>
        <button ref={objRef} type="button" className="moon-hud__objective" onClick={() => setLog(true)} hidden>
          <span className="moon-hud__objective-tag">{t('mission.title')}</span>
          <span ref={objTextRef} className="moon-hud__objective-text" />
          <span ref={objRangeRef} className="moon-hud__objective-range" />
        </button>

        {/* ── Left rail: the suit. ── */}
        <div className="moon-hud__vitals">
          <span className="moon-hud__vital"><i>O₂</i><span ref={o2Ref} /><b className="moon-hud__bar"><i ref={o2BarRef} /></b></span>
          <span className="moon-hud__vital"><i>{t('pulse')}</i><span ref={hrRef} /></span>
          <span className="moon-hud__vital"><i>{t('suitTemp')}</i><span ref={tempRef} /></span>
          <span className="moon-hud__vital"><i>{t('eva')}</i><span ref={evaRef} /></span>
          <span className="moon-hud__vital"><i>{t('distance')}</i><span ref={distRef} /></span>
        </div>

        {/* ── Top right: the eye, the camera, the menu. ── */}
        <button type="button" className="moon-hud__round moon-hud__unhide" onClick={() => setImmersive(false)} aria-label={t('hudShow')} title={t('hudShow')}>
          <Eye size={19} aria-hidden />
        </button>
        <div className="moon-hud__top">
          <button type="button" className="moon-hud__round" onClick={cycleView} aria-label={t('camera')} title={t('camera')}>
            <Camera size={19} aria-hidden />
          </button>
          <button type="button" className="moon-hud__round" onClick={() => { setImmersive(true); setMenu(false); }} aria-label={t('hudHide')} title={t('hudHide')}>
            <EyeOff size={19} aria-hidden />
          </button>
          <button type="button" className="moon-hud__round" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-haspopup="menu" aria-label={t('menu')} title={t('menu')}>
            {menu ? <X size={19} aria-hidden /> : <Menu size={19} aria-hidden />}
          </button>
          {menu && (
            <div className="moon-hud__menu" role="menu" aria-label={t('menu')}>
              <button type="button" role="menuitem" onClick={() => { setLog(true); setMenu(false); }}>
                <Trophy size={16} aria-hidden /><span>{t('mission.log')}</span>
              </button>
              <button type="button" role="menuitem" onClick={() => { cycleView(); setMenu(false); }}>
                <Camera size={16} aria-hidden /><span>{t('camera')}</span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setHelp((h) => !h); setMenu(false); }}>
                <HelpCircle size={16} aria-hidden /><span>{t('help')}</span>
              </button>
              <button type="button" role="menuitem" className="moon-hud__menu-exit" onClick={onReturn}>
                <Rocket size={16} aria-hidden /><span>{t('returnOrbit')}</span>
              </button>
            </div>
          )}
        </div>

        {help && (
          <div className="moon-hud__help" role="dialog" aria-label={t('help')}>
            <div className="moon-hud__help-head">
              <span>{t('help')}</span>
              <button type="button" onClick={() => setHelp(false)} aria-label={t('close')}><X size={14} aria-hidden /></button>
            </div>
            {(touch ? TOUCH_ROWS : KEY_ROWS).map((k) => <p key={k}>{t(`keys.${k}`)}</p>)}
          </div>
        )}
        {log && (
          <div className="moon-hud__log" role="dialog" aria-label={t('mission.log')}>
            <div className="moon-hud__help-head">
              <span>{t('mission.log')}</span>
              <button type="button" onClick={() => setLog(false)} aria-label={t('close')}><X size={14} aria-hidden /></button>
            </div>
            <p className="moon-hud__log-brief">{t('mission.brief')}</p>
            <div className="moon-hud__log-rewards">
              {rewards.length === 0 && <p>{t('mission.none')}</p>}
              {rewards.map((r) => (
                <p key={r} className="moon-hud__reward"><Trophy size={14} aria-hidden /><span>{t(`mission.rewards.${r}`)}</span></p>
              ))}
            </div>
          </div>
        )}

        <div ref={impactRef} className="moon-hud__impact" role="status" hidden />
        <div ref={bannerRef} className="moon-hud__banner" role="status" hidden><span /></div>

        {/* ── The middle of the glass: what is in front of the crew. ── */}
        <div className="moon-hud__foot">
          <div ref={airlockRef} className="moon-hud__airlock" hidden>{t('airlockOpen')}</div>
          <div ref={stanceRef} className="moon-hud__stance" hidden />
          <div ref={poiRef} className="moon-hud__poi" hidden />
          <p ref={hintRef} className="moon-hud__hint" hidden />
        </div>

        {/* ── The thumbs. ── */}
        <div className="moon-hud__move">
          <GameStick label={t('move')} onMove={(x, y) => {
            movingRef.current = x !== 0 || y !== 0;
            const h = handleRef.current;
            if (!h) return;
            if (movingRef.current) h.startAudio();
            h.input.moveX = movingRef.current ? x : keyboardMoveRef.current.x;
            h.input.moveY = movingRef.current ? y : keyboardMoveRef.current.y;
          }} />
          <div className="moon-hud__stance-keys">
            <button type="button" className="moon-hud__key" data-on={run} onClick={toggleRun} aria-pressed={run} title={t('run')}>
              <ChevronsUp size={18} aria-hidden /><span>{t('run')}</span>
            </button>
            <button type="button" className="moon-hud__key" data-on={crouch} onClick={toggleCrouch} aria-pressed={crouch} title={t('crouch')}>
              <ChevronsDown size={18} aria-hidden /><span>{t('crouch')}</span>
            </button>
          </div>
        </div>

        <div className="moon-hud__thumb">
          <div ref={workRef} className="moon-hud__work" hidden><span /></div>
          <button ref={gearRef} type="button" className="moon-hud__key moon-hud__gear" onClick={cycleGear} hidden>
            <Gauge size={16} aria-hidden /><span ref={gearTextRef} />
          </button>
          <button ref={actionRef} type="button" className="moon-hud__action" {...actionKey} hidden>
            {/* The icon is set by the mode in CSS; the word says the rest. */}
            <Drill className="moon-hud__ico-work" size={20} aria-hidden />
            <LogIn className="moon-hud__ico-use" size={20} aria-hidden />
            <span ref={actionTextRef} />
          </button>
          <button type="button" className="moon-hud__jump" {...jumpKey} aria-label={t('jump')}>
            <Wind size={18} aria-hidden /><span>{t('jump')}</span>
          </button>
          <button type="button" className="moon-hud__throttle" {...throttleKey} aria-label={t('landing.throttle')}>
            <span className="moon-hud__throttle-fill"><i ref={landThrRef} /></span>
            <Flame size={22} aria-hidden /><span>{t('landing.throttle')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
