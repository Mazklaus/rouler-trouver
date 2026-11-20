import * as THREE from 'three';
import type { MoveInput } from '../game/control';
import { BALL } from '../game/control';
import { GARDEN, type LevelDef, type SecretDef } from '../game/level';
import { SECRET_RADIUS, SecretTracker } from '../game/secrets';
import { FIXED_DT, GardenWorld } from '../world/GardenWorld';
import { Hud } from './Hud';

/** Couleurs provisoires (formes primitives, pas d'assets). */
const COLORS = {
  sky: 0xfff4e0, // crème
  ground: 0x7a5a48,
  groundTop: 0x8fbf6a,
  bounce: 0x9b6bd3,
  decor: 0x3f7d4e,
  hero: 0xff5c8a, // rose réservé au héros
  secret: 0x36e0c8, // turquoise réservé aux secrets
} as const;

/** Caméra 3/4 plongeante en orbite autour de la boule. */
const CAMERA = { distance: 16, minPitch: 0.35, maxPitch: 1.25, startPitch: 0.85, follow: 6, mouseSensitivity: 0.005 };

/** Scène unique du prototype : le Jardin, une boule, trois secrets. */
export class GardenScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
  private readonly world: GardenWorld;
  private readonly secrets: SecretTracker;
  private readonly hud: Hud;
  private readonly ballMesh: THREE.Mesh;
  private readonly sun: THREE.DirectionalLight;
  private readonly secretMeshes = new Map<string, THREE.Mesh>();
  private readonly keys = new Set<string>();
  private readonly cameraTarget = new THREE.Vector3();
  private yaw = 0;
  private pitch = CAMERA.startPitch;
  private jumpQueued = false;
  private paused = false;
  private accumulator = 0;
  private elapsed = 0;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly level: LevelDef = GARDEN,
  ) {
    this.world = new GardenWorld(level);
    this.secrets = new SecretTracker(level);
    this.hud = new Hud(level.name, this.secrets);

    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.sky, 40, 90);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6d5a, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-6, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 50 });
    this.scene.add(sun, sun.target);
    this.sun = sun;

    this.buildLevel();
    this.ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(BALL.radius, 24, 16),
      // Deux couleurs pour voir la boule rouler.
      new THREE.MeshStandardMaterial({ color: COLORS.hero, roughness: 0.6, flatShading: true }),
    );
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(BALL.radius * 1.001, 0.04, 6, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    );
    this.ballMesh.add(stripe);
    this.ballMesh.castShadow = true;
    this.scene.add(this.ballMesh);

    this.cameraTarget.copy(this.ballMesh.position.set(level.start.x, level.start.y, level.start.z));
    this.bindInput();
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Appelée à chaque image avec le temps écoulé en secondes. */
  update(dt: number): void {
    if (!this.paused) {
      this.accumulator = Math.min(this.accumulator + dt, 0.25);
      while (this.accumulator >= FIXED_DT) {
        const events = this.world.step({ move: this.moveInput(), jump: this.jumpQueued, cameraYaw: this.yaw });
        this.jumpQueued = false;
        this.accumulator -= FIXED_DT;
        if (events.includes('respawn')) this.hud.flash();
        for (const s of this.secrets.touch(this.world.position, BALL.radius)) this.onDiscover(s);
      }
      this.elapsed += dt;
    }

    const p = this.world.position;
    const r = this.world.ball.rotation();
    this.ballMesh.position.set(p.x, p.y, p.z);
    this.ballMesh.quaternion.set(r.x, r.y, r.z, r.w);
    this.animateSecrets();
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private buildLevel(): void {
    const groundMat = new THREE.MeshStandardMaterial({ color: COLORS.ground });
    const topMat = new THREE.MeshStandardMaterial({ color: COLORS.groundTop });
    const bounceMat = new THREE.MeshStandardMaterial({ color: COLORS.bounce });
    for (const b of this.level.blocks) {
      const geo = new THREE.BoxGeometry(b.size.x, b.size.y, b.size.z);
      // Dessus vert (face +Y = groupe 2 de BoxGeometry), côtés terre : lecture « diorama ».
      const mats = b.kind === 'bounce' ? bounceMat : [groundMat, groundMat, topMat, groundMat, groundMat, groundMat];
      const mesh = new THREE.Mesh(geo, mats);
      mesh.position.set(b.center.x, b.center.y, b.center.z);
      mesh.rotation.z = b.rotZ;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.scene.add(mesh);
    }

    const secretGeo = new THREE.OctahedronGeometry(SECRET_RADIUS);
    const secretMat = new THREE.MeshStandardMaterial({ color: COLORS.secret, emissive: COLORS.secret, emissiveIntensity: 0.4 });
    for (const s of this.level.secrets) {
      const mesh = new THREE.Mesh(secretGeo, secretMat);
      mesh.position.set(s.position.x, s.position.y, s.position.z);
      this.secretMeshes.set(s.id, mesh);
      this.scene.add(mesh);
    }

    // Décors sans collision qui masquent le secret « caché » ; un point turquoise qui clignote sert d'indice.
    const decorMat = new THREE.MeshStandardMaterial({ color: COLORS.decor, flatShading: true });
    for (const d of this.level.decors) {
      const bush = new THREE.Mesh(new THREE.BoxGeometry(d.size.x, d.size.y, d.size.z), decorMat);
      bush.position.set(d.center.x, d.center.y, d.center.z);
      bush.castShadow = true;
      this.scene.add(bush);
      const hint = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), secretMat.clone());
      hint.position.set(d.center.x + d.size.x * 0.3, d.center.y + d.size.y / 2 + 0.05, d.center.z);
      hint.userData.hint = true;
      this.scene.add(hint);
    }
  }

  private animateSecrets(): void {
    const t = this.elapsed;
    for (const mesh of this.secretMeshes.values()) {
      mesh.rotation.y = t * 1.5;
      mesh.scale.setScalar(mesh.userData.popping ? mesh.scale.x : 1 + 0.1 * Math.sin(t * 4));
    }
    this.scene.traverse((o) => {
      if (o.userData.hint && o instanceof THREE.Mesh) o.visible = Math.sin(t * 3) > -0.3;
    });
  }

  private updateCamera(dt: number): void {
    const p = this.ballMesh.position;
    this.cameraTarget.lerp(p, 1 - Math.exp(-CAMERA.follow * dt));
    const d = CAMERA.distance;
    const horizontal = d * Math.cos(this.pitch);
    this.camera.position.set(
      this.cameraTarget.x + horizontal * Math.sin(this.yaw),
      this.cameraTarget.y + d * Math.sin(this.pitch),
      this.cameraTarget.z + horizontal * Math.cos(this.yaw),
    );
    this.camera.lookAt(this.cameraTarget);
    // L'ombre suit la boule pour garder une petite shadow map nette.
    this.sun.position.set(p.x - 6, p.y + 14, p.z + 8);
    this.sun.target.position.copy(p);
  }

  private moveInput(): MoveInput {
    const k = this.keys;
    const right = k.has('ArrowRight') || k.has('KeyD');
    const left = k.has('ArrowLeft') || k.has('KeyA'); // KeyA = touche Q en AZERTY
    const up = k.has('ArrowUp') || k.has('KeyW'); // KeyW = touche Z en AZERTY
    const down = k.has('ArrowDown') || k.has('KeyS');
    return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (up ? 1 : 0) - (down ? 1 : 0) };
  }

  private bindInput(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        if (!e.repeat) this.toggleNotebook();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat && !this.paused) this.jumpQueued = true;
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    // Caméra : glisser avec la souris pour tourner autour de la boule.
    const canvas = this.renderer.domElement;
    let dragging = false;
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', () => (dragging = false));
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging || this.paused) return;
      this.yaw -= e.movementX * CAMERA.mouseSensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch + e.movementY * CAMERA.mouseSensitivity, CAMERA.minPitch, CAMERA.maxPitch);
    });
  }

  private onDiscover(secret: SecretDef): void {
    const mesh = this.secretMeshes.get(secret.id);
    if (mesh) {
      mesh.userData.popping = true;
      const start = performance.now();
      const grow = (): void => {
        const k = (performance.now() - start) / 400;
        if (k >= 1) {
          this.scene.remove(mesh);
          return;
        }
        mesh.scale.setScalar(1 + 2 * k);
        requestAnimationFrame(grow);
      };
      grow();
    }
    this.hud.discovered();
  }

  private toggleNotebook(): void {
    this.paused = !this.paused;
    this.keys.clear();
    this.hud.showNotebook(this.paused);
  }
}
