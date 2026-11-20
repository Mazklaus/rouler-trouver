import { describe, expect, it } from 'vitest';
import type { LevelDef } from './level';
import { SecretTracker } from './secrets';

const lvl: LevelDef = {
  name: 't',
  width: 1000,
  killY: 1000,
  start: { x: 0, y: 0 },
  ground: [],
  secrets: [
    { id: 'a', type: 'hidden', x: 100, y: 100 },
    { id: 'b', type: 'bounce', x: 500, y: 100 },
  ],
  decors: [],
};

describe('SecretTracker', () => {
  it('découvre un secret au simple contact, une seule fois', () => {
    const t = new SecretTracker(lvl);
    expect(t.touch(0, 100, 16)).toEqual([]);
    expect(t.touch(80, 100, 16).map((s) => s.id)).toEqual(['a']);
    expect(t.touch(80, 100, 16)).toEqual([]);
    expect(t.foundCount).toBe(1);
    expect(t.total).toBe(2);
    expect(t.isFound('a')).toBe(true);
  });
});
