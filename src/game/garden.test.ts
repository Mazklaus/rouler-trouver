/** Vérifie que chaque secret du Jardin est atteignable avec les règles de mouvement. */
import { describe, expect, it } from 'vitest';
import { GARDEN } from './level';
import { createBall, PHYSICS, stepBall, type BallInput, type BallState } from './physics';
import { SecretTracker } from './secrets';

const DT = 1 / 120;

function play(setup: (b: BallState) => void, control: (b: BallState) => BallInput, seconds: number): string[] {
  const ball = createBall(GARDEN);
  setup(ball);
  const tracker = new SecretTracker(GARDEN);
  const found: string[] = [];
  for (let t = 0; t < seconds; t += DT) {
    stepBall(ball, control(ball), DT, GARDEN);
    found.push(...tracker.touch(ball.x, ball.y - PHYSICS.radius, PHYSICS.radius).map((s) => s.id));
  }
  return found;
}

describe('Jardin jouable', () => {
  it('secret de rebond : rouler à gauche sur le champignon', () => {
    expect(play(() => {}, () => ({ move: -1, jump: false }), 5)).toContain('jardin-rebond');
  });

  it("secret d'élan : descendre la colline et sauter au bord du trou", () => {
    const found = play(
      (b) => {
        b.x = 1100;
        b.y = 450;
      },
      (b) => ({ move: 1, jump: b.grounded && b.x > 1770 && b.x < 1800 }),
      4,
    );
    expect(found).toContain('jardin-elan');
  });

  it("secret d'élan : inaccessible sans élan (départ arrêté au bord)", () => {
    const found = play(
      (b) => {
        b.x = 1700;
        b.y = 450 + (200 * (1700 - 1150)) / 650;
      },
      (b) => ({ move: 1, jump: b.grounded && b.x > 1770 && b.x < 1800 }),
      2,
    );
    expect(found).not.toContain('jardin-elan');
  });

  it('secret caché : traverser le buisson', () => {
    const found = play(
      (b) => {
        b.x = 3150;
        b.y = 650;
      },
      () => ({ move: 1, jump: false }),
      3,
    );
    expect(found).toContain('jardin-cache');
  });
});
