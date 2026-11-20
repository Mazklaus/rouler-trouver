import { describe, expect, it } from 'vitest';
import type { LevelDef } from './level';
import { createBall, PHYSICS, stepBall, type BallInput, type BallState, type StepEvent } from './physics';

const DT = 1 / 120;
const idle: BallInput = { move: 0, jump: false };
const right: BallInput = { move: 1, jump: false };

function level(ground: LevelDef['ground'], startX = 100, startY = 500): LevelDef {
  return { name: 't', width: 4000, killY: 1000, start: { x: startX, y: startY }, ground, secrets: [], decors: [] };
}

function run(ball: BallState, lvl: LevelDef, input: BallInput, seconds: number): StepEvent[] {
  const events: StepEvent[] = [];
  for (let t = 0; t < seconds; t += DT) events.push(...stepBall(ball, input, DT, lvl));
  return events;
}

const flat = level([
  { x: 0, y: 500 },
  { x: 4000, y: 500 },
]);

describe('stepBall', () => {
  it('accélère progressivement puis plafonne la vitesse au clavier', () => {
    const ball = createBall(flat);
    run(ball, flat, right, 0.1);
    expect(ball.vx).toBeGreaterThan(0);
    expect(ball.vx).toBeLessThan(PHYSICS.maxInputSpeed);
    run(ball, flat, right, 2);
    expect(ball.vx).toBeCloseTo(PHYSICS.maxInputSpeed);
  });

  it('garde son élan et freine doucement au relâchement', () => {
    const ball = createBall(flat);
    run(ball, flat, right, 1);
    run(ball, flat, idle, 0.3);
    expect(ball.vx).toBeGreaterThan(150);
    run(ball, flat, idle, 5);
    expect(ball.vx).toBeLessThan(5);
  });

  it('accélère en descente au-delà de la vitesse clavier', () => {
    const slope = level(
      [
        { x: 0, y: 300 },
        { x: 1000, y: 600 },
        { x: 4000, y: 600 },
      ],
      50,
      315,
    );
    const ball = createBall(slope);
    run(ball, slope, right, 2);
    expect(ball.vx).toBeGreaterThan(PHYSICS.maxInputSpeed + 100);
  });

  it('ralentit en montée', () => {
    const hill = level(
      [
        { x: 0, y: 600 },
        { x: 4000, y: 0 },
      ],
      100,
      585,
    );
    const ball = createBall(hill);
    ball.vx = 300;
    run(ball, hill, idle, 0.5);
    expect(ball.vx).toBeLessThan(150);
  });

  it('saute plus loin quand il va plus vite', () => {
    const distance = (vx: number): number => {
      const ball = createBall(flat);
      ball.vx = vx;
      const x0 = ball.x;
      stepBall(ball, { move: 0, jump: true }, DT, flat);
      while (!ball.grounded) stepBall(ball, idle, DT, flat);
      return ball.x - x0;
    };
    expect(distance(400)).toBeGreaterThan(distance(100) * 2);
  });

  it('rebondit plus haut sur une surface souple', () => {
    const pad = level([
      { x: 0, y: 500, kind: 'bounce' },
      { x: 4000, y: 500 },
    ]);
    const ball = createBall(pad);
    const events = run(ball, pad, idle, 0.05);
    expect(events).toContain('bounce');
    let top = ball.y;
    for (let i = 0; i < 120; i++) {
      stepBall(ball, idle, DT, pad);
      top = Math.min(top, ball.y);
    }
    expect(500 - top).toBeGreaterThan(250);
  });

  it('est arrêté par un mur', () => {
    const wall = level([
      { x: 0, y: 500 },
      { x: 300, y: 500 },
      { x: 300, y: 200 },
      { x: 4000, y: 200 },
    ]);
    const ball = createBall(wall);
    run(ball, wall, right, 2);
    expect(ball.x).toBeLessThan(300);
    expect(ball.y).toBe(500);
  });

  it('revient au dernier point sûr après une chute', () => {
    const gap = level([
      { x: 0, y: 500 },
      { x: 300, y: 500, kind: 'gap' },
      { x: 4000, y: 500 },
    ]);
    const ball = createBall(gap);
    let respawned = false;
    for (let i = 0; i < 600 && !respawned; i++) respawned = stepBall(ball, right, DT, gap).includes('respawn');
    expect(respawned).toBe(true);
    expect(ball.x).toBeLessThan(300 - PHYSICS.radius * 3);
    expect(ball.vx).toBe(0);
  });
});
