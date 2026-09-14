'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronsUp, Eye, HelpCircle, Rocket, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { makeMoonSurface, type MoonSurfaceHandle } from '@/lib/solar-system/moon-surface';
import { GameStick } from './GameStick';

interface MoonSurfaceProps {
  onReturn: () => void;
}
const KEY_ROWS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r8', 'r7'] as const;
const TOUCH_ROWS = ['t1', 't2', 't3', 't4', 't6', 't5'] as const;
const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyC']);
const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function MoonSurface({ onReturn }: MoonSurfaceProps) {
  const t = useTranslations('solarSystem.moon');
  const [touch, setTouch] = useState(false);
  const [help, setHelp] = useState(false);
  const [run, setRun] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<MoonSurfaceHandle | null>(null);
  const descentRef = useRef<HTMLDivElement>(null);
  const touchdownRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const cratersRef = useRef<HTMLSpanElement>(null);
  const poiRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const impactRef = useRef<HTMLDivElement>(null);
  const o2Ref = useRef<HTMLSpanElement>(null);
  const hrRef = useRef<HTMLSpanElement>(null);
  const tempRef = useRef<HTMLSpanElement>(null);
  const evaRef = useRef<HTMLSpanElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const airlockRef = useRef<HTMLDivElement>(null);
  const movingRef = useRef(false);
  const keyboardMoveRef = useRef({ x: 0, y: 0 });
  const runRef = useRef(false);
  runRef.current = run;

  useEffect(() => setTouch(window.matchMedia('(pointer: coarse)').matches), []);

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
      input.jump = has('Space') || input.jump;
      input.run = has('ShiftLeft') || has('ShiftRight') || runRef.current;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!MOVE_KEYS.has(e.code)) return;
      handle.startAudio();
      if (e.repeat) { e.preventDefault(); return; }
      pressed.add(e.code);
      if (e.code === 'Space') input.jump = true;
      if (e.code === 'KeyE') input.interact = true;
      if (e.code === 'KeyC') input.viewToggle = true;
      sync();
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!MOVE_KEYS.has(e.code)) return;
      pressed.delete(e.code);
      if (e.code === 'Space') input.jump = false;
      sync();
    };
    const onBlur = () => {
      pressed.clear(); input.moveX = input.moveY = 0; input.jump = false; input.run = false;
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
    let raf = 0;
    let lastPaint = 0;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const paint = (now: number) => {
      raf = requestAnimationFrame(paint);
      if (now - lastPaint < 33) return;
      lastPaint = now;
      root.dataset.phase = tel.phase;
      root.dataset.view = tel.view;
      if (descentRef.current) descentRef.current.hidden = tel.phase !== 'descent';
      text(touchdownRef.current, t('touchdown', { n: Math.ceil(tel.touchdownIn) }));
      text(altRef.current, `${tel.altitude.toFixed(1)} m`);
      text(speedRef.current, `${tel.speed.toFixed(1)} m/s`);
      text(cratersRef.current, String(tel.craters));
      text(o2Ref.current, `${tel.o2.toFixed(1)} %`);
      text(hrRef.current, `${Math.round(tel.heartRate)} bpm`);
      text(tempRef.current, `${tel.suitTemp.toFixed(1)} °C`);
      text(evaRef.current, fmtTime(tel.evaSeconds));
      text(distRef.current, tel.distanceM >= 1000 ? `${(tel.distanceM / 1000).toFixed(2)} km` : `${Math.round(tel.distanceM)} m`);
      const action = actionRef.current;
      if (action) {
        const show = tel.phase === 'surface' && (tel.canDrive || tel.view === 'rover');
        action.hidden = !show;
        if (show) text(action, t(tel.view === 'rover' ? (isTouch ? 'dismountTouch' : 'dismount') : (isTouch ? 'driveTouch' : 'drive')));
      }
      if (airlockRef.current) airlockRef.current.hidden = !tel.airlockOpen || tel.view === 'rover';
      const poi = poiRef.current;
      if (poi) {
        poi.hidden = !tel.poiId;
        if (tel.poiId) text(poi, t(`pois.${tel.poiId}`));
      }
      const hintKey = tel.hint ? (isTouch ? `hints.${tel.hint}Touch` : `hints.${tel.hint}`) : '';
      const hint = hintRef.current;
      if (hint) {
        hint.hidden = !hintKey || tel.phase !== 'surface';
        if (hintKey) text(hint, t(hintKey));
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

  const hold = {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      if (handleRef.current) handleRef.current.input.jump = true;
    },
    onPointerUp: () => { if (handleRef.current) handleRef.current.input.jump = false; },
    onPointerCancel: () => { if (handleRef.current) handleRef.current.input.jump = false; },
    onLostPointerCapture: () => { if (handleRef.current) handleRef.current.input.jump = false; },
  };
  const act = () => { if (handleRef.current) handleRef.current.input.interact = true; };
  const toggleView = () => { if (handleRef.current) handleRef.current.input.viewToggle = true; };
  const toggleRun = () => {
    setRun((r) => {
      if (handleRef.current) handleRef.current.input.run = !r;
      return !r;
    });
  };

  return (
    <div ref={rootRef} className="moon-surface" data-phase="descent">
      <div ref={mountRef} className="moon-surface__canvas" />
      <div className="moon-hud">
        <div className="moon-hud__head">
          <span className="moon-hud__place">{t('place')}</span>
          <span className="moon-hud__reading"><span>{t('gravity')}</span><span>1.62 m/s²</span></span>
          <span className="moon-hud__reading"><span>{t('altitude')}</span><span ref={altRef} /></span>
          <span className="moon-hud__reading"><span>{t('speed')}</span><span ref={speedRef} /></span>
          <span className="moon-hud__reading"><span>{t('craters')}</span><span ref={cratersRef}>0</span></span>
        </div>
        <div className="moon-hud__suit">
          <span className="moon-hud__reading"><span>{t('eva')}</span><span ref={evaRef}>00:00</span></span>
          <span className="moon-hud__reading"><span>O₂</span><span ref={o2Ref} /></span>
          <span className="moon-hud__reading"><span>{t('pulse')}</span><span ref={hrRef} /></span>
          <span className="moon-hud__reading"><span>{t('suitTemp')}</span><span ref={tempRef} /></span>
          <span className="moon-hud__reading"><span>{t('distance')}</span><span ref={distRef} /></span>
        </div>
        <div className="moon-hud__visor" aria-hidden />
        <div className="moon-hud__top">
          <button type="button" onClick={() => setHelp((h) => !h)} aria-label={t('helpShow')} aria-expanded={help}>
            <HelpCircle size={19} aria-hidden />
          </button>
          <button type="button" onClick={toggleView} aria-label={t('view')}>
            <Eye size={19} aria-hidden />
          </button>
          <button type="button" className="moon-hud__return" onClick={onReturn} aria-label={t('returnOrbit')}>
            <Rocket size={16} aria-hidden /><span>{t('returnOrbit')}</span>
          </button>
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
        <div ref={impactRef} className="moon-hud__impact" role="status" hidden />
        <div className="moon-hud__foot">
          <div ref={airlockRef} className="moon-hud__airlock" hidden>{t('airlockOpen')}</div>
          <div ref={poiRef} className="moon-hud__poi" hidden />
          <button ref={actionRef} type="button" className="moon-hud__action" onClick={act} hidden />
          <p ref={hintRef} className="moon-hud__hint" hidden />
        </div>
        <div className="moon-hud__station">
          <button type="button" className={run ? 'is-on' : undefined} onClick={toggleRun} aria-pressed={run} title={t('run')}>
            <ChevronsUp size={20} aria-hidden /><span>{t('run')}</span>
          </button>
          <GameStick label={t('move')} onMove={(x, y) => {
            movingRef.current = x !== 0 || y !== 0;
            if (handleRef.current) {
              if (movingRef.current) handleRef.current.startAudio();
              handleRef.current.input.moveX = movingRef.current ? x : keyboardMoveRef.current.x;
              handleRef.current.input.moveY = movingRef.current ? y : keyboardMoveRef.current.y;
            }
          }} />
        </div>
        <div className="moon-hud__aux">
          <button type="button" className="moon-hud__jump" {...hold} aria-label={t('jump')}>
            <span>{t('jump')}</span>
          </button>
        </div>
        <div ref={descentRef} className="moon-hud__descent">
          <span className="moon-hud__descent-title">{t('descending')}</span>
          <span ref={touchdownRef} className="moon-hud__descent-count" />
        </div>
      </div>
    </div>
  );
}
