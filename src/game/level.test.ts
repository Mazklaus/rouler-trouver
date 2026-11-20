import { describe, expect, it } from 'vitest';
import { GARDEN, groundAt, type GroundPoint } from './level';

const ground: GroundPoint[] = [
  { x: 0, y: 100 },
  { x: 100, y: 200 },
  { x: 200, y: 200, kind: 'gap' },
  { x: 300, y: 200, kind: 'bounce' },
  { x: 400, y: 200 },
];

describe('groundAt', () => {
  it('interpole la hauteur et la pente', () => {
    expect(groundAt(ground, 50)).toEqual({ y: 150, slope: 1, kind: 'ground' });
  });
  it('renvoie null dans un trou ou hors du niveau', () => {
    expect(groundAt(ground, 250)).toBeNull();
    expect(groundAt(ground, -1)).toBeNull();
    expect(groundAt(ground, 500)).toBeNull();
  });
  it('signale les surfaces de rebond', () => {
    expect(groundAt(ground, 350)?.kind).toBe('bounce');
  });
});

describe('zone Jardin', () => {
  it('contient un secret de chaque type du prototype', () => {
    expect(GARDEN.secrets.map((s) => s.type).sort()).toEqual(['bounce', 'hidden', 'momentum']);
  });
  it('démarre sur du sol', () => {
    expect(groundAt(GARDEN.ground, GARDEN.start.x)?.y).toBe(GARDEN.start.y);
  });
});
