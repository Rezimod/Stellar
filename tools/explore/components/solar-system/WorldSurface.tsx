'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronsDown, ChevronsUp, Eye, EyeOff, Flame, Hand, HelpCircle, Menu, Rocket, Volume2, VolumeX, Wind, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { makeWorldSurface, type WorldSurfaceHandle } from '@/lib/solar-system/world-surface';
import { WORLDS, type WorldId } from '@/lib/solar-system/world-profiles';
import { loadTbilisi, type EarthData } from '@/lib/solar-system/world-earth-data';
import type { SkyTarget } from '@/lib/solar-system/world-earth-tonight';
import { TelescopeEyepiece } from './TelescopeEyepiece';
import { setSoundOn, soundOn } from '@/lib/solar-system/sound-prefs';
import { deadZone } from '@/lib/solar-system/surface-input';
import { GameStick, tapKey } from './GameStick';
import { CosmicLoader } from './CosmicLoader';
import { useLoadingTips } from './useLoadingTips';
import { useSoundPref } from './useSoundPref';
import type { RoomLink } from '@/lib/multiplayer/room-link';

interface WorldSurfaceProps {
  world: WorldId;
  onReturn: () => void;
  room: RoomLink;
}

const KEY_ROWS = ['r1', 'r2', 'r8', 'r3', 'r4', 'r9', 'r5', 'r6', 'r7'] as const;
const TOUCH_ROWS = ['t1', 't2', 't3', 't4', 't5', 't6'] as const;
const HANDLED = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyC', 'KeyF', 'KeyV', 'KeyM', 'ControlLeft', 'KeyQ', 'AltLeft', 'AltRight',
]);
const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtRange = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);
const PPD = 3.1;
const TURNS = 3;

