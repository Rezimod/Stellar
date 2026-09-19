import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface PostFxHandle {
  render: (dtSec: number) => void;
  setSize: (cssWidth: number, cssHeight: number) => void;
  dispose: () => void;
}

/**
 * Scene → bloom → tone-mapped output. Threshold sits above every lit planet
 * surface so only HDR emitters bloom: the Sun's photosphere, engine glows,
 * laser bolts. On lite devices the bloom chain runs at half resolution.
 */
export function makePostFx(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  lite: boolean,
): PostFxHandle {
  const composer = new EffectComposer(renderer);
  const size = renderer.getSize(new THREE.Vector2());
  const bloomScale = lite ? 0.5 : 1;
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(size.x * bloomScale, size.y * bloomScale),
    0.4,
    0.7,
    0.85,
  );
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);

  const setSize = (w: number, h: number) => {
    const pr = renderer.getPixelRatio();
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    // EffectComposer resizes every pass to full device resolution — pull the
    // bloom chain back down on lite devices after that.
    bloom.setSize(w * pr * bloomScale, h * pr * bloomScale);
  };
  setSize(size.x, size.y);

  return {
    render(dtSec) {
      composer.render(dtSec);
    },
    setSize,
    dispose() {
      renderPass.dispose();
      bloom.dispose();
      output.dispose();
      composer.dispose();
    },
  };
}
