// Cockpit view. The world camera sits at the pilot's eye, but the world's
// near plane is wider than the whole fighter, so the interior is its own
// little scene in metres, drawn over the frame with the depth buffer
// cleared: a panoramic canopy held by thin struts, a swept dashboard with
// live glass, side consoles, and the seat's edge at the bottom of the view.
// Inspired by the wide-glass bridges of the films, kept legible.

import * as THREE from 'three';

export interface CockpitHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Bank / pitch tilt of the airframe, camera shake, and the live readouts. */
  update: (dt: number, bank: number, pitch: number, shake: number, speedKmS: number, altKm: number, near: string, hull: number) => void;
  setAspect: (aspect: number) => void;
  dispose: () => void;
}

function screenTexture(): { tex: THREE.CanvasTexture; ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement } {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, ctx, canvas };
}

export function makeCockpit(accent: number): CockpitHandle {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(78, 1, 0.05, 40);
  camera.position.set(0, 1.3, -0.3);
  const rig = new THREE.Group();
  scene.add(rig);

  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1d23, roughness: 0.75, metalness: 0.35 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.6, metalness: 0.5 });
  const seat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.9, metalness: 0.1 });
  const accentMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(0.9) });
  const amber = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const owned: THREE.Material[] = [dark, trim, seat, accentMat, amber];
  const geoms: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => {
    geoms.push(g);
    const o = new THREE.Mesh(g, m);
    rig.add(o);
    return o;
  };

  // Canopy frame: a wide arch of struts around a glass that is simply open.
  const strutGeom = new THREE.BoxGeometry(0.06, 2.4, 0.06);
  for (const x of [-1.9, 1.9]) {
    const s = mesh(strutGeom, trim);
    s.position.set(x, 1.6, 1.3);
    s.rotation.z = x < 0 ? 0.32 : -0.32;
  }
  const brow = mesh(new THREE.BoxGeometry(3.2, 0.08, 0.1), trim);
  brow.position.set(0, 2.55, 1.05);

  // Dashboard: a swept slab under the glass with three live panes.
  const dash = mesh(new THREE.BoxGeometry(3.0, 0.18, 0.9), dark);
  dash.position.set(0, 0.6, 0.95);
  dash.rotation.x = -0.2;
  const cowl = mesh(new THREE.BoxGeometry(3.2, 0.14, 0.4), dark);
  cowl.position.set(0, 0.98, 1.38);
  cowl.rotation.x = -0.45;
  const ledge = mesh(new THREE.BoxGeometry(3.2, 0.03, 0.05), accentMat);
  ledge.position.set(0, 1.05, 1.22);
  ledge.rotation.x = -0.45;

  const main = screenTexture();
  const side = screenTexture();
  const paneMats = [main, side].map((s) => new THREE.MeshBasicMaterial({ map: s.tex }));
  owned.push(...paneMats);
  const centrePane = mesh(new THREE.PlaneGeometry(1.1, 0.42), paneMats[0]);
  // Panes face aft, toward the seat, tilted up at the eye.
  centrePane.position.set(0, 0.9, 0.78);
  centrePane.rotation.set(-0.5, Math.PI, 0, 'YXZ');
  for (const x of [-1.0, 1.0]) {
    const p = mesh(new THREE.PlaneGeometry(0.7, 0.34), paneMats[1]);
    p.position.set(x, 0.86, 0.82);
    p.rotation.set(-0.5, Math.PI + (x < 0 ? -0.35 : 0.35), 0, 'YXZ');
  }
  // Switch rows: small amber and accent keys along the dash lip.
  const keyGeom = new THREE.BoxGeometry(0.07, 0.02, 0.05);
  for (let i = 0; i < 14; i++) {
    const k = mesh(keyGeom, i % 4 === 0 ? amber : i % 4 === 2 ? accentMat : trim);
    k.position.set(-0.95 + i * 0.146, 0.72, 1.3);
    k.rotation.x = -0.2;
  }
  // Side consoles and the seat edge.
  for (const x of [-1.55, 1.55]) {
    const c = mesh(new THREE.BoxGeometry(0.5, 0.3, 1.2), dark);
    c.position.set(x, 0.55, 0.3);
    c.rotation.y = x < 0 ? 0.18 : -0.18;
  }
  const seatEdge = mesh(new THREE.BoxGeometry(1.2, 0.16, 0.3), seat);
  seatEdge.position.set(0, 0.42, -0.25);
  const stick = mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.42, 8), trim);
  stick.position.set(0.32, 0.6, 0.15);
  stick.rotation.x = 0.3;
  const grip = mesh(new THREE.SphereGeometry(0.05, 8, 8), dark);
  grip.position.set(0.32, 0.82, 0.08);

  scene.add(new THREE.AmbientLight(0x6b7a99, 0.9));
  const glow = new THREE.PointLight(accent, 1.4, 4, 1.4);
  glow.position.set(0, 0.9, 0.9);
  scene.add(glow);
  const fill = new THREE.PointLight(0xffb347, 0.5, 3, 1.4);
  fill.position.set(-1.2, 0.9, 0.6);
  scene.add(fill);

  let sinceDraw = 1;
  let flicker = 0;
  const drawMain = (speedKmS: number, altKm: number, near: string, hull: number) => {
    const { ctx, canvas } = main;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#060a10';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(94,234,212,0.18)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = '#5eead4';
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText('VEL', 20, 40);
    ctx.fillText('ALT', 20, 100);
    ctx.fillText('HULL', 20, 160);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 40px "JetBrains Mono", monospace';
    ctx.fillText(`${Math.round(speedKmS).toLocaleString('en-US')} km/s`, 110, 46);
    ctx.fillText(near ? `${Math.round(altKm).toLocaleString('en-US')} km` : '—', 110, 106);
    ctx.fillStyle = hull > 50 ? '#5eead4' : hull > 25 ? '#ffb347' : '#ff5a5a';
    ctx.fillRect(110, 136, Math.max(0, (w - 140) * hull / 100), 26);
    ctx.strokeStyle = 'rgba(248,244,236,0.5)';
    ctx.strokeRect(110, 136, w - 140, 26);
    main.tex.needsUpdate = true;
  };
  const drawSide = (t: number) => {
    const { ctx, canvas } = side;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#07090d';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,179,71,0.35)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 18 + i * 16, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,179,71,0.8)';
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2 + Math.cos(t * 1.4) * 96, h / 2 + Math.sin(t * 1.4) * 96);
    ctx.stroke();
    ctx.fillStyle = '#ffb347';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText('SCAN', 16, 28);
    ctx.fillText('NAV', w - 64, 28);
    side.tex.needsUpdate = true;
  };
  drawMain(0, 0, '', 100);
  drawSide(0);
  let clock = 0;

  return {
    scene,
    camera,
    update(dt, bank, pitch, shake, speedKmS, altKm, near, hull) {
      clock += dt;
      rig.rotation.z = -bank * 0.35;
      rig.rotation.x = -pitch * 0.12;
      camera.position.set(
        (Math.random() - 0.5) * shake * 0.03,
        1.3 + (Math.random() - 0.5) * shake * 0.03,
        -0.3,
      );
      camera.lookAt(0, 1.5, 6);
      // Panel lighting breathes the way real cockpit glass does at night.
      flicker += dt;
      glow.intensity = 1.3 + 0.1 * Math.sin(flicker * 1.7);
      sinceDraw += dt;
      if (sinceDraw > 0.2) {
        sinceDraw = 0;
        drawMain(speedKmS, altKm, near, hull);
        drawSide(clock);
      }
    },
    setAspect(aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },
    dispose() {
      for (const g of geoms) g.dispose();
      for (const m of owned) m.dispose();
      main.tex.dispose();
      side.tex.dispose();
    },
  };
}
