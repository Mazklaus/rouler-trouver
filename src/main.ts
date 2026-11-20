import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { GardenScene } from './scenes/GardenScene';

async function start(): Promise<void> {
  await RAPIER.init();

  const container = document.getElementById('game')!;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.append(renderer.domElement);

  const scene = new GardenScene(renderer);
  const resize = (): void => {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    scene.resize(w, h);
  };
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Timer();
  renderer.setAnimationLoop((time) => {
    clock.update(time);
    scene.update(clock.getDelta());
  });
}

void start();
