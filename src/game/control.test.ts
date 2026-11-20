import { describe, expect, it } from 'vitest';
import { BALL, inputToWorld, pushDelta, SafePoint } from './control';

describe('inputToWorld', () => {
  it('avant = -Z et droite = +X avec la caméra par défaut', () => {
    const f = inputToWorld({ x: 0, y: 1 }, 0);
    expect(f.x).toBeCloseTo(0);
    expect(f.z).toBeCloseTo(-1);
    const r = inputToWorld({ x: 1, y: 0 }, 0);
    expect(r.x).toBeCloseTo(1);
    expect(r.z).toBeCloseTo(0);
  });
  it('tourne avec la caméra', () => {
    const f = inputToWorld({ x: 0, y: 1 }, Math.PI / 2);
    expect(f.x).toBeCloseTo(-1);
    expect(f.z).toBeCloseTo(0);
  });
  it('normalise les diagonales', () => {
    const d = inputToWorld({ x: 1, y: 1 }, 0);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1);
  });
});

describe('pushDelta', () => {
  const dt = 1 / 60;
  it('pousse progressivement', () => {
    const d = pushDelta({ x: 1, z: 0 }, { x: 0, y: 0, z: 0 }, true, dt);
    expect(d.x).toBeCloseTo(BALL.groundAccel * dt);
  });
  it('ne dépasse pas la vitesse clavier, sans freiner un élan', () => {
    expect(pushDelta({ x: 1, z: 0 }, { x: BALL.maxInputSpeed - 0.01, y: 0, z: 0 }, true, dt).x).toBeCloseTo(0.01);
    expect(pushDelta({ x: 1, z: 0 }, { x: 9, y: 0, z: 0 }, true, dt)).toEqual({ x: 0, z: 0 });
  });
  it('permet de freiner en poussant en sens inverse', () => {
    expect(pushDelta({ x: -1, z: 0 }, { x: 9, y: 0, z: 0 }, true, dt).x).toBeLessThan(0);
  });
  it("pousse moins en l'air", () => {
    const ground = pushDelta({ x: 1, z: 0 }, { x: 0, y: 0, z: 0 }, true, dt).x;
    const air = pushDelta({ x: 1, z: 0 }, { x: 0, y: 0, z: 0 }, false, dt).x;
    expect(air).toBeLessThan(ground);
  });
});

describe('SafePoint', () => {
  it("ne retient que les sols plats, ordinaires et loin d'un bord", () => {
    const s = new SafePoint({ x: 0, y: 0, z: 0 });
    s.update({ x: 1, y: 0, z: 0 }, true, 1, false, true);
    expect(s.value.x).toBe(1);
    s.update({ x: 2, y: 0, z: 0 }, true, 0.9, false, true); // pente
    s.update({ x: 3, y: 0, z: 0 }, true, 1, true, true); // champignon
    s.update({ x: 4, y: 0, z: 0 }, true, 1, false, false); // bord
    s.update({ x: 5, y: 3, z: 0 }, false, 1, false, true); // en l'air
    expect(s.value.x).toBe(1);
  });
});
