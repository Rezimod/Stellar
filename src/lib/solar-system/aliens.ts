// Alien encounters for SolarSystemCanvas — an easter egg, not a feature tile.
// Four ship classes and two kinds of sightings, all real-time:
//   flyby    — a saucer, a scout probe, or a slow mothership glides across
//              the scene on a curved path, then warps out in a flash.
//   dogfight — a dart-fighter chases a saucer trading laser bolts with
//              small shield flashes, then both warp away.
// Most encounters are anchored near Earth (that's where the camera usually
// is), the rest cross the inner system. The first sighting comes shortly
// after the view opens; later ones arrive every minute or so.

import * as THREE from 'three';

export interface AlienHandle {
  group: THREE.Group;
  update: (dtSec: number, earthPos: THREE.Vector3 | null) => void;
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

/** Mothership: long dark hull, rows of lit windows, violet drive glow. */
function buildMothership(s: number): THREE.Group {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x3a3f4c, roughness: 0.5, metalness: 0.75,
  });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.22, s * 1.7, 6, 14), hullMat);
  hull.rotation.x = Math.PI / 2; // long axis along +Z
  g.add(hull);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(s * 0.1, s * 0.32, s * 1.1), hullMat);
  g.add(spine);
  // Window rows down both flanks.
  const winMat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff });
  const winGeom = new THREE.BoxGeometry(s * 0.015, s * 0.03, s * 0.06);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const w = new THREE.Mesh(winGeom, winMat);
      w.position.set(side * s * 0.225, s * 0.02, (i / 8 - 0.5) * s * 1.5);
      g.add(w);
    }
  }
  const drive = new THREE.Mesh(
    new THREE.SphereGeometry(s * 0.12, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xb08cff, transparent: true, opacity: 0.9 }),
  );
  drive.position.z = -s * 1.06;
  g.add(drive);
  return g;
}

/** Scout probe: small glowing orb — fast and erratic. */
function buildProbe(s: number, glowTex: THREE.Texture): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(s * 0.1, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0x9adfd2, roughness: 0.2, metalness: 0.4,
      emissive: 0x35c0a0, emissiveIntensity: 1.4,
    }),
  );
  g.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  halo.scale.setScalar(s * 0.55);
  g.add(halo);
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

  const S = 0.3; // base ship scale (scene units)
  const glowTex = glowSprite();

  const saucer = buildSaucer(S);
  const dart = buildDart(S * 0.9);
  const mothership = buildMothership(S * 1.5);
  const probe = buildProbe(S, glowTex);
  const ships = [saucer, dart, mothership, probe];

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
  for (const s of ships) {
    s.visible = false;
    group.add(s);
  }
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
  let lead: THREE.Group = saucer; // the ship flying the bezier path
  // First sighting shortly after the view opens; later ones every 45–90 s.
  let clock = 12 + Math.random() * 6;
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
  const rand = new THREE.Vector3();
  const wobbleAxis = new THREE.Vector3();

  const randPoint = (rMin: number, rMax: number, out: THREE.Vector3) => {
    const a = Math.random() * Math.PI * 2;
    const r = rMin + Math.random() * (rMax - rMin);
    out.set(Math.cos(a) * r, (Math.random() - 0.5) * r * 0.5, Math.sin(a) * r);
  };

  const randDir = (out: THREE.Vector3) =>
    out.set(Math.random() - 0.5, (Math.random() - 0.5) * 0.7, Math.random() - 0.5).normalize();

  const bezier = (t: number, out: THREE.Vector3) => {
    const inv = 1 - t;
    return out.set(0, 0, 0)
      .addScaledVector(pA, inv * inv)
      .addScaledVector(pB, 2 * inv * t)
      .addScaledVector(pC, t * t);
  };

  const begin = (m: Exclude<Mode, 'idle'>, earth: THREE.Vector3 | null) => {
    mode = m;
    encT = 0;
    randDir(wobbleAxis);

    if (m === 'flyby') {
      const pick = Math.random();
      lead = pick < 0.4 ? saucer : pick < 0.75 ? probe : mothership;
    } else {
      lead = saucer;
    }
    encDur =
      lead === probe ? 8 + Math.random() * 3 :
      lead === mothership ? 20 + Math.random() * 6 :
      m === 'dogfight' ? 15 + Math.random() * 4 :
      13 + Math.random() * 5;

    // Most sightings buzz Earth — enter a few units out, swing close past
    // the planet, exit through the far side. The rest cross the inner system.
    if (earth && Math.random() < 0.7) {
      randDir(rand);
      pA.copy(earth).addScaledVector(rand, 2.5 + Math.random() * 1.5);
      randDir(rand);
      pC.copy(earth).multiplyScalar(2).sub(pA).addScaledVector(rand, 0.8 + Math.random() * 0.8);
      randDir(rand);
      pB.copy(earth).addScaledVector(rand, 0.5 + Math.random() * 0.7);
    } else {
      randPoint(3.5, 8, pA);
      randPoint(3.5, 8, pC);
      pC.negate(); // cross the scene rather than hug one side
      pB.copy(pA).add(pC).multiplyScalar(0.5);
      pB.y += (Math.random() - 0.5) * 5;
    }

    for (const s of ships) s.visible = false;
    lead.visible = true;
    if (m === 'dogfight') dart.visible = true;
    group.visible = true;
  };

  const endEncounter = () => {
    mode = 'idle';
    clock = 45 + Math.random() * 45;
    for (const s of ships) {
      s.visible = false;
      s.scale.setScalar(1);
    }
    warpMat.opacity = 0;
    for (const b of bolts) {
      b.t = -1;
      b.mesh.visible = false;
    }
    group.visible = false;
  };

  return {
    group,
    update(dtSec: number, earthPos: THREE.Vector3 | null) {
      if (mode === 'idle') {
        clock -= dtSec;
        if (clock <= 0) begin(Math.random() < 0.65 ? 'flyby' : 'dogfight', earthPos);
        return;
      }

      encT += dtSec;
      const t = Math.min(1, encT / encDur);

      bezier(t, pos);
      bezier(Math.min(1, t + 0.01), posNext);
      lead.position.copy(pos);

      if (lead === saucer) {
        // Saucer glides with a light wobble and a slow spin.
        lead.position.y += Math.sin(encT * 2.2) * S * 0.5;
        lead.rotation.y += dtSec * 2.4;
      } else if (lead === probe) {
        // Scout probe jinks hard off the path — clearly not ballistic.
        lead.position.addScaledVector(wobbleAxis, Math.sin(encT * 6.5) * S * 1.6);
        lead.position.y += Math.cos(encT * 4.8) * S * 0.9;
      } else {
        // Mothership holds course, nose along the velocity, slow roll.
        tmp.copy(posNext).sub(pos).add(lead.position);
        lead.lookAt(tmp);
        lead.rotateZ(encT * 0.15);
      }

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
        warpFlash.position.copy(lead.position);
        warpFlash.scale.setScalar(S * (1 + k * 6) * (lead === mothership ? 1.8 : 1));
        warpMat.opacity = Math.sin(k * Math.PI) * 0.9;
        lead.scale.setScalar(Math.max(0.001, 1 - k));
        dart.scale.setScalar(Math.max(0.001, 1 - k));
      } else {
        lead.scale.setScalar(1);
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
