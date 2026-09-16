'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera, ChevronsDown, ChevronsUp, Drill, Eye, EyeOff, Flame, Gauge, HelpCircle,
  LogIn, Menu, Rocket, Trophy, Volume2, VolumeX, Wind, X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { makeMoonSurface, type MoonSurfaceHandle } from '@/lib/solar-system/moon-surface';
import { DRILL_BAND } from '@/lib/solar-system/moon-mission';
import { setSoundOn, soundOn } from '@/lib/solar-system/sound-prefs';
import { GameStick, tapKey } from './GameStick';
import { CosmicLoader } from './CosmicLoader';
import { useLoadingTips } from './useLoadingTips';
import { useSoundPref } from './useSoundPref';

interface MoonSurfaceProps {
  onReturn: () => void;
}

const KEY_ROWS = ['r1', 'r2', 'r9', 'r3', 'r4', 'r5', 'r10', 'r6', 'r11', 'r12', 'r8', 'r13', 'r14', 'r7'] as const;
const TOUCH_ROWS = ['t1', 't2', 't3', 't7', 't4', 't8', 't9', 't6', 't10', 't11', 't5'] as const;
const HANDLED = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyC', 'KeyF', 'KeyV', 'KeyM', 'ControlLeft',
  'Digit1', 'Digit2', 'Digit3', 'Digit4',
]);
const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtRange = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);
/** A rough range: to the nearest ten metres, marked as such. */
const fmtApprox = (m: number) => `~${fmtRange(Math.round(m / 10) * 10)}`;
/** How wide a degree of the compass is, and how far round it is drawn. */
const PPD = 3.1;
const TURNS = 3;

