import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { QualityProfile } from '@/game/quality';

export interface PostFxHandle {
  render: (dtSec: number) => void;
  setSize: (cssWidth: number, cssHeight: number) => void;
  dispose: () => void;
}

/**
 * Scene → bloom → tone-mapped output. Threshold sits above every lit planet
 * surface so only HDR emitters bloom: the Sun's photosphere, engine glows,
 * laser bolts.
 *
 * The chain is what the preset says it is, the same as the surfaces'
 * (`moon-post.ts`). `performance` drops the bloom outright: UnrealBloom is
 * five blur levels — a dozen passes, each one a program bind and a quad —
 * and on a phone that is the frame, not a garnish. The Sun still reads,
 * because the tone map is doing the work either way.
 */
export function makePostFx(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  quality: QualityProfile,
): PostFxHandle {
  const size = renderer.getSize(new THREE.Vector2());
  const pr0 = renderer.getPixelRatio();
  // The scene is drawn into the composer's target, never the canvas, so the
  // anti-aliasing has to live here. Off the `performance` preset nothing
  // changes from what the orrery always drew: a multisampled target and a
  // full-resolution bloom chain.
  const target = new THREE.WebGLRenderTarget(size.x * pr0, size.y * pr0, {
    type: THREE.HalfFloatType,
    samples: quality.bloom ? 4 : 0,
  });
  const composer = new EffectComposer(renderer, target);
  const renderPass = new RenderPass(scene, camera);
  const bloom = quality.bloom
    ? new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.4, 0.7, 0.85)
    : null;
  const output = new OutputPass();
  composer.addPass(renderPass);
  if (bloom) composer.addPass(bloom);
  composer.addPass(output);

  const setSize = (w: number, h: number) => {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
  };
  setSize(size.x, size.y);

  return {
    render(dtSec) {
      composer.render(dtSec);
    },
    setSize,
    dispose() {
      renderPass.dispose();
      bloom?.dispose();
      output.dispose();
      composer.dispose();
    },
  };
}
