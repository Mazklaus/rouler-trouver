import { describe, expect, it } from 'vitest';
import type { LevelDef } from './level';
import { SecretTracker } from './secrets';

const lvl: LevelDef = {
  name: 't',
  killY: -10,
  start: { x: 0, y: 0, z: 0 },
  blocks: [],
  secrets: [
    { id: 'a', type: 'hidden', position: { x: 1, y: 0, z: 0 } },
    { id: 'b', type: 'bounce', position: { x: 0, y: 5, z: 5 } },
  ],
  decors: [],
};

describe('SecretTracker', () => {
  it('découvre un secret au simple contact en 3D, une seule fois', () => {
    const t = new SecretTracker(lvl);
    expect(t.touch({ x: 0, y: 0, z: 2 }, 0.5)).toEqual([]);
    expect(t.touch({ x: 0.3, y: 0, z: 0.2 }, 0.5).map((s) => s.id)).toEqual(['a']);
    expect(t.touch({ x: 0.3, y: 0, z: 0.2 }, 0.5)).toEqual([]);
    expect(t.foundCount).toBe(1);
    expect(t.total).toBe(2);
    expect(t.isFound('a')).toBe(true);
  });
});
