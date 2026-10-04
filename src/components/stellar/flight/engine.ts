/**
 * The flight: one capsule launched to orbit with a card inside, opened up
 * there. Everything on the stage is a function of one clock, so a frame can
 * be drawn at any moment and Skip is only a jump of the clock.
 *
 *   0.0 s   ignition on the pad at dusk
 *   0.6 s   liftoff, through a cloud deck
 *   2.05 s  stage separation, the Earth comes up from below
 *   2.9 s   the fairing opens and the capsule leaves
 *   3.2 s   the capsule glides to the camera as the Sun rises over the limb
 *   4.25 s  the hatch opens, the card comes out face down and turns over
 *
 * The scarcer the card, the longer it is held before it turns and the larger
 * the turn: a clean flip, a ring, a traced edge and a burst, a star.
 *
 * Canvas for light and smoke, SVG for the vehicles, CSS 3D for the card. No
 * dependencies. Under prefers-reduced-motion it goes straight to the card.
 */

import type { Rarity } from '@/lib/rarity';
import { capsuleArt, doorArt, rocketArt } from './art';

export type FlightOptions = {
  rarity: Rarity;
  /** The rarity's own colour, for the rim, the ring and the dust. */
  tone: string;
  reducedMotion: boolean;
  sound: boolean;
  /** Called once the card has turned over and settled. */
  onDone: () => void;
  /** Called when the run starts, and when Skip stops being useful. */
  onState?: (s: { flying: boolean; skippable: boolean }) => void;
};

export type FlightHandle = {
  launch: () => void;
  skip: () => void;
  setSound: (on: boolean) => void;
  destroy: () => void;
};

/** The light out of the hatch, by rarity: the only tell before the card turns. */
const RAY: Record<Rarity, string> = { common: '#fff1d8', rare: '#ffc98a', epic: '#ff9a4a', legendary: '#ffe39a' };

const T = { lift: 600, maxq: 1200, meco: 1900, sep: 2050, ign2: 2200, zoom: 2300, zoomEnd: 2900, fair: 2900, capsep: 3200, drift: 4200, hatch: 4250, card: 4550 };
const EMERGE = 1100;
const HOLD: Record<Rarity, number> = { common: 250, rare: 450, epic: 450, legendary: 550 };
const FLIP: Record<Rarity, number> = { common: 750, rare: 900, epic: 2400, legendary: 3800 };
const PHASES: [number, string][] = [[0, 'Ignition'], [T.lift, 'Liftoff'], [T.maxq, 'Max-Q'], [T.meco, 'Main engine cut-off'], [T.sep, 'Stage separation'], [T.fair, 'Fairing separation'], [T.capsep, 'Capsule separation'], [3700, 'In orbit'], [T.hatch, 'Hatch open']];

export const flightEnd = (r: Rarity) => T.card + EMERGE + HOLD[r] + FLIP[r];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const eio = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const eo = (u: number) => 1 - Math.pow(1 - u, 3);
const eo4 = (u: number) => 1 - Math.pow(1 - u, 4);
const ei = (u: number) => u * u * u;
const sm = (u: number) => u * u * (3 - 2 * u);
const back = (u: number) => 1 + 2.9 * Math.pow(u - 1, 3) + 1.9 * Math.pow(u - 1, 2);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

type Smoke = { x: number; y: number; vx: number; vy: number; r: number; grow: number; life: number; max: number; a: number; drag: number; buoy: number; img: HTMLCanvasElement; world: boolean; hot: boolean; hit?: boolean };
type Glow = { x: number; y: number; vx: number; vy: number; s: number; life: number; max: number; c: string; drag: number; g: number; shrink: boolean; world: boolean };
type Cloud = { x: number; y: number; w: number; d: number; v: number; front: boolean };
type Star = { x: number; y: number; z: number; a: number; tw: number };

/* ---------------- sound: synthesised, nothing to load ---------------- */

type Voice = { type?: BiquadFilterType; f?: number; f2?: number; q?: number; gain?: number; a?: number; hold?: number; r?: number };
type ToneVoice = { f?: number; f2?: number; type?: OscillatorType; gain?: number; a?: number; hold?: number; r?: number };

function makeSound() {
  let ac: AudioContext | null = null;
  let out: GainNode | null = null;
  let buf: AudioBuffer | null = null;
  let on = true;
  const fresh = () => {
    if (!ac) return;
    if (out) {
      const old = out;
      old.gain.setTargetAtTime(0, ac.currentTime, 0.05);
      window.setTimeout(() => old.disconnect(), 400);
    }
    out = ac.createGain();
    out.gain.value = on ? 0.9 : 0;
    const comp = ac.createDynamicsCompressor();
    out.connect(comp);
    comp.connect(ac.destination);
  };
  const env = (g: GainNode, t0: number, peak: number, a: number, hold: number, r: number) => {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.setValueAtTime(peak, t0 + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + hold + r);
  };
  return {
    init() {
      if (ac) {
        void ac.resume?.();
        return;
      }
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      const len = ac.sampleRate * 4;
      buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      let l = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        l = (l + 0.02 * w) / 1.02;
        d[i] = l * 2.45 + w * 0.045;
      }
      fresh();
      void ac.resume?.();
    },
    fresh,
    noise(at: number, { type = 'lowpass', f = 200, f2, q = 0.7, gain = 0.5, a = 0.05, hold = 0.5, r = 0.5 }: Voice) {
      if (!ac || !out || !buf) return;
      const t0 = ac.currentTime + at;
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.playbackRate.value = 0.8 + Math.random() * 0.4;
      const flt = ac.createBiquadFilter();
      flt.type = type;
      flt.frequency.setValueAtTime(f, t0);
      if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t0 + a + hold);
      flt.Q.value = q;
      const g = ac.createGain();
      env(g, t0, gain, a, hold, r);
      src.connect(flt);
      flt.connect(g);
      g.connect(out);
      src.start(t0, Math.random() * 3);
      src.stop(t0 + a + hold + r + 0.1);
    },
    tone(at: number, { f = 440, f2, type = 'sine', gain = 0.1, a = 0.01, hold = 0, r = 1 }: ToneVoice) {
      if (!ac || !out) return;
      const t0 = ac.currentTime + at;
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f, t0);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + a + hold + r * 0.6);
      const g = ac.createGain();
      env(g, t0, gain, a, hold, r);
      o.connect(g);
      g.connect(out);
      o.start(t0);
      o.stop(t0 + a + hold + r + 0.1);
    },
    set(v: boolean) {
      on = v;
      if (out && ac) out.gain.setTargetAtTime(v ? 0.9 : 0, ac.currentTime, 0.05);
    },
    get on() {
      return on;
    },
    close() {
      if (out) out.disconnect();
      void ac?.close?.();
      ac = null;
      out = null;
    },
  };
}

/* ---------------- the engine ---------------- */

