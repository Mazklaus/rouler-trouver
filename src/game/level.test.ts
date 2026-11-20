import { describe, expect, it } from 'vitest';
import { GARDEN, ramp } from './level';

describe('ramp', () => {
  it('place le dessus de la pente sur ses deux extrémités', () => {
    const b = ramp(0, 0, 8, 4, 10);
    const c = Math.cos(b.rotZ);
    const s = Math.sin(b.rotZ);
    // Coin haut-gauche et haut-droit du pavé, dans le repère monde.
    const corner = (lx: number) => ({ x: b.center.x + lx * c - 0.5 * s, y: b.center.y + lx * s + 0.5 * c });
    expect(corner(-b.size.x / 2).x).toBeCloseTo(0);
    expect(corner(-b.size.x / 2).y).toBeCloseTo(0);
    expect(corner(b.size.x / 2).x).toBeCloseTo(8);
    expect(corner(b.size.x / 2).y).toBeCloseTo(4);
  });
});

describe('zone Jardin', () => {
  it('contient un secret de chaque type du prototype', () => {
    expect(GARDEN.secrets.map((s) => s.type).sort()).toEqual(['bounce', 'hidden', 'momentum']);
  });
});
