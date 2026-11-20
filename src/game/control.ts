/** Règles de contrôle de la boule, sans Three.js ni Rapier. */
import type { Vec3 } from './level';

export const BALL = {
  radius: 0.5,
  /** Accélération donnée par les touches (m/s²), au sol et en l'air. */
  groundAccel: 9,
  airAccel: 4,
  /** Les touches ne poussent plus au-delà de cette vitesse ; les pentes, si. */
  maxInputSpeed: 4.5,
  jumpSpeed: 5,
  bounceSpeed: 10.5,
  /** Freinage doux quand on relâche, et quasi aucun quand on pousse (garde l'élan). */
  releaseDamping: 0.8,
  rollingDamping: 0.05,
} as const;

export interface MoveInput {
  /** Axe gauche/droite de l'écran, de -1 à 1. */
  x: number;
  /** Axe avant/arrière de l'écran, de -1 (arrière) à 1 (avant). */
  y: number;
}

/**
 * Convertit l'entrée (relative à la caméra) en direction monde sur le plan XZ.
 * `yaw` est l'angle de la caméra autour de Y : 0 = caméra côté +Z regardant vers -Z.
 */
export function inputToWorld(input: MoveInput, yaw: number): { x: number; z: number } {
  let { x, y } = input;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  // Droite écran = (cos, 0, -sin), avant écran = (-sin, 0, -cos).
  return { x: x * c - y * s, z: -x * s - y * c };
}

/**
 * Variation de vitesse horizontale à appliquer ce pas-ci.
 * La poussée est coupée dans la direction voulue au-delà de maxInputSpeed, sans freiner un élan acquis.
 */
export function pushDelta(dir: { x: number; z: number }, velocity: Vec3, grounded: boolean, dt: number): { x: number; z: number } {
  const len = Math.hypot(dir.x, dir.z);
  if (len === 0) return { x: 0, z: 0 };
  const along = (velocity.x * dir.x + velocity.z * dir.z) / len;
  if (along >= BALL.maxInputSpeed) return { x: 0, z: 0 };
  const accel = grounded ? BALL.groundAccel : BALL.airAccel;
  const dv = Math.min(accel * dt * len, BALL.maxInputSpeed - along);
  return { x: (dir.x / len) * dv, z: (dir.z / len) * dv };
}

/** Garde en mémoire le dernier point sûr où réapparaître après une chute. */
export class SafePoint {
  private point: Vec3;

  constructor(start: Vec3) {
    this.point = { ...start };
  }

  get value(): Vec3 {
    return { ...this.point };
  }

  /**
   * Un point est sûr si la boule est posée sur un sol plat ordinaire
   * et qu'il y a du sol tout autour (jamais au ras d'un bord).
   */
  update(position: Vec3, grounded: boolean, groundNormalY: number, onBounce: boolean, surroundedByGround: boolean): void {
    if (grounded && !onBounce && groundNormalY > 0.98 && surroundedByGround) this.point = { ...position };
  }
}
