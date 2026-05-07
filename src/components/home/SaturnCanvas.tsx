'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * WebGL Saturn — textured sphere + procedural ring built from ~7,000
 * orbiting particles. Mouse parallax tilts the camera; the rings rotate
 * continuously. No external textures — everything is generated in canvas.
 */
export default function SaturnCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Mobile gets a much lighter scene: lower DPR, fewer particles, smaller sphere.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    // Save-Data flag (some browsers expose it via connection) — treat as mobile-tier.
    type NavWithConn = Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
    const conn = (navigator as NavWithConn).connection;
    const lowData = !!conn && (conn.saveData === true || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g');
    const lite = isMobile || lowData;

    // ── Renderer ─────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: !lite,           // skip MSAA on mobile — fillrate-heavy
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1.5 : 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // ── Scene + camera ───────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      35,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0.4, 8.6);
    camera.lookAt(0, 0, 0);

    // ── Lighting (cinematic 3-point: key sun, cool fill, back rim) ──
    // Low ambient so the unlit hemisphere stays dramatically dark — that
    // contrast is what gives the planet an "epic" crescent silhouette.
    scene.add(new THREE.AmbientLight(0x10162a, 0.18));

    // Key light: warm sun from upper-left, sharp falloff
    const sun = new THREE.DirectionalLight(0xffe4ba, 3.6);
    sun.position.set(-6, 3.2, 5);
    scene.add(sun);

    // Cool fill from lower-right, mimics scattered light off the rings
    const fill = new THREE.DirectionalLight(0x6a82c2, 0.45);
    fill.position.set(4.5, -2, 2.0);
    scene.add(fill);

    // Back rim light — orange, wraps the silhouette edge
    const rim = new THREE.DirectionalLight(0xff7a3a, 1.4);
    rim.position.set(5, 0.4, -3.5);
    scene.add(rim);

    // ── Saturn surface texture (procedural bands) ────────────────
    const surfaceTex = makeSaturnTexture();
    surfaceTex.colorSpace = THREE.SRGBColorSpace;

    const sphereSegs = lite ? 48 : 96;
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(2.45, sphereSegs, sphereSegs),
      new THREE.MeshStandardMaterial({
        map: surfaceTex,
        roughness: 0.92,
        metalness: 0.0,
      }),
    );
    planet.rotation.z = THREE.MathUtils.degToRad(26.7); // Saturn's axial tilt
    scene.add(planet);


    // ── Ring particles ───────────────────────────────────────────
    // Mobile gets ~5x fewer particles — the per-frame loop that updates
    // every position is the single hottest path here.
    const RING_COUNT = reduceMotion ? 1500 : lite ? 2400 : 12000;
    const innerR = 2.95;
    const outerR = 4.95;

    const positions = new Float32Array(RING_COUNT * 3);
    const colors = new Float32Array(RING_COUNT * 3);
    const sizes = new Float32Array(RING_COUNT);
    const orbitData = new Float32Array(RING_COUNT * 2); // radius, angle

    const palette = [
      new THREE.Color('#f5dcb6'),
      new THREE.Color('#e7c08c'),
      new THREE.Color('#d49a5e'),
      new THREE.Color('#fff3da'),
      new THREE.Color('#a87444'),
    ];

    for (let i = 0; i < RING_COUNT; i++) {
      // Bias particles toward the visible Cassini-style banding pattern.
      const t = Math.pow(Math.random(), 0.85);
      const r = innerR + t * (outerR - innerR);
      // Cassini gap — wide band ~62% across, very visible
      const cassini = Math.abs(r - (innerR + (outerR - innerR) * 0.62));
      if (cassini < 0.06 && Math.random() < 0.85) {
        i--;
        continue;
      }
      // Encke gap — thin gap near outer edge for added realism
      const encke = Math.abs(r - (innerR + (outerR - innerR) * 0.88));
      if (encke < 0.02 && Math.random() < 0.9) {
        i--;
        continue;
      }
      const angle = Math.random() * Math.PI * 2;
      const jitterY = (Math.random() - 0.5) * 0.018;
      positions[i * 3 + 0] = Math.cos(angle) * r;
      positions[i * 3 + 1] = jitterY;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      orbitData[i * 2 + 0] = r;
      orbitData[i * 2 + 1] = angle;

      const c = palette[Math.floor(Math.random() * palette.length)];
      const shade = 0.65 + Math.random() * 0.45;
      colors[i * 3 + 0] = c.r * shade;
      colors[i * 3 + 1] = c.g * shade;
      colors[i * 3 + 2] = c.b * shade;

      sizes[i] = 0.018 + Math.random() * 0.045;
    }

    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    ringGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    ringGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const ringMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (320.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float alpha = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    });

    const rings = new THREE.Points(ringGeo, ringMat);
    rings.rotation.z = THREE.MathUtils.degToRad(26.7);
    scene.add(rings);

    // ── Background star field ────────────────────────────────────
    // CSS starfield in HeroSaturn covers the whole hero already; keep WebGL
    // stars only on desktop where they parallax with the planet camera.
    const STAR_COUNT = lite ? 0 : 220;
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starSize = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 30 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 14;
      starSize[i] = 0.04 + Math.random() * 0.12;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSize, 1));
    const starMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uPixelRatio: { value: renderer.getPixelRatio() } },
      vertexShader: /* glsl */ `
        attribute float size;
        uniform float uPixelRatio;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (260.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(1.0, 0.96, 0.9, a * 0.85);
        }
      `,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ── Moons (Titan-, Rhea-, Iapetus-inspired) ──────────────────
    // Tilted to match the ring plane so they orbit in Saturn's equator.
    const moonsGroup = new THREE.Group();
    moonsGroup.rotation.z = THREE.MathUtils.degToRad(26.7);

    type MoonData = { r: number; a: number; speed: number; size: number; color: number };
    const moonsData: MoonData[] = [
      { r: 5.6, a: Math.random() * Math.PI * 2, speed: 0.42, size: 0.18, color: 0xd9b487 }, // Titan-ish, warm hazy
      { r: 6.5, a: Math.random() * Math.PI * 2, speed: 0.28, size: 0.12, color: 0xc8c8c8 }, // Rhea-ish, icy grey
      { r: 7.6, a: Math.random() * Math.PI * 2, speed: 0.18, size: 0.10, color: 0x8c8478 }, // Iapetus-ish, dusky
    ];
    const moons: THREE.Mesh[] = moonsData.map((m) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(m.size, 18, 18),
        new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.95, metalness: 0 }),
      );
      moonsGroup.add(mesh);
      return mesh;
    });

    // ── Saturn group offset (aspect-aware: cinematic crop on desktop,
    //    pulled back on portrait/mobile so it stays visible) ──────────
    const planetGroup = new THREE.Group();
    planetGroup.add(planet);
    planetGroup.add(rings);
    planetGroup.add(moonsGroup);
    scene.add(planetGroup);
    const updatePlanetOffset = () => {
      const aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
      if (aspect < 0.9) {
        planetGroup.position.x = 0.6;       // narrow mobile portrait
        planetGroup.scale.setScalar(0.7);   // smaller on mobile only
      } else {
        planetGroup.scale.setScalar(0.85);  // slightly smaller on desktop
        if (aspect < 1.3)      planetGroup.position.x = 3.0;   // tablet / square
        else if (aspect < 1.7) planetGroup.position.x = 4.8;   // tight laptop
        else                   planetGroup.position.x = 6.0;   // wide desktop — pushed further right
      }
    };
    updatePlanetOffset();

    // ── Mouse parallax ───────────────────────────────────────────
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };
    mount.addEventListener('mousemove', onMove);
    mount.addEventListener('mouseleave', onLeave);

    // ── Resize ───────────────────────────────────────────────────
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      ringMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      starMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      updatePlanetOffset();
    };
    window.addEventListener('resize', onResize);

    // ── Pause RAF when offscreen / tab hidden ───────────────────
    // The hero is a fixed-viewport landing slab: as soon as the user
    // scrolls past it there's no reason to keep simulating 12k particles.
    let inView = true;
    let docVisible = !document.hidden;
    const io = new IntersectionObserver(
      (entries) => { inView = entries[0]?.isIntersecting ?? true; },
      { threshold: 0 },
    );
    io.observe(mount);
    const onVis = () => { docVisible = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);

    // ── Animation loop ───────────────────────────────────────────
    let raf = 0;
    let last = performance.now();
    const ringSpeed = reduceMotion ? 0.0 : 0.055; // rad/s mean
    const planetSpinSpeed = reduceMotion ? 0.0 : 0.045;
    const positionAttr = ringGeo.getAttribute('position') as THREE.BufferAttribute;

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (!inView || !docVisible) {
        last = now; // reset dt so resume doesn't jump
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Lerp parallax
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;

      // Camera shifts on mouse, planet group counter-shifts subtly
      camera.position.x = current.x * 0.55;
      camera.position.y = -current.y * 0.4 + 0.4;
      camera.lookAt(planetGroup.position.x * 0.6, 0, 0);

      planetGroup.rotation.y = current.x * 0.18;
      planetGroup.rotation.x = -current.y * 0.10;

      // Spin planet on its own axis (visible despite featureless texture via bands)
      planet.rotation.y += planetSpinSpeed * dt;

      // Moons — orbit in the ring plane (moonsGroup is z-tilted), each at its own speed
      if (!reduceMotion) {
        for (let i = 0; i < moonsData.length; i++) {
          const m = moonsData[i];
          m.a += m.speed * dt * 0.25;
          if (m.a > Math.PI * 2) m.a -= Math.PI * 2;
          moons[i].position.set(Math.cos(m.a) * m.r, 0, Math.sin(m.a) * m.r);
          moons[i].rotation.y += dt * 0.5;
        }
      } else {
        for (let i = 0; i < moonsData.length; i++) {
          const m = moonsData[i];
          moons[i].position.set(Math.cos(m.a) * m.r, 0, Math.sin(m.a) * m.r);
        }
      }

      // Rotate the ring particles around Y. Vary speed by 1/sqrt(r) for
      // pseudo-Keplerian feel — inner particles outrun outer particles.
      for (let i = 0; i < RING_COUNT; i++) {
        const r = orbitData[i * 2 + 0];
        let a = orbitData[i * 2 + 1] + (ringSpeed / Math.sqrt(r)) * dt;
        if (a > Math.PI * 2) a -= Math.PI * 2;
        orbitData[i * 2 + 1] = a;
        positions[i * 3 + 0] = Math.cos(a) * r;
        positions[i * 3 + 2] = Math.sin(a) * r;
      }
      positionAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(render);

    // ── Cleanup ──────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      mount.removeEventListener('mousemove', onMove);
      mount.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();

      ringGeo.dispose();
      ringMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      planet.geometry.dispose();
      (planet.material as THREE.Material).dispose();
      moons.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      surfaceTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="absolute inset-0 pointer-events-auto"
      style={{ touchAction: 'pan-y' }}
    />
  );
}

