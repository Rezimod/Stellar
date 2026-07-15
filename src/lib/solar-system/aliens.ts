// Alien encounters for SolarSystemCanvas — an easter egg, not a feature tile.
// Two kinds of sightings, both real-time and rare enough to feel special:
//   flyby    — a lone saucer glides across the inner system on a curved
//              path with a gentle wobble, then warps out in a flash.
//   dogfight — two ships chase each other trading laser bolts with small
//              shield flashes, then both warp away.
// The first sighting is scheduled shortly after the view opens (noticeable),
// later ones arrive every few minutes.

import * as THREE from 'three';

export interface AlienHandle {
  group: THREE.Group;
  update: (dtSec: number) => void;
  dispose: () => void;
}

function glowSprite(): THREE.CanvasTexture {
  const s = 96;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(220,255,244,0.95)');
  grad.addColorStop(0.4, 'rgba(140,255,214,0.4)');
  grad.addColorStop(1, 'rgba(80,255,190,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Classic saucer: brushed-metal hull, glass dome, ring of running lights. */
function buildSaucer(s: number): THREE.Group {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xb9c2cc, roughness: 0.35, metalness: 0.85,
  });
  const hull = new THREE.Mesh(new THREE.SphereGeometry(s * 0.5, 24, 12), hullMat);
  hull.scale.y = 0.22;
  g.add(hull);
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x9adfd2,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.85,
    emissive: 0x2a7a6a,
    emissiveIntensity: 0.7,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(s * 0.18, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.position.y = s * 0.08;
  g.add(dome);
  // Running lights around the rim.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0x7dffd0 });
  const lightGeom = new THREE.SphereGeometry(s * 0.03, 6, 6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const l = new THREE.Mesh(lightGeom, lightMat);
    l.position.set(Math.cos(a) * s * 0.44, 0, Math.sin(a) * s * 0.44);
    g.add(l);
  }
  return g;
}

/** Attack dart: slim fuselage, swept fins, hot engine dot. */
function buildDart(s: number): THREE.Group {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x5a4a66, roughness: 0.4, metalness: 0.7,
  });
  const body = new THREE.Mesh(new THREE.ConeGeometry(s * 0.1, s * 0.7, 8), hullMat);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(s * 0.34, s * 0.015, s * 0.16), hullMat);
    fin.position.set(side * s * 0.18, 0, -s * 0.18);
    fin.rotation.y = side * 0.5;
    g.add(fin);
  }
  const engine = new THREE.Mesh(
    new THREE.SphereGeometry(s * 0.045, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff7a5a }),
  );
  engine.position.z = -s * 0.36;
  g.add(engine);
  return g;
}

interface Bolt {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
}

