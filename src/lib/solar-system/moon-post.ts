// Scene → bloom → film. The film pass is what makes it a photograph rather
// than a render: fine grain, a soft vignette, and in the helmet a slight
// colour fringe at the edge of the visor and the visor's own curvature.
//
// The scene is drawn into the composer's own target, so that is where the
// anti-aliasing has to live: MSAA samples on the target, by preset. Bloom is
// a blur, so it runs at half resolution and can be dropped altogether.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** What the post chain takes from a quality preset. */
export interface PostQuality {
  bloom: boolean;
  bloomScale: number;
  msaa: number;
  lite: boolean;
}

export interface MoonPostHandle {
  render: (dt: number) => void;
  setSize: (w: number, h: number) => void;
  /** 0 chase camera, 1 inside the helmet. */
  setHelmet: (k: number) => void;
  /** The scene being drawn. */
  scene: () => THREE.Scene;
  /** A new preset: bloom on or off, and the samples on the target. */
  setQuality: (q: PostQuality) => void;
  /** Where the scene is drawn: a pre-compile must target it to build the variants the frame uses. */
  drawTarget: () => THREE.WebGLRenderTarget;
  dispose: () => void;
}

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uHelmet: { value: 0 },
    uGrain: { value: 0.045 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uHelmet; uniform float uGrain;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uTime) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);
      // Visor curvature: a touch of barrel distortion inside the helmet.
      uv = 0.5 + c * (1.0 + uHelmet * 0.08 * r2);
      float fringe = uHelmet * 0.0035 * r2 * 4.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * fringe).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * fringe).b;
      float g = (hash(uv * 1000.0) - 0.5) * uGrain;
      col += g * (0.6 + 0.4 * (1.0 - clamp(length(col), 0.0, 1.0)));
      float vig = 1.0 - smoothstep(0.35, 1.05, sqrt(r2) * (1.15 + uHelmet * 0.55));
      col *= mix(0.86, 1.0, vig);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function makeMoonPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, quality: PostQuality): MoonPostHandle {
  const size = renderer.getSize(new THREE.Vector2());
  const pr = renderer.getPixelRatio();
  const target = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples: quality.msaa });
  const composer = new EffectComposer(renderer, target);
  let q = quality;
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x * q.bloomScale, size.y * q.bloomScale), 0.35, 0.6, 0.9);
  bloom.enabled = q.bloom;
  const film = new ShaderPass(FilmShader);
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);
  composer.addPass(film);
  let time = 0;
  let helmet = 0;
  let helmetTarget = 0;
  const setSize = (w: number, h: number) => {
    const ratio = renderer.getPixelRatio();
    composer.setPixelRatio(ratio);
    composer.setSize(w, h);
    bloom.setSize(w * ratio * q.bloomScale, h * ratio * q.bloomScale);
  };
  setSize(size.x, size.y);
  return {
    render(dt) {
      time += dt;
      helmet += (helmetTarget - helmet) * (1 - Math.exp(-dt * 6));
      film.uniforms.uTime.value = time % 100;
      film.uniforms.uHelmet.value = helmet;
      film.uniforms.uGrain.value = q.lite ? 0.03 : 0.045;
      composer.render(dt);
    },
    setSize,
    setHelmet(k) { helmetTarget = k; },
    scene: () => renderPass.scene as THREE.Scene,
    drawTarget: () => composer.renderTarget1,
    setQuality(next) {
      q = next;
      bloom.enabled = q.bloom;
      // The targets keep their sample count from creation: drop them and
      // they come back at the new one on the next frame.
      for (const rt of [composer.renderTarget1, composer.renderTarget2]) {
        rt.samples = q.msaa;
        rt.dispose();
      }
    },
    dispose() {
      renderPass.dispose(); bloom.dispose(); film.dispose(); output.dispose(); composer.dispose();
    },
  };
}
