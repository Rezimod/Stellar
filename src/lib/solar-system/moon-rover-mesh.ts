// The rover, as built: a lunar utility vehicle rather than a cart. A low
// carbon tub between two battery pods, an open two-seat crew station under a
// roll cage with a PV sunshade, an instrument nose with work lamps and nav
// cameras, a cargo deck with the sample caddy and tool rack, the camera mast
// and high-gain antenna, the tool arm folded across the nose — and six mesh
// wheels under fenders on the rocker-bogie that moon-rover drives.
//
// The kinematics are the drive's contract and do not change: rockers pivot
// at (±1.05, 1.15, 0.3), bogies hang 0.3 below and 0.85 behind them, wheels
// of radius 0.55 meet the ground at x ±1.35, z 1.55 / −0.2 / −1.55.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Kit } from '@/lib/solar-system/moon-kit';
import type { RoverParts } from '@/lib/solar-system/moon-rover';

export function buildRover(kit: Kit, lite: boolean): { group: THREE.Group; parts: RoverParts; dispose: () => void } {
  const m = kit.mat;
  const group = new THREE.Group();
  group.name = 'rover';
  const brakeLight = new THREE.MeshStandardMaterial({ color: 0x3a0606, emissive: new THREE.Color(0xff2a1a), emissiveIntensity: 0.15, roughness: 0.4 });
  const ionMat = new THREE.MeshStandardMaterial({ color: 0x0b1a22, emissive: new THREE.Color(0x8ff0ff), emissiveIntensity: 0, roughness: 0.35 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x5b6067, roughness: 0.62, metalness: 0.6 });
  const parts: RoverParts = {
    spin: [], steer: [], rockers: [], bogies: [], wheelXZ: [],
    mast: new THREE.Group(), seat: new THREE.Object3D(),
    headlight: new THREE.SpotLight(0xfff4dc, 0, 26, 0.6, 0.55, 1.2),
    arm: [], brakeLight, ionMat,
  };
  const noShadow = (o: THREE.Mesh) => { o.castShadow = false; return o; };

  // ── The tub, its skid plate and the battery pods either side. ──
  kit.rbox(group, 1.6, 0.36, 3.2, 0.08, m.carbon, 0, 1.28, -0.1);
  kit.box(group, 1.3, 0.05, 3.0, m.anodised, 0, 1.08, -0.1);
  for (const sd of [-1, 1]) {
    kit.rbox(group, 0.36, 0.36, 1.7, 0.06, m.shellDusty, sd * 0.72, 1.62, -0.55);
    kit.box(group, 0.3, 0.03, 1.5, m.radiator, sd * 0.72, 1.815, -0.55);
    const logo = noShadow(kit.box(group, 0.01, 0.13, 0.58, kit.logo,sd * 0.905, 1.62, -0.55));
    logo.rotation.y = sd > 0 ? 0 : Math.PI;
    noShadow(kit.box(group, 0.012, 0.03, 2.9, ionMat, sd * 0.805, 1.2, -0.1));
  }
  // ── The instrument nose: work lamps on the corners, nav cameras on top,
  // a hazard-striped bumper. ──
  kit.rbox(group, 1.55, 0.42, 0.6, 0.08, m.shell, 0, 1.36, 1.6);
  noShadow(kit.box(group, 1.5, 0.08, 0.04, m.hazard, 0, 1.12, 1.91));
  noShadow(kit.box(group, 0.5, 0.12, 0.02, kit.label(['LTV-01'], { w: 256, h: 64 }), 0, 1.4, 1.905));
  for (const sd of [-1, 1]) {
    const pod = kit.rbox(group, 0.3, 0.22, 0.2, 0.04, m.carbon, sd * 0.62, 1.64, 1.8);
    noShadow(kit.cylZ(pod, 0.075, 0.03, m.work, -0.05, 0, 0.1, 14));
    noShadow(kit.cylZ(pod, 0.045, 0.03, m.work, 0.08, 0, 0.1, 10));
    kit.cylZ(group, 0.04, 0.08, m.carbon, sd * 0.12, 1.66, 1.88, 10);
  }
  kit.box(group, 0.4, 0.06, 0.1, m.anodised, 0, 1.64, 1.84);
  noShadow(kit.box(group, 0.05, 0.05, 0.02, m.cool, 0, 1.6, 1.905));
  parts.headlight.position.set(0, 1.65, 1.9);
  parts.headlight.target.position.set(0, 0.3, 10);
  group.add(parts.headlight, parts.headlight.target);

  // ── The crew station: two seats, the driver's hand controller and display,
  // footrests, a roll cage and the PV sunshade over it. ──
  for (const sx of [-0.38, 0.38]) {
    kit.rbox(group, 0.52, 0.12, 0.5, 0.04, m.carbon, sx, 1.62, 0.5);
    const back = kit.rbox(group, 0.52, 0.62, 0.1, 0.04, m.carbon, sx, 1.95, 0.22);
    back.rotation.x = -0.18;
    kit.box(group, 0.46, 0.04, 0.3, m.anodised, sx, 1.52, 1.12);
  }
  const dash = kit.rbox(group, 0.5, 0.26, 0.16, 0.03, m.carbon, -0.38, 1.9, 1.05);
  dash.rotation.x = -0.4;
  noShadow(kit.mesh(dash, new THREE.PlaneGeometry(0.4, 0.18), m.screen, 0, 0, 0.085));
  kit.cyl(group, 0.03, 0.03, 0.3, m.steel, 0.02, 1.8, 0.82, 8);
  kit.mesh(group, new THREE.SphereGeometry(0.05, 10, 8), m.carbon, 0.02, 1.96, 0.82);
  parts.seat.position.set(-0.38, 2.42, 0.55);
  group.add(parts.seat);
  for (const sd of [-1, 1]) {
    kit.strut(group, sd * 0.74, 1.46, -0.05, sd * 0.68, 2.72, 0.05, 0.035, m.alu);
    kit.strut(group, sd * 0.74, 1.46, 1.3, sd * 0.68, 2.62, 0.95, 0.03, m.alu);
    kit.strut(group, sd * 0.68, 2.72, 0.05, sd * 0.68, 2.62, 0.95, 0.03, m.alu);
  }
  kit.strut(group, -0.68, 2.72, 0.05, 0.68, 2.72, 0.05, 0.035, m.alu);
  const shade = kit.box(group, 1.55, 0.03, 1.15, m.solar, 0, 2.72, 0.5);
  shade.rotation.x = 0.1;

  // ── The cargo deck: tie-down rails, the sample caddy, a spare battery
  // case, the tool rack, and the charge port at the back corner. ──
  kit.box(group, 1.5, 0.05, 1.5, m.deck, 0, 1.49, -1.1);
  for (const sd of [-1, 1]) noShadow(kit.box(group, 0.04, 0.05, 1.5, m.alu, sd * 0.74, 1.54, -1.1));
  noShadow(kit.box(group, 1.5, 0.05, 0.04, m.hazard, 0, 1.52, -1.86));
  kit.rbox(group, 0.52, 0.32, 0.4, 0.04, m.shell, -0.36, 1.68, -1.2);
  noShadow(kit.box(group, 0.53, 0.04, 0.41, m.orange, -0.36, 1.85, -1.2));
  kit.rbox(group, 0.5, 0.26, 0.36, 0.03, m.anodised, 0.4, 1.65, -1.45);
  for (const tx of [0.2, 0.4, 0.6]) kit.cyl(group, 0.015, 0.015, 0.7, m.alu, tx, 1.86, -0.8, 6);
  kit.box(group, 0.6, 0.04, 0.05, m.steel, 0.4, 2.2, -0.8);
  kit.cylZ(group, 0.06, 0.08, m.carbon, -0.62, 1.34, -1.86, 12);
  noShadow(kit.mesh(group, new THREE.TorusGeometry(0.075, 0.012, 6, 16), m.amber, -0.62, 1.34, -1.905));
  for (const sd of [-1, 1]) noShadow(kit.box(group, 0.22, 0.08, 0.03, brakeLight, sd * 0.66, 1.2, -1.87));

  // ── The mast and its camera head, the high-gain antenna, the UHF whip. ──
  kit.cyl(group, 0.05, 0.07, 1.55, m.alu, 0.74, 2.25, -0.05, 10);
  parts.mast.position.set(0.74, 3.08, -0.05);
  group.add(parts.mast);
  kit.rbox(parts.mast, 0.46, 0.22, 0.26, 0.04, m.shell, 0, 0, 0);
  for (const sd of [-1, 1]) noShadow(kit.cylZ(parts.mast, 0.05, 0.08, m.carbon, sd * 0.13, 0, 0.14, 12));
  noShadow(kit.box(parts.mast, 0.04, 0.04, 0.02, m.cool, 0, 0.08, 0.135));
  kit.strut(group, -0.62, 1.55, -1.75, -0.62, 2.35, -1.75, 0.03, m.steel);
  const hga = kit.mesh(group, new THREE.CylinderGeometry(0.3, 0.06, 0.1, kit.seg(20), 1, true), m.alu, -0.62, 2.42, -1.75);
  hga.rotation.x = -0.8;
  kit.cyl(group, 0.008, 0.012, 1.4, m.steel, 0.66, 2.2, -1.8, 6);

  // ── The tool arm: shoulder on the nose, upper arm, elbow, forearm and a
  // turret of tools. The drive folds and unfolds it. ──
  const shoulder = new THREE.Group();
  shoulder.position.set(-0.55, 1.45, 1.92);
  group.add(shoulder);
  kit.cyl(shoulder, 0.1, 0.1, 0.18, m.anodised, 0, 0, 0, 12);
  kit.strut(shoulder, 0, 0, 0, 0.9, 0.1, 0.3, 0.05, m.shell);
  const elbow = new THREE.Group();
  elbow.position.set(0.9, 0.1, 0.3);
  elbow.rotation.x = -0.9;
  shoulder.add(elbow);
  kit.mesh(elbow, new THREE.SphereGeometry(0.075, 12, 10), m.anodised);
  kit.strut(elbow, 0, 0, 0, -0.5, -0.25, 0.45, 0.045, m.shell);
  kit.cylZ(elbow, 0.14, 0.2, m.carbon, -0.5, -0.25, 0.5, 12);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    noShadow(kit.cylZ(elbow, 0.022, 0.12, m.steel, -0.5 + Math.cos(a) * 0.09, -0.25 + Math.sin(a) * 0.09, 0.64, 8));
  }
  parts.arm.push(shoulder, elbow);

  // ── Rocker-bogie, both sides; each wheel on a steering pivot that carries
  // its fender and actuator, the spinning hub inside it. ──
  const tread = (() => {
    const bars: THREE.BufferGeometry[] = [];
    const count = lite ? 16 : 24;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      for (const half of [-1, 1]) {
        const bar = new THREE.BoxGeometry(0.21, 0.04, 0.06);
        bar.rotateZ(half * 0.55);
        bar.rotateX(-a);
        bar.translate(half * 0.1, Math.cos(a) * 0.555, Math.sin(a) * 0.555);
        bars.push(bar);
      }
    }
    const g = mergeGeometries(bars, false)!;
    for (const b of bars) b.dispose();
    return g;
  })();
  const wheel = (parent: THREE.Object3D, x: number, y: number, z: number, steerable: boolean, sd: number) => {
    const pivotG = new THREE.Group();
    pivotG.position.set(x, y, z);
    parent.add(pivotG);
    const hub = new THREE.Group();
    pivotG.add(hub);
    kit.mesh(hub, new THREE.CylinderGeometry(0.53, 0.53, 0.42, kit.seg(32), 1, true), tyre).rotation.z = Math.PI / 2;
    kit.mesh(hub, tread.clone(), m.anodised);
    for (const side of [-0.2, 0.2]) {
      const rim = kit.mesh(hub, new THREE.TorusGeometry(0.5, 0.03, 6, kit.seg(28)), m.alu, side, 0, 0);
      rim.rotation.y = Math.PI / 2;
    }
    kit.cylX(hub, 0.2, 0.34, m.carbon, 0, 0, 0, 16);
    for (let sp = 0; sp < 5; sp++) {
      const spoke = kit.box(hub, 0.05, 0.84, 0.05, m.steel, sd * 0.16, 0, 0);
      spoke.rotation.x = (sp / 5) * Math.PI;
    }
    kit.cylX(hub, 0.1, 0.46, m.steel, 0, 0, 0, 10);
    // Fender over the top of the wheel, open to the outside.
    // Turned onto its side about X, a cylinder's θ = π/2 points up: the
    // fender spans the top 126° of the wheel.
    const fender = kit.mesh(pivotG, new THREE.CylinderGeometry(0.66, 0.66, 0.5, kit.seg(20), 1, true, Math.PI * 0.15, Math.PI * 0.7), m.shellDusty, 0, 0, 0);
    fender.rotation.z = Math.PI / 2;
    if (steerable) kit.cyl(pivotG, 0.07, 0.07, 0.3, m.carbon, -sd * 0.28, 0.62, 0, 10);
    parts.spin.push(hub);
    if (steerable) parts.steer.push(pivotG);
  };
  for (const sd of [-1, 1]) {
    const rocker = new THREE.Group();
    rocker.position.set(sd * 1.05, 1.15, 0.3);
    group.add(rocker);
    parts.rockers.push(rocker);
    kit.strut(rocker, 0, 0, 0, sd * 0.3, -0.6, 1.25, 0.055, m.anodised);
    kit.strut(rocker, 0, 0, 0, 0, -0.3, -0.85, 0.055, m.anodised);
    kit.cylX(rocker, 0.11, 0.22, m.carbon, 0, 0, 0, 14);
    wheel(rocker, sd * 0.3, -0.6, 1.25, true, sd);
    const bogie = new THREE.Group();
    bogie.position.set(0, -0.3, -0.85);
    rocker.add(bogie);
    parts.bogies.push(bogie);
    kit.strut(bogie, 0, 0, 0, sd * 0.3, -0.3, 0.35, 0.05, m.anodised);
    kit.strut(bogie, 0, 0, 0, sd * 0.3, -0.3, -1.0, 0.05, m.anodised);
    kit.cylX(bogie, 0.09, 0.2, m.carbon, 0, 0, 0, 12);
    wheel(bogie, sd * 0.3, -0.3, 0.35, false, sd);
    wheel(bogie, sd * 0.3, -0.3, -1.0, true, sd);
    parts.wheelXZ.push([sd * 1.35, 1.55], [sd * 1.35, -0.2], [sd * 1.35, -1.55]);
  }
  // The differential bar that ties the rockers across the top of the tub.
  kit.box(group, 2.3, 0.07, 0.07, m.steel, 0, 1.5, 0.3);
  tread.dispose();

  return {
    group, parts,
    dispose() { brakeLight.dispose(); ionMat.dispose(); tyre.dispose(); },
  };
}
