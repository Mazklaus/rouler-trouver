/**
 * Physique de la boule, sans Phaser : élan, pentes, saut, rebond, chute.
 * `y` est le point de contact (bas de la boule). Repère écran : y vers le bas.
 */
import { groundAt, type LevelDef } from './level';

export const PHYSICS = {
  radius: 16,
  gravity: 1400,
  /** Accélération horizontale au sol et en l'air (px/s²). */
  groundAccel: 700,
  airAccel: 350,
  /** La touche ne pousse plus au-delà de cette vitesse ; les pentes, si. */
  maxInputSpeed: 320,
  /** Freinage doux quand on relâche (taux par seconde). */
  releaseDamping: 1.5,
  jumpSpeed: 420,
  bounceSpeed: 950,
  /** Tolérance de marche : au-delà, un dénivelé est un mur. */
  stepTolerance: 10,
  /** Distance d'accroche au sol (évite de décoller sur une simple bosse). */
  snapDistance: 6,
} as const;

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  safe: { x: number; y: number };
}

export interface BallInput {
  /** -1 gauche, 0 rien, 1 droite. */
  move: number;
  /** Vrai sur l'image où le saut est demandé. */
  jump: boolean;
}

export type StepEvent = 'jump' | 'bounce' | 'land' | 'respawn';

export function createBall(level: LevelDef): BallState {
  return {
    x: level.start.x,
    y: level.start.y,
    vx: 0,
    vy: 0,
    grounded: true,
    safe: { ...level.start },
  };
}

/** Avance la simulation de `dt` secondes. Modifie `ball` et renvoie les évènements survenus. */
export function stepBall(ball: BallState, input: BallInput, dt: number, level: LevelDef): StepEvent[] {
  const P = PHYSICS;
  const events: StepEvent[] = [];

  // Poussée du joueur, plafonnée : seules les pentes et rebonds donnent plus de vitesse.
  const accel = ball.grounded ? P.groundAccel : P.airAccel;
  if (input.move !== 0) {
    const pushed = ball.vx + input.move * accel * dt;
    // On ne dépasse pas maxInputSpeed à la force des touches, sans pour autant casser un élan acquis.
    const limit = Math.max(P.maxInputSpeed, Math.abs(ball.vx));
    ball.vx = Math.max(-limit, Math.min(limit, pushed));
  } else if (ball.grounded) {
    ball.vx *= Math.exp(-P.releaseDamping * dt);
  }

  if (input.jump && ball.grounded) {
    ball.vy = -P.jumpSpeed;
    ball.grounded = false;
    events.push('jump');
  }

  ball.vy += P.gravity * dt;

  // Mouvement horizontal, bloqué par les murs (marche trop haute).
  let nx = ball.x + ball.vx * dt;
  const front = nx + Math.sign(ball.vx) * P.radius;
  const ahead = groundAt(level.ground, front);
  const outside = front < 0 || front > level.width;
  if (outside || (ahead && ball.y > ahead.y + P.stepTolerance)) {
    nx = ball.x;
    ball.vx = 0;
  }
  let ny = ball.y + ball.vy * dt;

  const g = groundAt(level.ground, nx);
  const wasGrounded = ball.grounded;
  ball.grounded = false;
  if (g && (ny >= g.y || (wasGrounded && ball.vy >= 0 && g.y - ny <= P.snapDistance))) {
    if (g.kind === 'bounce') {
      ny = g.y;
      ball.vy = -P.bounceSpeed;
      events.push('bounce');
    } else {
      // Projection de la vitesse sur la pente : la gravité accélère en descente, freine en montée.
      const len = Math.hypot(1, g.slope);
      const tx = 1 / len;
      const ty = g.slope / len;
      const along = ball.vx * tx + ball.vy * ty;
      ball.vx = along * tx;
      ball.vy = along * ty;
      ny = g.y;
      ball.grounded = true;
      if (!wasGrounded) events.push('land');
      if (isSafeSpot(level, nx, g.slope)) ball.safe = { x: nx, y: g.y };
    }
  }

  ball.x = nx;
  ball.y = ny;

  if (ball.y > level.killY) {
    ball.x = ball.safe.x;
    ball.y = ball.safe.y;
    ball.vx = 0;
    ball.vy = 0;
    ball.grounded = true;
    events.push('respawn');
  }
  return events;
}

/** Un point sûr est plat et loin d'un bord : on ne réapparaît jamais au ras d'un trou. */
function isSafeSpot(level: LevelDef, x: number, slope: number): boolean {
  if (Math.abs(slope) >= 0.05) return false;
  const margin = PHYSICS.radius * 4;
  const left = groundAt(level.ground, x - margin);
  const right = groundAt(level.ground, x + margin);
  return left?.kind === 'ground' && right?.kind === 'ground';
}