export function makeAlienEncounters(): AlienHandle {
  const group = new THREE.Group();
  group.name = 'alienEncounters';
  group.visible = false;

  const S = 0.3; // ship scale (scene units)
  const glowTex = glowSprite();

  const saucer = buildSaucer(S);
  const dart = buildDart(S * 0.9);
  // Soft teal halo under the saucer so a passing sighting catches the eye
  // even at system zoom.
  const saucerGlowMat = new THREE.SpriteMaterial({
    map: glowTex,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const saucerGlow = new THREE.Sprite(saucerGlowMat);
  saucerGlow.scale.setScalar(S * 2.2);
  saucer.add(saucerGlow);
  const warpMat = new THREE.SpriteMaterial({
    map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const warpFlash = new THREE.Sprite(warpMat);
  group.add(saucer);
  group.add(dart);
  group.add(warpFlash);

  // Laser bolts — short emissive sticks reused from a small pool.
  const boltMat = new THREE.MeshBasicMaterial({ color: 0x8cff5a, transparent: true, opacity: 0.95 });
  const boltGeom = new THREE.CylinderGeometry(S * 0.012, S * 0.012, S * 0.5, 5);
  boltGeom.rotateX(Math.PI / 2); // along +Z
  const bolts: Bolt[] = [];
  for (let i = 0; i < 6; i++) {
    const mesh = new THREE.Mesh(boltGeom, boltMat);
    mesh.visible = false;
    group.add(mesh);
    bolts.push({ mesh, from: new THREE.Vector3(), to: new THREE.Vector3(), t: -1 });
  }

  // Shield-hit flash on the saucer.
  const hitMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: new THREE.Color(0.6, 0.8, 1.0),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const hitFlash = new THREE.Sprite(hitMat);
  hitFlash.scale.setScalar(S * 1.6);
  saucer.add(hitFlash);

  // Encounter state.
  type Mode = 'idle' | 'flyby' | 'dogfight';
  let mode: Mode = 'idle';
  // First sighting ~35 s after the view opens; later ones every 2–4 min.
  let clock = 35;
  let encT = 0;
  let encDur = 15;
  let fireAcc = 0;
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pC = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const posNext = new THREE.Vector3();
  const chase = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  const randPoint = (rMin: number, rMax: number, out: THREE.Vector3) => {
    const a = Math.random() * Math.PI * 2;
    const r = rMin + Math.random() * (rMax - rMin);
    out.set(Math.cos(a) * r, (Math.random() - 0.5) * r * 0.5, Math.sin(a) * r);
  };

  const bezier = (t: number, out: THREE.Vector3) => {
    const inv = 1 - t;
    return out.set(0, 0, 0)
      .addScaledVector(pA, inv * inv)
      .addScaledVector(pB, 2 * inv * t)
      .addScaledVector(pC, t * t);
  };

  const begin = (m: Exclude<Mode, 'idle'>) => {
    mode = m;
    encT = 0;
    encDur = m === 'flyby' ? 13 + Math.random() * 5 : 15 + Math.random() * 4;
    // Path through the inner-to-mid system where the camera usually looks.
    randPoint(3.5, 8, pA);
    randPoint(3.5, 8, pC);
    pC.negate(); // cross the scene rather than hug one side
    pB.copy(pA).add(pC).multiplyScalar(0.5);
    pB.y += (Math.random() - 0.5) * 5;
    saucer.visible = true;
    dart.visible = m === 'dogfight';
    group.visible = true;
  };

  const endEncounter = () => {
    mode = 'idle';
    clock = 120 + Math.random() * 120;
    saucer.visible = false;
    dart.visible = false;
    warpMat.opacity = 0;
    for (const b of bolts) {
      b.t = -1;
      b.mesh.visible = false;
    }
    group.visible = false;
  };

  return {
    group,
    update(dtSec: number) {
      if (mode === 'idle') {
        clock -= dtSec;
        if (clock <= 0) begin(Math.random() < 0.6 ? 'flyby' : 'dogfight');
        return;
      }

      encT += dtSec;
      const t = Math.min(1, encT / encDur);

      bezier(t, pos);
      bezier(Math.min(1, t + 0.01), posNext);
      // Saucer glides with a light wobble and a slow spin.
      saucer.position.copy(pos);
      saucer.position.y += Math.sin(encT * 2.2) * S * 0.5;
      saucer.rotation.y += dtSec * 2.4;

      if (mode === 'dogfight') {
        // The dart trails the saucer, weaving.
        chase.copy(pos).sub(posNext).normalize().multiplyScalar(S * 6);
        chase.add(pos);
        chase.x += Math.sin(encT * 3.1) * S * 2;
        chase.y += Math.cos(encT * 2.3) * S * 2;
        dart.position.copy(chase);
        tmp.copy(saucer.position);
        dart.lookAt(tmp);

        // Fire a bolt every 0.5–1 s.
        fireAcc -= dtSec;
        if (fireAcc <= 0) {
          fireAcc = 0.5 + Math.random() * 0.5;
          const b = bolts.find((x) => x.t < 0);
          if (b) {
            b.from.copy(dart.position);
            b.to.copy(saucer.position);
            // Most bolts miss by a little.
            if (Math.random() < 0.6) {
              b.to.x += (Math.random() - 0.5) * S * 3;
              b.to.y += (Math.random() - 0.5) * S * 3;
            }
            b.t = 0;
            b.mesh.visible = true;
          }
        }
      }

      // Advance bolts; a bolt that reaches the saucer sparks its shield.
      for (const b of bolts) {
        if (b.t < 0) continue;
        b.t += dtSec * 2.6;
        if (b.t >= 1) {
          if (b.to.distanceToSquared(saucer.position) < S * S * 1.2) {
            hitMat.opacity = 0.9;
          }
          b.t = -1;
          b.mesh.visible = false;
          continue;
        }
        b.mesh.position.lerpVectors(b.from, b.to, b.t);
        tmp.copy(b.to);
        b.mesh.lookAt(tmp);
      }
      hitMat.opacity = Math.max(0, hitMat.opacity - dtSec * 3);

      // Warp-out flash at the end of the run.
      if (t > 0.94) {
        const k = (t - 0.94) / 0.06;
        warpFlash.position.copy(saucer.position);
        warpFlash.scale.setScalar(S * (1 + k * 6));
        warpMat.opacity = Math.sin(k * Math.PI) * 0.9;
        saucer.scale.setScalar(Math.max(0.001, 1 - k));
        dart.scale.setScalar(Math.max(0.001, 1 - k));
      } else {
        saucer.scale.setScalar(1);
        dart.scale.setScalar(1);
      }

      if (t >= 1) endEncounter();
    },
    dispose() {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else (m as THREE.Material).dispose();
        } else if (o instanceof THREE.Sprite) {
          (o.material as THREE.SpriteMaterial).dispose();
        }
      });
      glowTex.dispose();
    },
  };
}
