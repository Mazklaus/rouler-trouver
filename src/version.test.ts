import { describe, expect, it } from 'vitest';
import { GAME_TITLE } from './version';

describe('smoke', () => {
  it('expose le titre du jeu', () => {
    expect(GAME_TITLE).toBe('Rouler-Trouver');
  });
});