export function MoonSurface({ onReturn }: MoonSurfaceProps) {
  const t = useTranslations('solarSystem.moon');
  const tl = useTranslations('solarSystem.loading');
  const tips = useLoadingTips();
  const [sound, toggleSound] = useSoundPref();
  const [touch, setTouch] = useState(false);
  /** Bumped when the GPU drops the context; the scene is rebuilt on the surface. */
  const [glGeneration, setGlGeneration] = useState(0);
  const [gpuLost, setGpuLost] = useState(false);
  const resumeRef = useRef(false);
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
  const landTitleRef = useRef<HTMLSpanElement>(null);
  const onReturnRef = useRef(onReturn);
  onReturnRef.current = onReturn;
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
  const compassRef = useRef<HTMLDivElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const holePipRef = useRef<HTMLDivElement>(null);
  const jobPipRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const meterLabelRef = useRef<HTMLSpanElement>(null);
  const objRef = useRef<HTMLButtonElement>(null);
  const objTextRef = useRef<HTMLSpanElement>(null);
  const objRangeRef = useRef<HTMLSpanElement>(null);
  const jobRef = useRef<HTMLSpanElement>(null);
  const jobTextRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const cratersRef = useRef<HTMLSpanElement>(null);
  const poiRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const promptTextRef = useRef<HTMLSpanElement>(null);
  const promptHoldRef = useRef<HTMLElement>(null);
  const impactRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const radioRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const drillRef = useRef<HTMLDivElement>(null);
  const drillDepthRef = useRef<HTMLSpanElement>(null);
  const drillLoadRef = useRef<HTMLSpanElement>(null);
  const drillHeatRef = useRef<HTMLSpanElement>(null);
  const drillWarnRef = useRef<HTMLSpanElement>(null);
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
  // Underground.
  const blackRef = useRef<HTMLDivElement>(null);
  const crackRef = useRef<SVGSVGElement>(null);
  const brRef = useRef<HTMLDivElement>(null);
  const brGravRef = useRef<HTMLSpanElement>(null);
  const brReadRef = useRef<HTMLSpanElement>(null);
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
    let rebuildTimer = 0;
    const handle = makeMoonSurface(mount, {
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
      if (!movingRef.current) {
        input.moveX = x / len;
        input.moveY = y / len;
      }
      input.run = has('ShiftLeft') || has('ShiftRight') || runRef.current;
      input.crouch = has('ControlLeft') || crouchRef.current;
      // E and F both hold the job in front of you; E also presses it.
      input.use = has('KeyE') || has('KeyF');
      // On the way down, the space bar is the descent engine.
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
      if (e.code === 'KeyC') { crouchRef.current = !crouchRef.current; setCrouch(crouchRef.current); }
      if (e.code === 'KeyM') setSoundOn(!soundOn());
      if (e.code.startsWith('Digit')) input.gearRequest = Number(e.code.slice(5)) - 1;
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
      input.jump = false; input.run = false; input.use = false; input.throttle = 0;
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
    const setVar = (el: HTMLElement | null, name: string, v: string) => { if (el && el.style.getPropertyValue(name) !== v) el.style.setProperty(name, v); };
    /** How many degrees the ribbon can show either side of the needle. The
     *  strip is narrower on a phone than on a desk, so this is measured
     *  rather than assumed: a fixed clamp put the pip off the end of it. */
    let pipLimit = 58;
    const measureCompass = () => {
      const w = compassRef.current?.clientWidth ?? 0;
      if (w > 0) pipLimit = Math.max(12, (w / 2 - 9) / PPD);
    };
    const pipAt = (el: HTMLElement | null, bearing: number, heading: number, on: boolean) => {
      if (!el) return;
      show(el, on);
      if (!on) return;
      let rel = ((bearing * 180) / Math.PI - heading + 540) % 360 - 180;
      const edge = Math.abs(rel) > pipLimit;
      rel = Math.max(-pipLimit, Math.min(pipLimit, rel));
      el.style.transform = `translateX(calc(-50% + ${rel * PPD}px))`;
      el.dataset.edge = String(edge);
    };
    let raf = 0;
    let lastPaint = 0;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    root.dataset.touch = String(isTouch);
    // A standard-mapping gamepad: left stick moves, right stick looks, A jumps,
    // X is the action key, B crouches, the left trigger or stick click runs, Y turns the camera.
    const padWas: boolean[] = [];
    let padMoving = false;
    const pollPad = () => {
      const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
      const pad = Array.from(pads).find((p) => p && p.mapping === 'standard');
      if (!pad) return;
      const dz = (v: number) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
      const mx = dz(pad.axes[0] ?? 0); const my = -dz(pad.axes[1] ?? 0);
      const down = (i: number) => !!pad.buttons[i]?.pressed;
      const edge = (i: number) => { const on = down(i); const was = padWas[i]; padWas[i] = on; return on && !was; };
      if (mx !== 0 || my !== 0) { padMoving = true; input.moveX = mx; input.moveY = my; handle.startAudio(); }
      else if (padMoving) { padMoving = false; input.moveX = keyboardMoveRef.current.x; input.moveY = keyboardMoveRef.current.y; }
      input.orbitDX += dz(pad.axes[2] ?? 0) * 14;
      input.orbitDY += dz(pad.axes[3] ?? 0) * 10;
      // Held buttons are let go only on their own release, so the keyboard and the touch keys keep theirs.
      const jumpWas = !!padWas[0]; const useWas = !!padWas[2];
      if (edge(0)) input.jump = true; else if (jumpWas && !down(0) && !pressed.has('Space')) input.jump = false;
      if (edge(2)) { input.interact = true; input.use = true; } else if (useWas && !down(2) && !pressed.has('KeyE') && !pressed.has('KeyF')) input.use = false;
      if (edge(1)) { crouchRef.current = !crouchRef.current; setCrouch(crouchRef.current); input.crouch = crouchRef.current; }
      if (edge(3)) input.viewToggle = true;
      const runPad = down(6) || down(10);
      if (runPad || padWas[6] || padWas[10]) input.run = runPad || runRef.current || pressed.has('ShiftLeft') || pressed.has('ShiftRight');
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
      root.dataset.driving = String(tel.driving);
      const bt = tel.backrooms;
      const under = bt.phase !== '' && bt.phase !== 'fall';
      root.dataset.backrooms = bt.phase;
      root.dataset.helmetOn = String(bt.helmet);
      setVar(blackRef.current, '--black', bt.black.toFixed(3));
      if (crackRef.current) crackRef.current.dataset.on = String(bt.crack);
      const brPanel = brRef.current;
      if (brPanel) {
        show(brPanel, under);
        if (under) {
          text(brGravRef.current, t('backrooms.gravityRead', { n: bt.gravity.toFixed(2), g: (bt.gravity / 9.81).toFixed(2) }));
          if (brGravRef.current) brGravRef.current.dataset.earth = String(bt.gravity > 5);
          show(brReadRef.current, !!bt.readout);
          if (bt.readout) text(brReadRef.current, t(`backrooms.readout.${bt.readout}`));
          setVar(brPanel, '--glitch', bt.glitch.toFixed(2));
        }
      }

      // ── The way down. ──
      if (tel.ascended) { tel.ascended = false; onReturnRef.current(); return; }
      if (tel.phase !== 'surface') {
        const l = tel.landing;
        text(landTitleRef.current, tel.phase === 'ascent' ? t('landing.ascent') : t('landing.title'));
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

      // ── The compass, and where the crew is being sent. ──
      measureCompass();
      const heading = tel.heading;
      if (stripRef.current) stripRef.current.style.transform = `translateX(${-(heading + 360) * PPD}px)`;
      const m = tel.mission;
      const j = tel.jobs;
      pipAt(pipRef.current, m.bearing, heading, m.distance >= 0 && (m.task === '' || !m.atSite));
      pipAt(jobPipRef.current, j.bearing, heading, j.active !== '' && j.distance >= 0);
      // The hum on channel two, once the base has mentioned it.
      pipAt(holePipRef.current, bt.bearing, heading, bt.known && !bt.escaped && bt.distance >= 0 && tel.phase === 'surface');
      // One meter under the compass: a job's alignment when there is one,
      // otherwise the expedition's scanner.
      const meter = meterRef.current;
      if (meter) {
        const align = j.meter >= 0;
        const on = align || m.signal >= 0;
        show(meter, on);
        if (on) {
          meter.dataset.kind = align ? 'align' : 'scan';
          meter.dataset.ping = String(m.ping);
          setVar(meter, '--v', (align ? j.meter : m.signal).toFixed(3));
          text(meterLabelRef.current, align ? t('jobs.meter') : m.task === 'scan' ? t('mission.scanLock', { n: Math.round(m.work * 100) }) : t('mission.scanner'));
        }
      }
      show(objRef.current, (m.distance >= 0 || m.complete || j.active !== '') && !m.banner && !j.banner);
      text(objTextRef.current, t(`mission.${m.objective || 'obj.done'}`));
      text(objRangeRef.current,
        m.task === 'drill' && m.atSite ? `${m.drill.depth.toFixed(1)} / ${5.2} m`
        : m.task === 'clear' && m.atSite ? t('mission.patches', { n: m.cleared, total: m.patches })
        : m.distance >= 0 ? (m.approx ? fmtApprox(m.distance) : fmtRange(m.distance)) : '');
      show(jobRef.current, j.active !== '');
      if (j.active && j.objective) text(jobTextRef.current, `${t(`jobs.steps.${j.objective}`)}${j.distance >= 0 && j.distance > 4 ? ` · ${fmtRange(j.distance)}` : ''}`);

      text(altRef.current, `${tel.altitude.toFixed(1)} m`);
      text(speedRef.current, `${tel.speed.toFixed(1)} m/s`);
      text(cratersRef.current, String(tel.craters));
      text(o2Ref.current, `${tel.o2.toFixed(1)}%`);
      if (o2BarRef.current) o2BarRef.current.style.width = `${Math.max(0, Math.min(100, tel.o2))}%`;
      text(hrRef.current, `${Math.round(tel.heartRate)}`);
      text(tempRef.current, `${tel.suitTemp.toFixed(1)}°`);
      text(evaRef.current, fmtTime(tel.evaSeconds));
      text(distRef.current, fmtRange(tel.distanceM));

      // ── The one key: underground, the Backrooms' own. ──
      const p = under ? bt.prompt : tel.prompt;
      const label = !p.active ? '' : under ? t(`backrooms.act.${p.label}`) : t(`act.${p.label}`);
      const action = actionRef.current;
      if (action) {
        show(action, p.active);
        if (p.active) {
          action.dataset.mode = p.kind === 'hold' ? 'work' : 'use';
          text(actionTextRef.current, label);
        }
      }
      const prompt = promptRef.current;
      if (prompt) {
        show(prompt, p.active);
        if (p.active) {
          text(promptTextRef.current, label);
          show(promptHoldRef.current, p.kind === 'hold');
        }
      }
      const work = workRef.current;
      if (work) {
        const busy = p.active && p.progress > 0.001;
        show(work, busy);
        if (busy) setVar(work, '--work', Math.min(1, p.progress).toFixed(3));
      }
      // The drill's own panel, while standing at it.
      const drill = drillRef.current;
      if (drill) {
        const on = m.stage === 'drill' && m.atSite && m.drill.engaged;
        show(drill, on);
        if (on) {
          const d = m.drill;
          text(drillDepthRef.current, `${d.depth.toFixed(2)} m`);
          const loadEl = drillLoadRef.current;
          setVar(loadEl, '--v', Math.min(1, d.load).toFixed(3));
          if (loadEl) loadEl.dataset.state = d.load > DRILL_BAND[1] ? 'over' : 'ok';
          const heatEl = drillHeatRef.current;
          setVar(heatEl, '--v', d.heat.toFixed(3));
          if (heatEl) heatEl.dataset.state = d.heat > 0.75 ? 'hot' : 'ok';
          const warn = d.stalled ? t('mission.drill.stalled') : d.ready ? t('mission.drill.ready') : d.hard ? t('mission.drill.hard') : '';
          show(drillWarnRef.current, warn !== '');
          text(drillWarnRef.current, warn);
        }
      }
      const gear = gearRef.current;
      if (gear) {
        show(gear, tel.driving);
        if (tel.driving) {
          gear.dataset.gear = tel.gear;
          text(gearTextRef.current, `${t(`gears.${tel.gear}`)} · ${Math.round(tel.battery * 100)}%`);
        }
      }
      const stance = stanceRef.current;
      if (stance) {
        const s = tel.driving
          ? (tel.roverFault ? t('rover.fault') : tel.charging ? t('rover.charging', { n: Math.round(tel.battery * 100) }) : '')
          : tel.fallen ? t(isTouch ? 'stance.fallenTouch' : 'stance.fallen') : tel.stumbling ? t('stance.stumble') : tel.sliding ? t('stance.slide') : tel.crouched ? t('stance.crouch') : '';
        show(stance, s !== '');
        text(stance, s);
      }
      const lock = tel.airlock;
      const lockText = !lock.near ? '' : lock.state === 'cycling' ? t('airlock.cycling', { n: Math.round(lock.cycle * 100) }) : lock.state === 'open' ? t('airlock.open') : '';
      show(airlockRef.current, lockText !== '');
      text(airlockRef.current, lockText);
      const poi = poiRef.current;
      if (poi) {
        const on = !!tel.poiId && !p.active;
        show(poi, on);
        if (on) text(poi, t(`pois.${tel.poiId}`));
      }
      const hintKey = tel.hint ? (isTouch ? `hints.${tel.hint}Touch` : `hints.${tel.hint}`) : '';
      const hint = hintRef.current;
      if (hint) {
        show(hint, !!hintKey && !p.active);
        if (hintKey) text(hint, t(hintKey));
      }
      const banner = bannerRef.current;
      if (banner) {
        const key = m.banner ? `mission.${m.banner}` : j.banner ? `jobs.${j.banner}` : '';
        show(banner, key !== '');
        if (key) text(banner.firstElementChild as HTMLElement, t(key));
      }
      const radio = radioRef.current;
      if (radio) {
        const line = bt.radio ? t(`backrooms.radio.${bt.radio}`) : m.radio ? t(`mission.${m.radio}`) : '';
        show(radio, line !== '');
        if (line) text(radio, line);
        radio.dataset.static = String(!!bt.radio);
      }
      const readout = readoutRef.current;
      if (readout) {
        show(readout, !!tel.readout);
        if (tel.readout) text(readout, tel.readout === 'charger' ? t('readout.charger', { n: Math.round(tel.battery * 100) }) : t(`readout.${tel.readout}`));
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
  }, [t, glGeneration]);

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
  /** The action key: pressing it presses the job in front of you; holding it holds it. */
  const actionKey = hold((on) => {
    const h = handleRef.current;
    if (!h) return;
    if (on) h.input.interact = true;
    h.input.use = on;
  });
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
  const jobsDone = handleRef.current?.telemetry.jobs.done ?? [];
  const underground = handleRef.current?.telemetry.backrooms;

  return (
    <div ref={rootRef} className="moon-surface" data-phase="descent" data-ready="false" data-immersive={immersive}>
      <div ref={mountRef} className="moon-surface__canvas" />
      <CosmicLoader className={gpuLost ? 'moon-surface__loader is-forced' : 'moon-surface__loader'} variant="descent"
        label={gpuLost ? tl('gpu') : tl('moon')} detail={gpuLost ? undefined : tl('moonDetail')} tips={tips} />
      <div className="moon-hud">
        <div className="moon-hud__visor" aria-hidden />
        <div ref={blackRef} className="moon-hud__black" aria-hidden />
        <svg ref={crackRef} className="moon-hud__crack" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden data-on="false">
          <path d="M612 318 L655 262 L668 180 L702 120 M655 262 L742 246 L820 262 M612 318 L560 290 L498 300 L430 262 M612 318 L640 392 L628 470 L672 540 M640 392 L716 420 L790 404 L860 440 M560 290 L540 220 L552 150" />
          <path className="moon-hud__crack-fine" d="M668 180 L640 150 M742 246 L760 200 M498 300 L470 350 M628 470 L590 500 M716 420 L730 470 M540 220 L500 205" />
          <circle cx="612" cy="318" r="9" />
        </svg>
        <div ref={brRef} className="moon-hud__br" role="status" hidden>
          <span className="moon-hud__br-place">{t('backrooms.place')}</span>
          <span ref={brGravRef} className="moon-hud__br-grav" data-earth="true" />
          <span ref={brReadRef} className="moon-hud__br-read" hidden />
          <span className="moon-hud__br-carrier">{t('backrooms.noCarrier')}</span>
        </div>

        {/* ── The way down. ── */}
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

        {/* ── The compass ribbon, what it points at, and the meter under it. ── */}
        <div ref={compassRef} className="moon-hud__compass" aria-hidden>
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
          <div ref={jobPipRef} className="moon-hud__pip moon-hud__pip--job" hidden />
          <div ref={holePipRef} className="moon-hud__pip moon-hud__pip--hole" hidden />
          <span className="moon-hud__needle" />
        </div>
        <div ref={meterRef} className="moon-hud__meter" hidden>
          <span className="moon-hud__meter-bar"><i /></span>
          <span ref={meterLabelRef} />
        </div>
        <div ref={radioRef} className="moon-hud__radio" role="status" hidden />

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
          <span ref={jobRef} className="moon-hud__objective-job" hidden>
            <span className="moon-hud__objective-tag">{t('jobs.title')}</span>
            <span ref={jobTextRef} />
          </span>
        </button>

        {/* ── Left rail: the suit. ── */}
        <div className="moon-hud__vitals">
          <span className="moon-hud__vital"><i>O₂</i><span ref={o2Ref} /><b className="moon-hud__bar"><i ref={o2BarRef} /></b></span>
          <span className="moon-hud__vital"><i>{t('pulse')}</i><span ref={hrRef} /></span>
          <span className="moon-hud__vital"><i>{t('suitTemp')}</i><span ref={tempRef} /></span>
          <span className="moon-hud__vital"><i>{t('eva')}</i><span ref={evaRef} /></span>
          <span className="moon-hud__vital"><i>{t('distance')}</i><span ref={distRef} /></span>
        </div>

        {/* ── Right rail: the drill's instruments while it runs. ── */}
        <div ref={drillRef} className="moon-hud__drill" hidden
          style={{ '--lo': DRILL_BAND[0], '--hi': DRILL_BAND[1] } as React.CSSProperties}>
          <span className="moon-hud__drill-row"><span>{t('mission.drill.depth')}</span><span ref={drillDepthRef} className="moon-hud__drill-depth" /></span>
          <span className="moon-hud__drill-row"><span>{t('mission.drill.load')}</span><span ref={drillLoadRef} className="moon-hud__gauge"><b /><i /></span></span>
          <span className="moon-hud__drill-row"><span>{t('mission.drill.temp')}</span><span ref={drillHeatRef} className="moon-hud__gauge"><i /></span></span>
          <span ref={drillWarnRef} className="moon-hud__drill-warn" hidden />
        </div>

        {/* ── Top right: the camera, the eye, the menu. ── */}
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
              <button type="button" role="menuitem" onClick={() => { setLog(true); setMenu(false); }}>
                <Trophy size={16} aria-hidden /><span>{t('mission.log')}</span>
              </button>
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
              {rewards.length === 0 && jobsDone.length === 0 && !underground?.escaped && <p>{t('mission.none')}</p>}
              {underground?.escaped && (
                <p className="moon-hud__reward"><Trophy size={14} aria-hidden /><span>{t('backrooms.log', { time: fmtTime(underground.bestSeconds) })}</span></p>
              )}
              {rewards.map((r) => (
                <p key={r} className="moon-hud__reward"><Trophy size={14} aria-hidden /><span>{t(`mission.rewards.${r}`)}</span></p>
              ))}
              {jobsDone.map((id) => (
                <p key={id} className="moon-hud__reward"><Trophy size={14} aria-hidden /><span>{t(`jobs.names.${id}`)}</span></p>
              ))}
            </div>
          </div>
        )}

        <div ref={impactRef} className="moon-hud__impact" role="status" hidden />
        <div ref={bannerRef} className="moon-hud__banner" role="status" hidden><span /></div>
        <div ref={readoutRef} className="moon-hud__readout" role="status" hidden />

        {/* ── The middle of the glass: what is in front of the crew. ── */}
        <div className="moon-hud__foot">
          <div ref={promptRef} className="moon-hud__prompt" hidden>
            <kbd>E</kbd><span ref={promptTextRef} /><small ref={promptHoldRef} hidden>{t('hold')}</small>
          </div>
          <div ref={airlockRef} className="moon-hud__airlock" hidden />
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
            // On a touch screen, the stick pushed right out to its rim lopes.
            if (touchRef.current) h.input.run = runRef.current || Math.hypot(x, y) > 0.93;
          }} />
          <div className="moon-hud__stance-keys">
            <button type="button" className="moon-hud__key" data-on={run} {...tapKey(toggleRun)} aria-pressed={run} title={t('run')}>
              <ChevronsUp size={18} aria-hidden /><span>{t('run')}</span>
            </button>
            <button type="button" className="moon-hud__key" data-on={crouch} {...tapKey(toggleCrouch)} aria-pressed={crouch} title={t('crouch')}>
              <ChevronsDown size={18} aria-hidden /><span>{t('crouch')}</span>
            </button>
          </div>
        </div>

        <div className="moon-hud__thumb">
          <div ref={workRef} className="moon-hud__work" hidden><span /></div>
          <button ref={gearRef} type="button" className="moon-hud__key moon-hud__gear" {...tapKey(cycleGear)} hidden>
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