export function startFlight(root: HTMLElement, opts: FlightOptions): FlightHandle {
  const { rarity, tone } = opts;
  const RM = opts.reducedMotion;
  const q = <E extends Element = HTMLElement>(name: string) => root.querySelector(`[data-sf="${name}"]`) as unknown as E;
  const u = `f${Math.random().toString(36).slice(2, 8)}`;

  const stage = q('stage');
  const el = {
    cam: q('cam'), rocket: q('rocket'), cap: q('cap'), capart: q('capart'),
    door: q('door'), hlight: q('hlight'), rays: q('rays'), dim: q('dim'), mover: q('mover'), bob: q('bob'), tilt: q('tilt'),
    card: q('card'), rim: q('rim'), ring: q('ring'), tracer: q('tracer'), spikes: q('spikes'), sheen: q('sheen'),
    flash: q('flash'), lbT: q('lbT'), lbB: q('lbB'), tele: q('tele'), phase: q('phase'), clock: q('clock'), tdata: q('tdata'),
  };
  el.rocket.innerHTML = rocketArt(u);
  el.capart.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">${capsuleArt(`${u}d`, false)}</svg>`;
  el.door.innerHTML = doorArt(u);
  const part = (scope: Element, name: string) => scope.querySelector(`[data-part="${name}"]`) as SVGElement;
  const v = {
    boost: part(el.rocket, 'boost'), upper: part(el.rocket, 'upper'), payload: part(el.rocket, 'payload'),
    fairL: part(el.rocket, 'fairL'), fairR: part(el.rocket, 'fairR'), frost: part(el.rocket, 'frost'), burn: part(el.rocket, 'burn'),
    char: part(el.capart, 'char'), heat: part(el.capart, 'heat'),
  };
  // Opened in orbit: the capsule never meets the air, so no scorch and no glow.
  v.char.style.opacity = '0';
  v.heat.style.opacity = '0';
  const rims = [...el.rocket.querySelectorAll<SVGElement>('[data-part="rim"]')];
  const tracerRect = el.tracer.querySelector('rect') as SVGRectElement;
  const spk = {
    core: el.spikes.querySelector<HTMLElement>('.sf-spk-core')!,
    h: el.spikes.querySelector<HTMLElement>('.sf-spk-h')!,
    v: el.spikes.querySelector<HTMLElement>('.sf-spk-v')!,
    d1: el.spikes.querySelector<HTMLElement>('.sf-spk-d1')!,
    d2: el.spikes.querySelector<HTMLElement>('.sf-spk-d2')!,
  };
  root.style.setProperty('--sf-tone', tone);
  root.style.setProperty('--sf-ray', RAY[rarity]);

  const bg = q<HTMLCanvasElement>('bg'), bctx = bg.getContext('2d')!;
  const fx = q<HTMLCanvasElement>('fx'), fctx = fx.getContext('2d')!;
  const gl = document.createElement('canvas'), gctx = gl.getContext('2d')!;
  const b1 = document.createElement('canvas'), b1x = b1.getContext('2d')!;
  const b2 = document.createElement('canvas'), b2x = b2.getContext('2d')!;

  let seed = 7;
  const srnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const sprite = (inner: string, mid: string, outer: string) => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d')!;
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, inner);
    g.addColorStop(0.45, mid);
    g.addColorStop(1, outer);
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return c;
  };
  const SMOKE = sprite('rgba(222,222,228,.9)', 'rgba(190,190,198,.45)', 'rgba(170,170,180,0)');
  const glowCache = new Map<string, HTMLCanvasElement>();
  const glow = (c: string) => {
    let s = glowCache.get(c);
    if (!s) glowCache.set(c, (s = sprite('#ffffff', c, 'rgba(0,0,0,0)')));
    return s;
  };
  const cloudSprite = (top: number[], bottom: number[], s0: number) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 220;
    const x = c.getContext('2d')!;
    seed = s0;
    for (let i = 0; i < 70; i++) {
      const px = 256 + (srnd() - 0.5) * 420 * (1 - Math.pow(srnd(), 3) * 0.5), py = 120 + (srnd() - 0.5) * 90, r = 28 + srnd() * 60;
      const k = clamp((py - 60) / 120);
      const col = (a: number) => `rgba(${top.map((t, j) => Math.round(lerp(t, bottom[j], k))).join(',')},${a})`;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, col(0.5));
      g.addColorStop(0.6, col(0.22));
      g.addColorStop(1, col(0));
      x.fillStyle = g;
      x.fillRect(px - r, py - r, r * 2, r * 2);
    }
    return c;
  };
  const CLOUD_DUSK = [cloudSprite([255, 214, 196], [120, 118, 150], 21), cloudSprite([250, 200, 190], [110, 110, 145], 33)];
  const EARTH = new Image();
  EARTH.src = '/stellar/flight/earth.jpg';
  const MW = new Image();
  MW.src = '/stellar/flight/milkyway.jpg';

  let W = 0, H = 0, dpr = 1, padY = 0, rh = 0, rw = 0, ZR = 1, cw = 0, ZH = 1, fw = 0, fh = 0, CX = 0, CY = 0;
  let stars: Star[] = [], clouds: Cloud[] = [], ridgeLaunch: number[] = [];

  function layout() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [bg, fx, gl]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    b1.width = Math.ceil(W / 4);
    b1.height = Math.ceil(H / 4);
    b2.width = Math.ceil(W / 10);
    b2.height = Math.ceil(H / 10);
    padY = H * 0.86;
    rh = Math.min(H * 0.52, W * 4);
    rw = rh / 12;
    ZR = (H * 0.5) / ((rh * 250) / 1200);
    el.rocket.style.width = `${rw}px`;
    el.rocket.style.height = `${rh}px`;
    cw = Math.min(W * 0.4, H * 0.24);
    el.cap.style.width = el.cap.style.height = `${cw}px`;
    ZH = Math.min(W * 0.6, H * 0.34) / (0.26 * cw);
    fh = Math.min(H * 0.5, 470);
    fw = (fh * 630) / 880;
    if (fw > W * 0.78) {
      fw = W * 0.78;
      fh = (fw * 880) / 630;
    }
    CX = W / 2;
    CY = H * 0.4;
    Object.assign(el.mover.style, { width: `${fw}px`, height: `${fh}px`, left: `${CX - fw / 2}px`, top: `${CY - fh / 2}px` });
    root.style.setProperty('--sf-card-bottom', `${CY + fh / 2}px`);
    el.spikes.style.left = `${CX}px`;
    el.spikes.style.top = `${CY}px`;
    stars = Array.from({ length: Math.round((W * H) / 1900) }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.2 + Math.random() * 0.8, a: 0.25 + Math.random() * 0.75, tw: Math.random() * 6 }));
    seed = 3;
    const ridge = (n: number, amp: number, jag: number) => Array.from({ length: n + 1 }, (_, i) => amp * (0.35 + 0.65 * Math.abs(Math.sin(i * 0.9 + srnd() * jag)) * (0.5 + srnd() * 0.5)));
    ridgeLaunch = ridge(10, H * 0.05, 1.4);
    seed = 91;
    clouds = Array.from({ length: 16 }, (_, i) => ({ x: srnd() * 1.4 - 0.2, y: (srnd() - 0.5) * 0.5, w: 0.7 + srnd() * 0.9, d: 0.75 + srnd() * 0.55, v: i % 2, front: srnd() < 0.35 }));
  }

  /* particles */
  const smoke: Smoke[] = [];
  const glows: Glow[] = [];
  const addSmoke = (p: Partial<Smoke> & { x: number; y: number }) => smoke.push({ vx: 0, vy: 0, r: 10, grow: 0.5, life: 0, max: 1500, a: 0.7, drag: 0.985, buoy: 0.004, img: SMOKE, world: false, hot: false, ...p });
  const addGlow = (p: Partial<Glow> & { x: number; y: number; c: string }) => glows.push({ vx: 0, vy: 0, s: 2, life: 0, max: 800, drag: 0.96, g: 0, shrink: true, world: false, ...p });
  const burst = (x: number, y: number, n: number, color: string, speed: number, o: { angle?: number; spread?: number; life?: number; size?: number; g?: number; drag?: number } = {}) => {
    for (let i = 0; i < n; i++) {
      const a = o.angle !== undefined ? o.angle + (Math.random() - 0.5) * (o.spread ?? 1) : Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random() * 0.9);
      addGlow({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, max: (o.life ?? 900) * (0.6 + Math.random() * 0.7), s: (o.size ?? 2) * (0.5 + Math.random()), c: color, g: o.g ?? 0.03, drag: o.drag ?? 0.965 });
    }
  };
  const puff = (x: number, y: number, n: number, img: HTMLCanvasElement, o: { angle?: number; spread?: number; speed?: number; r?: number; grow?: number; life?: number; a?: number; buoy?: number } = {}) => {
    for (let i = 0; i < n; i++) {
      const a = o.angle !== undefined ? o.angle + (Math.random() - 0.5) * (o.spread ?? 1) : Math.random() * Math.PI * 2;
      const sp = (o.speed ?? 2) * (0.3 + Math.random() * 0.9);
      addSmoke({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: (o.r ?? 10) * (0.6 + Math.random() * 0.6), grow: o.grow ?? 0.5, max: (o.life ?? 1800) * (0.7 + Math.random() * 0.6), img, a: o.a ?? 0.6, buoy: o.buoy ?? 0.002 });
    }
  };

  /* state */
  let running = false, done = false, startAt = 0, t = -1, raf = 0, alive = true;
  let skippable = false;
  const F = T.card + EMERGE + HOLD[rarity];
  const END = F + FLIP[rarity];
  const sound = makeSound();
  sound.set(opts.sound);
  const buzz = (p: number | number[]) => {
    try {
      navigator.vibrate?.(p);
    } catch {
      /* not every browser lets a page buzz */
    }
  };

  const alt = (tt: number) => {
    if (tt < T.lift) return 0;
    const s = (tt - T.lift) / 1000;
    return H * 0.16 * s * s * (1 + 0.25 * s);
  };

  let rocketBox = { left: 0, top: 0, k: 1 };
  let capPose = { hx: 0, hy: 0, k: 1, rot: 0 };
  let camY = 0;
  const rp = (lx: number, ly: number): [number, number] => [rocketBox.left + (lx / 100) * rw * rocketBox.k, rocketBox.top + (ly / 1200) * rh * rocketBox.k];
  const cp = (lx: number, ly: number): [number, number] => {
    const { hx, hy, k, rot } = capPose;
    const a = (rot * Math.PI) / 180, dx = (lx - 0.5) * cw * k, dy = (ly - 0.47) * cw * k;
    return [hx + dx * Math.cos(a) - dy * Math.sin(a), hy + dx * Math.sin(a) + dy * Math.cos(a)];
  };

  type Scene = { a: number; launchVis: number; thr: number; thr2: number };

  function renderVehicles(tt: number, live: boolean): Scene {
    const a = live ? alt(tt) : 0;
    const rise = H * 0.2 * (1 - Math.exp(-a / (H * 0.2)));
    camY = a - rise;
    let amp = 0;
    if (live && tt < T.meco) amp = tt < T.lift ? 2.2 * eo(tt / T.lift) : 2.2 * Math.exp(-(tt - T.lift) / 1400) + 0.5;
    const jx = (Math.random() - 0.5) * amp, jy = (Math.random() - 0.5) * amp * 0.5;
    let ay = 1, sy = padY - rise, k = 1;
    if (live && tt > T.zoom) {
      const z = eio(prog(tt, T.zoom, T.zoomEnd));
      ay = lerp(1, 125 / 1200, z);
      sy = lerp(padY - rise, H * 0.42, z);
      k = lerp(1, ZR, z);
    }
    const left = W / 2 + jx - 0.5 * rw * k, top = sy + jy - ay * rh * k;
    rocketBox = { left, top, k };
    // The spent upper stage and the fairing fall away behind the capsule.
    const launchVis = live ? 1 - prog(tt, T.capsep + 250, T.capsep + 950) : 1;
    el.rocket.style.transform = `translate(${left}px,${top}px) scale(${k})`;
    el.rocket.style.opacity = `${launchVis}`;
    el.rocket.style.visibility = launchVis > 0 ? 'visible' : 'hidden';
    const s1 = live ? Math.max(0, (tt - T.sep) / 1000) : 0;
    v.boost.setAttribute('transform', s1 ? `translate(0 ${380 * s1 * s1 + 30 * s1}) rotate(${7 * s1} 50 800)` : '');
    v.boost.style.opacity = `${1 - prog(tt, T.sep + 900, T.sep + 1700)}`;
    const s2 = live ? Math.max(0, (tt - T.capsep) / 1000) : 0;
    v.upper.setAttribute('transform', s2 ? `translate(0 ${90 * s2 * s2 + 25 * s2})` : '');
    v.upper.style.opacity = `${1 - prog(tt, T.capsep + 100, T.capsep + 900)}`;
    v.payload.setAttribute('transform', s2 ? `translate(0 ${-30 * s2})` : '');
    v.payload.style.opacity = live && tt >= T.capsep ? '0' : '1';
    const s3 = live ? Math.max(0, (tt - T.fair) / 1000) : 0;
    const fr = Math.min(85, 150 * Math.pow(s3, 1.15));
    v.fairL.setAttribute('transform', s3 ? `translate(${-40 * s3} ${12 * s3}) rotate(${-fr} 15 250)` : '');
    v.fairR.setAttribute('transform', s3 ? `translate(${40 * s3} ${12 * s3}) rotate(${fr} 85 250)` : '');
    const fo = `${1 - prog(tt, T.fair + 450, T.fair + 1200)}`;
    v.fairL.style.opacity = fo;
    v.fairR.style.opacity = fo;
    const rimO = live ? clamp(1 - camY / (H * 1.6)) * 0.9 + (tt > T.zoom ? 0.55 * prog(tt, T.zoom, T.zoomEnd) : 0) : 0.9;
    for (const r of rims) r.style.opacity = `${rimO}`;
    v.frost.style.opacity = `${live ? 1 - prog(tt, T.lift - 100, T.lift + 1400) : 1}`;
    const thr = !live ? 0 : tt < T.lift ? 0.85 * eo(tt / T.lift) : tt < T.meco ? 1 : 1 - prog(tt, T.meco, T.meco + 80);
    const thr2 = !live ? 0 : prog(tt, T.ign2, T.ign2 + 120) * (1 - prog(tt, 3650, 3900));
    v.burn.style.opacity = `${thr * 0.8 * (1 - clamp(a / (H * 1.6)))}`;

    /* the capsule, out of the fairing and gliding up to the camera in orbit */
    const capVis = live ? prog(tt, T.capsep, T.capsep + 1) : 0;
    let hx = W / 2, hy = H * 0.42, ck = ZH, rot = 0;
    if (live && tt >= T.capsep) {
      const m = eio(prog(tt, T.capsep, T.drift));
      const [px, py] = rp(50, 214.3 - 30 * Math.max(0, (tt - T.capsep) / 1000));
      hx = lerp(px, W / 2, m);
      hy = lerp(py, H * 0.42, m) + Math.sin((tt - T.capsep) / 900) * cw * 0.012 * m;
      ck = lerp((0.56 * rw * rocketBox.k) / cw, ZH, m);
      // A slow quarter-roll as it comes in, square to the camera by the time the hatch opens.
      rot = -22 * (1 - m) * (1 - m) + 1.2 * Math.sin((tt - T.capsep) / 1100) * m;
    }
    capPose = { hx, hy, k: ck, rot };
    el.cap.style.transform = `translate(${hx - 0.5 * cw}px,${hy - 0.47 * cw}px) rotate(${rot}deg) scale(${ck})`;
    el.cap.style.opacity = `${capVis * (1 - prog(tt, T.card + 350, T.card + 1350))}`;
    el.cap.style.visibility = capVis > 0 ? 'visible' : 'hidden';
    el.door.style.transform = `rotateY(${live && tt > T.hatch ? -112 * back(prog(tt, T.hatch, T.hatch + 650)) : 0}deg)`;
    el.hlight.style.opacity = `${live ? prog(tt, T.hatch, T.hatch + 320) : 0}`;
    const D = 0.26 * cw * ck;
    const ro = live && tt > T.hatch ? prog(tt, T.hatch, T.hatch + 380) * (1 - 0.7 * prog(tt, T.card + EMERGE, F)) * (1 - prog(tt, F, F + 700)) : 0;
    const size = D * 7.5;
    el.rays.style.width = el.rays.style.height = `${size}px`;
    el.rays.style.transform = `translate(${hx - size / 2}px,${hy - size / 2}px) rotate(${tt / 45}deg)`;
    el.rays.style.opacity = `${ro * (rarity === 'legendary' ? 1 : rarity === 'epic' ? 0.9 : 0.7)}`;
    return { a, launchVis, thr, thr2 };
  }

  /* the sky and the ground */
  const LOW = [[28, 44, 96], [74, 87, 145], [185, 124, 128], [242, 168, 101]];
  const SPACE = [[0, 0, 0], [1, 3, 10], [3, 8, 24], [6, 16, 44]];
  const STOPS = [0, 0.5, 0.78, 1];
  const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((x, i) => Math.round(lerp(x, b[i], k))).join(',')})`;

  function drawClouds(c: CanvasRenderingContext2D, tt: number, front: boolean) {
    const base = padY - H * 0.85 + camY, set = CLOUD_DUSK, alpha = 1 - prog(tt, T.zoom, T.zoomEnd);
    if (alpha <= 0) return;
    for (const cl of clouds) {
      if (cl.front !== front) continue;
      const y = H * 0.45 + (base - H * 0.45) * cl.d + cl.y * H * 0.5;
      const w = W * cl.w * cl.d, h = (w * 220) / 512;
      if (y + h < -10 || y - h > H + 10) continue;
      c.globalAlpha = alpha * (front ? 0.9 : 0.8);
      c.drawImage(set[cl.v], cl.x * W - w / 2, y - h / 2, w, h);
    }
    c.globalAlpha = 1;
  }

  function drawBG(tt: number, live: boolean, s: Scene, dt: number) {
    const c = bctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    let f: number;
    if (!live) f = 0;
    else f = Math.max(sm(clamp(camY / (H * 2.4))), tt > T.zoom ? prog(tt, T.zoom, T.zoomEnd) : 0);
    const horizon = padY + camY * 0.35 - H * 0.02;
    const g = c.createLinearGradient(0, 0, 0, Math.max(H * 0.55, horizon + H * 0.04));
    STOPS.forEach((st, i) => g.addColorStop(st, mix(LOW[i], SPACE[i], f)));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    if (f < 1) {
      const sg = c.createRadialGradient(W * 0.8, horizon, 0, W * 0.8, horizon, W * 1.1);
      sg.addColorStop(0, `rgba(255,190,120,${0.55 * (1 - f)})`);
      sg.addColorStop(0.35, `rgba(255,140,90,${0.18 * (1 - f)})`);
      sg.addColorStop(1, 'rgba(255,140,90,0)');
      c.fillStyle = sg;
      c.fillRect(0, 0, W, H);
    }
    const sa = Math.pow(f, 1.3);
    if (sa > 0.01 && MW.complete && MW.naturalWidth) {
      const sc = Math.max(W / MW.naturalWidth, (H * 0.75) / MW.naturalHeight) * 1.15;
      const iw = MW.naturalWidth * sc, ih = MW.naturalHeight * sc;
      const oy = live ? -clamp(camY * 0.01, 0, H * 0.08) : 0;
      c.globalAlpha = sa * 0.75;
      c.drawImage(MW, (W - iw) / 2, oy, iw, ih);
      c.globalAlpha = 1;
    }
    let sv = 0;
    if (live && tt < T.capsep) sv = Math.min((alt(tt) - alt(tt - 16)) * 0.35, 14) * (1 - 0.85 * prog(tt, T.zoom, T.zoomEnd));
    else if (live) sv = 0.35;
    if (sa > 0.01) {
      c.lineCap = 'round';
      const now = performance.now();
      for (const st of stars) {
        st.y += (sv * st.z * dt) / 16;
        if (st.y > H + 30) {
          st.y -= H + 60;
          st.x = Math.random() * W;
        }
        if (st.y < -30) {
          st.y += H + 60;
          st.x = Math.random() * W;
        }
        const len = Math.abs(sv) * st.z * 2.6;
        c.globalAlpha = sa * st.a * (0.8 + 0.2 * Math.sin(now / 600 + st.tw));
        c.strokeStyle = '#fff';
        c.lineWidth = st.z * 1.3;
        c.beginPath();
        c.moveTo(st.x, st.y);
        c.lineTo(st.x, st.y - Math.sign(sv || 1) * Math.max(0.2, len));
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    /* the Earth from orbit: NASA Blue Marble, the night side, the atmosphere and the sun on the limb */
    const L = live ? prog(tt, T.zoom, T.zoomEnd + 300) : 0;
    if (L > 0 && EARTH.complete && EARTH.naturalWidth) {
      // The Earth settles a little lower as the capsule comes in, so the limb frames the opening.
      const grow = eio(prog(tt, T.capsep, T.card + EMERGE)) * 0.18;
      const R = W * lerp(1.9, 3.4, grow) * (1 + 0.02 * prog(tt, T.zoom, T.capsep));
      const top = lerp(H * 1.05, H * 0.7, eo(prog(tt, T.zoom, T.capsep))) + grow * H * 0.45, cy = top + R, cx = W / 2 - W * 0.1;
      c.globalAlpha = L;
      c.save();
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI * 2);
      c.clip();
      c.drawImage(EARTH, cx - R, top, R * 2, R * 2);
      const night = c.createLinearGradient(cx - R * 0.5, 0, cx + R * 0.35, 0);
      night.addColorStop(0, 'rgba(2,6,18,.82)');
      night.addColorStop(0.55, 'rgba(2,6,18,.35)');
      night.addColorStop(1, 'rgba(2,6,18,0)');
      c.fillStyle = night;
      c.fillRect(cx - R, top, R * 2, H);
      const haze = c.createRadialGradient(cx, cy, R * 0.965, cx, cy, R);
      haze.addColorStop(0, 'rgba(140,195,255,0)');
      haze.addColorStop(1, 'rgba(150,205,255,.55)');
      c.fillStyle = haze;
      c.fillRect(cx - R, top, R * 2, H);
      c.restore();
      const atm = c.createRadialGradient(cx, cy, R * 0.998, cx, cy, R * 1.035);
      atm.addColorStop(0, 'rgba(170,215,255,.9)');
      atm.addColorStop(0.2, 'rgba(90,150,255,.45)');
      atm.addColorStop(1, 'rgba(60,110,255,0)');
      c.fillStyle = atm;
      c.beginPath();
      c.arc(cx, cy, R * 1.035, Math.PI, Math.PI * 2);
      c.arc(cx, cy, R * 0.998, Math.PI * 2, Math.PI, true);
      c.fill();
      const sx = W * 0.86, sy = top + ((sx - cx) * (sx - cx)) / (2 * R) - 2;
      c.globalCompositeOperation = 'lighter';
      // Sunrise over the limb, timed to the hatch: the light comes up as the capsule opens.
      c.globalAlpha = L * (0.7 + 0.7 * sm(prog(tt, T.drift - 500, T.card + 500)));
      const sun = c.createRadialGradient(sx, sy, 0, sx, sy, W * 0.55);
      sun.addColorStop(0, 'rgba(255,248,230,1)');
      sun.addColorStop(0.04, 'rgba(255,225,180,.75)');
      sun.addColorStop(0.18, 'rgba(255,170,110,.18)');
      sun.addColorStop(1, 'rgba(255,170,110,0)');
      c.fillStyle = sun;
      c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,240,220,.55)';
      c.fillRect(sx - W * 0.5, sy - 0.6, W, 1.2);
      for (const [k, r, a] of [[0.35, 26, 0.12], [0.62, 12, 0.18], [1.25, 40, 0.07], [1.5, 8, 0.2]]) {
        const gx = lerp(sx, W / 2, k), gy = lerp(sy, H * 0.4, k);
        c.globalAlpha = L * a;
        c.drawImage(glow('rgba(140,190,255,.7)'), gx - r, gy - r, r * 2, r * 2);
      }
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
    }
    if (live) drawClouds(c, tt, false);
    if (s.launchVis > 0) drawPad(tt, live, s);
  }

  function drawPad(tt: number, live: boolean, s: Scene) {
    const c = bctx, gy = padY + camY;
    c.globalAlpha = s.launchVis;
    const yd = padY + camY * 0.55;
    if (yd - H * 0.06 < H) {
      c.fillStyle = '#0b1226';
      c.beginPath();
      c.moveTo(0, H + 10);
      ridgeLaunch.forEach((h, i) => c.lineTo((i / (ridgeLaunch.length - 1)) * W, yd - h * 0.7));
      c.lineTo(W, H + 10);
      c.closePath();
      c.fill();
    }
    if (gy < H + 40) {
      c.fillStyle = '#03050a';
      c.fillRect(0, gy, W, H - gy + 40);
      c.fillStyle = 'rgba(255,170,110,.12)';
      c.fillRect(0, gy, W, 1);
      c.fillStyle = '#0b0f17';
      c.fillRect(W / 2 - rw * 4, gy - 5, rw * 8, 5);
      c.globalCompositeOperation = 'lighter';
      for (const side of [-1, 1]) {
        const bx = W / 2 + side * W * 0.36, ty = gy - rh * 0.6;
        const beam = c.createLinearGradient(bx, gy, W / 2, ty);
        beam.addColorStop(0, 'rgba(200,215,255,.08)');
        beam.addColorStop(1, 'rgba(200,215,255,0)');
        c.fillStyle = beam;
        c.beginPath();
        c.moveTo(bx - 3, gy);
        c.lineTo(W / 2 - side * rw * 1.5, ty - rh * 0.2);
        c.lineTo(W / 2 - side * rw * 1.5, ty + rh * 0.35);
        c.lineTo(bx + 3, gy);
        c.fill();
        c.drawImage(glow('rgba(210,220,255,.6)'), bx - 9, gy - 12, 18, 18);
      }
      const pg = s.thr * 0.6 * Math.exp(-s.a / (H * 0.45));
      if (pg > 0.01) {
        c.globalAlpha = s.launchVis * pg;
        c.drawImage(glow('rgba(255,140,60,.8)'), W / 2 - rw * 10, gy - rw * 6, rw * 20, rw * 10);
        c.globalAlpha = s.launchVis;
      }
      c.globalCompositeOperation = 'source-over';
      const tw = rw * 0.78, tx = W / 2 - rw * 0.5 - rw * 1.1 - tw, th = rh * 0.86;
      c.strokeStyle = '#080b13';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(tx, gy);
      c.lineTo(tx, gy - th);
      c.moveTo(tx + tw, gy);
      c.lineTo(tx + tw, gy - th);
      for (let y = 0; y < th; y += tw * 1.15) {
        c.moveTo(tx, gy - y);
        c.lineTo(tx + tw, gy - y - tw * 1.15);
        c.moveTo(tx + tw, gy - y);
        c.lineTo(tx, gy - y - tw * 1.15);
      }
      c.moveTo(tx - 3, gy - th);
      c.lineTo(tx + tw + 3, gy - th);
      c.stroke();
      const armA = live ? -1.1 * eo(prog(tt, 0, 600)) : 0;
      c.save();
      c.translate(tx + tw, gy - rh * 0.78);
      c.rotate(armA);
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(rw * 1.1, 0);
      c.stroke();
      c.restore();
      const blink = Math.sin(performance.now() / 380) > 0 ? 1 : 0.25;
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = s.launchVis * blink;
      c.drawImage(glow('rgba(255,70,50,.9)'), tx + tw / 2 - 7, gy - th - 9, 14, 14);
      c.globalAlpha = s.launchVis * 0.8;
      c.drawImage(glow('rgba(244,177,19,.9)'), tx - 5, gy - th * 0.45 - 5, 10, 10);
      c.globalCompositeOperation = 'source-over';
    }
    c.globalAlpha = 1;
  }

  function emit(tt: number, live: boolean, s: Scene, dt: number) {
    if (!live) {
      if (Math.random() < dt / 90) {
        const [x, y] = rp(Math.random() < 0.5 ? 20 : 80, 300 + Math.random() * 80);
        addSmoke({ x, y: y - camY, world: true, vx: (x < W / 2 ? -1 : 1) * rnd(0.2, 0.7), vy: rnd(0.05, 0.3), r: rw * 0.25, grow: 0.18, max: 1800, a: 0.32, buoy: -0.002 });
      }
      return;
    }
    if (s.thr > 0) {
      const [nx, ny] = rp(50, 1196);
      const wy = ny - camY;
      const n = Math.round((dt / 3) * s.thr);
      for (let i = 0; i < n; i++) addGlow({ x: nx + rnd(-rw * 0.12, rw * 0.12), y: wy, world: true, vx: rnd(-0.8, 0.8), vy: rnd(6, 11), max: rnd(180, 340), s: rw * rnd(0.16, 0.3), c: Math.random() < 0.5 ? 'rgba(255,200,110,.9)' : 'rgba(255,130,60,.8)', drag: 0.95 });
      if (s.a < H * 1.5) {
        const m = (dt / (tt < T.lift ? 5 : 8)) * s.thr;
        for (let i = 0; i < m; i++) addSmoke({ x: nx + rnd(-rw * 0.3, rw * 0.3), y: wy + rnd(0, rw), world: true, vx: rnd(-1, 1), vy: rnd(3, 6), r: rw * rnd(0.45, 0.8), grow: rnd(0.35, 0.8), max: rnd(2600, 4200), a: 0.72, hot: true });
      }
    }
    if (tt > T.card && tt < T.card + EMERGE * 0.8) {
      const e = eo4(prog(tt, T.card, T.card + EMERGE));
      const x = lerp(capPose.hx, CX, e), y = lerp(capPose.hy, CY, e) - Math.sin(Math.PI * e) * H * 0.05;
      for (let i = 0; i < dt / 10; i++) addGlow({ x: x + rnd(-1, 1) * fw * 0.3 * e, y: y + rnd(-1, 1) * fh * 0.3 * e, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), max: rnd(400, 800), s: rnd(1, 2.2), c: RAY[rarity], drag: 0.97 });
    }
    if (tt > T.hatch && tt < T.card + 600 && Math.random() < dt / 45) {
      const [x, y] = cp(0.5 + rnd(-0.1, 0.1), 0.47 + rnd(-0.1, 0.1));
      addSmoke({ x, y, vx: rnd(-1, 1.5), vy: rnd(-1.2, -0.3), r: cw * capPose.k * 0.06, grow: 0.6, max: 1500, a: 0.35 });
    }
    if (tt > T.card + EMERGE && tt < END && (rarity === 'epic' || rarity === 'legendary') && Math.random() < dt / (rarity === 'legendary' ? 28 : 55)) {
      addGlow({ x: CX + rnd(-0.65, 0.65) * fw, y: CY + fh * 0.48, vy: -rnd(0.6, 1.4), g: -0.004, max: 1700, s: 1.6, c: tone, drag: 0.995, shrink: false });
    }
    if (done && rarity === 'legendary' && Math.random() < dt / 70) addGlow({ x: Math.random() * W, y: -8, vx: rnd(-0.2, 0.2), vy: rnd(0.5, 1), g: 0.002, max: 5000, s: 1.4, c: tone, drag: 0.998, shrink: false });
  }

  function drawFX(tt: number, live: boolean, s: Scene, dt: number) {
    const c = fctx, g0 = gctx, k = dt / 16;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    g0.setTransform(dpr, 0, 0, dpr, 0, 0);
    g0.clearRect(0, 0, W, H);
    g0.globalCompositeOperation = 'lighter';
    if (s.thr > 0) {
      const [nx, ny] = rp(50, 1196), K = rocketBox.k;
      const af = clamp(s.a / (H * 2.2));
      const len = rw * K * (2.8 + 6 * af) * s.thr * rnd(0.94, 1.06), wid = rw * K * (0.4 + 0.9 * af);
      g0.save();
      g0.translate(nx, ny);
      g0.scale(wid, len);
      const g = g0.createRadialGradient(0, 0.05, 0, 0, 0.05, 1);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.12, 'rgba(255,250,232,.97)');
      g.addColorStop(0.3, 'rgba(255,205,120,.75)');
      g.addColorStop(0.6, 'rgba(255,125,55,.25)');
      g.addColorStop(1, 'rgba(255,90,40,0)');
      g0.fillStyle = g;
      g0.beginPath();
      g0.ellipse(0, 0.45, 0.5, 0.58, 0, 0, Math.PI * 2);
      g0.fill();
      g0.restore();
      if (af < 0.45) {
        g0.globalAlpha = 0.6 * (1 - af / 0.45) * s.thr;
        for (let i = 1; i <= 4; i++) g0.drawImage(glow('rgba(255,240,210,.95)'), nx - rw * K * 0.15, ny + rw * K * (0.5 + i * 0.58) - rw * K * 0.12, rw * K * 0.3, rw * K * 0.24);
        g0.globalAlpha = 1;
      }
    }
    if (s.thr2 > 0) {
      const [nx, ny] = rp(50, 498), K = rocketBox.k;
      g0.save();
      g0.globalAlpha = s.thr2;
      g0.translate(nx, ny);
      g0.scale(rw * K * 1.9, rw * K * 6);
      const g = g0.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, 'rgba(255,255,255,.95)');
      g.addColorStop(0.1, 'rgba(225,235,255,.7)');
      g.addColorStop(0.4, 'rgba(150,180,255,.18)');
      g.addColorStop(1, 'rgba(120,150,255,0)');
      g0.fillStyle = g;
      g0.beginPath();
      g0.ellipse(0, 0.5, 0.5, 0.55, 0, 0, Math.PI * 2);
      g0.fill();
      g0.restore();
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i];
      p.life += dt;
      if (p.life >= p.max) {
        smoke.splice(i, 1);
        continue;
      }
      if (p.world && p.hot && !p.hit && p.y > padY - 3) {
        p.hit = true;
        p.y = padY - 3;
        p.vy = -rnd(0.15, 0.7);
        p.vx = (Math.random() < 0.5 ? -1 : 1) * rnd(2, 6.5);
      }
      p.vx *= Math.pow(p.drag, k);
      p.vy = p.vy * Math.pow(p.drag, k) - p.buoy * k;
      p.x += p.vx * k;
      p.y += p.vy * k;
      p.r += p.grow * k;
      const y = p.world ? p.y + camY : p.y;
      if (y - p.r > H || y + p.r < 0) continue;
      const life = p.life / p.max;
      c.globalAlpha = Math.min(1, p.life / 140) * Math.pow(1 - life, 1.3) * p.a;
      c.drawImage(p.img, p.x - p.r, y - p.r, p.r * 2, p.r * 2);
      if (p.hot) {
        const near = p.world ? clamp(1 - Math.abs(p.y - padY) / (H * 0.25)) : 0;
        const lit = p.life < 700 ? (1 - p.life / 700) * 0.5 : 0;
        const a2 = Math.max(lit, near * s.thr * 0.28);
        if (a2 > 0.01) {
          g0.globalAlpha = a2 * Math.pow(1 - life, 1.3);
          g0.drawImage(glow('rgba(255,140,60,.85)'), p.x - p.r * 0.85, y - p.r * 0.85, p.r * 1.7, p.r * 1.7);
        }
      }
    }
    c.globalAlpha = 1;
    for (let i = glows.length - 1; i >= 0; i--) {
      const p = glows[i];
      p.life += dt;
      if (p.life >= p.max) {
        glows.splice(i, 1);
        continue;
      }
      p.vx *= Math.pow(p.drag, k);
      p.vy = p.vy * Math.pow(p.drag, k) + p.g * k;
      p.x += p.vx * k;
      p.y += p.vy * k;
      const y = p.world ? p.y + camY : p.y, left = 1 - p.life / p.max;
      const r = p.shrink ? p.s * (0.35 + 0.65 * left) : p.s;
      g0.globalAlpha = p.shrink ? left : Math.min(1, left * 3);
      g0.drawImage(glow(p.c), p.x - r * 2, y - r * 2, r * 4, r * 4);
    }
    g0.globalAlpha = 1;
    g0.globalCompositeOperation = 'source-over';
    /* the light onto the frame, then a bloom from two smaller copies of it */
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'lighter';
    c.drawImage(gl, 0, 0);
    b1x.clearRect(0, 0, b1.width, b1.height);
    b1x.drawImage(gl, 0, 0, b1.width, b1.height);
    b2x.clearRect(0, 0, b2.width, b2.height);
    b2x.drawImage(b1, 0, 0, b2.width, b2.height);
    c.imageSmoothingQuality = 'high';
    c.globalAlpha = 0.55;
    c.drawImage(b1, 0, 0, fx.width, fx.height);
    c.globalAlpha = 0.5;
    c.drawImage(b2, 0, 0, fx.width, fx.height);
    c.restore();
    if (live) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawClouds(c, tt, true);
    }
  }

  function renderCard(tt: number, live: boolean): number {
    const C0 = T.card;
    if (!live || tt < C0) {
      el.mover.style.opacity = '0';
      el.dim.style.opacity = '0';
      el.spikes.style.opacity = '0';
      el.tracer.style.opacity = '0';
      el.ring.style.opacity = '0';
      el.rim.style.opacity = '0';
      return 0;
    }
    const D = 0.26 * cw * capPose.k;
    let dx = 0, dy = 0, sc = 1, ang = 180, op = 1;
    if (tt < C0 + EMERGE) {
      const p = prog(tt, C0, C0 + EMERGE), e = eo4(p);
      dx = (capPose.hx - CX) * (1 - e);
      dy = (capPose.hy - CY) * (1 - e) - Math.sin(Math.PI * e) * H * 0.03;
      sc = lerp((D * 0.55) / fh, 1, e);
      // One slow turn out of the hatch, face down, settling square to the camera.
      ang = 180 + 360 * (1 - e);
      op = Math.min(1, p * 7);
    }
    let dim = 0, flash = 0, tr = 0, trO = 0;
    let ring: { s: number; o: number } | null = null;
    let spikes: { core: number; len: number; o: number; rot: number } | null = null;
    const ft = tt - F;
    if (ft >= 0) {
      if (rarity === 'common' || rarity === 'rare') {
        ang = 180 + 180 * eio(prog(ft, 0, rarity === 'rare' ? 800 : 680));
        if (rarity === 'rare' && ft > 480) {
          const p = prog(ft, 480, 1380);
          ring = { s: lerp(0.55, 1.9, eo(p)), o: 0.9 * (1 - p) };
        }
      } else if (rarity === 'epic') {
        dim = ft < 300 ? 0.82 * prog(ft, 0, 300) : ft < 1500 ? 0.82 : lerp(0.82, 0.3, prog(ft, 1500, 2400));
        const p = prog(ft, 50, 1150);
        tr = 1 - 2 * eio(p);
        trO = p > 0 && p < 1 ? 1 : 0;
        const fu = prog(ft, 1100, 1650);
        ang = 180 + 180 * eio(fu);
        sc *= 1 + 0.07 * Math.sin(Math.PI * fu);
        if (ft > 1450) {
          const ru = prog(ft, 1450, 2550);
          ring = { s: lerp(0.55, 2.4, eo(ru)), o: 1 - ru };
        }
      } else {
        dim = ft < 500 ? prog(ft, 0, 500) : ft < 2260 ? 1 : lerp(1, 0.55, prog(ft, 2260, 3800));
        if (ft < 2260) op = 1 - prog(ft, 0, 450);
        else {
          op = 1;
          ang = 360;
          sc *= lerp(1.14, 1, eo(prog(ft, 2260, 3560)));
        }
        if (ft > 650) {
          const p = prog(ft, 650, 2150);
          const core = ft < 2150 ? (p < 0.6 ? 0.35 * eo(p / 0.6) : lerp(0.35, 1.6, ei((p - 0.6) / 0.4))) : lerp(1.6, 0.7, prog(ft, 2150, 3700));
          const len = ft < 2150 ? (p < 0.55 ? 0.08 * eo(p / 0.55) : lerp(0.08, 1, ei((p - 0.55) / 0.45))) : 1;
          spikes = { core, len, o: ft < 2150 ? 1 : lerp(1, 0.45, prog(ft, 2150, 3700)), rot: (ft / 14000) * 90 };
        }
        if (ft > 2150) {
          const p = prog(ft, 2150, 3150);
          flash = p < 0.12 ? p / 0.12 : 1 - (p - 0.12) / 0.88;
        }
      }
    }
    if (tt >= END) ang = 360;
    const settled = tt > C0 + EMERGE;
    const quake = rarity === 'legendary' && settled && ft < 450 ? 1.2 : 0;
    el.mover.style.opacity = `${op}`;
    el.mover.style.transform = `translate(${dx}px,${dy}px) scale(${sc})`;
    el.bob.style.transform = `translate(${(Math.random() - 0.5) * quake * 2}px,${settled ? -5 * Math.sin((tt - C0 - EMERGE) / 650) : 0}px) rotate(${settled ? 0.4 * Math.sin((tt - C0) / 900) : 0}deg)`;
    el.card.style.transform = `rotateY(${ang}deg)`;
    // Until it turns, only the sealed back is ever seen, even mid-spin; the front waits for the flip.
    root.classList.toggle('is-sealed', ft < 0);
    el.dim.style.opacity = `${dim}`;
    el.tracer.style.opacity = `${trO}`;
    tracerRect.style.strokeDashoffset = `${tr}`;
    el.ring.style.opacity = `${ring ? ring.o : 0}`;
    if (ring) el.ring.style.transform = `translate(-50%,-50%) scale(${ring.s})`;
    const amp = { common: 0, rare: 0.5, epic: 0.85, legendary: 1 }[rarity];
    const per = { common: 1, rare: 1100, epic: 700, legendary: 420 }[rarity];
    let rim = 0;
    if (tt > C0 + EMERGE * 0.7 && ft < 0) rim = amp * (0.55 + 0.45 * Math.sin((tt / per) * Math.PI));
    else if (tt >= END) rim = { common: 0, rare: 0.2, epic: 0.4, legendary: 0.55 }[rarity] * (0.8 + 0.2 * Math.sin(tt / 900));
    el.rim.style.opacity = `${rim}`;
    el.spikes.style.opacity = `${spikes ? spikes.o : 0}`;
    if (spikes) {
      el.spikes.style.transform = `rotate(${spikes.rot}deg)`;
      spk.core.style.transform = `scale(${spikes.core})`;
      spk.h.style.transform = `scaleX(${spikes.len})`;
      spk.v.style.transform = `rotate(90deg) scaleX(${spikes.len})`;
      spk.d1.style.transform = `rotate(45deg) scaleX(${spikes.len * 0.9})`;
      spk.d2.style.transform = `rotate(-45deg) scaleX(${spikes.len * 0.9})`;
    }
    return flash;
  }

  /* one-off moments: bursts and the phone's buzz */
  const sheen = () => {
    el.sheen.classList.remove('is-sweep');
    void el.sheen.offsetWidth;
    el.sheen.classList.add('is-sweep');
  };
  const cueList: [number, () => void][] = [
    [0, () => buzz([20, 40, 20, 40, 90])],
    [T.lift, () => {
      buzz(140);
      for (let i = 0; i < 40; i++) {
        const [x, y] = rp(rnd(22, 78), rnd(560, 850));
        addGlow({ x, y: y - camY, world: true, vx: rnd(-0.5, 0.5), vy: rnd(0.5, 2), g: 0.12, max: rnd(700, 1300), s: rnd(0.6, 1.3), c: 'rgba(230,240,255,.8)', drag: 0.99, shrink: false });
      }
    }],
    [T.sep, () => {
      buzz(40);
      const [x, y] = rp(50, 500);
      burst(x, y, 26, 'rgba(255,235,200,.9)', 3, { life: 700, size: 1.4, g: 0 });
      puff(x, y, 10, SMOKE, { r: rw * 0.3, speed: 1.4, life: 900, a: 0.35, grow: 0.25 });
    }],
    [T.fair, () => {
      buzz(30);
      for (const ly of [40, 120, 200]) {
        const [x, y] = rp(50, ly);
        burst(x, y, 12, 'rgba(255,240,215,.9)', 2.6, { life: 600, size: 1.3, g: 0 });
      }
    }],
    [T.capsep, () => {
      const [x, y] = rp(50, 250);
      puff(x, y, 8, SMOKE, { r: rw * 0.5, speed: 1, life: 900, a: 0.3, grow: 0.3 });
    }],
    [T.hatch, () => {
      buzz([25, 40, 70]);
      const [x, y] = cp(0.5, 0.47);
      puff(x, y, 14, SMOKE, { r: cw * capPose.k * 0.05, speed: 2.4, life: 1400, a: 0.45, grow: 0.7 });
      burst(x, y, 30, RAY[rarity], 4, { life: 900, size: 1.8, g: 0.02 });
    }],
  ];
  if (rarity === 'common') cueList.push([F + 380, () => { buzz(15); sheen(); }]);
  if (rarity === 'rare') cueList.push([F + 480, () => { buzz(25); sheen(); burst(CX, CY, 34, tone, 4.5, { life: 900, size: 1.6, g: 0 }); }]);
  if (rarity === 'epic')
    cueList.push([F + 100, () => buzz([10, 90, 10, 90, 10])], [F + 1450, () => { buzz([30, 40, 80]); sheen(); burst(CX, CY, 100, tone, 6.5, { life: 1300, size: 2, g: 0.05 }); }]);
  if (rarity === 'legendary')
    cueList.push(
      [F + 650, () => buzz([15, 60, 15, 60, 15, 40, 40])],
      [F + 2150, () => buzz([70, 40, 140])],
      [F + 2260, () => {
        sheen();
        burst(CX, CY, 150, tone, 7.5, { life: 1900, size: 2, g: 0.04 });
        burst(CX, CY, 40, 'rgba(255,255,255,.95)', 9, { life: 900, size: 1.4, g: 0 });
      }],
    );
  const cues = cueList.sort((a, b) => a[0] - b[0]).map(([at, fn]) => ({ at, fn, fired: false }));

  /* every sound in the flight, on the same clock as the picture */
  function playFrom(ms: number) {
    if (RM || !sound.on) return;
    sound.fresh();
    const N = sound.noise, Tn = sound.tone, f0 = F / 1000;
    const at = (ms: number) => ms / 1000;
    const list: [number, (o: number) => void][] = [
      [0, (o) => { N(o, { f: 90, f2: 160, gain: 0.9, a: 0.5, hold: 1.6, r: 1.2 }); N(o, { type: 'bandpass', f: 700, q: 0.6, gain: 0.16, a: 0.4, hold: 1.4, r: 1 }); }],
      [at(T.lift), (o) => Tn(o, { f: 55, f2: 32, gain: 0.5, r: 1.1 })],
      [at(T.sep), (o) => { Tn(o, { f: 110, f2: 45, gain: 0.35, r: 0.45 }); N(o, { type: 'highpass', f: 2500, gain: 0.25, a: 0.005, hold: 0.04, r: 0.25 }); }],
      [at(T.ign2), (o) => N(o, { type: 'bandpass', f: 420, q: 1, gain: 0.12, a: 0.1, hold: 0.45, r: 0.4 })],
      [at(T.fair), (o) => { N(o, { type: 'highpass', f: 1800, gain: 0.45, a: 0.003, hold: 0.02, r: 0.18 }); N(o + 0.06, { type: 'highpass', f: 1600, gain: 0.35, a: 0.003, hold: 0.02, r: 0.2 }); }],
      [at(T.capsep), (o) => N(o, { type: 'bandpass', f: 1200, gain: 0.14, a: 0.01, hold: 0.05, r: 0.35 })],
      // In orbit: a low, slow swell under the glide, rising into the hatch.
      [at(T.capsep + 150), (o) => { Tn(o, { f: 196, f2: 262, gain: 0.05, a: 0.7, hold: 0.3, r: 0.9 }); Tn(o, { f: 294, f2: 392, gain: 0.03, a: 0.8, hold: 0.2, r: 0.9 }); }],
      [at(T.hatch), (o) => { Tn(o, { f: 140, f2: 90, type: 'triangle', gain: 0.2, r: 0.2 }); N(o + 0.05, { type: 'highpass', f: 3200, gain: 0.28, a: 0.02, hold: 0.45, r: 0.8 }); }],
      [at(T.card), (o) => { Tn(o, { f: 1318, gain: 0.03, a: 0.3, r: 1.4 }); Tn(o, { f: 1975, gain: 0.02, a: 0.4, r: 1.4 }); }],
    ];
    if (rarity === 'common') list.push([f0 + 0.38, (o) => { Tn(o, { f: 784, gain: 0.1, r: 0.9 }); Tn(o, { f: 1175, gain: 0.05, r: 0.9 }); }]);
    if (rarity === 'rare') list.push([f0 + 0.48, (o) => [523, 659, 784, 1046].forEach((fq, i) => Tn(o + i * 0.07, { f: fq, gain: 0.08, r: 1.2 }))]);
    if (rarity === 'epic')
      list.push(
        [f0 + 0.05, (o) => N(o, { type: 'bandpass', f: 800, f2: 4200, q: 3, gain: 0.12, a: 1.05, hold: 0, r: 0.1 })],
        [f0 + 1.45, (o) => { Tn(o, { f: 50, f2: 35, gain: 0.5, r: 1 }); [523, 659, 784, 1046].forEach((fq) => Tn(o, { f: fq, gain: 0.07, r: 2.2 })); }],
      );
    if (rarity === 'legendary')
      list.push(
        [f0 + 0.65, (o) => { N(o, { type: 'bandpass', f: 300, f2: 3000, q: 2, gain: 0.16, a: 1.45, hold: 0, r: 0.08 }); Tn(o, { f: 180, f2: 1200, type: 'sawtooth', gain: 0.025, a: 1.4, r: 0.1 }); }],
        [f0 + 2.15, (o) => {
          Tn(o, { f: 45, f2: 28, gain: 0.7, r: 2 });
          N(o, { f: 300, gain: 0.4, a: 0.01, hold: 0.1, r: 1.4 });
          [392, 523, 659, 784, 1046, 2093].forEach((fq, i) => Tn(o + i * 0.03, { f: fq, gain: i === 5 ? 0.03 : 0.065, a: 0.02, r: 3 }));
        }],
      );
    for (const [at, fn] of list) if (at * 1000 >= ms - 30) fn(at - ms / 1000);
  }

  const report = (sk: boolean) => {
    if (sk === skippable) return;
    skippable = sk;
    opts.onState?.({ flying: running, skippable: sk });
  };

  function finish() {
    running = false;
    done = true;
    report(false);
    opts.onDone();
  }

  let last = performance.now();
  function frame(now: number) {
    if (!alive) return;
    const dt = Math.min(48, now - last);
    last = now;
    if (running) t = now - startAt;
    const live = running || done;
    const tt = done && !running ? END + 5000 : t;
    if (running) for (const c of cues) if (!c.fired && c.at <= tt) { c.fired = true; c.fn(); }
    const s = renderVehicles(tt, live);
    drawBG(tt, live, s, dt);
    emit(tt, live, s, dt);
    drawFX(tt, live, s, dt);
    const flashCard = renderCard(tt, live);
    el.flash.style.opacity = `${flashCard}`;
    const lb = running ? H * 0.065 * (eo(prog(tt, 0, 600)) - eo(prog(tt, T.card + EMERGE, T.card + EMERGE + 700))) : 0;
    el.lbT.style.height = el.lbB.style.height = `${Math.max(0, lb)}px`;
    let sh = 0;
    if (running) {
      if (tt < T.meco) sh = tt < T.lift ? 3.2 * eo(tt / T.lift) : 3.2 * Math.exp(-(tt - T.lift) / 1100) + 0.7;
      for (const [at, a] of [[T.lift, 4], [T.sep, 3.5], [T.fair, 2.5], [T.hatch, 2]]) if (tt > at) sh += a * Math.exp(-(tt - at) / 230);
    }
    el.cam.style.transform = `translate(${(Math.random() - 0.5) * sh + 2 * Math.sin(now / 2300)}px,${(Math.random() - 0.5) * sh + 1.5 * Math.cos(now / 2900)}px) rotate(${(Math.random() - 0.5) * sh * 0.06}deg)`;
    const teleOn = running && tt < T.card;
    el.tele.classList.toggle('is-on', teleOn);
    if (teleOn) {
      let ph = PHASES[0][1];
      for (const [at, name] of PHASES) if (tt >= at) ph = name;
      el.phase.textContent = ph;
      el.clock.textContent = `T+ 00:${(tt / 1000).toFixed(1).padStart(4, '0')}`;
      const p = prog(tt, T.lift, T.capsep);
      const km = 212 * Math.pow(sm(p), 1.5), kmh = 27400 * Math.pow(p, 1.25);
      el.tdata.innerHTML = `<span><b>ALT</b>${km.toFixed(1)} KM</span><span><b>VEL</b>${Math.round(kmh).toLocaleString('en-US')} KM/H</span>`;
    }
    report(running && tt < F - 200);
    if (running && tt >= END + 150) finish();
    raf = requestAnimationFrame(frame);
  }

  const onResize = () => layout();
  window.addEventListener('resize', onResize);
  layout();
  raf = requestAnimationFrame(frame);

  return {
    launch() {
      if (running || done) return;
      if (RM) {
        done = true;
        t = END + 5000;
        finish();
        return;
      }
      sound.init();
      playFrom(0);
      running = true;
      startAt = performance.now();
      t = 0;
      opts.onState?.({ flying: true, skippable: true });
      skippable = true;
    },
    skip() {
      const to = F - 200;
      if (!running || t >= to) return;
      startAt -= to - t;
      t = to;
      smoke.length = 0;
      glows.length = 0;
      for (const c of cues) if (c.at < to) c.fired = true;
      playFrom(to);
    },
    setSound(on: boolean) {
      sound.set(on);
      if (on && running) {
        sound.init();
        playFrom(t);
      }
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      sound.close();
    },
  };
}
