/**
 * Monde physique Rapier d'un niveau (sans Three.js) : blocs statiques et boule dynamique.
 * Rapier doit être initialisé (`await RAPIER.init()`) avant de créer un GardenWorld.
 */
import RAPIER from '@dimforge/rapier3d-compat';
import { BALL, inputToWorld, pushDelta, SafePoint, type MoveInput } from '../game/control';
import type { LevelDef, Vec3 } from '../game/level';

export const FIXED_DT = 1 / 60;

export interface StepInput {
  move: MoveInput;
  /** Vrai sur le pas où le saut est demandé. */
  jump: boolean;
  /** Angle de la caméra autour de Y (voir inputToWorld). */
  cameraYaw: number;
}

export type StepEvent = 'jump' | 'bounce' | 'respawn';

interface GroundHit {
  normalY: number;
  bounce: boolean;
}

export class GardenWorld {
  readonly world: RAPIER.World;
  readonly ball: RAPIER.RigidBody;
  private readonly bounceColliders = new Set<number>();
  private readonly safe: SafePoint;
  /** Pas restants pendant lesquels on ignore le sol, juste après un saut ou un rebond. */
  private liftoff = 0;

  constructor(readonly level: LevelDef) {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = FIXED_DT;

    for (const b of level.blocks) {
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed()
          .setTranslation(b.center.x, b.center.y, b.center.z)
          .setRotation({ x: 0, y: 0, z: Math.sin(b.rotZ / 2), w: Math.cos(b.rotZ / 2) }),
      );
      const desc = RAPIER.ColliderDesc.cuboid(b.size.x / 2, b.size.y / 2, b.size.z / 2).setFriction(1);
      if (b.kind === 'bounce') desc.setRestitution(0.8);
      const collider = this.world.createCollider(desc, body);
      if (b.kind === 'bounce') this.bounceColliders.add(collider.handle);
    }

    const s = level.start;
    this.ball = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(s.x, s.y, s.z).setCcdEnabled(true).setCanSleep(false),
    );
    this.world.createCollider(RAPIER.ColliderDesc.ball(BALL.radius).setFriction(1).setDensity(1), this.ball);
    this.safe = new SafePoint(s);
  }

  get position(): Vec3 {
    const t = this.ball.translation();
    return { x: t.x, y: t.y, z: t.z };
  }

  get velocity(): Vec3 {
    const v = this.ball.linvel();
    return { x: v.x, y: v.y, z: v.z };
  }

  /** Avance la simulation d'un pas fixe et renvoie les évènements survenus. */
  step(input: StepInput): StepEvent[] {
    const events: StepEvent[] = [];
    const ground = this.liftoff > 0 ? null : this.groundBelow();
    if (this.liftoff > 0) this.liftoff--;
    const grounded = ground !== null;
    const v = this.velocity;

    const dir = inputToWorld(input.move, input.cameraYaw);
    const pushing = dir.x !== 0 || dir.z !== 0;
    const dv = pushDelta(dir, v, grounded, FIXED_DT);
    let vy = v.y;
    if (ground?.bounce) {
      vy = BALL.bounceSpeed;
      this.liftoff = 10;
      events.push('bounce');
    } else if (input.jump && grounded) {
      vy = BALL.jumpSpeed;
      this.liftoff = 10;
      events.push('jump');
    }
    this.ball.setLinvel({ x: v.x + dv.x, y: vy, z: v.z + dv.z }, true);

    const damping = grounded && !pushing ? BALL.releaseDamping : BALL.rollingDamping;
    this.ball.setLinearDamping(damping);
    this.ball.setAngularDamping(damping);

    this.world.step();

    const p = this.position;
    if (p.y < this.level.killY) {
      const back = this.safe.value;
      this.ball.setTranslation({ x: back.x, y: back.y + 0.05, z: back.z }, true);
      this.ball.setLinvel({ x: 0, y: 0, z: 0 }, true);
      this.ball.setAngvel({ x: 0, y: 0, z: 0 }, true);
      events.push('respawn');
    } else if (ground) {
      this.safe.update(p, true, ground.normalY, ground.bounce, this.surroundedByGround(p));
    }
    return events;
  }

  private castDown(from: Vec3, maxDist: number): RAPIER.RayColliderIntersection | null {
    const ray = new RAPIER.Ray(from, { x: 0, y: -1, z: 0 });
    return this.world.castRayAndGetNormal(ray, maxDist, true, undefined, undefined, undefined, this.ball);
  }

  private groundBelow(): GroundHit | null {
    const hit = this.castDown(this.position, BALL.radius + 0.15);
    if (!hit) return null;
    return { normalY: hit.normal.y, bounce: this.bounceColliders.has(hit.collider.handle) };
  }

  private surroundedByGround(p: Vec3): boolean {
    const m = 1.5;
    const probes = [
      { x: p.x + m, y: p.y, z: p.z },
      { x: p.x - m, y: p.y, z: p.z },
      { x: p.x, y: p.y, z: p.z + m },
      { x: p.x, y: p.y, z: p.z - m },
    ];
    return probes.every((q) => {
      const hit = this.castDown(q, BALL.radius + 0.3);
      return hit !== null && !this.bounceColliders.has(hit.collider.handle);
    });
  }
}
