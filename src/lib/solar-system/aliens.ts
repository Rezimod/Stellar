// Alien encounters for SolarSystemCanvas — an easter egg, not a feature tile.
// Ships are rocket-scale (a saucer spans ~1.5× the Earth launch vehicle, a
// tiny fraction of any planet) and fly precise, deliberate paths anchored
// near Earth, where the camera usually is. Three kinds of sightings:
//   flyby    — a saucer, scout probe, or mothership sweeps past Earth on a
//              smooth curve, then warps out in a flash.
//   dogfight — a dart-fighter chases a saucer trading laser bolts; hits
//              spark against the saucer's shield.
//   battle   — a small skirmish: two darts circle a saucer + scout, bolts
//              cross, impacts throw sparks, and one dart is destroyed in a
//              brief explosion before the rest warp away.
// First sighting comes shortly after the view opens; later ones arrive
// every minute or so. Everything is real-time and disabled by reduce-motion.

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

/** Scout probe: small glowing orb. */
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
  target: THREE.Group | null;
  t: number;
}

interface SparkBurst {
  points: THREE.Points;
  mat: THREE.PointsMaterial;
  vel: Float32Array;
  origin: THREE.Vector3;
  life: number; // <0 idle
}

export function makeAlienEncounters(): AlienHandle {
  const group = new THREE.Group();
  group.name = 'alienEncounters';
  group.visible = false;

  // Rocket-scale: the Earth launch vehicle is ~0.0084 scene units long, so a
  // saucer spans ~1.5× that — a machine, not a moon.
  const S = 0.012;
  const glowTex = glowSprite();

  const saucer = buildSaucer(S);
  const dartA = buildDart(S * 0.9);
  const dartB = buildDart(S * 0.9);
  const mothership = buildMothership(S * 1.5);
  const probe = buildProbe(S, glowTex);
  const ships = [saucer, dartA, dartB, mothership, probe];

  // Soft teal halo under the saucer so a passing sighting still catches the
  // eye against the black.
  const saucerGlowMat = new THREE.SpriteMaterial({
    map: glowTex,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const saucerGlow = new THREE.Sprite(saucerGlowMat);
  saucerGlow.scale.setScalar(S * 2.0);
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
  const boltGeom = new THREE.CylinderGeometry(S * 0.014, S * 0.014, S * 0.45, 5);
  boltGeom.rotateX(Math.PI / 2); // along +Z
  const bolts: Bolt[] = [];
  for (let i = 0; i < 8; i++) {
    const mesh = new THREE.Mesh(boltGeom, boltMat);
    mesh.visible = false;
    group.add(mesh);
    bolts.push({ mesh, from: new THREE.Vector3(), to: new THREE.Vector3(), target: null, t: -1 });
  }

  // Shield-hit flash on the saucer.
  const hitMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: new THREE.Color(0.6, 0.8, 1.0),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const hitFlash = new THREE.Sprite(hitMat);
  hitFlash.scale.setScalar(S * 1.4);
  saucer.add(hitFlash);

  // Impact sparks — small pooled bursts of glowing debris.
  const SPARK_N = 16;
  const sparks: SparkBurst[] = [];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARK_N * 3), 3));
    const mat = new THREE.PointsMaterial({
      map: glowTex,
      color: 0xffc07a,
      size: S * 0.14,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.visible = false;
    group.add(points);
    sparks.push({ points, mat, vel: new Float32Array(SPARK_N * 3), origin: new THREE.Vector3(), life: -1 });
  }
  const spawnSparks = (at: THREE.Vector3, speed: number) => {
    const b = sparks.find((x) => x.life < 0) ?? sparks[0];
    b.origin.copy(at);
    const p = b.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < SPARK_N; i++) {
      p.setXYZ(i, at.x, at.y, at.z);
      b.vel[i * 3] = (Math.random() - 0.5) * speed;
      b.vel[i * 3 + 1] = (Math.random() - 0.5) * speed;
      b.vel[i * 3 + 2] = (Math.random() - 0.5) * speed;
    }
    p.needsUpdate = true;
    b.life = 0;
    b.mat.opacity = 1;
    b.points.visible = true;
  };

  // Explosion flash for the battle's destroyed dart.
  const boomMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: new THREE.Color(1.0, 0.62, 0.3),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const boomFlash = new THREE.Sprite(boomMat);
  group.add(boomFlash);

  // Encounter state.
  type Mode = 'idle' | 'flyby' | 'dogfight' | 'battle';
  let mode: Mode = 'idle';
  let lead: THREE.Group = saucer; // the ship flying the bezier path
  // First sighting shortly after the view opens; later ones every 45–90 s.
  let clock = 12 + Math.random() * 6;
  let encT = 0;
  let encDur = 15;
  let fireAcc = 0;
  let dartBDown = false;
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pC = new THREE.Vector3();
  const battleCenter = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const posNext = new THREE.Vector3();
  const chase = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const rand = new THREE.Vector3();

  const randDir = (out: THREE.Vector3) =>
    out.set(Math.random() - 0.5, (Math.random() - 0.5) * 0.7, Math.random() - 0.5).normalize();

  const bezier = (t: number, out: THREE.Vector3) => {
    const inv = 1 - t;
    return out.set(0, 0, 0)
      .addScaledVector(pA, inv * inv)
      .addScaledVector(pB, 2 * inv * t)
      .addScaledVector(pC, t * t);
  };

  // Battle choreography: each combatant holds a precise circular track
  // around the engagement point — distinct radius, plane, and rate.
  interface Track { ship: THREE.Group; r: number; omega: number; phase: number; tilt: THREE.Quaternion }
  const tracks: Track[] = [];
  const makeTrack = (ship: THREE.Group, r: number, omega: number): Track => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      (Math.random() - 0.5) * 0.9, Math.random() * Math.PI * 2, 0,
    ));
    return { ship, r, omega, phase: Math.random() * Math.PI * 2, tilt: q };
  };
  const trackPos = (tr: Track, t: number, out: THREE.Vector3) => {
    const a = tr.phase + tr.omega * t;
    out.set(Math.cos(a) * tr.r, 0, Math.sin(a) * tr.r).applyQuaternion(tr.tilt).add(battleCenter);
    return out;
  };

  const begin = (m: Exclude<Mode, 'idle'>, earth: THREE.Vector3 | null) => {
    mode = m;
    encT = 0;
    dartBDown = false;
    // All encounters anchor near Earth; without an Earth mesh (edge case)
    // they anchor near the inner system instead.
    const anchor = earth ?? tmp.set(1, 0, 0);

    if (m === 'battle') {
      encDur = 18 + Math.random() * 5;
      randDir(rand);
      battleCenter.copy(anchor).addScaledVector(rand, 0.1 + Math.random() * 0.1);
      tracks.length = 0;
      tracks.push(
        makeTrack(saucer, S * 5, 0.9),
        makeTrack(probe, S * 8, -1.2),
        makeTrack(dartA, S * 11, 1.5),
        makeTrack(dartB, S * 14, -1.1),
      );
      saucer.visible = true;
      probe.visible = true;
      dartA.visible = true;
      dartB.visible = true;
      group.visible = true;
      return;
    }

    if (m === 'flyby') {
      const pick = Math.random();
      lead = pick < 0.4 ? saucer : pick < 0.75 ? probe : mothership;
    } else {
      lead = saucer;
    }
    encDur =
      lead === probe ? 9 + Math.random() * 3 :
      lead === mothership ? 20 + Math.random() * 6 :
      m === 'dogfight' ? 15 + Math.random() * 4 :
      13 + Math.random() * 5;

    // Enter half a unit out, swing close past the planet, exit the far side —
    // a deliberate reconnaissance sweep, not a wander.
    randDir(rand);
    pA.copy(anchor).addScaledVector(rand, 0.5 + Math.random() * 0.3);
    pC.copy(anchor).multiplyScalar(2).sub(pA);
    randDir(rand);
    pC.addScaledVector(rand, 0.12);
    randDir(rand);
    pB.copy(anchor).addScaledVector(rand, 0.08 + Math.random() * 0.1);

    for (const s of ships) s.visible = false;
    lead.visible = true;
    if (m === 'dogfight') dartA.visible = true;
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
    boomMat.opacity = 0;
    for (const b of bolts) {
      b.t = -1;
      b.mesh.visible = false;
    }
    group.visible = false;
  };

  const fireBolt = (from: THREE.Group, target: THREE.Group, spread: number) => {
    const b = bolts.find((x) => x.t < 0);
    if (!b) return;
    b.from.copy(from.position);
    b.to.copy(target.position);
    if (Math.random() < 0.55) {
      // Most bolts miss by a little.
      b.to.x += (Math.random() - 0.5) * spread;
      b.to.y += (Math.random() - 0.5) * spread;
      b.target = null;
    } else {
      b.target = target;
    }
    b.t = 0;
    b.mesh.visible = true;
  };

  return {
    group,
    update(dtSec: number, earthPos: THREE.Vector3 | null) {
      // Sparks decay regardless of mode so bursts finish after warp-out.
      for (const sp of sparks) {
        if (sp.life < 0) continue;
        sp.life += dtSec;
        const p = sp.points.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < SPARK_N; i++) {
          p.setXYZ(
            i,
            p.getX(i) + sp.vel[i * 3] * dtSec,
            p.getY(i) + sp.vel[i * 3 + 1] * dtSec,
            p.getZ(i) + sp.vel[i * 3 + 2] * dtSec,
          );
        }
        p.needsUpdate = true;
        sp.mat.opacity = Math.max(0, 1 - sp.life / 0.7);
        if (sp.life > 0.7) {
          sp.life = -1;
          sp.points.visible = false;
        }
      }
      boomMat.opacity = Math.max(0, boomMat.opacity - dtSec * 2.2);

      if (mode === 'idle') {
        clock -= dtSec;
        if (clock <= 0) {
          const r = Math.random();
          begin(r < 0.5 ? 'flyby' : r < 0.75 ? 'dogfight' : 'battle', earthPos);
        }
        return;
      }

      encT += dtSec;
      const t = Math.min(1, encT / encDur);

      if (mode === 'battle') {
        // Combatants hold their circular tracks with military precision.
        for (const tr of tracks) {
          if (tr.ship === dartB && dartBDown) continue;
          trackPos(tr, encT, pos);
          trackPos(tr, encT + 0.05, posNext);
          tr.ship.position.copy(pos);
          if (tr.ship === saucer) {
            saucer.rotation.y += dtSec * 2.0; // saucers stay level and spin
          } else {
            tmp.copy(posNext).sub(pos).add(pos);
            tr.ship.lookAt(tmp);
          }
        }

        // Crossfire: darts hunt the saucer and scout; the saucer returns fire.
        fireAcc -= dtSec;
        if (fireAcc <= 0 && t < 0.88) {
          fireAcc = 0.35 + Math.random() * 0.35;
          const r = Math.random();
          if (r < 0.4) fireBolt(dartA, saucer, S * 2.5);
          else if (r < 0.65 && !dartBDown) fireBolt(dartB, Math.random() < 0.5 ? saucer : probe, S * 2.5);
          else fireBolt(saucer, dartBDown || Math.random() < 0.5 ? dartA : dartB, S * 3);
        }

        // Dart B is destroyed late in the fight — flash, sparks, gone.
        if (!dartBDown && t > 0.72) {
          dartBDown = true;
          boomFlash.position.copy(dartB.position);
          boomFlash.scale.setScalar(S * 2.4);
          boomMat.opacity = 1;
          spawnSparks(dartB.position, S * 4.5);
          dartB.visible = false;
        }
      } else {
        bezier(t, pos);
        bezier(Math.min(1, t + 0.01), posNext);
        lead.position.copy(pos);

        if (lead === saucer) {
          // Level, steady, spinning — classic saucer discipline.
          lead.rotation.y += dtSec * 2.0;
        } else {
          // Probe and mothership hold their noses on the velocity vector.
          tmp.copy(posNext).sub(pos).add(lead.position);
          lead.lookAt(tmp);
        }

        if (mode === 'dogfight') {
          // The dart trails the saucer, weaving slightly off the line.
          chase.copy(pos).sub(posNext).normalize().multiplyScalar(S * 6);
          chase.add(pos);
          chase.x += Math.sin(encT * 3.1) * S * 1.5;
          chase.y += Math.cos(encT * 2.3) * S * 1.5;
          dartA.position.copy(chase);
          tmp.copy(saucer.position);
          dartA.lookAt(tmp);

          fireAcc -= dtSec;
          if (fireAcc <= 0) {
            fireAcc = 0.5 + Math.random() * 0.5;
            fireBolt(dartA, saucer, S * 2.5);
          }
        }
      }

      // Advance bolts; a bolt that reaches its target sparks against it.
      for (const b of bolts) {
        if (b.t < 0) continue;
        b.t += dtSec * 2.6;
        if (b.t >= 1) {
          if (b.target) {
            spawnSparks(b.target.position, S * 2.8);
            if (b.target === saucer) hitMat.opacity = 0.9;
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
        const anchorShip = mode === 'battle' ? saucer : lead;
        warpFlash.position.copy(anchorShip.position);
        warpFlash.scale.setScalar(S * (1 + k * 6) * (lead === mothership ? 1.8 : 1));
        warpMat.opacity = Math.sin(k * Math.PI) * 0.9;
        for (const s of ships) {
          if (s.visible) s.scale.setScalar(Math.max(0.001, 1 - k));
        }
      }

      if (t >= 1) endEncounter();
    },
    dispose() {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
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
