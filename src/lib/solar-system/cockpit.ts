// Cockpit view. The world camera sits at the pilot's eye, but the world's
// near plane is wider than the whole fighter, so the interior is its own
// little scene in metres, drawn over the frame with the depth buffer
// cleared: a wraparound canopy on thin struts, a coaming carrying the
// odometer strip, a centre stack of instruments, throttle and stick, side
// consoles with switch banks and guarded caps, and the seat's shoulders at
// the edge of frame. Everything readable is drawn to canvas textures and
// refreshed five times a second, so the interior costs almost nothing.

import * as THREE from 'three';

export interface CockpitHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Airframe tilt, hull shake, and the live figures on the glass. */
  update: (
    dt: number, bank: number, pitch: number, shake: number,
    speedKmS: number, speedC: number, maxKmS: number,
    altKm: number, near: string, hull: number, mode: string, heat: number,
  ) => void;
  setAspect: (aspect: number) => void;
  dispose: () => void;
}

interface Pane {
  tex: THREE.CanvasTexture;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

function pane(w: number, h: number): Pane {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, ctx, w, h };
}

const MONO = '"JetBrains Mono", ui-monospace, monospace';

export function makeCockpit(accent: number): CockpitHandle {
  const accentCss = `#${new THREE.Color(accent).getHexString()}`;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(76, 1, 0.05, 40);
  camera.position.set(0, 1.3, -0.3);
  const rig = new THREE.Group();
  scene.add(rig);

  const dark = new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.8, metalness: 0.3 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x272b33, roughness: 0.55, metalness: 0.55 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.95, metalness: 0.05 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 1, metalness: 0 });
  const accentMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent) });
  const amber = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const red = new THREE.MeshBasicMaterial({ color: 0xff5a5a });
  const owned: THREE.Material[] = [dark, trim, seatMat, rubber, accentMat, amber, red];
  const geoms: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, m: THREE.Material) => {
    geoms.push(g);
    const o = new THREE.Mesh(g, m);
    rig.add(o);
    return o;
  };

  // ── Canopy: two A-pillars, a brow, open glass between them. ──
  for (const x of [-1.95, 1.95]) {
    const s = add(new THREE.BoxGeometry(0.07, 2.6, 0.07), trim);
    s.position.set(x, 1.7, 1.25);
    s.rotation.z = x < 0 ? 0.3 : -0.3;
  }
  const brow = add(new THREE.BoxGeometry(3.3, 0.1, 0.12), trim);
  brow.position.set(0, 2.62, 1.0);
  // Overhead panel under the brow — breaker row with one amber guard.
  const overhead = add(new THREE.BoxGeometry(1.6, 0.1, 0.5), dark);
  overhead.position.set(0, 2.42, 0.55);
  overhead.rotation.x = 0.35;
  for (let i = 0; i < 8; i++) {
    const b = add(new THREE.BoxGeometry(0.05, 0.03, 0.09), i === 3 ? amber : trim);
    b.position.set(-0.5 + i * 0.143, 2.37, 0.42);
    b.rotation.x = 0.35;
  }

  // ── Coaming: the hood over the dash, carrying the odometer strip. ──
  const coaming = add(new THREE.BoxGeometry(3.1, 0.16, 0.42), dark);
  coaming.position.set(0, 1.02, 1.32);
  coaming.rotation.x = -0.42;
  const odo = pane(896, 84);
  const odoMat = new THREE.MeshBasicMaterial({ map: odo.tex });
  owned.push(odoMat);
  const odoPlane = add(new THREE.PlaneGeometry(2.0, 0.19), odoMat);
  odoPlane.position.set(0, 1.2, 0.98);
  odoPlane.rotation.set(-0.42, Math.PI, 0, 'YXZ');

  // ── Dash: a slab with a raised centre stack. ──
  const dash = add(new THREE.BoxGeometry(3.1, 0.2, 1.0), dark);
  dash.position.set(0, 0.62, 0.95);
  dash.rotation.x = -0.16;
  const stack = add(new THREE.BoxGeometry(1.5, 0.14, 0.7), trim);
  stack.position.set(0, 0.78, 0.86);
  stack.rotation.x = -0.42;

  // Centre instrument glass: the gauge cluster.
  const cluster = pane(640, 320);
  const clusterMat = new THREE.MeshBasicMaterial({ map: cluster.tex });
  owned.push(clusterMat);
  const clusterPlane = add(new THREE.PlaneGeometry(1.16, 0.58), clusterMat);
  clusterPlane.position.set(0, 0.9, 0.72);
  clusterPlane.rotation.set(-0.42, Math.PI, 0, 'YXZ');

  // Two side screens carrying the attitude ladder.
  const wing = pane(384, 288);
  const wingMat = new THREE.MeshBasicMaterial({ map: wing.tex });
  owned.push(wingMat);
  for (const x of [-1.05, 1.05]) {
    const p = add(new THREE.PlaneGeometry(0.62, 0.46), wingMat);
    p.position.set(x, 0.83, 0.82);
    p.rotation.set(-0.42, Math.PI + (x < 0 ? -0.22 : 0.22), 0, 'YXZ');
  }

  // ── Switch banks: two rows of keys along the dash lip, with guarded
  // covers over the outboard pair. ──
  const keyGeom = new THREE.BoxGeometry(0.075, 0.025, 0.06);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 12; i++) {
      const m = i % 5 === 0 ? amber : i % 5 === 2 ? accentMat : i === 11 ? red : trim;
      const k = add(keyGeom, m);
      k.position.set(-0.72 + i * 0.131, 0.7 - row * 0.045, 1.3 - row * 0.09);
      k.rotation.x = -0.16;
    }
  }
  for (const x of [-1.15, 1.15]) {
    const guard = add(new THREE.BoxGeometry(0.2, 0.12, 0.16), trim);
    guard.position.set(x, 0.72, 1.24);
    guard.rotation.x = -0.16;
    const cap = add(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10), red);
    cap.position.set(x, 0.75, 1.19);
    cap.rotation.x = Math.PI / 2 - 0.16;
  }

  // ── Side consoles: throttle quadrant to port, keypad to starboard. ──
  for (const x of [-1.6, 1.6]) {
    const c = add(new THREE.BoxGeometry(0.55, 0.34, 1.3), dark);
    c.position.set(x, 0.5, 0.35);
    c.rotation.y = x < 0 ? 0.16 : -0.16;
  }
  const quadrant = add(new THREE.BoxGeometry(0.34, 0.06, 0.5), trim);
  quadrant.position.set(-1.55, 0.68, 0.5);
  const throttle = add(new THREE.CylinderGeometry(0.028, 0.032, 0.3, 8), trim);
  throttle.position.set(-1.55, 0.8, 0.42);
  throttle.rotation.x = 0.4;
  const throttleGrip = add(new THREE.SphereGeometry(0.055, 10, 8), rubber);
  throttleGrip.position.set(-1.55, 0.93, 0.36);
  for (let i = 0; i < 9; i++) {
    const k = add(new THREE.BoxGeometry(0.055, 0.02, 0.055), i === 4 ? accentMat : trim);
    k.position.set(1.48 + (i % 3) * 0.075, 0.69, 0.62 - Math.floor(i / 3) * 0.1);
  }

  // ── Stick, seat and harness. ──
  const column = add(new THREE.CylinderGeometry(0.035, 0.05, 0.46, 10), trim);
  column.position.set(0.3, 0.58, 0.18);
  column.rotation.x = 0.26;
  const grip = add(new THREE.CapsuleGeometry(0.055, 0.1, 4, 10), rubber);
  grip.position.set(0.3, 0.84, 0.12);
  grip.rotation.x = 0.26;
  const trigger = add(new THREE.BoxGeometry(0.03, 0.05, 0.02), red);
  trigger.position.set(0.3, 0.85, 0.05);
  const seatPan = add(new THREE.BoxGeometry(1.24, 0.18, 0.34), seatMat);
  seatPan.position.set(0, 0.4, -0.28);
  for (const x of [-0.62, 0.62]) {
    const bolster = add(new THREE.BoxGeometry(0.16, 0.5, 0.3), seatMat);
    bolster.position.set(x, 0.62, -0.3);
  }
  for (const x of [-0.34, 0.34]) {
    const strap = add(new THREE.BoxGeometry(0.11, 0.9, 0.03), seatMat);
    strap.position.set(x, 0.72, -0.16);
    strap.rotation.z = x < 0 ? -0.2 : 0.2;
  }

  scene.add(new THREE.AmbientLight(0x5c6b8a, 0.8));
  const glow = new THREE.PointLight(accent, 1.5, 4.5, 1.5);
  glow.position.set(0, 0.95, 0.8);
  scene.add(glow);
  const warm = new THREE.PointLight(0xffb347, 0.55, 3.2, 1.5);
  warm.position.set(-1.3, 0.95, 0.6);
  scene.add(warm);

  /* ── Canvas drawing ── */

  const grid = (p: Pane, colour: string, step: number) => {
    p.ctx.strokeStyle = colour;
    p.ctx.lineWidth = 1;
    for (let x = 0; x < p.w; x += step) {
      p.ctx.beginPath();
      p.ctx.moveTo(x, 0);
      p.ctx.lineTo(x, p.h);
      p.ctx.stroke();
    }
    for (let y = 0; y < p.h; y += step) {
      p.ctx.beginPath();
      p.ctx.moveTo(0, y);
      p.ctx.lineTo(p.w, y);
      p.ctx.stroke();
    }
  };

  /** Odometer strip: one line of numbers across the coaming. */
  const drawOdo = (speedKmS: number, speedC: number, altKm: number, near: string, mode: string) => {
    const { ctx, w, h } = odo;
    ctx.fillStyle = '#05070b';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(248,244,236,0.16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    // One line only: the strip is shallow, and a second row would sit
    // behind the coaming's lip from the pilot's eye.
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    let x = 24;
    const cell = (label: string, value: string, colour: string) => {
      ctx.fillStyle = 'rgba(248,244,236,0.5)';
      ctx.font = `600 20px ${MONO}`;
      ctx.fillText(label, x, 42);
      x += ctx.measureText(label).width + 12;
      ctx.fillStyle = colour;
      ctx.font = `600 32px ${MONO}`;
      ctx.fillText(value, x, 40);
      x += ctx.measureText(value).width + 34;
    };
    cell('VEL', `${Math.round(speedKmS).toLocaleString('en-US')} km/s`, '#ffffff');
    cell('ALT', near ? `${Math.round(altKm).toLocaleString('en-US')} km` : '—', accentCss);
    cell('MODE', mode.toUpperCase().slice(0, 6), '#ffb347');
    ctx.textBaseline = 'alphabetic';
    odo.tex.needsUpdate = true;
  };

  /** Centre cluster: a speed arc, hull and heat bars, a caution lamp. */
  const drawCluster = (speedKmS: number, maxKmS: number, hull: number, heat: number, t: number) => {
    const { ctx, w, h } = cluster;
    ctx.fillStyle = '#04060a';
    ctx.fillRect(0, 0, w, h);
    grid(cluster, 'rgba(94,234,212,0.07)', 40);
    const cx = 150;
    const cy = 150;
    const r = 96;
    const a0 = Math.PI * 0.75;
    const a1 = Math.PI * 2.25;
    const frac = maxKmS > 0 ? Math.min(1, speedKmS / maxKmS) : 0;
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(248,244,236,0.12)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
    ctx.strokeStyle = frac < 0.5 ? accentCss : frac < 0.85 ? '#ffb347' : '#ff5a5a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a0 + (a1 - a0) * frac);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(248,244,236,0.45)';
    for (let i = 0; i <= 10; i++) {
      const a = a0 + (a1 - a0) * (i / 10);
      const len = i % 5 === 0 ? 14 : 8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10));
      ctx.lineTo(cx + Math.cos(a) * (r - 10 - len), cy + Math.sin(a) * (r - 10 - len));
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 44px ${MONO}`;
    ctx.fillText(`${Math.round(speedKmS).toLocaleString('en-US')}`, cx, cy + 12);
    ctx.fillStyle = 'rgba(248,244,236,0.55)';
    ctx.font = `600 16px ${MONO}`;
    ctx.fillText('KM/S', cx, cy + 42);
    ctx.textAlign = 'left';
    const bar = (x: number, label: string, k: number, colour: string) => {
      ctx.fillStyle = 'rgba(248,244,236,0.5)';
      ctx.font = `600 15px ${MONO}`;
      ctx.fillText(label, x, 50);
      ctx.strokeStyle = 'rgba(248,244,236,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 60, 44, 200);
      ctx.fillStyle = colour;
      const fill = Math.max(0, Math.min(1, k)) * 196;
      ctx.fillRect(x + 2, 258 - fill, 40, fill);
    };
    bar(340, 'HULL', hull / 100, hull > 50 ? accentCss : hull > 25 ? '#ffb347' : '#ff5a5a');
    bar(440, 'HEAT', heat, heat > 0.6 ? '#ff5a5a' : '#ffb347');
    ctx.fillStyle = hull < 60 && Math.sin(t * 6) > 0 ? '#ff5a5a' : 'rgba(255,90,90,0.15)';
    ctx.beginPath();
    ctx.arc(560, 70, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(248,244,236,0.6)';
    ctx.font = `600 13px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('CAUTION', 560, 114);
    ctx.textAlign = 'left';
    cluster.tex.needsUpdate = true;
  };

  /** Side screen: an attitude ladder that rolls and pitches with the ship. */
  const drawWing = (bank: number, pitch: number, t: number) => {
    const { ctx, w, h } = wing;
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-bank);
    ctx.translate(0, pitch * 220);
    ctx.strokeStyle = 'rgba(94,234,212,0.5)';
    ctx.lineWidth = 2;
    for (let i = -4; i <= 4; i++) {
      const y = i * 34;
      const len = i === 0 ? 150 : 70;
      ctx.beginPath();
      ctx.moveTo(-len, y);
      ctx.lineTo(len, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 46, h / 2);
    ctx.lineTo(w / 2 - 14, h / 2);
    ctx.moveTo(w / 2 + 14, h / 2);
    ctx.lineTo(w / 2 + 46, h / 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(248,244,236,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = accentCss;
    ctx.font = `600 15px ${MONO}`;
    ctx.fillText('ATT', 14, 26);
    ctx.fillText(`${Math.round(-bank * 57)}°`, w - 60, 26);
    ctx.fillStyle = 'rgba(255,179,71,0.8)';
    ctx.beginPath();
    ctx.arc(w - 24, h - 24 - (t % 2) * 12, 4, 0, Math.PI * 2);
    ctx.fill();
    wing.tex.needsUpdate = true;
  };

  drawOdo(0, 0, 0, '', 'cruise');
  drawCluster(0, 1, 100, 0, 0);
  drawWing(0, 0, 0);

  let sinceDraw = 1;
  let clock = 0;
  let flicker = 0;

  return {
    scene,
    camera,
    update(dt, bank, pitch, shake, speedKmS, speedC, maxKmS, altKm, near, hull, mode, heat) {
      clock += dt;
      rig.rotation.z = -bank * 0.32;
      rig.rotation.x = -pitch * 0.1;
      camera.position.set(
        (Math.random() - 0.5) * shake * 0.03,
        1.3 + (Math.random() - 0.5) * shake * 0.03,
        -0.3,
      );
      camera.lookAt(0, 1.5, 6);
      flicker += dt;
      glow.intensity = 1.4 + 0.12 * Math.sin(flicker * 1.7);
      // Panels refresh five times a second — the eye cannot tell, and the
      // canvas uploads stay off the frame budget.
      sinceDraw += dt;
      if (sinceDraw > 0.2) {
        sinceDraw = 0;
        drawOdo(speedKmS, speedC, altKm, near, mode);
        drawCluster(speedKmS, maxKmS, hull, heat, clock);
        drawWing(bank, pitch, clock);
      }
    },
    setAspect(aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },
    dispose() {
      for (const g of geoms) g.dispose();
      for (const m of owned) m.dispose();
      odo.tex.dispose();
      cluster.tex.dispose();
      wing.tex.dispose();
    },
  };
}
