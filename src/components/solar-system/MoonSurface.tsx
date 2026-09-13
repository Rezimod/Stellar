'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronsUp, HelpCircle, Rocket, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { makeMoonSurface, type MoonSurfaceHandle } from '@/lib/solar-system/moon-surface';

interface MoonSurfaceProps {
  onReturn: () => void;
}
interface Stick { id: number; ox: number; oy: number; x: number; y: number }
const STICK_RADIUS = 58;
const KEY_ROWS = ['r1', 'r2', 'r3', 'r4', 'r5'] as const;
const TOUCH_ROWS = ['t1', 't2', 't3', 't4'] as const;
const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight']);

export function MoonSurface({ onReturn }: MoonSurfaceProps) {
  const t = useTranslations('solarSystem.moon');
  const [touch, setTouch] = useState(false);
  const [help, setHelp] = useState(false);
  const [run, setRun] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<MoonSurfaceHandle | null>(null);
  const descentRef = useRef<HTMLDivElement>(null);
  const touchdownRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const cratersRef = useRef<HTMLSpanElement>(null);
  const poiRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const impactRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<Stick>({ id: -1, ox: 0, oy: 0, x: 0, y: 0 });
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
      if (stickRef.current.id < 0) {
        input.moveX = x / len;
        input.moveY = y / len;
      }
      input.jump = has('Space') || input.jump;
      input.run = has('ShiftLeft') || has('ShiftRight') || runRef.current;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!MOVE_KEYS.has(e.code)) return;
      if (e.repeat) { e.preventDefault(); return; }
      pressed.add(e.code);
      if (e.code === 'Space') input.jump = true;
      sync();
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!MOVE_KEYS.has(e.code)) return;
      pressed.delete(e.code);
      if (e.code === 'Space') input.jump = false;
      sync();
    };
    const onBlur = () => { pressed.clear(); input.moveX = input.moveY = 0; input.jump = false; input.run = runRef.current; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Pointer: a drag anywhere (right half on touch) orbits the camera; a
    // touch on the left half is the walking stick.
    let orbitId = -1;
    let lastX = 0; let lastY = 0;
    const stick = stickRef.current;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('button')) return;
      const rect = mount.getBoundingClientRect();
      const px = e.clientX - rect.left; const py = e.clientY - rect.top;
      if (e.pointerType === 'touch' && px < rect.width / 2) {
        if (stick.id >= 0) return;
        stick.id = e.pointerId;
        stick.ox = px; stick.oy = py; stick.x = stick.y = 0;
      } else {
        if (orbitId >= 0) return;
        orbitId = e.pointerId;
        lastX = e.clientX; lastY = e.clientY;
      }
      mount.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId === orbitId) {
        input.orbitDX += e.clientX - lastX;
        input.orbitDY += e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
      } else if (e.pointerId === stick.id) {
        const rect = mount.getBoundingClientRect();
        let dx = (e.clientX - rect.left - stick.ox) / STICK_RADIUS;
        let dy = (e.clientY - rect.top - stick.oy) / STICK_RADIUS;
        const len = Math.hypot(dx, dy);
        if (len > 1) { dx /= len; dy /= len; }
        stick.x = dx; stick.y = dy;
        input.moveX = dx;
        input.moveY = -dy;
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === orbitId) orbitId = -1;
      if (e.pointerId === stick.id) {
        stick.id = -1; stick.x = stick.y = 0;
        input.moveX = input.moveY = 0;
        sync();
      }
    };
    const onWheel = (e: WheelEvent) => { input.zoom += Math.sign(e.deltaY); e.preventDefault(); };
    mount.addEventListener('pointerdown', onDown);
    mount.addEventListener('pointermove', onMove);
    mount.addEventListener('pointerup', onUp);
    mount.addEventListener('pointercancel', onUp);
    mount.addEventListener('wheel', onWheel, { passive: false });

    // HUD paint at ~30 Hz off the telemetry, no React state churn.
    const tel = handle.telemetry;
    const text = (el: HTMLElement | null, v: string) => { if (el && el.textContent !== v) el.textContent = v; };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pad = padRef.current;
    const resizePad = () => { if (pad) { pad.width = pad.clientWidth * dpr; pad.height = pad.clientHeight * dpr; } };
    resizePad();
    window.addEventListener('resize', resizePad);
    let raf = 0;
    let lastPaint = 0;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const paint = (now: number) => {
      raf = requestAnimationFrame(paint);
      if (now - lastPaint < 33) return;
      lastPaint = now;
      root.dataset.phase = tel.phase;
      if (descentRef.current) descentRef.current.hidden = tel.phase !== 'descent';
      text(touchdownRef.current, t('touchdown', { n: Math.ceil(tel.touchdownIn) }));
      text(altRef.current, `${tel.altitude.toFixed(1)} m`);
      text(speedRef.current, `${tel.speed.toFixed(1)} m/s`);
      text(cratersRef.current, String(tel.craters));
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
      if (pad) {
        const ctx = pad.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, pad.width, pad.height);
          if (stick.id >= 0) {
            ctx.strokeStyle = 'rgba(230, 236, 245, 0.45)';
            ctx.lineWidth = dpr;
            ctx.beginPath(); ctx.arc(stick.ox * dpr, stick.oy * dpr, STICK_RADIUS * dpr, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc((stick.ox + stick.x * STICK_RADIUS) * dpr, (stick.oy + stick.y * STICK_RADIUS) * dpr, 12 * dpr, 0, Math.PI * 2); ctx.stroke();
          }
        }
      }
    };
    raf = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resizePad);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      mount.removeEventListener('pointerdown', onDown);
      mount.removeEventListener('pointermove', onMove);
      mount.removeEventListener('pointerup', onUp);
      mount.removeEventListener('pointercancel', onUp);
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
  };
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
        <div className="moon-hud__top">
          <button type="button" onClick={() => setHelp((h) => !h)} aria-label={t('helpShow')} aria-expanded={help}>
            <HelpCircle size={19} aria-hidden />
          </button>
          <button type="button" className="moon-hud__return" onClick={onReturn}>
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
          <div ref={poiRef} className="moon-hud__poi" hidden />
          <p ref={hintRef} className="moon-hud__hint" hidden />
        </div>
        {touch && (
          <div className="moon-hud__aux">
            <button type="button" className={run ? 'is-on' : undefined} onClick={toggleRun} aria-pressed={run}>
              <ChevronsUp size={18} aria-hidden /><span>{t('run')}</span>
            </button>
            <button type="button" className="moon-hud__jump" {...hold} aria-label={t('jump')}>
              <span>{t('jump')}</span>
            </button>
          </div>
        )}
        {touch && <canvas ref={padRef} className="moon-hud__pad" aria-hidden />}
        <div ref={descentRef} className="moon-hud__descent">
          <span className="moon-hud__descent-title">{t('descending')}</span>
          <span ref={touchdownRef} className="moon-hud__descent-count" />
        </div>
      </div>
    </div>
  );
}