export function WorldSurface({ world, onReturn, room }: WorldSurfaceProps) {
  const t = useTranslations('solarSystem.moon');
  const tw = useTranslations(`solarSystem.worlds.${world}`);
  const tl = useTranslations('solarSystem.loading');
  const tips = useLoadingTips();
  const [sound, toggleSound] = useSoundPref();
  const [touch, setTouch] = useState(false);
  const [glGeneration, setGlGeneration] = useState(0);
  const [gpuLost, setGpuLost] = useState(false);
  const resumeRef = useRef(false);
  const [help, setHelp] = useState(false);
  const [menu, setMenu] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [run, setRun] = useState(false);
  const [crouch, setCrouch] = useState(false);
  const isEarth = world === 'earth';
  const breathable = !!WORLDS[world].breathable;
  const [earthData, setEarthData] = useState<EarthData | null>(null);
  const [earthError, setEarthError] = useState(false);
  const [eyepiece, setEyepiece] = useState<{ target: SkyTarget; date: Date } | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<WorldSurfaceHandle | null>(null);
  const landAltRef = useRef<HTMLSpanElement>(null);
  const landRateRef = useRef<HTMLSpanElement>(null);
  const landOffRef = useRef<HTMLSpanElement>(null);
  const landDriftRef = useRef<HTMLSpanElement>(null);
  const landFuelRef = useRef<HTMLElement>(null);
  const landThrRef = useRef<HTMLElement>(null);
  const assistRef = useRef<HTMLDivElement>(null);
  const plaqueRef = useRef<HTMLDivElement>(null);
  const plaqueGradeRef = useRef<HTMLSpanElement>(null);
  const plaqueSpeedRef = useRef<HTMLSpanElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const gravRef = useRef<HTMLSpanElement>(null);
  const poiRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const promptTextRef = useRef<HTMLSpanElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogWhoRef = useRef<HTMLSpanElement>(null);
  const dialogTextRef = useRef<HTMLSpanElement>(null);
  const o2Ref = useRef<HTMLSpanElement>(null);
  const o2BarRef = useRef<HTMLElement>(null);
  const hrRef = useRef<HTMLSpanElement>(null);
  const tempRef = useRef<HTMLSpanElement>(null);
  const outRef = useRef<HTMLSpanElement>(null);
  const evaRef = useRef<HTMLSpanElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const actionTextRef = useRef<HTMLSpanElement>(null);
  const stanceRef = useRef<HTMLDivElement>(null);
  const objRef = useRef<HTMLDivElement>(null);
  const objTextRef = useRef<HTMLSpanElement>(null);
  const objRangeRef = useRef<HTMLSpanElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const meterLabelRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const landTitleRef = useRef<HTMLSpanElement>(null);
  const onReturnRef = useRef(onReturn);
  onReturnRef.current = onReturn;
  const movingRef = useRef(false);
  const keyboardMoveRef = useRef({ x: 0, y: 0 });
  const runRef = useRef(false);
  const crouchRef = useRef(false);
  const touchRef = useRef(false);
  runRef.current = run;
  crouchRef.current = crouch;

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    touchRef.current = coarse;
    setTouch(coarse);
  }, []);

  const ticks = useMemo(() => {
    const out: { deg: number; label: string | null; major: boolean }[] = [];
    const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    for (let d = 0; d < 360 * TURNS; d += 15) {
      const c = d % 360;
      out.push({ deg: d, label: c % 45 === 0 ? names[(c / 45) | 0] : null, major: c % 45 === 0 });
    }
    return out;
  }, []);

  // Tbilisi's ground and city are real data: fetch them before building the scene.
  useEffect(() => {
    if (!isEarth || earthData) return;
    const abort = new AbortController();
    setEarthError(false);
    loadTbilisi(abort.signal).then(setEarthData, (e: unknown) => {
      if ((e as { name?: string })?.name !== 'AbortError') setEarthError(true);
    });
    return () => abort.abort();
  }, [isEarth, earthData]);

  useEffect(() => {
    const mount = mountRef.current;
    const root = rootRef.current;
    if (!mount || !root) return;
    if (isEarth && !earthData) return;
    let rebuildTimer = 0;
    const handle = makeWorldSurface(mount, world, {
      room,
      earth: earthData ?? undefined,
      startOnSurface: resumeRef.current,
      onContextLost: () => {
        setGpuLost(true);
        rebuildTimer = window.setTimeout(() => {
          resumeRef.current = true;
          setGpuLost(false);
          setGlGeneration((g) => g + 1);
        }, 1200);
      },
    });
    handleRef.current = handle;
    const input = handle.input;
    const pressed = new Set<string>();
    const sync = () => {
      const has = (c: string) => pressed.has(c);
      const x = (has('KeyD') || has('ArrowRight') ? 1 : 0) - (has('KeyA') || has('ArrowLeft') ? 1 : 0);
      const y = (has('KeyW') || has('ArrowUp') ? 1 : 0) - (has('KeyS') || has('ArrowDown') ? 1 : 0);
      const len = Math.hypot(x, y) || 1;
      keyboardMoveRef.current = { x: x / len, y: y / len };
      if (!movingRef.current) { input.moveX = x / len; input.moveY = y / len; }
      // Shift is a sprint (held, or tapped to latch); Alt is a deliberate walk; the touch key is a run.
      input.run = runRef.current;
      input.sprint = has('ShiftLeft') || has('ShiftRight');
      input.walk = has('AltLeft') || has('AltRight');
      input.crouch = has('ControlLeft') || crouchRef.current;
      input.use = has('KeyE') || has('KeyF');
      input.throttle = has('Space') ? 1 : 0;
      input.jump = has('Space');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!HANDLED.has(e.code)) return;
      handle.startAudio();
      if (e.repeat) { e.preventDefault(); return; }
      pressed.add(e.code);
      if (e.code === 'KeyE' || e.code === 'KeyF') input.interact = true;
      if (e.code === 'KeyV') input.viewToggle = true;
      if (e.code === 'KeyQ') input.shoulderSwap = true;
      if (e.code === 'KeyC') { crouchRef.current = !crouchRef.current; setCrouch(crouchRef.current); }
      if (e.code === 'KeyM') setSoundOn(!soundOn());
      sync();
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!HANDLED.has(e.code)) return;
      pressed.delete(e.code);
      sync();
    };
    const onBlur = () => {
      pressed.clear();
      input.moveX = input.moveY = 0;
      input.jump = false; input.run = false; input.sprint = false; input.walk = false; input.use = false; input.throttle = 0;
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
    const noSelect = (e: Event) => {
      const el = e.target as Element | null;
      if (el && el.closest('.moon-hud__help, .moon-hud__menu')) return;
      e.preventDefault();
    };
    document.addEventListener('selectstart', noSelect);
    document.addEventListener('contextmenu', noSelect);

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
    const onUp = (e: PointerEvent) => { if (e.pointerId === orbitId) orbitId = -1; };
    const onWheel = (e: WheelEvent) => { input.zoom += Math.sign(e.deltaY); e.preventDefault(); };
    mount.addEventListener('pointerdown', onDown);
    mount.addEventListener('pointermove', onMove);
    mount.addEventListener('pointerup', onUp);
    mount.addEventListener('pointercancel', onUp);
    mount.addEventListener('lostpointercapture', onUp);
    mount.addEventListener('wheel', onWheel, { passive: false });

    const tel = handle.telemetry;
    const text = (el: HTMLElement | null, v: string) => { if (el && el.textContent !== v) el.textContent = v; };
    const show = (el: HTMLElement | null, on: boolean) => { if (el && el.hidden === on) el.hidden = !on; };
    let eyepieceOpen = false;
    let raf = 0;
    let lastPaint = 0;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    root.dataset.touch = String(isTouch);
    // A standard-mapping gamepad: left stick moves (its length picks the gait), right stick looks,
    // A jumps, X is the action key, B crouches, LT runs, L3 sprints, RB swaps the shoulder, Y turns the camera.
    const padWas: boolean[] = [];
    let padMoving = false;
    const pollPad = () => {
      const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
      const pad = Array.from(pads).find((p) => p && p.mapping === 'standard');
      if (!pad) return;
      const mx = deadZone(pad.axes[0] ?? 0); const my = -deadZone(pad.axes[1] ?? 0);
      const down = (i: number) => !!pad.buttons[i]?.pressed;
      const edge = (i: number) => { const on = down(i); const was = padWas[i]; padWas[i] = on; return on && !was; };
      if (mx !== 0 || my !== 0) { padMoving = true; input.moveX = mx; input.moveY = my; handle.startAudio(); }
      else if (padMoving) { padMoving = false; input.moveX = keyboardMoveRef.current.x; input.moveY = keyboardMoveRef.current.y; }
      input.orbitDX += deadZone(pad.axes[2] ?? 0) * 14;
      input.orbitDY += deadZone(pad.axes[3] ?? 0) * 10;
      const jumpWas = !!padWas[0]; const useWas = !!padWas[2];
      if (edge(0)) input.jump = true; else if (jumpWas && !down(0) && !pressed.has('Space')) input.jump = false;
      if (edge(2)) { input.interact = true; input.use = true; } else if (useWas && !down(2) && !pressed.has('KeyE') && !pressed.has('KeyF')) input.use = false;
      if (edge(1)) { crouchRef.current = !crouchRef.current; setCrouch(crouchRef.current); input.crouch = crouchRef.current; }
      if (edge(3)) input.viewToggle = true;
      if (edge(5)) input.shoulderSwap = true;
      if (down(6) || padWas[6]) input.run = down(6) || runRef.current;
      if (down(10) || padWas[10]) input.sprint = down(10) || pressed.has('ShiftLeft') || pressed.has('ShiftRight');
      padWas[6] = down(6); padWas[10] = down(10);
    };
    const paint = (now: number) => {
      raf = requestAnimationFrame(paint);
      pollPad();
      if (now - lastPaint < 33) return;
      lastPaint = now;
      root.dataset.ready = String(tel.ready);
      root.dataset.phase = tel.phase;
      root.dataset.view = tel.view;

      if (tel.ascended) { tel.ascended = false; onReturnRef.current(); return; }
      if (tel.phase !== 'surface') {
        const l = tel.landing;
        text(landTitleRef.current, tel.entry ? tw('entry') : tel.phase === 'ascent' ? t('landing.ascent') : t('landing.title'));
        text(landAltRef.current, `${l.altitude.toFixed(l.altitude < 10 ? 1 : 0)} m`);
        text(landRateRef.current, `${Math.abs(l.descent).toFixed(1)} m/s`);
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

      if (stripRef.current) stripRef.current.style.transform = `translateX(${-(tel.heading + 360) * PPD}px)`;
      text(altRef.current, `${tel.altitude.toFixed(1)} m`);
      text(speedRef.current, tel.driving ? `${Math.round(tel.speed * 3.6)} km/h` : `${tel.speed.toFixed(1)} m/s`);
      text(gravRef.current, `${handle.profile.gravity.toFixed(2)} m/s²`);
      text(o2Ref.current, `${tel.o2.toFixed(1)}%`);
      if (o2BarRef.current) o2BarRef.current.style.width = `${Math.max(0, Math.min(100, tel.o2))}%`;
      text(hrRef.current, `${Math.round(tel.heartRate)}`);
      text(tempRef.current, `${tel.suitTemp.toFixed(1)}°`);
      text(outRef.current, tel.earth && tel.earth.outsideC === null ? '—' : `${tel.outsideC}°`);
      text(evaRef.current, fmtTime(tel.evaSeconds));
      text(distRef.current, fmtRange(tel.distanceM));

      const p = tel.prompt;
      const label = p.active ? tw(`act.${p.label}`) : '';
      const action = actionRef.current;
      if (action) {
        show(action, p.active);
        if (p.active) text(actionTextRef.current, label);
      }
      const prompt = promptRef.current;
      if (prompt) {
        show(prompt, p.active);
        if (p.active) text(promptTextRef.current, label);
      }
      const stance = stanceRef.current;
      if (stance) {
        const s = tel.stumbling ? t('stance.stumble') : tel.sliding ? t('stance.slide') : tel.crouched ? t('stance.crouch') : '';
        show(stance, s !== '');
        text(stance, s);
      }
      const poi = poiRef.current;
      if (poi) {
        const on = !!tel.poiId && !p.active;
        show(poi, on);
        if (on) text(poi, tw(`pois.${tel.poiId}`));
      }
      const hintKey = tel.hint ? (isTouch ? `hints.${tel.hint}Touch` : `hints.${tel.hint}`) : '';
      const hint = hintRef.current;
      if (hint) {
        show(hint, !!hintKey && !p.active);
        if (hintKey) text(hint, tw(hintKey));
      }
      const banner = bannerRef.current;
      if (banner) {
        show(banner, tel.banner !== '');
        if (tel.banner) text(banner.firstElementChild as HTMLElement, tw(`banner.${tel.banner}`));
      }
      const ea = tel.earth;
      if (ea) {
        const ex = ea.expedition;
        text(clockRef.current, ea.clock);
        const obj = objRef.current;
        if (obj) {
          const on = !!ex.objective;
          show(obj, on);
          if (on) {
            text(objTextRef.current, tw(`expedition.obj.${ex.objective}`));
            const range = ex.stage === 'overlook'
              ? tw('expedition.found', { n: ex.found.length })
              : ex.distance >= 0 && ex.distance > 6 ? fmtRange(ex.distance) : '';
            text(objRangeRef.current, range);
          }
        }
        const pip = pipRef.current;
        if (pip) {
          const on = ex.bearing >= 0 && ex.distance > 6;
          show(pip, on);
          if (on) {
            let rel = ((ex.bearing - tel.heading + 540) % 360) - 180;
            pip.dataset.edge = String(Math.abs(rel) > 58);
            rel = Math.max(-58, Math.min(58, rel));
            pip.style.transform = `translateX(calc(-50% + ${rel * PPD}px))`;
          }
        }
        const meter = meterRef.current;
        if (meter) {
          const spotting = ex.stage === 'overlook' && !!ex.spotting;
          const working = ex.work > 0 && !spotting;
          show(meter, spotting || working);
          if (spotting) {
            meter.style.setProperty('--v', ex.spotWork.toFixed(3));
            text(meterLabelRef.current, tw('expedition.spot', { name: tw(`expedition.names.${ex.spotting}`) }));
          } else if (working) {
            meter.style.setProperty('--v', ex.work.toFixed(3));
            text(meterLabelRef.current, label || tw(`expedition.obj.${ex.objective}`));
          }
        }
        if (ex.eyepiece !== eyepieceOpen) {
          eyepieceOpen = ex.eyepiece;
          setEyepiece(ex.eyepiece && ea.target ? { target: ea.target, date: new Date(ea.date) } : null);
        }
        if (!tel.banner && ex.banner) {
          const bannerEl = bannerRef.current;
          if (bannerEl) {
            show(bannerEl, true);
            text(bannerEl.firstElementChild as HTMLElement, tw(`banner.${ex.banner}`));
          }
        }
      }
      const readout = readoutRef.current;
      if (readout) {
        show(readout, !!tel.readout);
        if (tel.readout) text(readout, tw(`readout.${tel.readout}`));
      }
      const dialog = dialogRef.current;
      if (dialog) {
        const al = tel.aliens;
        const on = !!al && al.phrase !== '';
        show(dialog, on);
        if (on && al) {
          text(dialogWhoRef.current, tw('dialog.who', { n: al.speaker + 1 }));
          text(dialogTextRef.current, tw(`dialog.${al.phrase}`));
        }
      }
    };
    raf = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(rebuildTimer);
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
  }, [t, tw, world, glGeneration, isEarth, earthData, room]);

  const capture = (e: React.PointerEvent<HTMLElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* no live pointer: the key still works */ }
  };
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
  const actionKey = hold((on) => {
    const h = handleRef.current;
    if (!h) return;
    if (on) h.input.interact = true;
    h.input.use = on;
  });
  const cycleView = () => { const h = handleRef.current; if (h) h.input.viewToggle = true; };
  const toggleRun = () => {
    setRun((r) => { const h = handleRef.current; if (h) h.input.run = !r; return !r; });
  };
  const toggleCrouch = () => {
    setCrouch((c) => { crouchRef.current = !c; const h = handleRef.current; if (h) h.input.crouch = !c; return !c; });
  };

  return (
    <div ref={rootRef} className={`moon-surface moon-surface--${world}`} data-phase="descent" data-ready="false" data-immersive={immersive}>
      <div ref={mountRef} className="moon-surface__canvas" />
      <CosmicLoader className={gpuLost || earthError ? 'moon-surface__loader is-forced' : 'moon-surface__loader'} variant="descent"
        label={gpuLost ? tl('gpu') : earthError ? tw('loadError') : tw('loading')} detail={gpuLost || earthError ? undefined : tw('loadingDetail')} tips={tips} />
      {earthError && (
        <button type="button" className="moon-hud__key earth-hud__retry" onClick={onReturn}>
          <Rocket size={18} aria-hidden /><span>{t('returnOrbit')}</span>
        </button>
      )}
      <div className="moon-hud">
        <div className="moon-hud__visor" aria-hidden />

        <div className="moon-hud__landing">
          <div className="moon-hud__land-card">
            <span ref={landTitleRef} className="moon-hud__land-title">{t('landing.title')}</span>
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
          {isEarth && <div ref={pipRef} className="moon-hud__pip" hidden />}
          <span className="moon-hud__needle" />
        </div>
        {isEarth && (
          <div ref={meterRef} className="moon-hud__meter" hidden>
            <span className="moon-hud__meter-bar"><i /></span>
            <span ref={meterLabelRef} />
          </div>
        )}

        <div className="moon-hud__head">
          <span className="moon-hud__place">{tw('place')}</span>
          <div className="moon-hud__head-rows">
            <span className="moon-hud__reading"><span>{t('altitude')}</span><span ref={altRef} /></span>
            <span className="moon-hud__reading"><span>{t('speed')}</span><span ref={speedRef} /></span>
            <span className="moon-hud__reading"><span>{t('gravity')}</span><span ref={gravRef} /></span>
            {isEarth && <span className="moon-hud__reading"><span>{tw('localTime')}</span><span ref={clockRef} /></span>}
          </div>
        </div>
        {isEarth && (
          <div ref={objRef} className="moon-hud__objective" hidden>
            <span className="moon-hud__objective-tag">{tw('expedition.title')}</span>
            <span ref={objTextRef} className="moon-hud__objective-text" />
            <span ref={objRangeRef} className="moon-hud__objective-range" />
          </div>
        )}

        <div className="moon-hud__vitals">
          {!breathable && <span className="moon-hud__vital"><i>O₂</i><span ref={o2Ref} /><b className="moon-hud__bar"><i ref={o2BarRef} /></b></span>}
          <span className="moon-hud__vital"><i>{t('pulse')}</i><span ref={hrRef} /></span>
          {!breathable && <span className="moon-hud__vital"><i>{t('suitTemp')}</i><span ref={tempRef} /></span>}
          <span className="moon-hud__vital"><i>{tw('outside')}</i><span ref={outRef} /></span>
          <span className="moon-hud__vital"><i>{t('eva')}</i><span ref={evaRef} /></span>
          <span className="moon-hud__vital"><i>{t('distance')}</i><span ref={distRef} /></span>
        </div>

        <button type="button" className="moon-hud__round moon-hud__unhide" onClick={() => setImmersive(false)} aria-label={t('hudShow')} title={t('hudShow')}>
          <Eye size={19} aria-hidden />
        </button>
        <div className="moon-hud__top">
          <button type="button" className="moon-hud__round" {...tapKey(cycleView)} aria-label={t('camera')} title={t('camera')}>
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
              <button type="button" role="menuitem" onClick={() => { cycleView(); setMenu(false); }}>
                <Camera size={16} aria-hidden /><span>{t('camera')}</span>
              </button>
              <button type="button" role="menuitem" onClick={toggleSound} aria-pressed={sound}>
                {sound ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}<span>{t(sound ? 'soundOn' : 'soundOff')}</span>
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
            {(touch ? TOUCH_ROWS : KEY_ROWS).map((k) => <p key={k}>{tw(`keys.${k}`)}</p>)}
          </div>
        )}

        <div ref={bannerRef} className="moon-hud__banner" role="status" hidden><span /></div>
        <div ref={readoutRef} className="moon-hud__readout" role="status" hidden />
        <div ref={dialogRef} className="moon-hud__dialog" role="status" hidden>
          <span ref={dialogWhoRef} className="moon-hud__dialog-who" />
          <span ref={dialogTextRef} className="moon-hud__dialog-text" />
        </div>

        <div className="moon-hud__foot">
          <div ref={promptRef} className="moon-hud__prompt" hidden>
            <kbd>E</kbd><span ref={promptTextRef} />
          </div>
          <div ref={stanceRef} className="moon-hud__stance" hidden />
          <div ref={poiRef} className="moon-hud__poi" hidden />
          <p ref={hintRef} className="moon-hud__hint" hidden />
        </div>
        {isEarth && <p className="earth-hud__credits">{tw('credits')}</p>}

        <div className="moon-hud__move">
          <GameStick label={t('move')} onMove={(x, y) => {
            movingRef.current = x !== 0 || y !== 0;
            const h = handleRef.current;
            if (!h) return;
            if (movingRef.current) h.startAudio();
            h.input.moveX = movingRef.current ? x : keyboardMoveRef.current.x;
            h.input.moveY = movingRef.current ? y : keyboardMoveRef.current.y;
            if (touchRef.current) h.input.run = runRef.current || Math.hypot(x, y) > 0.93;
          }} />
          <div className="moon-hud__stance-keys">
            <button type="button" className="moon-hud__key" data-on={run} {...tapKey(toggleRun)} aria-pressed={run} title={t('run')}>
              <ChevronsUp size={18} aria-hidden /><span>{tw('run')}</span>
            </button>
            <button type="button" className="moon-hud__key" data-on={crouch} {...tapKey(toggleCrouch)} aria-pressed={crouch} title={t('crouch')}>
              <ChevronsDown size={18} aria-hidden /><span>{t('crouch')}</span>
            </button>
          </div>
        </div>

        <div className="moon-hud__thumb">
          <button ref={actionRef} type="button" className="moon-hud__action" data-mode="use" {...actionKey} hidden>
            <Hand className="moon-hud__ico-use" size={20} aria-hidden />
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
      {eyepiece && (
        <TelescopeEyepiece target={eyepiece.target} date={eyepiece.date} onClose={() => {
          const ex = handleRef.current?.telemetry.earth?.expedition;
          if (ex) ex.eyepiece = false;
        }} />
      )}
    </div>
  );
}