/**
 * Procedural Saturn surface — beige base with subtle horizontal cloud bands.
 * Drawn into a 1024×512 canvas, returned as a CanvasTexture.
 */
function makeSaturnTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;

  // Base gradient (poles slightly cooler than equator)
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0.0, '#9a7748');
  base.addColorStop(0.18, '#c69b67');
  base.addColorStop(0.5, '#e8c896');
  base.addColorStop(0.82, '#c69b67');
  base.addColorStop(1.0, '#8a6840');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Cloud bands — horizontal, varying alpha + slight color jitter
  const bands = 28;
  for (let i = 0; i < bands; i++) {
    const y = (i / bands) * h + (Math.random() - 0.5) * 6;
    const bandH = 6 + Math.random() * 18;
    const lightness = 110 + Math.floor(Math.random() * 80);
    const warmth = 70 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgba(${lightness + 40}, ${lightness}, ${warmth}, ${0.10 + Math.random() * 0.16})`;
    ctx.fillRect(0, y, w, bandH);
  }

  // Subtle horizontal noise streaks for cloud texture
  for (let i = 0; i < 6000; i++) {
    const y = Math.random() * h;
    const x = Math.random() * w;
    const len = 6 + Math.random() * 40;
    ctx.fillStyle = `rgba(255, 230, 190, ${Math.random() * 0.04})`;
    ctx.fillRect(x, y, len, 1);
  }
  for (let i = 0; i < 4000; i++) {
    const y = Math.random() * h;
    const x = Math.random() * w;
    const len = 6 + Math.random() * 40;
    ctx.fillStyle = `rgba(60, 40, 20, ${Math.random() * 0.05})`;
    ctx.fillRect(x, y, len, 1);
  }

  // Soft pole shadows
  const polar = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, h * 0.55);
  polar.addColorStop(0, 'rgba(40,20,10,0.35)');
  polar.addColorStop(1, 'rgba(40,20,10,0)');
  ctx.fillStyle = polar;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}
