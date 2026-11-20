/** Simule le Jardin avec la vraie physique Rapier : chaque secret doit être atteignable. */
import RAPIER from '@dimforge/rapier3d-compat';
import { beforeAll, describe, expect, it } from 'vitest';
import { BALL, type MoveInput } from '../game/control';
import { GARDEN } from '../game/level';
import { SecretTracker } from '../game/secrets';
import { FIXED_DT, GardenWorld, type StepEvent } from './GardenWorld';

beforeAll(async () => {
  await RAPIER.init();
});

const RIGHT: MoveInput = { x: 1, y: 0 };
const LEFT: MoveInput = { x: -1, y: 0 };

interface Run {
  found: string[];
  events: StepEvent[];
  world: GardenWorld;
}

function play(
  start: { x: number; y: number },
  control: (w: GardenWorld) => { move: MoveInput; jump?: boolean },
  seconds: number,
): Run {
  const world = new GardenWorld(GARDEN);
  world.ball.setTranslation({ x: start.x, y: start.y, z: 0 }, true);
  const tracker = new SecretTracker(GARDEN);
  const found: string[] = [];
  const events: StepEvent[] = [];
  for (let t = 0; t < seconds; t += FIXED_DT) {
    const c = control(world);
    events.push(...world.step({ move: c.move, jump: c.jump ?? false, cameraYaw: 0 }));
    found.push(...tracker.touch(world.position, BALL.radius).map((s) => s.id));
  }
  return { found, events, world };
}

/** Saute au bord du trou (x = 33 en allant à droite, 38.5 en allant à gauche). */
const jumpAtEdge = (edge: number, dirSign: number) => (w: GardenWorld) => ({
  move: dirSign > 0 ? RIGHT : LEFT,
  jump: Math.abs(w.position.x - (edge - dirSign * 0.4)) < 0.4,
});

describe('Jardin en 3D (Rapier)', () => {
  it('la boule roule et garde de la vitesse sur le plat', () => {
    const r = play({ x: 0, y: 0.5 }, () => ({ move: RIGHT }), 1.5);
    expect(r.world.velocity.x).toBeGreaterThan(3);
  });

  it('secret de rebond : rouler à gauche sur le champignon', () => {
    const r = play({ x: 0, y: 0.5 }, () => ({ move: LEFT }), 6);
    expect(r.events).toContain('bounce');
    expect(r.found).toContain('jardin-rebond');
  });

  it('le pilier est trop haut pour un simple saut', () => {
    const r = play({ x: -8, y: 0.5 }, () => ({ move: { x: 0, y: 0 }, jump: true }), 2);
    expect(r.world.position.y).toBeLessThan(2);
  });

  it("secret d'élan : descendre la colline et sauter au bord du trou", () => {
    const r = play({ x: 19.5, y: 4.5 }, jumpAtEdge(33, 1), 5);
    expect(r.found).toContain('jardin-elan');
  });

  it("secret d'élan : le trou ne se franchit pas sans élan", () => {
    const r = play({ x: 29, y: 1.9 }, (w) => {
      // Démarrage freiné : on limite la vitesse à celle du clavier.
      if (w.velocity.x > BALL.maxInputSpeed) w.ball.setLinvel({ ...w.velocity, x: BALL.maxInputSpeed }, true);
      return jumpAtEdge(33, 1)(w);
    }, 5);
    expect(r.found).not.toContain('jardin-elan');
    expect(r.events).toContain('respawn');
  });

  it("retour possible depuis le plateau d'élan, par l'autre colline", () => {
    const r = play({ x: 55.5, y: 4.5 }, jumpAtEdge(38.5, -1), 6);
    expect(r.world.position.x).toBeLessThan(33);
    expect(r.world.position.y).toBeGreaterThan(-1);
  });

  it('secret caché : traverser le buisson', () => {
    const r = play({ x: 70, y: 0.5 }, () => ({ move: { x: 1, y: 0.15 } }), 4);
    expect(r.found).toContain('jardin-cache');
  });

  it('une chute ramène au dernier point sûr, loin du bord', () => {
    let fell = false;
    const r = play({ x: 0, y: 0.5 }, (w) => {
      fell ||= w.position.y < GARDEN.killY + 1;
      return { move: fell ? { x: 0, y: 0 } : { x: 0, y: 1 } };
    }, 5);
    expect(r.events).toContain('respawn');
    const p = r.world.position;
    expect(Math.abs(p.z)).toBeLessThan(5 - 1);
  });
});
